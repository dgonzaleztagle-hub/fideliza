import { NextRequest, NextResponse } from 'next/server'
import {
    ADMIN_COOKIE_NAME,
    ADMIN_SESSION_TTL_SECONDS,
    createAdminSessionToken,
    isAllowedAdminEmail
} from '@/lib/adminSession'
import { getSupabase } from '@/lib/supabase/admin'

const MAX_FAILED_ATTEMPTS = 8
const FAILED_WINDOW_MINUTES = 15

function getRequestIp(req: NextRequest) {
    const forwarded = req.headers.get('x-forwarded-for') || ''
    const first = forwarded.split(',')[0]?.trim()
    return first || 'unknown'
}

async function logAdminAuthEvent(params: {
    action: 'admin_login_failed' | 'admin_login_success'
    email: string
    ip: string
    reason?: string
}) {
    try {
        const supabase = getSupabase()
        await supabase.from('admin_audit_logs').insert({
            admin_email: params.email || 'unknown',
            action: params.action,
            tenant_id: null,
            meta: {
                ip: params.ip,
                reason: params.reason || null,
                at: new Date().toISOString()
            }
        })
    } catch {
        // La auditoría de login no debe bloquear el acceso.
    }
}

async function hasTooManyRecentFailures(email: string, ip: string) {
    try {
        const supabase = getSupabase()
        const { data, error } = await supabase
            .from('admin_audit_logs')
            .select('admin_email, meta, created_at')
            .eq('action', 'admin_login_failed')
            .order('created_at', { ascending: false })
            .limit(300)

        if (error || !data) return false

        const cutoff = Date.now() - FAILED_WINDOW_MINUTES * 60 * 1000
        const recent = data.filter((row) => {
            const createdAt = new Date(row.created_at).getTime()
            if (!Number.isFinite(createdAt) || createdAt < cutoff) return false
            const rowEmail = (row.admin_email || '').toLowerCase()
            const rowIp = String((row.meta as { ip?: string } | null)?.ip || 'unknown')
            return rowEmail === email.toLowerCase() || rowIp === ip
        })

        return recent.length >= MAX_FAILED_ATTEMPTS
    } catch {
        return false
    }
}

export async function POST(req: NextRequest) {
    try {
        const { email, password }: { email?: string; password?: string } = await req.json()
        const ip = getRequestIp(req)
        const normalizedEmail = (email || '').trim().toLowerCase()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email y contraseña son obligatorios' }, { status: 400 })
        }

        if (await hasTooManyRecentFailures(normalizedEmail, ip)) {
            await logAdminAuthEvent({
                action: 'admin_login_failed',
                email: normalizedEmail || 'unknown',
                ip,
                reason: 'blocked_rate_limit'
            })
            return NextResponse.json(
                { error: `Demasiados intentos. Espera ${FAILED_WINDOW_MINUTES} minutos e inténtalo otra vez.` },
                { status: 429 }
            )
        }

        const configuredPassword = process.env.ADMIN_PANEL_PASSWORD || ''
        if (!configuredPassword) {
            await logAdminAuthEvent({
                action: 'admin_login_failed',
                email: normalizedEmail || 'unknown',
                ip,
                reason: 'missing_admin_panel_password'
            })
            return NextResponse.json({ error: 'ADMIN_PANEL_PASSWORD no está configurado' }, { status: 503 })
        }
        if (!isAllowedAdminEmail(email)) {
            await logAdminAuthEvent({
                action: 'admin_login_failed',
                email: normalizedEmail || 'unknown',
                ip,
                reason: 'email_not_allowed'
            })
            return NextResponse.json({ error: 'Acceso restringido a super admin' }, { status: 403 })
        }
        if (password !== configuredPassword) {
            await logAdminAuthEvent({
                action: 'admin_login_failed',
                email: normalizedEmail || 'unknown',
                ip,
                reason: 'invalid_password'
            })
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
        await logAdminAuthEvent({
            action: 'admin_login_success',
            email: normalizedEmail,
            ip
        })
        return res
    } catch {
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
