import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/authz'

export async function GET(_req: NextRequest) {
    const admin = await requireSuperAdmin()
    if (!admin.ok) return admin.response

    const supabase = getSupabase()

    try {
        // 1. Total Tenants
        const { count: totalTenants, error: tenantsError } = await supabase
            .from('tenants')
            .select('*', { count: 'exact', head: true })
        if (tenantsError) throw tenantsError

        // 2. Total Customers (Global)
        const { count: totalCustomers, error: customersError } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true })
        if (customersError) throw customersError

        // 3. Stamps Globales
        const { count: totalStamps, error: stampsError } = await supabase
            .from('stamps')
            .select('*', { count: 'exact', head: true })
        if (stampsError) throw stampsError

        // 4. Premios Canjeados Globales
        const { count: totalPremios, error: premiosError } = await supabase
            .from('rewards')
            .select('*', { count: 'exact', head: true })
            .eq('canjeado', true)
        if (premiosError) throw premiosError

        // 5. Tenants activos vs trial
        const { data: tenantsData, error: tenantsDataError } = await supabase
            .from('tenants')
            .select('plan, estado')
        if (tenantsDataError) throw tenantsDataError

        const statsPlan = {
            trial: tenantsData?.filter(t => t.plan === 'trial').length || 0,
            pro: tenantsData?.filter(t => t.plan === 'pro' || t.plan === 'premium').length || 0,
            pausados: tenantsData?.filter(t => t.estado === 'pausado').length || 0
        }

        // 6. MRR Proyectado (en base a $34.990)
        const mrrProyectado = statsPlan.pro * 34990

        // 7. Clientes Activos (últimos 30 días)
        const hace30dias = new Date()
        hace30dias.setDate(hace30dias.getDate() - 30)

        const { data: activeStamps } = await supabase
            .from('stamps')
            .select('customer_id')
            .gte('created_at', hace30dias.toISOString())

        const activeCustomers = new Set(activeStamps?.map(s => s.customer_id)).size

        return NextResponse.json({
            totalTenants,
            totalCustomers,
            activeCustomers,
            totalStamps,
            totalPremios,
            statsPlan,
            mrrProyectado
        })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno'
        console.error('Error en admin stats:', message)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
