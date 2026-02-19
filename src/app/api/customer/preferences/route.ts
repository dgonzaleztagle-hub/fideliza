import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
    const supabase = getSupabase()
    try {
        const { customer_id, preferences } = await req.json()

        if (!customer_id || !preferences) {
            return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
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
