import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isProgramType } from '@/lib/programTypes'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { normalizeBrandColor } from '@/lib/brandColor'
import { BillingPlan, isBillingPlan, normalizeProgramChoices } from '@/lib/plans'

function toOptionalNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null
    if (typeof value === 'string' && value.trim() === '') return null
    const n = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(n) ? n : null
}

function looksLikeMissingTenantPlanColumns(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false
    const err = error as { code?: string; message?: string; details?: string; hint?: string }
    const haystack = `${err.message || ''} ${err.details || ''} ${err.hint || ''}`.toLowerCase()
    return err.code === '42703'
        || haystack.includes('selected_plan')
        || haystack.includes('selected_program_types')
        || haystack.includes('card_background_url')
        || haystack.includes('card_background_overlay')
        || haystack.includes('stamp_icon_url')
}

// POST /api/tenant/register
// Registrar un nuevo negocio
export async function POST(req: NextRequest) {
    const clientRequestId = req.headers.get('x-client-request-id')?.trim() || null

    const errorResponse = (status: number, message: string, code: string, extra?: Record<string, unknown>) =>
        NextResponse.json(
            {
                error: message,
                error_code: code,
                request_id: clientRequestId || undefined,
                ...(extra || {})
            },
            { status }
        )

    try {
        const ip = getClientIp(req.headers)
        const ipRate = checkRateLimit(`tenant_register:ip:${ip}`, 8, 60 * 60 * 1000)
        if (!ipRate.allowed) {
            const res = errorResponse(429, 'Demasiados intentos de registro. Intenta más tarde.', 'TENANT_REGISTER_RATE_LIMIT_IP')
            res.headers.set('Retry-After', String(ipRate.retryAfterSec))
            return res
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
            card_background_url,
            card_background_overlay,
            stamp_icon_url,
            color_primario,
            mensaje_geofencing,
            // Datos del programa
            puntos_meta,
            descripcion_premio,
            tipo_premio,
            valor_premio,
            tipo_programa,
            config,
            selected_plan,
            selected_program_types
        } = body

        const normalizedSelectedPlan: BillingPlan = isBillingPlan(selected_plan) ? selected_plan : 'pyme'
        const normalizedSelectedProgramTypes = normalizeProgramChoices(selected_program_types, normalizedSelectedPlan)

        const incomingProgramType = typeof tipo_programa === 'string'
            ? tipo_programa.trim().toLowerCase()
            : 'sellos'
        const normalizedProgramType = normalizedSelectedProgramTypes.includes(incomingProgramType as typeof normalizedSelectedProgramTypes[number])
            ? incomingProgramType
            : normalizedSelectedProgramTypes[0]

        if (!isProgramType(normalizedProgramType)) {
            return errorResponse(400, `Tipo de programa inválido: ${tipo_programa}`, 'TENANT_REGISTER_PROGRAM_TYPE_INVALID')
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
        const normalizedCardBackgroundUrl = typeof card_background_url === 'string' ? card_background_url.trim() : ''
        const rawCardBackgroundOverlay = toOptionalNumber(card_background_overlay)
        const normalizedCardBackgroundOverlay = rawCardBackgroundOverlay === null
            ? 0.22
            : Math.max(0, Math.min(0.8, rawCardBackgroundOverlay))
        const normalizedStampIconUrl = typeof stamp_icon_url === 'string' ? stamp_icon_url.trim() : ''
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
        if (normalizedCardBackgroundUrl) {
            try {
                new URL(normalizedCardBackgroundUrl)
            } catch {
                return NextResponse.json(
                    { error: 'El card_background_url no es una URL válida' },
                    { status: 400 }
                )
            }
        }
        if (normalizedStampIconUrl) {
            try {
                new URL(normalizedStampIconUrl)
            } catch {
                return NextResponse.json(
                    { error: 'El stamp_icon_url no es una URL válida' },
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
            const res = errorResponse(429, 'Demasiados intentos para este correo. Intenta más tarde.', 'TENANT_REGISTER_RATE_LIMIT_EMAIL')
            res.headers.set('Retry-After', String(emailRate.retryAfterSec))
            return res
        }

        // Generar slug único
        const baseSlug = normalizedName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            || `negocio-${Date.now()}`

        // Verificar slug en modo estricto (sin autogenerar -1, -2, etc.)
        const { data: existingSlug, error: slugCheckError } = await supabase
            .from('tenants')
            .select('id')
            .eq('slug', baseSlug)
            .maybeSingle()

        if (slugCheckError) {
            return errorResponse(500, 'Error al validar el nombre del negocio', 'TENANT_REGISTER_SLUG_CHECK_FAILED')
        }
        if (existingSlug) {
            return errorResponse(
                409,
                'Nombre de negocio ya registrado. Usa otro nombre para continuar.',
                'TENANT_REGISTER_SLUG_ALREADY_EXISTS'
            )
        }

        const slug = baseSlug

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
                const authErrorAny = authError as {
                    status?: number | string
                    code?: number | string
                    name?: string
                    message?: string
                    error_description?: string
                    details?: string
                    hint?: string
                }

                const authStatusRaw = authErrorAny.status ?? authErrorAny.code
                const authStatus =
                    typeof authStatusRaw === 'number'
                        ? authStatusRaw
                        : Number.isFinite(Number(authStatusRaw))
                            ? Number(authStatusRaw)
                            : null

                const rawMessageCandidates = [
                    authErrorAny.message,
                    authErrorAny.error_description,
                    authErrorAny.details,
                    authErrorAny.hint,
                    authErrorAny.name
                ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)

                const rawMessage = rawMessageCandidates.join(' | ') || 'unknown'
                const normalizedMessage = rawMessage.toLowerCase()

                const looksLikeDuplicateEmail =
                    normalizedMessage.includes('already registered') ||
                    normalizedMessage.includes('already exists') ||
                    normalizedMessage.includes('duplicate') ||
                    normalizedMessage.includes('email exists') ||
                    normalizedMessage.includes('email') && normalizedMessage.includes('registered') ||
                    authStatus === 422

                if (looksLikeDuplicateEmail) {
                    return errorResponse(
                        409,
                        'Email ya registrado. Inicia sesión con ese correo.',
                        'TENANT_REGISTER_EMAIL_ALREADY_EXISTS'
                    )
                }

                const looksLikePasswordPolicyError =
                    normalizedMessage.includes('password') &&
                    (normalizedMessage.includes('weak') ||
                        normalizedMessage.includes('least') ||
                        normalizedMessage.includes('characters') ||
                        normalizedMessage.includes('policy'))

                if (looksLikePasswordPolicyError) {
                    return errorResponse(
                        400,
                        'La contraseña no cumple la política de seguridad configurada.',
                        'TENANT_REGISTER_PASSWORD_POLICY_FAILED',
                        { error_detail: rawMessage }
                    )
                }

                const looksLikeInvalidEmail =
                    normalizedMessage.includes('invalid email') ||
                    normalizedMessage.includes('email address is invalid')

                if (looksLikeInvalidEmail) {
                    return errorResponse(
                        400,
                        'El correo ingresado no es válido.',
                        'TENANT_REGISTER_EMAIL_INVALID',
                        { error_detail: rawMessage }
                    )
                }

                const looksLikeInvalidServerApiKey =
                    authStatus === 401 ||
                    authStatus === 403 ||
                    normalizedMessage.includes('invalid api key') ||
                    normalizedMessage.includes('api key is invalid') ||
                    normalizedMessage.includes('apikey is invalid') ||
                    normalizedMessage.includes('invalid jwt') ||
                    normalizedMessage.includes('apikey')

                if (looksLikeInvalidServerApiKey) {
                    return errorResponse(
                        500,
                        'Configuración de servidor inválida: revisa SUPABASE_SERVICE_ROLE_KEY y NEXT_PUBLIC_SUPABASE_URL (deben ser del mismo proyecto).',
                        'TENANT_REGISTER_SUPABASE_SERVER_KEY_INVALID',
                        { error_detail: rawMessage }
                    )
                }

                return errorResponse(
                    authStatus && authStatus >= 400 && authStatus < 600 ? authStatus : 400,
                    'Error al crear la cuenta',
                    'TENANT_REGISTER_AUTH_CREATE_FAILED',
                    { error_detail: rawMessage }
                )
            }
            authUserId = authData.user.id
            authUserCreatedByThisRequest = true
        }

        // 2. Crear el tenant

        const tenantInsertBase = {
            auth_user_id: authUserId,
            nombre: normalizedName,
            rubro: rubro || null,
            direccion: normalizedAddress || null,
            email: normalizedEmail,
            telefono: normalizedPhone || null,
            lat: parsedLat ?? null,
            lng: parsedLng ?? null,
            logo_url: normalizedLogoUrl || null,
            card_background_url: normalizedCardBackgroundUrl || null,
            card_background_overlay: normalizedCardBackgroundOverlay,
            stamp_icon_url: normalizedStampIconUrl || null,
            color_primario: normalizeBrandColor(color_primario),
            mensaje_geofencing: normalizedGeoMessage || '¡Estás cerca! Pasa a sumar puntos 🎉',
            slug,
            plan: 'trial',
            trial_hasta: trialHasta.toISOString(),
            estado: 'activo',
            onboarding_completado: false
        }

        const tenantInsertLegacy = {
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
            estado: 'activo',
            onboarding_completado: false
        }

        let { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .insert({
                ...tenantInsertBase,
                selected_plan: normalizedSelectedPlan,
                selected_program_types: normalizedSelectedProgramTypes
            })
            .select()
            .single()

        if (tenantError && looksLikeMissingTenantPlanColumns(tenantError)) {
            console.warn('Tenants sin columnas selected_plan/selected_program_types. Reintentando inserción compatible.')
            const fallbackInsert = await supabase
                .from('tenants')
                .insert(tenantInsertLegacy)
                .select()
                .single()
            tenant = fallbackInsert.data
            tenantError = fallbackInsert.error
        }

        if (tenantError) {
            console.error('Error creando tenant:', tenantError)
            if (authUserCreatedByThisRequest && authUserId) {
                await supabase.auth.admin.deleteUser(authUserId)
            }
            if (tenantError.code === '23505') {
                return errorResponse(409, 'Ya existe un negocio con ese email', 'TENANT_REGISTER_TENANT_DUPLICATE')
            }
            return errorResponse(500, 'Error al crear negocio', 'TENANT_REGISTER_TENANT_CREATE_FAILED', {
                error_detail: tenantError.message || tenantError.details || 'unknown'
            })
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
                return errorResponse(
                    500,
                    'La base de datos no acepta este tipo de programa todavía. Aplica la migración de tipos y reintenta.',
                    'TENANT_REGISTER_PROGRAM_CONSTRAINT_FAILED'
                )
            }

            return errorResponse(500, 'Error al crear programa de lealtad', 'TENANT_REGISTER_PROGRAM_CREATE_FAILED')
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
        return errorResponse(500, 'Error interno', 'TENANT_REGISTER_UNEXPECTED', {
            error_detail: error instanceof Error ? error.message : 'unknown'
        })
    }
}
