import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// GET /api/tenant/[slug]
// Obtiene datos completos de un tenant por su slug
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const supabase = getSupabase()
    try {
        const { slug } = await params

        // Normalizar: quitar espacios extra, lowercase, reemplazar espacios con guiones
        const normalizedSlug = slug.trim().toLowerCase().replace(/\s+/g, '-')

        // 1. Buscar por slug exacto
        let { data: tenant } = await supabase
            .from('tenants')
            .select('*')
            .eq('slug', slug)
            .single()

        // 2. Si no encuentra, intentar con slug normalizado
        if (!tenant) {
            const { data: t2 } = await supabase
                .from('tenants')
                .select('*')
                .eq('slug', normalizedSlug)
                .single()
            tenant = t2
        }

        // 3. Si aún no, buscar por nombre (case-insensitive)
        if (!tenant) {
            const { data: t3 } = await supabase
                .from('tenants')
                .select('*')
                .ilike('nombre', slug.trim())
                .single()
            tenant = t3
        }

        if (!tenant) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
        }

        // Buscar programa activo
        const { data: program } = await supabase
            .from('programs')
            .select('*')
            .eq('tenant_id', tenant.id)
            .eq('activo', true)
            .single()

        // Buscar clientes
        const { data: customers } = await supabase
            .from('customers')
            .select('*')
            .eq('tenant_id', tenant.id)
            .order('created_at', { ascending: false })

        // Contar stamps de hoy
        const today = new Date().toISOString().split('T')[0]
        const { count: stampsHoy } = await supabase
            .from('stamps')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id)
            .eq('fecha', today)

        // Calcular stats
        const stats = {
            totalClientes: customers?.length || 0,
            totalPuntosDados: customers?.reduce((sum, c) => sum + (c.total_puntos_historicos || 0), 0) || 0,
            totalPremiosCanjeados: customers?.reduce((sum, c) => sum + (c.total_premios_canjeados || 0), 0) || 0,
            clientesHoy: stampsHoy || 0
        }

        return NextResponse.json({
            tenant,
            program,
            customers: customers || [],
            stats
        })

    } catch (error) {
        console.error('Error obteniendo tenant:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}

// PUT /api/tenant/[slug]
// Actualiza configuración del negocio y programa
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const supabase = getSupabase()
    try {
        const { slug } = await params
        const body = await req.json()

        // Buscar tenant
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('id, auth_user_id')
            .eq('slug', slug)
            .single()

        if (tenantError || !tenant) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
        }

        // VALIDACIÓN DE SEGURIDAD
        const supabaseServer = await createClient()
        const { data: { user } } = await supabaseServer.auth.getUser()

        if (!user || user.id !== tenant.auth_user_id) {
            return NextResponse.json({ error: 'No autorizado para editar este negocio' }, { status: 401 })
        }

        // Actualizar datos del tenant
        const tenantUpdates: Record<string, unknown> = {}
        const tenantFields = ['nombre', 'rubro', 'direccion', 'logo_url', 'color_primario', 'lat', 'lng', 'mensaje_geofencing', 'telefono', 'google_business_url', 'validation_pin']
        for (const field of tenantFields) {
            if (body[field] !== undefined) {
                tenantUpdates[field] = body[field]
            }
        }

        if (Object.keys(tenantUpdates).length > 0) {
            tenantUpdates.updated_at = new Date().toISOString()
            const { error } = await supabase
                .from('tenants')
                .update(tenantUpdates)
                .eq('id', tenant.id)
            if (error) {
                console.error('Error actualizando tenant:', error)
                return NextResponse.json({ error: 'Error al actualizar negocio' }, { status: 500 })
            }
        }

        // Actualizar programa si hay datos
        const programUpdates: Record<string, unknown> = {}
        const programFields = ['puntos_meta', 'descripcion_premio', 'tipo_premio', 'valor_premio', 'nombre', 'tipo_programa', 'config']
        for (const field of programFields) {
            if (body.program?.[field] !== undefined) {
                programUpdates[field] = body.program[field]
            }
        }

        if (Object.keys(programUpdates).length > 0) {
            programUpdates.updated_at = new Date().toISOString()
            const { error } = await supabase
                .from('programs')
                .update(programUpdates)
                .eq('tenant_id', tenant.id)
                .eq('activo', true)
            if (error) {
                console.error('Error actualizando programa:', error)
                return NextResponse.json({ error: 'Error al actualizar programa' }, { status: 500 })
            }
        }

        return NextResponse.json({ message: '✅ Configuración actualizada' })

    } catch (error) {
        console.error('Error actualizando tenant:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
