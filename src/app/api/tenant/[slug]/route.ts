import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getOptionalAuthenticatedUser, requireTenantOwnerBySlug } from '@/lib/authz'
import { isProgramType } from '@/lib/programTypes'
import { normalizeBrandColor } from '@/lib/brandColor'
import { getEffectiveBillingPlan, isBillingPlan, normalizeProgramChoices } from '@/lib/plans'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

type TenantRow = {
    id: string
    nombre: string
    slug: string
    rubro: string | null
    direccion: string | null
    email: string | null
    telefono: string | null
    estado: string | null
    plan: string | null
    selected_plan: string | null
    selected_program_types: string[] | null
    trial_hasta: string | null
    logo_url: string | null
    card_background_url: string | null
    card_background_overlay: number | null
    stamp_icon_url: string | null
    color_primario: string | null
    lat: number | null
    lng: number | null
    mensaje_geofencing: string | null
    google_business_url: string | null
    validation_pin: string | null
    onboarding_completado: boolean | null
    auth_user_id: string | null
    created_at: string
    updated_at: string
}

type CustomerStatsRow = {
    total_puntos_historicos: number | null
    total_premios_canjeados: number | null
}

// GET /api/tenant/[slug]
// Público: solo datos de vitrina
// Dueño autenticado: datos completos de panel + clientes
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const serverSupabase = await createServerClient()
        const adminSupabase = getSupabase()
        const { slug } = await params
        const incomingSlug = slug.trim().toLowerCase()

        const tenantSelectWithAssets = `
            id, nombre, slug, rubro, direccion, email, telefono, estado, plan, selected_plan, selected_program_types, trial_hasta,
            logo_url, card_background_url, card_background_overlay, stamp_icon_url, color_primario, lat, lng, mensaje_geofencing, google_business_url,
            validation_pin, onboarding_completado, auth_user_id, created_at, updated_at
        `
        let authUserId: string | null = null
        const authHeader = req.headers.get('authorization') || ''
        const bearer = authHeader.toLowerCase().startsWith('bearer ')
            ? authHeader.slice(7).trim()
            : ''

        if (bearer && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            const anonClient = createSupabaseClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            )
            const { data, error } = await anonClient.auth.getUser(bearer)
            if (!error && data?.user) {
                authUserId = data.user.id
            }
        }

        if (!authUserId) {
            const { data: { user } } = await serverSupabase.auth.getUser()
            authUserId = user?.id || null
        }
        if (!authUserId) {
            const user = await getOptionalAuthenticatedUser()
            authUserId = user?.id || null
        }

        let tenant: TenantRow | null = null
        let tenantQueryError: { code?: string; message?: string; details?: string } | null = null

        if (authUserId) {
            // Flujo dueño: mismo contexto de sesión que /api/my-tenants
            const ownerBySlug = await serverSupabase
                .from('tenants')
                .select(tenantSelectWithAssets)
                .eq('auth_user_id', authUserId)
                .eq('slug', incomingSlug)
                .maybeSingle()

            tenant = (ownerBySlug.data as TenantRow | null) || null
            tenantQueryError = ownerBySlug.error

            if (!tenant && !tenantQueryError) {
                const ownerFallback = await serverSupabase
                    .from('tenants')
                    .select(tenantSelectWithAssets)
                    .eq('auth_user_id', authUserId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()
                tenant = (ownerFallback.data as TenantRow | null) || null
                tenantQueryError = ownerFallback.error
            }
        } else {
            // Flujo público (sin sesión): lookup directo por slug
            const publicBySlug = await adminSupabase
                .from('tenants')
                .select(tenantSelectWithAssets)
                .eq('slug', incomingSlug)
                .maybeSingle()
            tenant = (publicBySlug.data as TenantRow | null) || null
            tenantQueryError = publicBySlug.error
        }

        if (tenantQueryError) {
            console.error('TENANT_LOOKUP_FAILED', {
                slug: incomingSlug,
                code: tenantQueryError.code,
                message: tenantQueryError.message,
                details: tenantQueryError.details
            })
            return NextResponse.json(
                { error: 'Error al buscar negocio', code: 'TENANT_LOOKUP_FAILED' },
                { status: 500 }
            )
        }

        if (!tenant) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
        }

        const { data: program } = await adminSupabase
            .from('programs')
            .select('id, tenant_id, nombre, puntos_meta, descripcion_premio, tipo_premio, valor_premio, tipo_programa, config, activo')
            .eq('tenant_id', tenant.id)
            .eq('activo', true)
            .maybeSingle()

        const isOwner = !!authUserId && authUserId === tenant.auth_user_id

        if (!isOwner) {
            return NextResponse.json({
                tenant: {
                    id: tenant.id,
                    nombre: tenant.nombre,
                    slug: tenant.slug,
                    rubro: tenant.rubro,
                    direccion: tenant.direccion,
                    estado: tenant.estado,
                    logo_url: tenant.logo_url,
                    card_background_url: tenant.card_background_url,
                    card_background_overlay: tenant.card_background_overlay,
                    stamp_icon_url: tenant.stamp_icon_url,
                    color_primario: tenant.color_primario,
                    mensaje_geofencing: tenant.mensaje_geofencing,
                    google_business_url: tenant.google_business_url
                },
                program: program || null,
                customers: [],
                stats: null,
                is_owner: false
            })
        }

        const { data: customers } = await adminSupabase
            .from('customers')
            .select('*')
            .eq('tenant_id', tenant.id)
            .order('created_at', { ascending: false })

        const today = new Date().toISOString().split('T')[0]
        const { count: stampsHoy } = await adminSupabase
            .from('stamps')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id)
            .eq('fecha', today)

        const stats = {
            totalClientes: customers?.length || 0,
            totalPuntosDados: (customers as CustomerStatsRow[] | null)?.reduce((sum: number, c) => sum + (c.total_puntos_historicos || 0), 0) || 0,
            totalPremiosCanjeados: (customers as CustomerStatsRow[] | null)?.reduce((sum: number, c) => sum + (c.total_premios_canjeados || 0), 0) || 0,
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
                selected_plan: tenant.selected_plan,
                selected_program_types: tenant.selected_program_types,
                trial_hasta: tenant.trial_hasta,
                logo_url: tenant.logo_url,
                card_background_url: tenant.card_background_url,
                card_background_overlay: tenant.card_background_overlay,
                stamp_icon_url: tenant.stamp_icon_url,
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
        const { data: currentTenantPlan } = await supabase
            .from('tenants')
            .select('plan, selected_plan, selected_program_types')
            .eq('id', ownerTenant.id)
            .maybeSingle()

        const effectiveSelectedPlan = getEffectiveBillingPlan(
            currentTenantPlan?.plan,
            isBillingPlan(body.selected_plan) ? body.selected_plan : currentTenantPlan?.selected_plan
        )

        if (!body.nombre) {
            return NextResponse.json({ error: 'El nombre del negocio es obligatorio' }, { status: 400 })
        }
        if (!body.program || !body.program.descripcion_premio) {
            return NextResponse.json({ error: 'La descripción del premio es obligatoria' }, { status: 400 })
        }
        if (body.program?.tipo_programa !== undefined && !isProgramType(body.program.tipo_programa)) {
            return NextResponse.json({ error: 'Tipo de programa inválido' }, { status: 400 })
        }
        if (body.selected_plan !== undefined && !isBillingPlan(body.selected_plan)) {
            return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
        }
        for (const imageField of ['logo_url', 'card_background_url', 'stamp_icon_url'] as const) {
            if (body[imageField] === undefined || body[imageField] === null || body[imageField] === '') continue
            try {
                new URL(String(body[imageField]))
            } catch {
                return NextResponse.json({ error: `${imageField} no es una URL válida` }, { status: 400 })
            }
        }
        if (body.card_background_overlay !== undefined) {
            const parsedOverlay = Number(body.card_background_overlay)
            if (!Number.isFinite(parsedOverlay) || parsedOverlay < 0 || parsedOverlay > 0.8) {
                return NextResponse.json({ error: 'card_background_overlay debe estar entre 0 y 0.8' }, { status: 400 })
            }
        }

        const normalizedAllowedTypes = normalizeProgramChoices(
            body.selected_program_types ?? currentTenantPlan?.selected_program_types,
            effectiveSelectedPlan
        )
        if (
            body.program?.tipo_programa !== undefined &&
            !normalizedAllowedTypes.includes(body.program.tipo_programa)
        ) {
            return NextResponse.json(
                { error: 'El motor seleccionado no está habilitado para este plan.' },
                { status: 400 }
            )
        }

        const tenantUpdates: Record<string, unknown> = {}
        const tenantFields = [
            'nombre',
            'rubro',
            'direccion',
            'logo_url',
            'card_background_url',
            'card_background_overlay',
            'stamp_icon_url',
            'color_primario',
            'lat',
            'lng',
            'mensaje_geofencing',
            'telefono',
            'google_business_url',
            'validation_pin',
            'onboarding_completado',
            'selected_plan',
            'selected_program_types'
        ]

        for (const field of tenantFields) {
            if (body[field] !== undefined) {
                tenantUpdates[field] = field === 'color_primario'
                    ? normalizeBrandColor(body[field])
                    : body[field]
            }
        }
        if (body.selected_plan !== undefined) {
            tenantUpdates.selected_plan = body.selected_plan
        }
        if (body.selected_program_types !== undefined) {
            tenantUpdates.selected_program_types = normalizedAllowedTypes
        }

        if (Object.keys(tenantUpdates).length > 0) {
            tenantUpdates.updated_at = new Date().toISOString()
            let { error } = await supabase
                .from('tenants')
                .update(tenantUpdates)
                .eq('id', ownerTenant.id)

            if (error) {
                const looksLikeMissingAssetCols = error.code === '42703'
                    || `${error.message || ''} ${error.details || ''}`.includes('card_background_url')
                    || `${error.message || ''} ${error.details || ''}`.includes('card_background_overlay')
                    || `${error.message || ''} ${error.details || ''}`.includes('stamp_icon_url')
                if (looksLikeMissingAssetCols) {
                    const fallbackUpdates = { ...tenantUpdates }
                    delete fallbackUpdates.card_background_url
                    delete fallbackUpdates.card_background_overlay
                    delete fallbackUpdates.stamp_icon_url
                    const fallback = await supabase
                        .from('tenants')
                        .update(fallbackUpdates)
                        .eq('id', ownerTenant.id)
                    error = fallback.error
                }
            }

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
