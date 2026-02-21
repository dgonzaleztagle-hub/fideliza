import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// POST /api/tenant/register
// Registrar un nuevo negocio
export async function POST(req: NextRequest) {
    try {
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

        const supabaseServer = await createClient()
        const { data: { user: currentUser } } = await supabaseServer.auth.getUser()

        if (!currentUser) {
            if (!nombre || !email || !password) {
                return NextResponse.json(
                    { error: 'Faltan campos requeridos: nombre, email, password' },
                    { status: 400 }
                )
            }
        } else {
            if (!nombre || !email) {
                return NextResponse.json(
                    { error: 'Faltan campos requeridos: nombre, email' },
                    { status: 400 }
                )
            }
        }

        // Generar slug único
        const baseSlug = nombre
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

        let authUserId = null

        if (currentUser) {
            // Ya viene logueado por Google u OAuth
            authUserId = currentUser.id
        } else {
            // 1. Crear el usuario en Supabase Auth manualmente
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true, // Para asegurar que no queden varados
                user_metadata: {
                    nombre_negocio: nombre
                }
            })

            if (authError) {
                console.error('Error creando usuario Auth:', authError)
                let msg = 'Error al crear la cuenta'
                if (authError.message.includes('already registered')) msg = 'El email ya está registrado. Intenta iniciar sesión.'
                return NextResponse.json({ error: msg }, { status: 400 })
            }
            authUserId = authData.user.id
        }

        // 2. Crear el tenant

        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .insert({
                auth_user_id: authUserId,
                nombre,
                rubro: rubro || null,
                direccion: direccion || null,
                email: currentUser?.email || email,
                telefono: telefono || null,
                lat: lat || null,
                lng: lng || null,
                logo_url: logo_url || null,
                color_primario: color_primario || '#6366f1',
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
                nombre: `Programa de ${nombre}`,
                puntos_meta: puntos_meta || 10,
                descripcion_premio: descripcion_premio || 'Premio por tu lealtad',
                tipo_premio: tipo_premio || 'descuento',
                valor_premio: valor_premio || null,
                tipo_programa: tipo_programa || 'sellos',
                config: config || {},
                activo: true
            })
            .select()
            .single()

        if (programError) {
            console.error('Error creando programa:', programError)
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
