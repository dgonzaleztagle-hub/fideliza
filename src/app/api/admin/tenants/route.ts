import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/authz'

export async function GET(_req: NextRequest) {
    const admin = await requireSuperAdmin()
    if (!admin.ok) return admin.response

    const supabase = getSupabase()

    try {
        const { data: tenants, error } = await supabase
            .from('tenants')
            .select(`
                *,
                customers:customers(count),
                stamps:stamps(count),
                rewards:rewards(count)
            `)
            .order('created_at', { ascending: false })

        if (error) throw error

        // Mapear para limpiar conteos
        const result = tenants.map((t: any) => ({
            ...t,
            total_customers: t.customers?.[0]?.count || 0,
            total_stamps: t.stamps?.[0]?.count || 0,
            total_rewards: t.rewards?.[0]?.count || 0
        }))

        return NextResponse.json({ tenants: result })

    } catch (error) {
        console.error('Error fetching admin tenants:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
