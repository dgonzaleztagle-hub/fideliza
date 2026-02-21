import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isProgramType } from '@/lib/programTypes'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { normalizeBrandColor } from '@/lib/brandColor'

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
            // Ya viene logueado por Google u OAuth
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
                direccion: direccion || null,
                email: normalizedEmail,
                telefono: telefono || null,
                lat: lat || null,
                lng: lng || null,
                logo_url: logo_url || null,
                color_primario: normalizeBrandColor(color_primario),
                mensaje_geofencing: mensaje_geofencing || '¡Estás cerca! Pasa a sumar puntos 🎉',
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
                puntos_meta: puntos_meta || 10,
                descripcion_premio: descripcion_premio || 'Premio por tu lealtad',
                tipo_premio: tipo_premio || 'descuento',
                valor_premio: valor_premio || null,
                tipo_programa: normalizedProgramType,
                config: config || {},
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
