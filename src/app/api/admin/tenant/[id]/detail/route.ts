import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/authz'

type Params = { params: Promise<{ id: string }> }

async function safeTableSelect<T>(query: PromiseLike<{ data: T | null; error: { message: string } | null }>, fallback: T) {
    const { data, error } = await query
    if (error) return fallback
    return (data ?? fallback) as T
}

async function safeCount(
    query: PromiseLike<{ count: number | null; error: { message: string } | null }>
) {
    const { count, error } = await query
    if (error) return 0
    return count || 0
}

export async function GET(_req: Request, { params }: Params) {
    const admin = await requireSuperAdmin()
    if (!admin.ok) return admin.response

    const supabase = getSupabase()
    const { id } = await params

    try {
        let tenant: Record<string, unknown> | null = null
        let tenantError: { message: string } | null = null

        // Esquema nuevo (con columnas de piloto)
        {
            const result = await supabase
                .from('tenants')
                .select(`
                    id, nombre, slug, plan, selected_plan, estado, trial_hasta, is_pilot, pilot_started_at, pilot_notes,
                    created_at, telefono, direccion, rubro, color_primario
                `)
                .eq('id', id)
                .maybeSingle()
            tenant = (result.data as Record<string, unknown> | null) ?? null
            tenantError = result.error ? { message: result.error.message } : null
        }

        // Fallback esquema anterior (sin columnas de piloto/selected_plan)
        if (tenantError && (
            tenantError.message.includes('column tenants.is_pilot does not exist')
            || tenantError.message.includes('column tenants.pilot_started_at does not exist')
            || tenantError.message.includes('column tenants.pilot_notes does not exist')
            || tenantError.message.includes('column tenants.selected_plan does not exist')
        )) {
            const fallback = await supabase
                .from('tenants')
                .select(`
                    id, nombre, slug, plan, estado, trial_hasta,
                    created_at, telefono, direccion, rubro, color_primario
                `)
                .eq('id', id)
                .maybeSingle()
            tenant = (fallback.data as Record<string, unknown> | null) ?? null
            tenantError = fallback.error ? { message: fallback.error.message } : null
            if (tenant) {
                tenant = {
                    ...tenant,
                    selected_plan: null,
                    is_pilot: false,
                    pilot_started_at: null,
                    pilot_notes: null,
                }
            }
        }

        if (tenantError) throw new Error(tenantError.message)
        if (!tenant) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

        const [customers, recentStamps, recentRewards, notifications, scheduledCampaigns, topCustomers, auditLogs, program, totalStampsCount, totalRewardsCount, totalRewardsRedeemedCount, totalNotificationsCount, totalCampaignsCount] = await Promise.all([
            safeTableSelect(
                supabase
                    .from('customers')
                    .select('id, nombre, whatsapp, email, total_puntos_historicos, puntos_actuales, created_at')
                    .eq('tenant_id', id)
                    .order('created_at', { ascending: false })
                    .limit(100),
                []
            ),
            safeTableSelect(
                supabase
                    .from('stamps')
                    .select('id, customer_id, fecha, created_at')
                    .eq('tenant_id', id)
                    .order('created_at', { ascending: false })
                    .limit(200),
                []
            ),
            safeTableSelect(
                supabase
                    .from('rewards')
                    .select('id, customer_id, descripcion, canjeado, created_at')
                    .eq('tenant_id', id)
                    .order('created_at', { ascending: false })
                    .limit(100),
                []
            ),
            safeTableSelect(
                supabase
                    .from('notifications')
                    .select('id, titulo, mensaje, segmento, total_destinatarios, created_at')
                    .eq('tenant_id', id)
                    .order('created_at', { ascending: false })
                    .limit(100),
                []
            ),
            safeTableSelect(
                supabase
                    .from('scheduled_campaigns')
                    .select('id, nombre, fecha_envio, estado, titulo_notif, mensaje_notif, segmento, created_at')
                    .eq('tenant_id', id)
                    .order('created_at', { ascending: false })
                    .limit(100),
                []
            ),
            safeTableSelect(
                supabase
                    .from('customers')
                    .select('id, nombre, whatsapp, total_puntos_historicos, total_premios_canjeados, created_at')
                    .eq('tenant_id', id)
                    .order('total_puntos_historicos', { ascending: false })
                    .limit(10),
                []
            ),
            safeTableSelect(
                supabase
                    .from('admin_audit_logs')
                    .select('id, admin_email, action, meta, created_at')
                    .eq('tenant_id', id)
                    .order('created_at', { ascending: false })
                    .limit(200),
                []
            ),
            safeTableSelect(
                supabase
                    .from('programs')
                    .select('id, tipo_programa, puntos_meta, descripcion_premio, activo, updated_at')
                    .eq('tenant_id', id)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle(),
                null
            ),
            safeCount(
                supabase
                    .from('stamps')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', id)
            ),
            safeCount(
                supabase
                    .from('rewards')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', id)
            ),
            safeCount(
                supabase
                    .from('rewards')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', id)
                    .eq('canjeado', true)
            ),
            safeCount(
                supabase
                    .from('notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', id)
            ),
            safeCount(
                supabase
                    .from('scheduled_campaigns')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', id)
            )
        ])

        const byCustomer = new Map((customers || []).map((c: { id: string; nombre: string; whatsapp: string }) => [c.id, c]))
        const stampsDecorated = (recentStamps || []).map((s: { customer_id: string; created_at: string; fecha: string }) => ({
            ...s,
            customer_name: byCustomer.get(s.customer_id)?.nombre || 'Sin nombre',
            customer_whatsapp: byCustomer.get(s.customer_id)?.whatsapp || '-'
        }))
        const rewardsDecorated = (recentRewards || []).map((r: { customer_id: string }) => ({
            ...r,
            customer_name: byCustomer.get(r.customer_id)?.nombre || 'Sin nombre',
            customer_whatsapp: byCustomer.get(r.customer_id)?.whatsapp || '-'
        }))

        const summary = {
            total_customers: (customers || []).length,
            total_stamps: totalStampsCount || 0,
            total_rewards: totalRewardsCount || 0,
            total_rewards_redeemed: totalRewardsRedeemedCount || 0,
            total_notifications: totalNotificationsCount || 0,
            total_campaigns: totalCampaignsCount || 0,
            sample_stamps: (recentStamps || []).length,
            sample_rewards: (recentRewards || []).length,
            sample_notifications: (notifications || []).length,
            sample_campaigns: (scheduledCampaigns || []).length,
            last_customer_at: (customers || [])[0]?.created_at || null,
            last_stamp_at: (recentStamps || [])[0]?.created_at || null,
            last_notification_at: (notifications || [])[0]?.created_at || null
        }

        return NextResponse.json({
            tenant,
            summary,
            program,
            customers: customers || [],
            top_customers: topCustomers || [],
            recent_stamps: stampsDecorated,
            recent_rewards: rewardsDecorated,
            notifications: notifications || [],
            scheduled_campaigns: scheduledCampaigns || [],
            audit_logs: auditLogs || []
        })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno'
        console.error('Error fetching tenant detail admin:', message)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
