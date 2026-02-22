import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { requireTenantOwnerById } from '@/lib/authz'
import { PLAN_CATALOG, getEffectiveBillingPlan } from '@/lib/plans'

export async function GET(req: NextRequest) {
    const supabase = getSupabase()
    try {
        const { searchParams } = new URL(req.url)
        const tenant_id = searchParams.get('tenant_id')

        if (!tenant_id) {
            return NextResponse.json({ error: 'Falta tenant_id' }, { status: 400 })
        }

        const owner = await requireTenantOwnerById(tenant_id)
        if (!owner.ok) return owner.response

        const { data: tenantPlan } = await supabase
            .from('tenants')
            .select('plan, selected_plan')
            .eq('id', tenant_id)
            .maybeSingle()
        const effectivePlan = getEffectiveBillingPlan(tenantPlan?.plan, tenantPlan?.selected_plan)
        if (!PLAN_CATALOG[effectivePlan].limits.exportCsv) {
            return NextResponse.json(
                { error: 'Tu plan actual no incluye exportación CSV.' },
                { status: 403 }
            )
        }

        // Obtener clientes
        const { data: customers, error } = await supabase
            .from('customers')
            .select('nombre, whatsapp, email, puntos_actuales, total_puntos_historicos, tier, current_streak, created_at')
            .eq('tenant_id', tenant_id)
            .order('created_at', { ascending: false })

        if (error) throw error

        if (!customers || customers.length === 0) {
            return NextResponse.json({ error: 'No hay clientes para exportar' }, { status: 404 })
        }

        // Generar CSV
        const headers = ['Nombre', 'WhatsApp', 'Email', 'Puntos Actuales', 'Puntos Historicos', 'Rango', 'Racha Semanal', 'Fecha Registro']
        const rows = customers.map(c => [
            `"${c.nombre}"`,
            `"${c.whatsapp}"`,
            `"${c.email || ''}"`,
            c.puntos_actuales,
            c.total_puntos_historicos,
            `"${c.tier || 'bronce'}"`,
            c.current_streak || 0,
            new Date(c.created_at).toLocaleDateString('es-CL')
        ])

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

        // Retornar como archivo descargable
        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="clientes_vuelveplus_${new Date().toISOString().split('T')[0]}.csv"`
            }
        })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno al exportar'
        console.error('Error exportando clientes:', message)
        return NextResponse.json({ error: 'Error interno al exportar' }, { status: 500 })
    }
}
