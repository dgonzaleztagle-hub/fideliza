import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/authz'
import { isBillingPlan } from '@/lib/plans'

type TenantAdminAction =
    | 'activate'
    | 'pause'
    | 'convert_pro'
    | 'convert_plan'
    | 'extend_trial'
    | 'set_pilot'

async function insertAuditLog(params: {
    admin_email: string
    action: string
    tenant_id: string
    meta?: Record<string, unknown>
}) {
    const supabase = getSupabase()
    const { error } = await supabase.from('admin_audit_logs').insert({
        admin_email: params.admin_email,
        action: params.action,
        tenant_id: params.tenant_id,
        meta: params.meta || {}
    })
    if (error) {
        // La auditoría no debe bloquear la operación admin.
        console.warn('admin_audit_logs insert failed:', error.message)
    }
}

// POST /api/admin/tenant/[id]/status
// Actualizar plan/estado del tenant (Activación manual)
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const admin = await requireSuperAdmin()
    if (!admin.ok) return admin.response

    const supabase = getSupabase()
    const { id } = await params

    try {
        const body = await req.json()
        const action = body?.action as TenantAdminAction | undefined

        if (!action || !['activate', 'pause', 'convert_pro', 'convert_plan', 'extend_trial', 'set_pilot'].includes(action)) {
            return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
        }

        let currentTenant: {
            id: string
            plan: string | null
            selected_plan: string | null
            estado: string | null
            trial_hasta: string | null
            is_pilot: boolean
            pilot_started_at: string | null
        } | null = null
        let currentTenantError: { message: string } | null = null

        {
            const result = await supabase
                .from('tenants')
                .select('id, plan, selected_plan, estado, trial_hasta, is_pilot, pilot_started_at')
                .eq('id', id)
                .maybeSingle()
            currentTenant = (result.data as typeof currentTenant) ?? null
            currentTenantError = result.error ? { message: result.error.message } : null
        }

        if (currentTenantError && (
            currentTenantError.message.includes('column tenants.is_pilot does not exist')
            || currentTenantError.message.includes('column tenants.pilot_started_at does not exist')
            || currentTenantError.message.includes('column tenants.selected_plan does not exist')
        )) {
            const fallback = await supabase
                .from('tenants')
                .select('id, plan, estado, trial_hasta')
                .eq('id', id)
                .maybeSingle()
            currentTenant = fallback.data
                ? {
                    ...(fallback.data as { id: string; plan: string | null; estado: string | null; trial_hasta: string | null }),
                    selected_plan: null,
                    is_pilot: false,
                    pilot_started_at: null
                }
                : null
            currentTenantError = fallback.error ? { message: fallback.error.message } : null
        }

        if (currentTenantError) throw new Error(currentTenantError.message)
        if (!currentTenant) return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 })

        let updateData: Record<string, unknown> = {}
        let auditMeta: Record<string, unknown> = {}

        if (action === 'activate') {
            // Dar 30 días adicionales
            const nuevaFecha = new Date()
            nuevaFecha.setDate(nuevaFecha.getDate() + 30)

            updateData = {
                estado: 'activo',
                trial_hasta: nuevaFecha.toISOString()
            }
            auditMeta = { days_added: 30 }
        } else if (action === 'pause') {
            updateData = { estado: 'pausado' }
            auditMeta = { previous_status: currentTenant.estado }
        } else if (action === 'convert_pro') {
            updateData = { plan: 'pro', selected_plan: 'pro', estado: 'activo' }
            auditMeta = { previous_plan: currentTenant.plan, target_plan: 'pro' }
        } else if (action === 'convert_plan') {
            const plan = typeof body?.plan === 'string' ? body.plan : ''
            if (!isBillingPlan(plan)) {
                return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
            }
            updateData = {
                plan,
                selected_plan: plan,
                estado: 'activo'
            }
            auditMeta = { previous_plan: currentTenant.plan, target_plan: plan }
        } else if (action === 'extend_trial') {
            const rawDays = Number(body?.days || 0)
            const days = Math.max(1, Math.min(180, Math.round(rawDays || 30)))
            const baseDate = currentTenant.trial_hasta && new Date(currentTenant.trial_hasta) > new Date()
                ? new Date(currentTenant.trial_hasta)
                : new Date()
            baseDate.setDate(baseDate.getDate() + days)
            updateData = {
                trial_hasta: baseDate.toISOString(),
                estado: 'activo'
            }
            auditMeta = { days_added: days }
        } else if (action === 'set_pilot') {
            const enabled = Boolean(body?.enabled)
            const notes = typeof body?.notes === 'string' ? body.notes.trim() : ''
            updateData = {
                is_pilot: enabled,
                pilot_started_at: enabled
                    ? (currentTenant.pilot_started_at || new Date().toISOString())
                    : null,
                pilot_notes: notes || null
            }
            auditMeta = { enabled, notes }
        }

        const { data, error } = await supabase
            .from('tenants')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error && (
            `${error.message || ''} ${error.details || ''}`.includes('is_pilot')
            || `${error.message || ''} ${error.details || ''}`.includes('pilot_started_at')
            || `${error.message || ''} ${error.details || ''}`.includes('pilot_notes')
            || `${error.message || ''} ${error.details || ''}`.includes('selected_plan')
        )) {
            const fallbackData = { ...updateData }
            delete fallbackData.is_pilot
            delete fallbackData.pilot_started_at
            delete fallbackData.pilot_notes
            delete fallbackData.selected_plan
            const fallback = await supabase
                .from('tenants')
                .update(fallbackData)
                .eq('id', id)
                .select()
                .single()
            if (fallback.error) throw fallback.error
            await insertAuditLog({
                admin_email: admin.user.email || 'admin@local',
                action,
                tenant_id: id,
                meta: { ...auditMeta, schema_fallback: true }
            })
            return NextResponse.json({
                message: 'Tenant actualizado con éxito',
                tenant: fallback.data
            })
        }

        if (error) throw error

        await insertAuditLog({
            admin_email: admin.user.email || 'admin@local',
            action,
            tenant_id: id,
            meta: auditMeta
        })

        return NextResponse.json({
            message: 'Tenant actualizado con éxito',
            tenant: data
        })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error al actualizar tenant'
        console.error('Error updating tenant status:', message)
        return NextResponse.json({ error: 'Error al actualizar tenant' }, { status: 500 })
    }
}
