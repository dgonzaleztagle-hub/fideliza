import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'

// POST /api/tenant/register
// Registrar un nuevo negocio
export async function POST(req: NextRequest) {
    const supabase = getSupabase()
    try {
        const body = await req.json()
        const {
            nombre,
            rubro,
            direccion,
            email,
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

        if (!nombre || !email) {
            return NextResponse.json(
                { error: 'Faltan campos requeridos: nombre, email' },
                { status: 400 }
            )
        }

        // Generar slug único
        const baseSlug = nombre
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')

        // Verificar que el slug no exista
        let slug = baseSlug
        let attempt = 0
        while (true) {
            const { data: existing } = await supabase
                .from('tenants')
                .select('id')
                .eq('slug', slug)
                .single()

            if (!existing) break
            attempt++
            slug = `${baseSlug}-${attempt}`
        }

        // Calcular fecha de trial (14 días)
        const trialHasta = new Date()
        trialHasta.setDate(trialHasta.getDate() + 14)

        // Crear el tenant
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .insert({
                nombre,
                rubro: rubro || null,
                direccion: direccion || null,
                email,
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
        const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/qr/${slug}`

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
