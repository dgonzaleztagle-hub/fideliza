import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { hashPin, isValidPin, verifyPin } from '@/lib/security/pin'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

type AttemptState = {
    fails: number
    firstFailAt: number
    blockedUntil: number
}

const attempts = new Map<string, AttemptState>()
const WINDOW_MS = 10 * 60 * 1000
const BLOCK_MS = 15 * 60 * 1000
const MAX_FAILS = 5

export async function POST(req: Request) {
    try {
        const { slug, pin } = await req.json()
        const ip = getClientIp(req.headers)
        const slugValue = typeof slug === 'string' ? slug.trim() : ''
        const pinValue = typeof pin === 'string' ? pin.trim() : ''
        const key = `${slugValue}:${ip}`
        const now = Date.now()

        const ipRate = checkRateLimit(`staff-login-ip:${ip}`, 80, 10 * 60 * 1000)
        if (!ipRate.allowed) {
            return NextResponse.json(
                { error: 'Demasiadas solicitudes. Intenta nuevamente en unos minutos.' },
                { status: 429, headers: { 'Retry-After': String(ipRate.retryAfterSec) } }
            )
        }
        const slugRate = checkRateLimit(`staff-login:${ip}:${slugValue}`, 20, 10 * 60 * 1000)
        if (!slugRate.allowed) {
            return NextResponse.json(
                { error: 'Demasiados intentos. Intenta nuevamente en unos minutos.' },
                { status: 429, headers: { 'Retry-After': String(slugRate.retryAfterSec) } }
            )
        }

        const state = attempts.get(key)
        if (state && state.blockedUntil > now) {
            return NextResponse.json(
                { error: 'Demasiados intentos. Intenta nuevamente en unos minutos.' },
                { status: 429 }
            )
        }

        if (!slugValue || !pinValue) {
            return NextResponse.json({ error: 'Faltan credenciales' }, { status: 400 })
        }
        if (!isValidPin(pinValue)) {
            return NextResponse.json({ error: 'PIN inválido' }, { status: 400 })
        }
        const supabase = getSupabase()

        // 1. Buscar el tenant por slug
        const { data: tenant, error: tError } = await supabase
            .from('tenants')
            .select('id, nombre')
            .eq('slug', slugValue)
            .single()

        if (tError || !tenant) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
        }

        // 2. Buscar staff activo dentro de ese tenant y verificar PIN
        const { data: staffList, error: sError } = await supabase
            .from('staff_profiles')
            .select('id, nombre, rol, pin, pin_hash')
            .eq('tenant_id', tenant.id)
            .eq('activo', true)
            .limit(200)

        let legacyStaffList: Array<{ id: string; nombre: string; rol: string; pin: string | null }> | null = null
        if (sError && sError.message?.includes('pin_hash')) {
            const legacy = await supabase
                .from('staff_profiles')
                .select('id, nombre, rol, pin')
                .eq('tenant_id', tenant.id)
                .eq('activo', true)
                .limit(200)
            legacyStaffList = legacy.data
        }

        const staff = (staffList || legacyStaffList || []).find((row) =>
            verifyPin(
                pinValue,
                'pin_hash' in row ? (row.pin_hash as string | null) : null,
                row.pin as string | null
            )
        ) || null

        if ((sError && !legacyStaffList) || !staff) {
            const current = attempts.get(key)
            if (!current || now - current.firstFailAt > WINDOW_MS) {
                attempts.set(key, { fails: 1, firstFailAt: now, blockedUntil: 0 })
            } else {
                const fails = current.fails + 1
                const blockedUntil = fails >= MAX_FAILS ? now + BLOCK_MS : 0
                attempts.set(key, { fails, firstFailAt: current.firstFailAt, blockedUntil })
            }
            return NextResponse.json({ error: 'PIN incorrecto o cuenta inactiva' }, { status: 401 })
        }

        attempts.delete(key)

        // Upgrade silencioso de PIN legacy en texto plano a hash seguro
        const hasHashedPinColumn = 'pin_hash' in staff
        const currentHash = hasHashedPinColumn ? (staff.pin_hash as string | null) : null
        if (!currentHash && staff.pin) {
            await supabase
                .from('staff_profiles')
                .update({
                    pin_hash: hashPin(pinValue),
                    pin: null
                })
                .eq('id', staff.id)
        }

        // 3. Retornar éxito y datos de sesión básica
        // En Fase 2.1 podríamos usar JWT, por ahora manejo simple de sesión en cliente
        return NextResponse.json({
            success: true,
            staff: {
                id: staff.id,
                nombre: staff.nombre,
                rol: staff.rol
            },
            tenant: {
                id: tenant.id,
                nombre: tenant.nombre,
                slug: slugValue
            }
        })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
