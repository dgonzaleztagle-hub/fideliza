import { NextRequest, NextResponse } from 'next/server'
import {
    ADMIN_COOKIE_NAME,
    ADMIN_SESSION_TTL_SECONDS,
    createAdminSessionToken,
    isAllowedAdminEmail
} from '@/lib/adminSession'

export async function POST(req: NextRequest) {
    try {
        const { email, password }: { email?: string; password?: string } = await req.json()
        if (!email || !password) {
            return NextResponse.json({ error: 'Email y contraseña son obligatorios' }, { status: 400 })
        }

        const configuredPassword = process.env.ADMIN_PANEL_PASSWORD || ''
        if (!configuredPassword) {
            return NextResponse.json({ error: 'ADMIN_PANEL_PASSWORD no está configurado' }, { status: 503 })
        }
        if (!isAllowedAdminEmail(email)) {
            return NextResponse.json({ error: 'Acceso restringido a super admin' }, { status: 403 })
        }
        if (password !== configuredPassword) {
            return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
        }

        const token = createAdminSessionToken(email)
        if (!token) {
            return NextResponse.json({ error: 'No fue posible crear sesión admin' }, { status: 500 })
        }

        const res = NextResponse.json({ ok: true })
        res.cookies.set({
            name: ADMIN_COOKIE_NAME,
            value: token,
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: ADMIN_SESSION_TTL_SECONDS
        })
        return res
    } catch {
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}

