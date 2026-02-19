import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
    const supabase = getSupabase()

    try {
        // 1. Total Tenants
        const { count: totalTenants, error: tenantsError } = await supabase
            .from('tenants')
            .select('*', { count: 'exact', head: true })

        // 2. Total Customers (Global)
        const { count: totalCustomers, error: customersError } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true })

        // 3. Stamps Globales
        const { count: totalStamps, error: stampsError } = await supabase
            .from('stamps')
            .select('*', { count: 'exact', head: true })

        // 4. Premios Canjeados Globales
        const { count: totalPremios, error: premiosError } = await supabase
            .from('rewards')
            .select('*', { count: 'exact', head: true })
            .eq('canjeado', true)

        // 5. Tenants activos vs trial
        const { data: tenantsData, error: tenantsDataError } = await supabase
            .from('tenants')
            .select('plan, estado')

        const statsPlan = {
            trial: tenantsData?.filter(t => t.plan === 'trial').length || 0,
            pro: tenantsData?.filter(t => t.plan === 'pro' || t.plan === 'premium').length || 0,
            pausados: tenantsData?.filter(t => t.estado === 'pausado').length || 0
        }

        // 6. MRR Proyectado (en base a $29.990)
        const mrrProyectado = statsPlan.pro * 29990

        return NextResponse.json({
            totalTenants,
            totalCustomers,
            totalStamps,
            totalPremios,
            statsPlan,
            mrrProyectado
        })

    } catch (error) {
        console.error('Error en admin stats:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
