import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // El 'next' nos dirá a qué página volver (probablemente /qr/[slug])
    const requestedNext = searchParams.get('next') ?? '/'
    const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//')
        ? requestedNext
        : '/'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // Si hay error, volver al home o a una página de error
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
