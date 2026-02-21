import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
    const supabase = getSupabase()
    try {
        const { customer_id, preferences, whatsapp, tenant_slug } = await req.json()

        if (!customer_id || !preferences || !whatsapp || !tenant_slug) {
            return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
        }

        const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('id, whatsapp, tenant_id')
            .eq('id', customer_id)
            .eq('whatsapp', whatsapp)
            .single()

        if (customerError || !customer) {
            return NextResponse.json({ error: 'Cliente no válido' }, { status: 403 })
        }

        const { data: tenant } = await supabase
            .from('tenants')
            .select('id, slug')
            .eq('id', customer.tenant_id)
            .eq('slug', tenant_slug)
            .single()

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant no válido' }, { status: 403 })
        }

        const { error } = await supabase
            .from('customers')
            .update({ preferences })
            .eq('id', customer_id)

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Preferencias guardadas' })
    } catch (error) {
        console.error('Error saving preferences:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
