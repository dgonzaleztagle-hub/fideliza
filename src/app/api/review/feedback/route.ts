import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
    const supabase = getSupabase()
    try {
        const { slug, rating, comment } = await req.json()
        const ip = getClientIp(req.headers)

        if (!slug || !rating || !comment) {
            return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
        }

        const normalizedSlug = typeof slug === 'string' ? slug.trim().toLowerCase() : ''
        if (!normalizedSlug) {
            return NextResponse.json({ error: 'Slug inválido' }, { status: 400 })
        }

        const parsedRating = Number(rating)
        if (Number.isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            return NextResponse.json({ error: 'Rating inválido' }, { status: 400 })
        }

        const textComment = String(comment).trim()
        if (textComment.length < 3 || textComment.length > 1200) {
            return NextResponse.json({ error: 'Comentario inválido' }, { status: 400 })
        }

        const rate = checkRateLimit(`review-feedback:${ip}:${normalizedSlug}`, 8, 30 * 60 * 1000)
        if (!rate.allowed) {
            return NextResponse.json(
                { error: 'Demasiados envíos. Intenta nuevamente más tarde.' },
                { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
            )
        }

        const { data: tenant } = await supabase
            .from('tenants')
            .select('id')
            .eq('slug', normalizedSlug)
            .single()

        if (!tenant) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
        }

        const { error } = await supabase
            .from('review_feedback')
            .insert({
                tenant_id: tenant.id,
                rating: parsedRating,
                comment: textComment,
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
