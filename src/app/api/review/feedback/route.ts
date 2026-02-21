import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
    const supabase = getSupabase()
    try {
        const { slug, rating, comment } = await req.json()

        if (!slug || !rating || !comment) {
            return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
        }

        const parsedRating = Number(rating)
        if (Number.isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            return NextResponse.json({ error: 'Rating inválido' }, { status: 400 })
        }

        const { data: tenant } = await supabase
            .from('tenants')
            .select('id')
            .eq('slug', slug)
            .single()

        if (!tenant) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
        }

        const { error } = await supabase
            .from('review_feedback')
            .insert({
                tenant_id: tenant.id,
                rating: parsedRating,
                comment: String(comment).trim(),
                source: 'review_page'
            })

        if (error) {
            console.error('Error guardando feedback:', error)
            return NextResponse.json({ error: 'No se pudo guardar feedback' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error en review feedback:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
