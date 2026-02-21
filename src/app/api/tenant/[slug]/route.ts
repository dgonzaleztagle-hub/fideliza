import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { getOptionalAuthenticatedUser, requireTenantOwnerBySlug } from '@/lib/authz'

// GET /api/tenant/[slug]
// Público: solo datos de vitrina
// Dueño autenticado: datos completos de panel + clientes
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const supabase = getSupabase()

    try {
        const { slug } = await params
        const normalizedSlug = slug.trim().toLowerCase().replace(/\s+/g, '-')

        let tenant: any = null

        const findBySlug = async (value: string) => supabase
            .from('tenants')
            .select(`
                id, nombre, slug, rubro, direccion, email, telefono, estado, plan, trial_hasta,
                logo_url, color_primario, lat, lng, mensaje_geofencing, google_business_url,
                validation_pin, onboarding_completado, auth_user_id, created_at, updated_at
            `)
            .eq('slug', value)
            .maybeSingle()

        const { data: byExact } = await findBySlug(slug)
        tenant = byExact

        if (!tenant) {
            const { data: byNormalized } = await findBySlug(normalizedSlug)
            tenant = byNormalized
        }

        if (!tenant) {
            const { data: byName } = await supabase
                .from('tenants')
                .select(`
                    id, nombre, slug, rubro, direccion, email, telefono, estado, plan, trial_hasta,
                    logo_url, color_primario, lat, lng, mensaje_geofencing, google_business_url,
                    validation_pin, onboarding_completado, auth_user_id, created_at, updated_at
                `)
                .ilike('nombre', slug.trim())
                .maybeSingle()
            tenant = byName
        }

        if (!tenant) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
        }

        const { data: program } = await supabase
            .from('programs')
            .select('id, tenant_id, nombre, puntos_meta, descripcion_premio, tipo_premio, valor_premio, tipo_programa, config, activo')
            .eq('tenant_id', tenant.id)
            .eq('activo', true)
            .maybeSingle()

        const user = await getOptionalAuthenticatedUser()
        const isOwner = !!user && user.id === tenant.auth_user_id

        if (!isOwner) {
            return NextResponse.json({
                tenant: {
                    id: tenant.id,
                    nombre: tenant.nombre,
                    slug: tenant.slug,
                    rubro: tenant.rubro,
                    direccion: tenant.direccion,
                    telefono: tenant.telefono,
                    estado: tenant.estado,
                    logo_url: tenant.logo_url,
                    color_primario: tenant.color_primario,
                    lat: tenant.lat,
                    lng: tenant.lng,
                    mensaje_geofencing: tenant.mensaje_geofencing,
                    google_business_url: tenant.google_business_url
                },
                program: program || null,
                customers: [],
                stats: null,
                is_owner: false
            })
        }

        const { data: customers } = await supabase
            .from('customers')
            .select('*')
            .eq('tenant_id', tenant.id)
            .order('created_at', { ascending: false })

        const today = new Date().toISOString().split('T')[0]
        const { count: stampsHoy } = await supabase
            .from('stamps')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id)
            .eq('fecha', today)

        const stats = {
            totalClientes: customers?.length || 0,
            totalPuntosDados: customers?.reduce((sum: number, c: any) => sum + (c.total_puntos_historicos || 0), 0) || 0,
            totalPremiosCanjeados: customers?.reduce((sum: number, c: any) => sum + (c.total_premios_canjeados || 0), 0) || 0,
            clientesHoy: stampsHoy || 0
        }

        return NextResponse.json({
            tenant: {
                id: tenant.id,
                nombre: tenant.nombre,
                slug: tenant.slug,
                rubro: tenant.rubro,
                direccion: tenant.direccion,
                email: tenant.email,
                telefono: tenant.telefono,
                estado: tenant.estado,
                plan: tenant.plan,
                trial_hasta: tenant.trial_hasta,
                logo_url: tenant.logo_url,
                color_primario: tenant.color_primario,
                lat: tenant.lat,
                lng: tenant.lng,
                mensaje_geofencing: tenant.mensaje_geofencing,
                google_business_url: tenant.google_business_url,
                validation_pin: tenant.validation_pin,
                onboarding_completado: tenant.onboarding_completado,
                created_at: tenant.created_at,
                updated_at: tenant.updated_at
            },
            program: program || null,
            customers: customers || [],
            stats,
            is_owner: true
        })
    } catch (error) {
        console.error('Error obteniendo tenant:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}

// PUT /api/tenant/[slug]
// Solo dueño autenticado
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const supabase = getSupabase()

    try {
        const { slug } = await params
        const owner = await requireTenantOwnerBySlug(slug)
        if (!owner.ok) return owner.response
        const ownerTenant = owner.tenant!

        const body = await req.json()

        if (!body.nombre) {
            return NextResponse.json({ error: 'El nombre del negocio es obligatorio' }, { status: 400 })
        }
        if (!body.program || !body.program.descripcion_premio) {
            return NextResponse.json({ error: 'La descripción del premio es obligatoria' }, { status: 400 })
        }

        const tenantUpdates: Record<string, unknown> = {}
        const tenantFields = [
            'nombre',
            'rubro',
            'direccion',
            'logo_url',
            'color_primario',
            'lat',
            'lng',
            'mensaje_geofencing',
            'telefono',
            'google_business_url',
            'validation_pin',
            'onboarding_completado'
        ]

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
                .eq('id', ownerTenant.id)

            if (error) {
                console.error('Error actualizando tenant:', error)
                return NextResponse.json({ error: 'Error al actualizar negocio' }, { status: 500 })
            }
        }

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
                .eq('tenant_id', ownerTenant.id)
                .eq('activo', true)

            if (error) {
                console.error('Error actualizando programa:', error)
                return NextResponse.json({ error: 'Error al actualizar programa' }, { status: 500 })
            }
        }

        return NextResponse.json({ message: 'Configuración actualizada' })
    } catch (error) {
        console.error('Error actualizando tenant:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
