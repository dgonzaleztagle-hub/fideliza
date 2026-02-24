import crypto from 'crypto'
import { cookies } from 'next/headers'

const ADMIN_COOKIE_NAME = 'vuelve_admin_session'
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8 // 8 horas

function getSecret() {
    return process.env.ADMIN_PANEL_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

function base64UrlEncode(value: string) {
    return Buffer.from(value, 'utf8').toString('base64url')
}

function base64UrlDecode(value: string) {
    return Buffer.from(value, 'base64url').toString('utf8')
}

function sign(value: string) {
    const secret = getSecret()
    if (!secret) return ''
    return crypto.createHmac('sha256', secret).update(value).digest('base64url')
}

function getAllowlist() {
    return (process.env.SUPER_ADMIN_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
}

export function isAllowedAdminEmail(email: string) {
    const allowlist = getAllowlist()
    const normalized = email.trim().toLowerCase()
    if (allowlist.length > 0) return allowlist.includes(normalized)
    return normalized.endsWith('@acargoo.cl')
}

export function createAdminSessionToken(email: string) {
    const now = Math.floor(Date.now() / 1000)
    const payload = {
        email: email.trim().toLowerCase(),
        iat: now,
        exp: now + ADMIN_SESSION_TTL_SECONDS
    }
    const payloadEncoded = base64UrlEncode(JSON.stringify(payload))
    const signature = sign(payloadEncoded)
    return `${payloadEncoded}.${signature}`
}

export function verifyAdminSessionToken(token: string): { valid: boolean; email?: string } {
    if (!token || !token.includes('.')) return { valid: false }
    const [payloadEncoded, signature] = token.split('.')
    if (!payloadEncoded || !signature) return { valid: false }

    const expected = sign(payloadEncoded)
    if (!expected) return { valid: false }
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return { valid: false }
    }

    try {
        const parsed = JSON.parse(base64UrlDecode(payloadEncoded)) as {
            email?: string
            exp?: number
        }
        if (!parsed.email || !parsed.exp) return { valid: false }
        if (parsed.exp < Math.floor(Date.now() / 1000)) return { valid: false }
        if (!isAllowedAdminEmail(parsed.email)) return { valid: false }
        return { valid: true, email: parsed.email }
    } catch {
        return { valid: false }
    }
}

export async function getAdminEmailFromCookie(): Promise<string | null> {
    const store = await cookies()
    const raw = store.get(ADMIN_COOKIE_NAME)?.value || ''
    const verified = verifyAdminSessionToken(raw)
    if (!verified.valid || !verified.email) return null
    return verified.email
}

export { ADMIN_COOKIE_NAME, ADMIN_SESSION_TTL_SECONDS }

