import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/authz'

export async function GET() {
    const admin = await requireSuperAdmin()
    if (!admin.ok) return admin.response

    const supabase = getSupabase()
    try {
        const { data, error } = await supabase
            .from('admin_audit_logs')
            .select('id, admin_email, action, tenant_id, meta, created_at')
            .order('created_at', { ascending: false })
            .limit(200)

        if (error) throw error

        return NextResponse.json({ logs: data || [] })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno'
        console.error('Error fetching admin logs:', message)
        return NextResponse.json({ logs: [], error: 'No fue posible cargar los logs' }, { status: 500 })
    }
}
