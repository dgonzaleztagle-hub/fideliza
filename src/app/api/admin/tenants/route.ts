import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/authz'

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value))
}

const SORTABLE_FIELDS = new Set(['created_at', 'nombre', 'plan', 'estado', 'trial_hasta'])

export async function GET(req: Request) {
    const admin = await requireSuperAdmin()
    if (!admin.ok) return admin.response

    const supabase = getSupabase()
    const { searchParams } = new URL(req.url)

    const q = (searchParams.get('q') || '').trim()
    const plan = (searchParams.get('plan') || '').trim().toLowerCase()
    const estado = (searchParams.get('estado') || '').trim().toLowerCase()
    const pilot = (searchParams.get('pilot') || '').trim().toLowerCase()
    const page = clamp(Number(searchParams.get('page') || 1) || 1, 1, 10000)
    const pageSize = clamp(Number(searchParams.get('pageSize') || 20) || 20, 5, 100)
    const sortByRaw = (searchParams.get('sortBy') || 'created_at').trim()
    const sortBy = SORTABLE_FIELDS.has(sortByRaw) ? sortByRaw : 'created_at'
    const sortDir = (searchParams.get('sortDir') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc'
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    try {
        let query = supabase
            .from('tenants')
            .select(`
                id, nombre, slug, plan, estado, trial_hasta, created_at,
                is_pilot, pilot_started_at, pilot_notes,
                customers:customers(count),
                stamps:stamps(count),
                rewards:rewards(count)
            `, { count: 'exact' })

        if (q) {
            query = query.or(`nombre.ilike.%${q}%,slug.ilike.%${q}%`)
        }
        if (plan) {
            query = query.eq('plan', plan)
        }
        if (estado) {
            query = query.eq('estado', estado)
        }
        if (pilot === 'on') {
            query = query.eq('is_pilot', true)
        } else if (pilot === 'off') {
            query = query.eq('is_pilot', false)
        }

        let tenantsResult: {
            data: unknown[] | null
            error: { message: string } | null
            count: number | null
        } = await query
            .order(sortBy, { ascending: sortDir === 'asc' })
            .range(from, to)

        if (tenantsResult.error && (
            tenantsResult.error.message.includes('column tenants.is_pilot does not exist')
            || tenantsResult.error.message.includes('column tenants.pilot_started_at does not exist')
            || tenantsResult.error.message.includes('column tenants.pilot_notes does not exist')
        )) {
            let fallbackQuery = supabase
                .from('tenants')
                .select(`
                    id, nombre, slug, plan, estado, trial_hasta, created_at,
                    customers:customers(count),
                    stamps:stamps(count),
                    rewards:rewards(count)
                `, { count: 'exact' })

            if (q) {
                fallbackQuery = fallbackQuery.or(`nombre.ilike.%${q}%,slug.ilike.%${q}%`)
            }
            if (plan) {
                fallbackQuery = fallbackQuery.eq('plan', plan)
            }
            if (estado) {
                fallbackQuery = fallbackQuery.eq('estado', estado)
            }

            tenantsResult = await fallbackQuery
                .order(sortBy, { ascending: sortDir === 'asc' })
                .range(from, to)
        }

        if (tenantsResult.error) throw tenantsResult.error

        // Mapear para limpiar conteos
        type TenantAggregate = {
            id: string
            nombre: string
            slug: string
            plan: string
            estado: string
            trial_hasta: string | null
            created_at: string
            is_pilot?: boolean
            pilot_started_at?: string | null
            pilot_notes?: string | null
            customers?: Array<{ count: number | null }>
            stamps?: Array<{ count: number | null }>
            rewards?: Array<{ count: number | null }>
        }

        const rows = (tenantsResult.data || []) as TenantAggregate[]
        const result = rows.map((t) => ({
            id: t.id,
            nombre: t.nombre,
            slug: t.slug,
            plan: t.plan,
            estado: t.estado,
            trial_hasta: t.trial_hasta,
            created_at: t.created_at,
            is_pilot: Boolean(t.is_pilot),
            pilot_started_at: t.pilot_started_at || null,
            pilot_notes: t.pilot_notes || null,
            total_customers: t.customers?.[0]?.count || 0,
            total_stamps: t.stamps?.[0]?.count || 0,
            total_rewards: t.rewards?.[0]?.count || 0
        }))

        const total = tenantsResult.count || 0
        return NextResponse.json({
            tenants: result,
            pagination: {
                total,
                page,
                pageSize,
                totalPages: Math.max(1, Math.ceil(total / pageSize))
            }
        })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno'
        console.error('Error fetching admin tenants:', message)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
