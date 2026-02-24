import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { v4 as uuidv4 } from 'uuid'
import { calculateTier, processStreak } from '@/lib/gamification'
import { triggerWalletPush } from '@/lib/wallet/push'
import { getMotorConfig } from '@/lib/motorConfig'

type SupabaseAdminClient = ReturnType<typeof getSupabase>

type TenantInfo = {
    slug: string
    nombre: string
    color_primario?: string | null
    lat?: number | null
    lng?: number | null
    mensaje_geofencing?: string | null
}

type CustomerRow = {
    id: string
    nombre: string
    whatsapp: string
    puntos_actuales: number
    total_puntos_historicos: number
    total_premios_canjeados: number
    tier: string | null
    current_streak: number | null
    last_visit_at: string | null
    tenants: TenantInfo | TenantInfo[] | null
}

type NivelConfig = {
    visitas: number
    descuento: number
}

type ProgramConfig = {
    porcentaje?: number
    tope_mensual?: number
    niveles?: NivelConfig[]
    beneficios?: string[]
    descuento_porcentaje?: number
    valido_hasta?: string | null
}

type ProgramRow = {
    id: string
    puntos_meta: number
    descripcion_premio: string
    tipo_premio: string | null
    valor_premio: string | null
    tipo_programa: string
    config: ProgramConfig | null
}

function getTenantInfo(tenant: CustomerRow['tenants']): TenantInfo | null {
    if (!tenant) return null
    return Array.isArray(tenant) ? (tenant[0] || null) : tenant
}

function normalizeWhatsapp(value: string): string {
    return value.replace(/[^\d+]/g, '')
}

// POST /api/stamp
// Motor universal: suma punto, registra cashback, consume multipase, calcula descuento, etc.
// El comportamiento depende de program.tipo_programa
export async function POST(req: NextRequest) {
    const supabase = getSupabase()
    try {
        const body = await req.json()
        const { tenant_id, whatsapp, monto_compra, lat, lng } = body
        const normalizedWhatsapp = typeof whatsapp === 'string' ? normalizeWhatsapp(whatsapp) : ''

        if (!tenant_id || !normalizedWhatsapp) {
            return NextResponse.json(
                { error: 'Faltan campos: tenant_id, whatsapp' },
                { status: 400 }
            )
        }

        // Buscar al cliente y el tenant (para el slug, branding y ubicación)
        const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select(`
                id, 
                nombre, 
                whatsapp, 
                puntos_actuales, 
                total_puntos_historicos, 
                total_premios_canjeados, 
                tier, 
                current_streak, 
                last_visit_at,
                tenants (
                    slug,
                    nombre,
                    color_primario,
                    lat,
                    lng,
                    mensaje_geofencing
                )
            `)
            .eq('tenant_id', tenant_id)
            .eq('whatsapp', normalizedWhatsapp)
            .single()

        if (customerError || !customer) {
            return NextResponse.json({ error: 'Cliente no encontrado. ¿Ya te registraste?' }, { status: 404 })
        }
        const typedCustomer = customer as CustomerRow

        // ═══════════════════════════════════════════════════
        // VALIDACIÓN DE UBICACIÓN (GPS ANTI-FRAUDE)
        // ═══════════════════════════════════════════════════
        const tenantData = getTenantInfo(typedCustomer.tenants)

        if (tenantData?.lat !== null && tenantData?.lat !== undefined && tenantData?.lng !== null && tenantData?.lng !== undefined) {
            // Si el negocio tiene ubicación configurada, exigimos validación
            if (lat === null || lat === undefined || lng === null || lng === undefined) {
                return NextResponse.json({
                    error: '📍 Ubicación requerida. Por seguridad, debes permitir el acceso a tu ubicación para sumar puntos.'
                }, { status: 400 })
            }

            const clientLat = Number(lat)
            const clientLng = Number(lng)
            if (!Number.isFinite(clientLat) || !Number.isFinite(clientLng)) {
                return NextResponse.json({
                    error: '📍 Coordenadas inválidas. Activa tu ubicación y vuelve a intentar.'
                }, { status: 400 })
            }

            const distanciaMetros = calculateDistance(
                clientLat,
                clientLng,
                Number(tenantData.lat),
                Number(tenantData.lng)
            )

            // Umbral de 200 metros (ajustable)
            if (distanciaMetros > 200) {
                return NextResponse.json({
                    error: `📍 Estás demasiado lejos del local (${Math.round(distanciaMetros)}m). Debes estar presencialmente para sumar puntos.`
                }, { status: 403 })
            }
        }

        // Buscar el programa activo del tenant
        const { data: program, error: programError } = await supabase
            .from('programs')
            .select('id, puntos_meta, descripcion_premio, tipo_premio, valor_premio, tipo_programa, config')
            .eq('tenant_id', tenant_id)
            .eq('activo', true)
            .single()

        if (programError || !program) {
            return NextResponse.json({ error: 'No hay programa de lealtad activo' }, { status: 404 })
        }
        const typedProgram = program as ProgramRow

        const tipoPrograma = typedProgram.tipo_programa || 'sellos'
        const config = getMotorConfig(typedProgram.config, tipoPrograma) as ProgramConfig

        // ═══════════════════════════════════════════════════
        // TIPO: SELLOS (comportamiento original)
        // ═══════════════════════════════════════════════════
        if (tipoPrograma === 'sellos') {
            return await handleSellos(supabase, typedCustomer, typedProgram, tenant_id)
        }

        // ═══════════════════════════════════════════════════
        // TIPO: CASHBACK
        // ═══════════════════════════════════════════════════
        if (tipoPrograma === 'cashback') {
            if (!monto_compra || monto_compra <= 0) {
                return NextResponse.json(
                    { error: 'Para cashback necesitas enviar monto_compra' },
                    { status: 400 }
                )
            }
            return await handleCashback(supabase, typedCustomer, typedProgram, tenant_id, monto_compra, config)
        }

        // ═══════════════════════════════════════════════════
        // TIPO: MULTIPASE
        // ═══════════════════════════════════════════════════
        if (tipoPrograma === 'multipase') {
            return await handleMultipase(supabase, typedCustomer, typedProgram, tenant_id)
        }

        // ═══════════════════════════════════════════════════
        // TIPO: DESCUENTO POR NIVELES
        // ═══════════════════════════════════════════════════
        if (tipoPrograma === 'descuento') {
            return await handleDescuentoNiveles(supabase, typedCustomer, typedProgram, tenant_id, config)
        }

        // ═══════════════════════════════════════════════════
        // TIPO: MEMBRESÍA / VIP (solo registra visita)
        // ═══════════════════════════════════════════════════
        if (tipoPrograma === 'membresia') {
            return await handleMembresia(supabase, typedCustomer, typedProgram, tenant_id, config)
        }

        // ═══════════════════════════════════════════════════
        // TIPO: AFILIACIÓN (solo notificaciones, registra visita)
        // ═══════════════════════════════════════════════════
        if (tipoPrograma === 'afiliacion') {
            return await handleAfiliacion(supabase, typedCustomer, tenant_id)
        }

        // ═══════════════════════════════════════════════════
        // TIPO: CUPÓN (descuento un solo uso)
        // ═══════════════════════════════════════════════════
        if (tipoPrograma === 'cupon') {
            return await handleCupon(supabase, typedCustomer, typedProgram, tenant_id, config)
        }

        // ═══════════════════════════════════════════════════
        // TIPO: REGALO / GIFT CARD
        // ═══════════════════════════════════════════════════
        if (tipoPrograma === 'regalo') {
            return await handleRegalo(supabase, typedCustomer, typedProgram, tenant_id, config, monto_compra)
        }

        return NextResponse.json({ error: `Tipo de programa "${tipoPrograma}" no soportado` }, { status: 400 })

    } catch (error) {
        console.error('Error en stamp:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

/**
 * Fórmula de Haversine para calcular distancia en metros entre dos coordenadas
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Radio de la tierra en metros
    const φ1 = lat1 * Math.PI / 180; // φ, λ en radianes
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distancia en metros
}

/**
 * Inserta un stamp de forma segura. Si ya existe uno hoy (constraint UNIQUE),
 * lo ignora silenciosamente para tipos que no necesitan control de duplicados.
 */
function alreadyStampedTodayResponse(tipo: string) {
    return NextResponse.json({
        message: 'Ya registraste una visita hoy. Vuelve mañana para sumar nuevamente.',
        tipo_programa: tipo,
        already_stamped_today: true
    }, { status: 409 })
}

async function safeInsertStamp(supabase: SupabaseAdminClient, customer_id: string, tenant_id: string) {
    const { error } = await supabase.from('stamps').insert({
        customer_id,
        tenant_id,
        fecha: new Date().toISOString().split('T')[0]
    })

    if (error?.code === '23505') {
        return { inserted: false, duplicate: true }
    }

    if (error) {
        console.error('Error insertando stamp:', error)
        return { inserted: false, duplicate: false }
    }

    // Si el stamp fue exitoso, programar solicitud de reseña para 2 horas más tarde
    await scheduleReview(supabase, customer_id, tenant_id)
    return { inserted: true, duplicate: false }
}


/**
 * Programa una solicitud de reseña automática
 */
async function scheduleReview(supabase: SupabaseAdminClient, customer_id: string, tenant_id: string) {
    const scheduledFor = new Date()
    scheduledFor.setHours(scheduledFor.getHours() + 2)

    await supabase.from('pending_reviews').insert({
        customer_id,
        tenant_id,
        scheduled_for: scheduledFor.toISOString(),
        enviado: false
    })
}

async function notifyWallet(params: {
    customer_id: string
    whatsapp?: string | null
    tenant_slug: string | null | undefined
    titulo: string
    mensaje: string
}) {
    if (!params.tenant_slug) return
    await triggerWalletPush({
        customer_id: params.customer_id,
        whatsapp: params.whatsapp || undefined,
        tenant_slug: params.tenant_slug,
        titulo: params.titulo,
        mensaje: params.mensaje
    })
}

// ═══════════════════════════════════════════════════
// HANDLERS POR TIPO
// ═══════════════════════════════════════════════════

async function handleSellos(supabase: SupabaseAdminClient, customer: CustomerRow, program: ProgramRow, tenant_id: string) {
    // Llamar a la RPC atómica para procesar el stamp y el premio en una sola transacción
    const { data, error: rpcError } = await supabase.rpc('process_stamp_and_reward', {
        p_tenant_id: tenant_id,
        p_whatsapp: customer.whatsapp
    })

    if (rpcError) {
        console.error('Error en RPC handleSellos:', rpcError)
        return NextResponse.json({ error: 'Error procesando punto de forma atómica' }, { status: 500 })
    }

    const rpcData = (data || {}) as { points_added?: number; points_actual?: number } & Record<string, unknown>
    const pointsAdded = rpcData.points_added || 0

    if (pointsAdded > 0) {
        await scheduleReview(supabase, customer.id, tenant_id)

        // Gamificación para Sellos
        const { newStreak } = processStreak(customer.last_visit_at, customer.current_streak || 0)
        const nuevasVisitasHistoricas = (customer.total_puntos_historicos || 0) + pointsAdded
        const nuevoTier = calculateTier(nuevasVisitasHistoricas)

        await supabase.from('customers').update({
            total_puntos_historicos: nuevasVisitasHistoricas,
            tier: nuevoTier,
            current_streak: newStreak,
            last_visit_at: new Date().toISOString()
        }).eq('id', customer.id)

        // Wallet Push
        const tenantData = getTenantInfo(customer.tenants)
        await notifyWallet({
            customer_id: customer.id,
            whatsapp: customer.whatsapp,
            tenant_slug: tenantData?.slug,
            titulo: `¡Sello sumado en ${tenantData?.nombre || 'tu negocio'}!`,
            mensaje: `Llevas ${rpcData.points_actual || 0} / ${program.puntos_meta} sellos. ¡Falta poco!`
        })
    }

    // Adaptar respuesta de RPC a lo que el frontend espera
    return NextResponse.json({
        ...rpcData,
        puntos_meta: program.puntos_meta // Asegurar que viaja el meta para la UI
    })
}

async function handleCashback(supabase: SupabaseAdminClient, customer: CustomerRow, program: ProgramRow, tenant_id: string, monto_compra: number, config: ProgramConfig) {
    const porcentaje = config.porcentaje || 5
    const topeMensual = config.tope_mensual || 999999
    let cashbackGanado = Math.round(monto_compra * (porcentaje / 100))

    // Verificar tope mensual
    const { data: membership } = await supabase
        .from('memberships')
        .select('id, saldo_cashback')
        .eq('customer_id', customer.id)
        .eq('tenant_id', tenant_id)
        .eq('program_id', program.id)
        .eq('estado', 'activo')
        .single()

    const saldoActual = membership?.saldo_cashback || 0
    if (saldoActual + cashbackGanado > topeMensual) {
        cashbackGanado = Math.max(0, topeMensual - saldoActual)
    }

    const stamp = await safeInsertStamp(supabase, customer.id, tenant_id)
    if (!stamp.inserted) {
        // Cashback permite múltiples compras al día: si ya existe stamp hoy, continuamos.
        if (stamp.duplicate) {
            console.info('Cashback con stamp duplicado en el día; se procesa igual el abono.')
        } else {
            return NextResponse.json({ error: 'No se pudo registrar la visita' }, { status: 500 })
        }
    }

    // Actualizar o crear membership
    if (membership) {
        await supabase
            .from('memberships')
            .update({ saldo_cashback: saldoActual + cashbackGanado })
            .eq('id', membership.id)
    } else {
        await supabase.from('memberships').insert({
            customer_id: customer.id,
            tenant_id,
            program_id: program.id,
            estado: 'activo',
            saldo_cashback: cashbackGanado
        })
    }

    // Gamificación
    const { newStreak } = processStreak(customer.last_visit_at, customer.current_streak || 0)
    const nuevasVisitasHistoricas = (customer.total_puntos_historicos || 0) + 1
    const nuevoTier = calculateTier(nuevasVisitasHistoricas)

    // Actualizar puntos del cliente
    await supabase
        .from('customers')
        .update({
            puntos_actuales: customer.puntos_actuales + 1,
            total_puntos_historicos: nuevasVisitasHistoricas,
            tier: nuevoTier,
            current_streak: newStreak,
            last_visit_at: new Date().toISOString()
        })
        .eq('id', customer.id)

    // Wallet Push
    const tenantData = getTenantInfo(customer.tenants)
    await notifyWallet({
        customer_id: customer.id,
        whatsapp: customer.whatsapp,
        tenant_slug: tenantData?.slug,
        titulo: `💰 ¡Cashback en ${tenantData?.nombre || 'tu negocio'}!`,
        mensaje: `Ganaste $${cashbackGanado}. Nuevo saldo: $${saldoActual + cashbackGanado}`
    })

    return NextResponse.json({
        message: `💰 ¡Ganaste $${cashbackGanado} de cashback! (${porcentaje}% de $${monto_compra})`,
        tipo_programa: 'cashback',
        cashback_ganado: cashbackGanado,
        saldo_total: saldoActual + cashbackGanado,
        porcentaje,
        monto_compra
    })
}

async function handleMultipase(supabase: SupabaseAdminClient, customer: CustomerRow, program: ProgramRow, tenant_id: string) {
    // Buscar multipase activo
    const { data: membership, error } = await supabase
        .from('memberships')
        .select('id, usos_restantes')
        .eq('customer_id', customer.id)
        .eq('tenant_id', tenant_id)
        .eq('program_id', program.id)
        .eq('estado', 'activo')
        .single()

    if (error || !membership || !membership.usos_restantes || membership.usos_restantes <= 0) {
        return NextResponse.json({
            message: '❌ No tienes un multipase activo o ya usaste todos tus pases',
            tipo_programa: 'multipase',
            usos_restantes: 0,
            necesita_compra: true
        }, { status: 400 })
    }

    const stamp = await safeInsertStamp(supabase, customer.id, tenant_id)
    if (!stamp.inserted) {
        // Multipase puede consumir más de un uso por día.
        if (stamp.duplicate) {
            console.info('Multipase con stamp duplicado en el día; se procesa igual el consumo.')
        } else {
            return NextResponse.json({ error: 'No se pudo registrar la visita' }, { status: 500 })
        }
    }

    const nuevosUsos = membership.usos_restantes - 1

    await supabase
        .from('memberships')
        .update({
            usos_restantes: nuevosUsos,
            estado: nuevosUsos <= 0 ? 'expirado' : 'activo'
        })
        .eq('id', membership.id)

    await supabase
        .from('customers')
        .update({
            puntos_actuales: customer.puntos_actuales + 1,
            total_puntos_historicos: (customer.total_puntos_historicos || 0) + 1
        })
        .eq('id', customer.id)

    // Wallet Push
    const tenantData = getTenantInfo(customer.tenants)
    await notifyWallet({
        customer_id: customer.id,
        whatsapp: customer.whatsapp,
        tenant_slug: tenantData?.slug,
        titulo: `🎟️ Pase usado en ${tenantData?.nombre || 'tu negocio'}`,
        mensaje: nuevosUsos > 0
            ? `Te quedan ${nuevosUsos} usos en tu multipase.`
            : `¡Pack completado! ¡Gracias por tu visita!`
    })

    return NextResponse.json({
        message: nuevosUsos > 0
            ? `🎟️ ¡Pase usado! Te quedan ${nuevosUsos} usos`
            : '🎟️ ¡Último pase usado! Tu pack se ha completado',
        tipo_programa: 'multipase',
        usos_restantes: nuevosUsos,
        pack_completado: nuevosUsos <= 0
    })
}

async function handleDescuentoNiveles(supabase: SupabaseAdminClient, customer: CustomerRow, program: ProgramRow, tenant_id: string, config: ProgramConfig) {
    const niveles = config.niveles || [
        { visitas: 5, descuento: 5 },
        { visitas: 15, descuento: 10 },
        { visitas: 30, descuento: 15 }
    ]

    const stamp = await safeInsertStamp(supabase, customer.id, tenant_id)
    if (!stamp.inserted) {
        if (stamp.duplicate) return alreadyStampedTodayResponse('descuento')
        return NextResponse.json({ error: 'No se pudo registrar la visita' }, { status: 500 })
    }

    const nuevoTotal = (customer.total_puntos_historicos || 0) + 1

    // Gamificación
    const { newStreak } = processStreak(customer.last_visit_at, customer.current_streak || 0)
    const nuevasVisitasHistoricas = nuevoTotal
    const nuevoTier = calculateTier(nuevasVisitasHistoricas)

    await supabase
        .from('customers')
        .update({
            puntos_actuales: customer.puntos_actuales + 1,
            total_puntos_historicos: nuevoTotal,
            tier: nuevoTier,
            current_streak: newStreak,
            last_visit_at: new Date().toISOString()
        })
        .eq('id', customer.id)

    // Calcular nivel actual
    let nivelActual = { visitas: 0, descuento: 0 }
    let nivelSiguiente: { visitas: number; descuento: number } | null = null

    const nivelesOrdenados = niveles.sort((a: NivelConfig, b: NivelConfig) => a.visitas - b.visitas)
    for (let i = 0; i < nivelesOrdenados.length; i++) {
        if (nuevoTotal >= nivelesOrdenados[i].visitas) {
            nivelActual = nivelesOrdenados[i]
            nivelSiguiente = nivelesOrdenados[i + 1] || null
        } else {
            nivelSiguiente = nivelesOrdenados[i]
            break
        }
    }

    const subioDeNivel = nuevoTotal === nivelActual.visitas && nivelActual.descuento > 0

    // Wallet Push
    const tenantData = getTenantInfo(customer.tenants)
    await notifyWallet({
        customer_id: customer.id,
        whatsapp: customer.whatsapp,
        tenant_slug: tenantData?.slug,
        titulo: subioDeNivel ? `🎉 ¡Subiste de nivel en ${tenantData?.nombre || 'tu negocio'}!` : `✅ Visita registrada`,
        mensaje: subioDeNivel
            ? `Ahora tienes ${nivelActual.descuento}% de descuento permanente.`
            : `Llevas ${nuevoTotal} visitas. ¡Faltan ${nivelSiguiente?.visitas ? nivelSiguiente.visitas - nuevoTotal : '?'} para el próximo nivel!`
    })

    return NextResponse.json({
        message: subioDeNivel
            ? `🎉 ¡Subiste de nivel! Ahora tienes ${nivelActual.descuento}% de descuento permanente`
            : `✅ ¡Visita registrada! Tu descuento actual: ${nivelActual.descuento}%`,
        tipo_programa: 'descuento',
        descuento_actual: nivelActual.descuento,
        visitas_totales: nuevoTotal,
        siguiente_nivel: nivelSiguiente ? {
            faltan: nivelSiguiente.visitas - nuevoTotal,
            descuento: nivelSiguiente.descuento
        } : null,
        subio_de_nivel: subioDeNivel
    })
}

async function handleMembresia(
    supabase: SupabaseAdminClient,
    customer: CustomerRow,
    program: ProgramRow,
    tenant_id: string,
    config: ProgramConfig
) {
    // Verificar que tiene membresía activa
    const { data: membership } = await supabase
        .from('memberships')
        .select('id, estado, fecha_fin')
        .eq('customer_id', customer.id)
        .eq('tenant_id', tenant_id)
        .eq('program_id', program.id)
        .eq('estado', 'activo')
        .single()

    if (!membership) {
        return NextResponse.json({
            message: '❌ No tienes una membresía VIP activa',
            tipo_programa: 'membresia',
            tiene_membresia: false
        }, { status: 400 })
    }

    // Verificar si no ha expirado
    if (membership.fecha_fin && new Date(membership.fecha_fin) < new Date()) {
        await supabase
            .from('memberships')
            .update({ estado: 'expirado' })
            .eq('id', membership.id)

        return NextResponse.json({
            message: '⏰ Tu membresía VIP ha expirado. Renuévala para seguir disfrutando los beneficios',
            tipo_programa: 'membresia',
            tiene_membresia: false,
            expirada: true
        }, { status: 400 })
    }

    const stamp = await safeInsertStamp(supabase, customer.id, tenant_id)
    if (!stamp.inserted) {
        if (stamp.duplicate) return alreadyStampedTodayResponse('membresia')
        return NextResponse.json({ error: 'No se pudo registrar la visita' }, { status: 500 })
    }

    // Gamificación
    const { newStreak } = processStreak(customer.last_visit_at, customer.current_streak || 0)
    const nuevasVisitasHistoricas = (customer.total_puntos_historicos || 0) + 1
    const nuevoTier = calculateTier(nuevasVisitasHistoricas)

    await supabase
        .from('customers')
        .update({
            puntos_actuales: customer.puntos_actuales + 1,
            total_puntos_historicos: nuevasVisitasHistoricas,
            tier: nuevoTier,
            current_streak: newStreak,
            last_visit_at: new Date().toISOString()
        })
        .eq('id', customer.id)

    // Wallet Push
    const tenantData = getTenantInfo(customer.tenants)
    await notifyWallet({
        customer_id: customer.id,
        whatsapp: customer.whatsapp,
        tenant_slug: tenantData?.slug,
        titulo: `👑 ¡Bienvenido VIP a ${tenantData?.nombre || 'tu negocio'}!`,
        mensaje: `Tu visita ha sido registrada. ¡Disfruta tus beneficios!`
    })

    const beneficios = config.beneficios || []

    return NextResponse.json({
        message: `👑 ¡Bienvenido VIP! Visita registrada. Disfruta tus beneficios exclusivos`,
        tipo_programa: 'membresia',
        tiene_membresia: true,
        beneficios,
        visitas_totales: (customer.total_puntos_historicos || 0) + 1
    })
}

async function handleAfiliacion(supabase: SupabaseAdminClient, customer: CustomerRow, tenant_id: string) {
    // Solo registrar la visita — afiliación es para recibir notificaciones
    const stamp = await safeInsertStamp(supabase, customer.id, tenant_id)
    if (!stamp.inserted) {
        if (stamp.duplicate) return alreadyStampedTodayResponse('afiliacion')
        return NextResponse.json({ error: 'No se pudo registrar la visita' }, { status: 500 })
    }

    // Gamificación
    const { newStreak } = processStreak(customer.last_visit_at, customer.current_streak || 0)
    const nuevasVisitasHistoricas = (customer.total_puntos_historicos || 0) + 1
    const nuevoTier = calculateTier(nuevasVisitasHistoricas)

    await supabase
        .from('customers')
        .update({
            puntos_actuales: customer.puntos_actuales + 1,
            total_puntos_historicos: nuevasVisitasHistoricas,
            tier: nuevoTier,
            current_streak: newStreak,
            last_visit_at: new Date().toISOString()
        })
        .eq('id', customer.id)

    // Wallet Push
    const tenantData = getTenantInfo(customer.tenants)
    await notifyWallet({
        customer_id: customer.id,
        whatsapp: customer.whatsapp,
        tenant_slug: tenantData?.slug,
        titulo: `✅ Visita registrada en ${tenantData?.nombre || 'tu negocio'}`,
        mensaje: `¡Gracias por visitarnos! Recibirás promos exclusivas por aquí.`
    })

    return NextResponse.json({
        message: '✅ ¡Visita registrada! Te avisaremos de promos y novedades',
        tipo_programa: 'afiliacion',
        visitas_totales: (customer.total_puntos_historicos || 0) + 1
    })
}

async function handleCupon(supabase: SupabaseAdminClient, customer: CustomerRow, program: ProgramRow, tenant_id: string, config: ProgramConfig) {
    const descuentoPorcentaje = config.descuento_porcentaje || 15
    const validoHasta = config.valido_hasta || null

    // Verificar vigencia
    if (validoHasta && new Date(validoHasta) < new Date()) {
        return NextResponse.json({
            message: '⏰ Este cupón ha expirado',
            tipo_programa: 'cupon',
            expirado: true
        }, { status: 400 })
    }

    // Verificar si ya usó el cupón
    const { data: membership } = await supabase
        .from('memberships')
        .select('id, estado')
        .eq('customer_id', customer.id)
        .eq('tenant_id', tenant_id)
        .eq('program_id', program.id)
        .single()

    if (membership && membership.estado === 'usado') {
        return NextResponse.json({
            message: '❌ Ya usaste este cupón',
            tipo_programa: 'cupon',
            ya_usado: true
        })
    }

    const stamp = await safeInsertStamp(supabase, customer.id, tenant_id)
    if (!stamp.inserted) {
        if (stamp.duplicate) return alreadyStampedTodayResponse('cupon')
        return NextResponse.json({ error: 'No se pudo registrar la visita' }, { status: 500 })
    }

    // Generar QR de cupón único
    const cuponQR = `CUPON-${uuidv4().slice(0, 8).toUpperCase()}`

    const { data: reward } = await supabase
        .from('rewards')
        .insert({
            customer_id: customer.id,
            tenant_id,
            program_id: program.id,
            qr_code: cuponQR,
            descripcion: `${descuentoPorcentaje}% de descuento`
        })
        .select()
        .single()

    // Wallet Push
    const tenantData = getTenantInfo(customer.tenants)
    await notifyWallet({
        customer_id: customer.id,
        whatsapp: customer.whatsapp,
        tenant_slug: tenantData?.slug,
        titulo: `🎫 ¡Cupón generado en ${tenantData?.nombre || 'tu negocio'}!`,
        mensaje: `Tienes un ${descuentoPorcentaje}% de descuento listo para usar.`
    })

    // Marcar como usado en memberships
    if (membership) {
        await supabase.from('memberships').update({ estado: 'usado' }).eq('id', membership.id)
    } else {
        await supabase.from('memberships').insert({
            customer_id: customer.id,
            tenant_id,
            program_id: program.id,
            estado: 'usado'
        })
    }

    return NextResponse.json({
        message: `🎫 ¡Cupón de ${descuentoPorcentaje}% generado! Muestra el QR en caja`,
        tipo_programa: 'cupon',
        descuento: descuentoPorcentaje,
        cupon: reward ? { qr_code: reward.qr_code, descripcion: reward.descripcion } : null
    })
}

async function handleRegalo(supabase: SupabaseAdminClient, customer: CustomerRow, program: ProgramRow, tenant_id: string, _config: ProgramConfig, monto_compra?: number) {
    if (!monto_compra || monto_compra <= 0) {
        return NextResponse.json(
            { error: 'Para descontar de la Gift Card necesitas ingresar el monto en el cajero' },
            { status: 400 }
        )
    }

    // Verificar si ya tiene gift card activa
    const { data: membership } = await supabase
        .from('memberships')
        .select('id, saldo_cashback, estado')
        .eq('customer_id', customer.id)
        .eq('tenant_id', tenant_id)
        .eq('program_id', program.id)
        .eq('estado', 'activo')
        .single()

    if (!membership || membership.saldo_cashback <= 0) {
        return NextResponse.json({
            message: '❌ No tienes una gift card activa o tu saldo es $0',
            tipo_programa: 'regalo',
            tiene_giftcard: false,
            saldo: 0
        }, { status: 400 })
    }

    if (monto_compra > membership.saldo_cashback) {
        return NextResponse.json({
            error: `❌ Saldo insuficiente en la Gift Card. Saldo actual: $${membership.saldo_cashback}`,
            tipo_programa: 'regalo'
        }, { status: 400 })
    }

    const stamp = await safeInsertStamp(supabase, customer.id, tenant_id)
    if (!stamp.inserted) {
        // Gift Card puede tener múltiples consumos por día.
        if (stamp.duplicate) {
            console.info('Gift Card con stamp duplicado en el día; se procesa igual el consumo.')
        } else {
            return NextResponse.json({ error: 'No se pudo registrar la visita' }, { status: 500 })
        }
    }

    const nuevoSaldo = membership.saldo_cashback - monto_compra

    // APLICAR DEDUCCIÓN EN BASE DE DATOS
    await supabase.from('memberships').update({
        saldo_cashback: nuevoSaldo,
        estado: nuevoSaldo <= 0 ? 'usado' : 'activo'
    }).eq('id', membership.id)

    // Wallet Push
    const tenantData = getTenantInfo(customer.tenants)
    await notifyWallet({
        customer_id: customer.id,
        whatsapp: customer.whatsapp,
        tenant_slug: tenantData?.slug,
        titulo: `🎁 Consumo de Gift Card en ${tenantData?.nombre || 'tu negocio'}`,
        mensaje: `Descuento: -$${monto_compra}. Tu nuevo saldo es: $${nuevoSaldo}.`
    })

    return NextResponse.json({
        message: `🎁 ¡$${monto_compra} descontados con éxito! Nuevo saldo: $${nuevoSaldo}`,
        tipo_programa: 'regalo',
        tiene_giftcard: true,
        saldo: nuevoSaldo,
        consumido: monto_compra
    })
}

