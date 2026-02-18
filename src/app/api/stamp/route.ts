import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { v4 as uuidv4 } from 'uuid'

// POST /api/stamp
// Motor universal: suma punto, registra cashback, consume multipase, calcula descuento, etc.
// El comportamiento depende de program.tipo_programa
export async function POST(req: NextRequest) {
    const supabase = getSupabase()
    try {
        const body = await req.json()
        const { tenant_id, whatsapp, monto_compra } = body

        if (!tenant_id || !whatsapp) {
            return NextResponse.json(
                { error: 'Faltan campos: tenant_id, whatsapp' },
                { status: 400 }
            )
        }

        // Buscar al cliente
        const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('id, nombre, puntos_actuales, total_puntos_historicos, total_premios_canjeados')
            .eq('tenant_id', tenant_id)
            .eq('whatsapp', whatsapp)
            .single()

        if (customerError || !customer) {
            return NextResponse.json({ error: 'Cliente no encontrado. ¿Ya te registraste?' }, { status: 404 })
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

        const tipoPrograma = program.tipo_programa || 'sellos'
        const config = program.config || {}

        // ═══════════════════════════════════════════════════
        // TIPO: SELLOS (comportamiento original)
        // ═══════════════════════════════════════════════════
        if (tipoPrograma === 'sellos') {
            return await handleSellos(supabase, customer, program, tenant_id)
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
            return await handleCashback(supabase, customer, program, tenant_id, monto_compra, config)
        }

        // ═══════════════════════════════════════════════════
        // TIPO: MULTIPASE
        // ═══════════════════════════════════════════════════
        if (tipoPrograma === 'multipase') {
            return await handleMultipase(supabase, customer, program, tenant_id)
        }

        // ═══════════════════════════════════════════════════
        // TIPO: DESCUENTO POR NIVELES
        // ═══════════════════════════════════════════════════
        if (tipoPrograma === 'descuento') {
            return await handleDescuentoNiveles(supabase, customer, program, tenant_id, config)
        }

        // ═══════════════════════════════════════════════════
        // TIPO: MEMBRESÍA / VIP (solo registra visita)
        // ═══════════════════════════════════════════════════
        if (tipoPrograma === 'membresia') {
            return await handleMembresia(supabase, customer, program, tenant_id)
        }

        // ═══════════════════════════════════════════════════
        // TIPO: AFILIACIÓN (solo notificaciones, registra visita)
        // ═══════════════════════════════════════════════════
        if (tipoPrograma === 'afiliacion') {
            return await handleAfiliacion(supabase, customer, tenant_id)
        }

        // ═══════════════════════════════════════════════════
        // TIPO: CUPÓN (descuento un solo uso)
        // ═══════════════════════════════════════════════════
        if (tipoPrograma === 'cupon') {
            return await handleCupon(supabase, customer, program, tenant_id, config)
        }

        // ═══════════════════════════════════════════════════
        // TIPO: REGALO / GIFT CARD
        // ═══════════════════════════════════════════════════
        if (tipoPrograma === 'regalo') {
            return await handleRegalo(supabase, customer, program, tenant_id, config)
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
 * Inserta un stamp de forma segura. Si ya existe uno hoy (constraint UNIQUE),
 * lo ignora silenciosamente para tipos que no necesitan control de duplicados.
 */
async function safeInsertStamp(supabase: any, customer_id: string, tenant_id: string) {
    const { error } = await supabase.from('stamps').insert({
        customer_id,
        tenant_id,
        fecha: new Date().toISOString().split('T')[0]
    })
    // Ignorar duplicado (23505 = unique_violation)
    if (error && error.code !== '23505') {
        console.error('Error insertando stamp:', error)
    }
}

// ═══════════════════════════════════════════════════
// HANDLERS POR TIPO
// ═══════════════════════════════════════════════════

async function handleSellos(supabase: any, customer: any, program: any, tenant_id: string) {
    // Intentar insertar el stamp (la constraint UNIQUE evita duplicados del mismo día)
    const { error: stampError } = await supabase
        .from('stamps')
        .insert({
            customer_id: customer.id,
            tenant_id,
            fecha: new Date().toISOString().split('T')[0]
        })

    if (stampError) {
        if (stampError.code === '23505') {
            return NextResponse.json({
                message: '¡Ya sumaste tu punto hoy! Vuelve mañana 😊',
                puntos_actuales: customer.puntos_actuales,
                puntos_meta: program.puntos_meta,
                tipo_programa: 'sellos',
                alreadyStamped: true
            })
        }
        console.error('Error insertando stamp:', stampError)
        return NextResponse.json({ error: 'Error sumando punto' }, { status: 500 })
    }

    const nuevosPuntos = customer.puntos_actuales + 1
    const nuevoTotal = (customer.total_puntos_historicos || 0) + 1
    const llegoAMeta = nuevosPuntos >= program.puntos_meta
    let reward = null

    if (llegoAMeta) {
        const rewardQR = `PREMIO-${uuidv4().slice(0, 8).toUpperCase()}`
        const { data: newReward, error: rewardError } = await supabase
            .from('rewards')
            .insert({
                customer_id: customer.id,
                tenant_id,
                program_id: program.id,
                qr_code: rewardQR,
                descripcion: program.descripcion_premio
            })
            .select()
            .single()

        if (!rewardError) reward = newReward

        await supabase
            .from('customers')
            .update({
                puntos_actuales: 0,
                total_puntos_historicos: nuevoTotal,
                total_premios_canjeados: (customer.total_premios_canjeados || 0)
            })
            .eq('id', customer.id)
    } else {
        await supabase
            .from('customers')
            .update({
                puntos_actuales: nuevosPuntos,
                total_puntos_historicos: nuevoTotal
            })
            .eq('id', customer.id)
    }

    return NextResponse.json({
        message: llegoAMeta
            ? `🎉 ¡Felicidades! Llegaste a ${program.puntos_meta} puntos. ${program.descripcion_premio}`
            : `✅ ¡Punto sumado! Llevas ${nuevosPuntos}/${program.puntos_meta}`,
        puntos_actuales: llegoAMeta ? 0 : nuevosPuntos,
        puntos_meta: program.puntos_meta,
        tipo_programa: 'sellos',
        llegoAMeta,
        reward: reward ? { qr_code: reward.qr_code, descripcion: reward.descripcion } : null
    })
}

async function handleCashback(supabase: any, customer: any, program: any, tenant_id: string, monto_compra: number, config: any) {
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

    // Registrar stamp (cashback permite múltiples por día, no usamos safeInsert)
    await safeInsertStamp(supabase, customer.id, tenant_id)

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

    // Actualizar puntos del cliente
    await supabase
        .from('customers')
        .update({
            puntos_actuales: customer.puntos_actuales + 1,
            total_puntos_historicos: (customer.total_puntos_historicos || 0) + 1
        })
        .eq('id', customer.id)

    return NextResponse.json({
        message: `💰 ¡Ganaste $${cashbackGanado} de cashback! (${porcentaje}% de $${monto_compra})`,
        tipo_programa: 'cashback',
        cashback_ganado: cashbackGanado,
        saldo_total: saldoActual + cashbackGanado,
        porcentaje,
        monto_compra
    })
}

async function handleMultipase(supabase: any, customer: any, program: any, tenant_id: string) {
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

    const nuevosUsos = membership.usos_restantes - 1

    await supabase
        .from('memberships')
        .update({
            usos_restantes: nuevosUsos,
            estado: nuevosUsos <= 0 ? 'expirado' : 'activo'
        })
        .eq('id', membership.id)

    // Registrar stamp
    await safeInsertStamp(supabase, customer.id, tenant_id)

    await supabase
        .from('customers')
        .update({
            puntos_actuales: customer.puntos_actuales + 1,
            total_puntos_historicos: (customer.total_puntos_historicos || 0) + 1
        })
        .eq('id', customer.id)

    return NextResponse.json({
        message: nuevosUsos > 0
            ? `🎟️ ¡Pase usado! Te quedan ${nuevosUsos} usos`
            : '🎟️ ¡Último pase usado! Tu pack se ha completado',
        tipo_programa: 'multipase',
        usos_restantes: nuevosUsos,
        pack_completado: nuevosUsos <= 0
    })
}

async function handleDescuentoNiveles(supabase: any, customer: any, program: any, tenant_id: string, config: any) {
    const niveles = config.niveles || [
        { visitas: 5, descuento: 5 },
        { visitas: 15, descuento: 10 },
        { visitas: 30, descuento: 15 }
    ]

    // Registrar stamp
    await supabase.from('stamps').insert({
        customer_id: customer.id,
        tenant_id,
        fecha: new Date().toISOString().split('T')[0]
    })

    const nuevoTotal = (customer.total_puntos_historicos || 0) + 1

    await supabase
        .from('customers')
        .update({
            puntos_actuales: customer.puntos_actuales + 1,
            total_puntos_historicos: nuevoTotal
        })
        .eq('id', customer.id)

    // Calcular nivel actual
    let nivelActual = { visitas: 0, descuento: 0 }
    let nivelSiguiente: { visitas: number; descuento: number } | null = null

    const nivelesOrdenados = niveles.sort((a: any, b: any) => a.visitas - b.visitas)
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

async function handleMembresia(supabase: any, customer: any, program: any, tenant_id: string) {
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

    // Registrar visita
    await safeInsertStamp(supabase, customer.id, tenant_id)

    await supabase
        .from('customers')
        .update({
            puntos_actuales: customer.puntos_actuales + 1,
            total_puntos_historicos: (customer.total_puntos_historicos || 0) + 1
        })
        .eq('id', customer.id)

    const beneficios = program.config?.beneficios || []

    return NextResponse.json({
        message: `👑 ¡Bienvenido VIP! Visita registrada. Disfruta tus beneficios exclusivos`,
        tipo_programa: 'membresia',
        tiene_membresia: true,
        beneficios,
        visitas_totales: (customer.total_puntos_historicos || 0) + 1
    })
}

async function handleAfiliacion(supabase: any, customer: any, tenant_id: string) {
    // Solo registrar la visita — afiliación es para recibir notificaciones
    await safeInsertStamp(supabase, customer.id, tenant_id)

    await supabase
        .from('customers')
        .update({
            puntos_actuales: customer.puntos_actuales + 1,
            total_puntos_historicos: (customer.total_puntos_historicos || 0) + 1
        })
        .eq('id', customer.id)

    return NextResponse.json({
        message: '✅ ¡Visita registrada! Te avisaremos de promos y novedades',
        tipo_programa: 'afiliacion',
        visitas_totales: (customer.total_puntos_historicos || 0) + 1
    })
}

async function handleCupon(supabase: any, customer: any, program: any, tenant_id: string, config: any) {
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

    // Registrar stamp
    await safeInsertStamp(supabase, customer.id, tenant_id)

    return NextResponse.json({
        message: `🎫 ¡Cupón de ${descuentoPorcentaje}% generado! Muestra el QR en caja`,
        tipo_programa: 'cupon',
        descuento: descuentoPorcentaje,
        cupon: reward ? { qr_code: reward.qr_code, descripcion: reward.descripcion } : null
    })
}

async function handleRegalo(supabase: any, customer: any, program: any, tenant_id: string, config: any) {
    const valorMaximo = config.valor_maximo || 25000

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

    // Registrar uso
    await safeInsertStamp(supabase, customer.id, tenant_id)

    return NextResponse.json({
        message: `🎁 Tu Gift Card tiene $${membership.saldo_cashback} disponibles. Muestra este código en caja`,
        tipo_programa: 'regalo',
        tiene_giftcard: true,
        saldo: membership.saldo_cashback,
        valor_maximo: valorMaximo
    })
}
