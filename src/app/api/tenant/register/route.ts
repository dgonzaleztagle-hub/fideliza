import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isProgramType } from '@/lib/programTypes'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { normalizeBrandColor } from '@/lib/brandColor'

function toOptionalNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null
    if (typeof value === 'string' && value.trim() === '') return null
    const n = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(n) ? n : null
}

// POST /api/tenant/register
// Registrar un nuevo negocio
export async function POST(req: NextRequest) {
    try {
        const ip = getClientIp(req.headers)
        const ipRate = checkRateLimit(`tenant_register:ip:${ip}`, 8, 60 * 60 * 1000)
        if (!ipRate.allowed) {
            return NextResponse.json(
                { error: 'Demasiados intentos de registro. Intenta más tarde.' },
                { status: 429, headers: { 'Retry-After': String(ipRate.retryAfterSec) } }
            )
        }

        const supabase = getSupabase()
        const body = await req.json()
        const {
            nombre,
            rubro,
            direccion,
            email,
            password,
            telefono,
            lat,
            lng,
            logo_url,
            color_primario,
            mensaje_geofencing,
            // Datos del programa
            puntos_meta,
            descripcion_premio,
            tipo_premio,
            valor_premio,
            tipo_programa,
            config
        } = body

        const normalizedProgramType = typeof tipo_programa === 'string'
            ? tipo_programa.trim().toLowerCase()
            : 'sellos'

        if (!isProgramType(normalizedProgramType)) {
            return NextResponse.json(
                { error: `Tipo de programa inválido: ${tipo_programa}` },
                { status: 400 }
            )
        }

        const supabaseServer = await createClient()
        const { data: { user: currentUser } } = await supabaseServer.auth.getUser()

        const normalizedName = typeof nombre === 'string' ? nombre.trim() : ''
        const normalizedEmail = String(currentUser?.email || email || '').trim().toLowerCase()
        const passwordValue = typeof password === 'string' ? password : ''
        const normalizedPhone = typeof telefono === 'string' ? telefono.trim() : ''
        const normalizedAddress = typeof direccion === 'string' ? direccion.trim() : ''
        const normalizedGeoMessage = typeof mensaje_geofencing === 'string'
            ? mensaje_geofencing.trim()
            : ''
        const normalizedLogoUrl = typeof logo_url === 'string' ? logo_url.trim() : ''
        const parsedLat = toOptionalNumber(lat)
        const parsedLng = toOptionalNumber(lng)

        if (!normalizedName) {
            return NextResponse.json(
                { error: 'El nombre del negocio es obligatorio' },
                { status: 400 }
            )
        }

        if (normalizedName.length < 3) {
            return NextResponse.json(
                { error: 'El nombre del negocio debe tener al menos 3 caracteres' },
                { status: 400 }
            )
        }

        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
        if (!isValidEmail) {
            return NextResponse.json(
                { error: 'Debes ingresar un email válido' },
                { status: 400 }
            )
        }
        if (normalizedName.length > 120) {
            return NextResponse.json(
                { error: 'El nombre del negocio no puede exceder 120 caracteres' },
                { status: 400 }
            )
        }
        if (normalizedPhone.length > 30) {
            return NextResponse.json(
                { error: 'El teléfono no puede exceder 30 caracteres' },
                { status: 400 }
            )
        }
        if (normalizedGeoMessage.length > 180) {
            return NextResponse.json(
                { error: 'El mensaje de geofencing no puede exceder 180 caracteres' },
                { status: 400 }
            )
        }
        if ((parsedLat === null) !== (parsedLng === null)) {
            return NextResponse.json(
                { error: 'Debes enviar latitud y longitud juntas, o ninguna.' },
                { status: 400 }
            )
        }
        if (parsedLat !== null && (parsedLat < -90 || parsedLat > 90)) {
            return NextResponse.json(
                { error: 'La latitud es inválida' },
                { status: 400 }
            )
        }
        if (parsedLng !== null && (parsedLng < -180 || parsedLng > 180)) {
            return NextResponse.json(
                { error: 'La longitud es inválida' },
                { status: 400 }
            )
        }
        if (normalizedLogoUrl) {
            try {
                new URL(normalizedLogoUrl)
            } catch {
                return NextResponse.json(
                    { error: 'El logo_url no es una URL válida' },
                    { status: 400 }
                )
            }
        }

        const rawConfig = (config && typeof config === 'object' && !Array.isArray(config))
            ? (config as Record<string, unknown>)
            : {}
        const normalizedConfig: Record<string, unknown> = { ...rawConfig }
        const rawPuntosMeta = toOptionalNumber(puntos_meta)
        const normalizedPuntosMeta = Number.isInteger(rawPuntosMeta) && rawPuntosMeta !== null && rawPuntosMeta > 0
            ? rawPuntosMeta
            : 10

        if (normalizedProgramType === 'cashback') {
            const porcentaje = toOptionalNumber(rawConfig.porcentaje)
            const topeMensual = toOptionalNumber(rawConfig.tope_mensual)
            if (porcentaje !== null && (porcentaje <= 0 || porcentaje > 100)) {
                return NextResponse.json({ error: 'El porcentaje de cashback debe estar entre 1 y 100' }, { status: 400 })
            }
            if (topeMensual !== null && topeMensual < 0) {
                return NextResponse.json({ error: 'El tope mensual no puede ser negativo' }, { status: 400 })
            }
            if (porcentaje !== null) normalizedConfig.porcentaje = porcentaje
            if (topeMensual !== null) normalizedConfig.tope_mensual = topeMensual
        }

        if (normalizedProgramType === 'multipase') {
            const cantidadUsos = toOptionalNumber(rawConfig.cantidad_usos)
            const precioPack = toOptionalNumber(rawConfig.precio_pack)
            if (cantidadUsos !== null && (!Number.isInteger(cantidadUsos) || cantidadUsos <= 0)) {
                return NextResponse.json({ error: 'La cantidad de usos debe ser un entero mayor a 0' }, { status: 400 })
            }
            if (precioPack !== null && precioPack < 0) {
                return NextResponse.json({ error: 'El precio del pack no puede ser negativo' }, { status: 400 })
            }
            if (cantidadUsos !== null) normalizedConfig.cantidad_usos = cantidadUsos
            if (precioPack !== null) normalizedConfig.precio_pack = precioPack
        }

        if (normalizedProgramType === 'membresia') {
            const precioMensual = toOptionalNumber(rawConfig.precio_mensual)
            if (precioMensual !== null && precioMensual < 0) {
                return NextResponse.json({ error: 'El precio mensual no puede ser negativo' }, { status: 400 })
            }
            if (precioMensual !== null) normalizedConfig.precio_mensual = precioMensual
        }

        if (normalizedProgramType === 'descuento') {
            const niveles = rawConfig.niveles
            if (niveles !== undefined) {
                if (!Array.isArray(niveles)) {
                    return NextResponse.json({ error: 'Los niveles deben ser una lista válida' }, { status: 400 })
                }
                const isValidNivel = niveles.every((nivel) => {
                    if (!nivel || typeof nivel !== 'object') return false
                    const visitas = toOptionalNumber((nivel as Record<string, unknown>).visitas)
                    const descuento = toOptionalNumber((nivel as Record<string, unknown>).descuento)
                    return visitas !== null
                        && descuento !== null
                        && Number.isInteger(visitas)
                        && visitas > 0
                        && descuento >= 0
                        && descuento <= 100
                })
                if (!isValidNivel) {
                    return NextResponse.json(
                        { error: 'Cada nivel debe incluir visitas (entero > 0) y descuento (0-100)' },
                        { status: 400 }
                    )
                }
            }
        }

        if (normalizedProgramType === 'cupon') {
            const descuentoPorcentaje = toOptionalNumber(rawConfig.descuento_porcentaje)
            if (descuentoPorcentaje !== null && (descuentoPorcentaje <= 0 || descuentoPorcentaje > 100)) {
                return NextResponse.json({ error: 'El cupón debe tener descuento entre 1 y 100' }, { status: 400 })
            }
            if (descuentoPorcentaje !== null) normalizedConfig.descuento_porcentaje = descuentoPorcentaje
        }

        if (normalizedProgramType === 'regalo') {
            const valorMaximo = toOptionalNumber(rawConfig.valor_maximo)
            if (valorMaximo !== null && valorMaximo < 0) {
                return NextResponse.json({ error: 'El valor de la gift card no puede ser negativo' }, { status: 400 })
            }
            if (valorMaximo !== null) normalizedConfig.valor_maximo = valorMaximo
        }

        if (!currentUser) {
            if (!normalizedName || !normalizedEmail || !passwordValue) {
                return NextResponse.json(
                    { error: 'Faltan campos requeridos: nombre, email, password' },
                    { status: 400 }
                )
            }
            if (passwordValue.length < 8) {
                return NextResponse.json(
                    { error: 'La contraseña debe tener al menos 8 caracteres' },
                    { status: 400 }
                )
            }
        } else {
            if (!normalizedName || !normalizedEmail) {
                return NextResponse.json(
                    { error: 'Faltan campos requeridos: nombre, email' },
                    { status: 400 }
                )
            }
        }

        const emailRate = checkRateLimit(`tenant_register:email:${normalizedEmail}`, 3, 60 * 60 * 1000)
        if (!emailRate.allowed) {
            return NextResponse.json(
                { error: 'Demasiados intentos para este correo. Intenta más tarde.' },
                { status: 429, headers: { 'Retry-After': String(emailRate.retryAfterSec) } }
            )
        }

        // Generar slug único
        const baseSlug = normalizedName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            || `negocio-${Date.now()}`

        // Verificar que el slug no exista
        let slug = baseSlug
        let attempt = 0
        while (attempt < 50) {
            const { data: existing } = await supabase
                .from('tenants')
                .select('id')
                .eq('slug', slug)
                .maybeSingle()

            if (!existing) break
            attempt++
            slug = `${baseSlug}-${attempt}`
        }
        if (attempt >= 50) {
            return NextResponse.json({ error: 'No se pudo generar un slug único para tu negocio' }, { status: 500 })
        }

        // Calcular fecha de trial (14 días)
        const trialHasta = new Date()
        trialHasta.setDate(trialHasta.getDate() + 14)

        let authUserId: string | null = null
        let authUserCreatedByThisRequest = false

        if (currentUser) {
            // Ya viene con sesión autenticada
            authUserId = currentUser.id
        } else {
            // 1. Crear el usuario en Supabase Auth manualmente
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: normalizedEmail,
                password: passwordValue,
                email_confirm: true, // Para asegurar que no queden varados
                user_metadata: {
                    nombre_negocio: normalizedName
                }
            })

            if (authError) {
                console.error('Error creando usuario Auth:', authError)
                let msg = 'Error al crear la cuenta'
                if (authError.message.includes('already registered')) msg = 'El email ya está registrado. Intenta iniciar sesión.'
                return NextResponse.json({ error: msg }, { status: 400 })
            }
            authUserId = authData.user.id
            authUserCreatedByThisRequest = true
        }

        // 2. Crear el tenant

        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .insert({
                auth_user_id: authUserId,
                nombre: normalizedName,
                rubro: rubro || null,
                direccion: normalizedAddress || null,
                email: normalizedEmail,
                telefono: normalizedPhone || null,
                lat: parsedLat ?? null,
                lng: parsedLng ?? null,
                logo_url: normalizedLogoUrl || null,
                color_primario: normalizeBrandColor(color_primario),
                mensaje_geofencing: normalizedGeoMessage || '¡Estás cerca! Pasa a sumar puntos 🎉',
                slug,
                plan: 'trial',
                trial_hasta: trialHasta.toISOString(),
                estado: 'activo'
            })
            .select()
            .single()

        if (tenantError) {
            console.error('Error creando tenant:', tenantError)
            if (authUserCreatedByThisRequest && authUserId) {
                await supabase.auth.admin.deleteUser(authUserId)
            }
            if (tenantError.code === '23505') {
                return NextResponse.json({ error: 'Ya existe un negocio con ese email' }, { status: 409 })
            }
            return NextResponse.json({ error: 'Error al crear negocio' }, { status: 500 })
        }

        // Crear el programa de lealtad
        const { data: program, error: programError } = await supabase
            .from('programs')
            .insert({
                tenant_id: tenant.id,
                nombre: `Programa de ${normalizedName}`,
                puntos_meta: normalizedPuntosMeta,
                descripcion_premio: descripcion_premio || 'Premio por tu lealtad',
                tipo_premio: tipo_premio || 'descuento',
                valor_premio: valor_premio || null,
                tipo_programa: normalizedProgramType,
                config: normalizedConfig,
                activo: true
            })
            .select()
            .single()

        if (programError) {
            console.error('Error creando programa:', programError)
            await supabase.from('tenants').delete().eq('id', tenant.id)
            if (authUserCreatedByThisRequest && authUserId) {
                await supabase.auth.admin.deleteUser(authUserId)
            }

            if (programError.code === '23514') {
                return NextResponse.json({
                    error: 'La base de datos no acepta este tipo de programa todavía. Aplica la migración de tipos y reintenta.'
                }, { status: 500 })
            }

            return NextResponse.json({ error: 'Error al crear programa de lealtad' }, { status: 500 })
        }

        // Generar URL del QR (apunta a la página de escaneo)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL
            || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
            || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
        const qrUrl = `${baseUrl}/qr/${slug}`

        // Guardar QR URL en el tenant
        await supabase
            .from('tenants')
            .update({ qr_code: qrUrl })
            .eq('id', tenant.id)

        return NextResponse.json({
            message: '¡Negocio registrado exitosamente!',
            tenant: { ...tenant, qr_code: qrUrl },
            program,
            qr_url: qrUrl,
            trial_hasta: trialHasta.toISOString()
        }, { status: 201 })

    } catch (error) {
        console.error('Error en registro de tenant:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
