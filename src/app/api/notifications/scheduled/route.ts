import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'

// GET /api/notifications/scheduled?tenant_id=...
// POST /api/notifications/scheduled
// DELETE /api/notifications/scheduled?id=...

export async function GET(req: NextRequest) {
    const supabase = getSupabase()
    const { searchParams } = new URL(req.url)
    const tenant_id = searchParams.get('tenant_id')

    if (!tenant_id) {
        return NextResponse.json({ error: 'Falta tenant_id' }, { status: 400 })
    }

    const { data: campaigns, error } = await supabase
        .from('scheduled_campaigns')
        .select('*')
        .eq('tenant_id', tenant_id)
        .order('fecha_envio', { ascending: true })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ campaigns })
}

export async function POST(req: NextRequest) {
    const supabase = getSupabase()
    try {
        const body = await req.json()
        const { tenant_id, nombre, fecha_envio, titulo_notif, mensaje_notif, segmento } = body

        if (!tenant_id || !nombre || !fecha_envio || !titulo_notif || !mensaje_notif) {
            return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
        }

        const { data: campaign, error } = await supabase
            .from('scheduled_campaigns')
            .insert({
                tenant_id,
                nombre,
                fecha_envio,
                titulo_notif,
                mensaje_notif,
                segmento: segmento || 'todos',
                activo: true,
                estado: 'pendiente'
            })
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ campaign }, { status: 201 })
    } catch (err) {
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const supabase = getSupabase()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: 'Falta id' }, { status: 400 })
    }

    const { error } = await supabase
        .from('scheduled_campaigns')
        .delete()
        .eq('id', id)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Campaña eliminada' })
}
