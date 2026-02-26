import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import crypto from 'crypto'

// --- Configuración ---
const SSO_TOKEN_TTL_SECONDS = 60 // El token expira en 60 segundos (uso único)

/**
 * POST /api/sso/exchange
 *
 * Endpoint de autenticación SSO para integraciones white-label de HojaCero.
 * Permite que un panel de cliente H0 obtenga una sesión válida de Vuelve+
 * sin exponer credenciales al usuario final.
 *
 * Body: { tenant_id: string, secret: string }
 * Response: { sso_token: string, tenant_slug: string, expires_in: number }
 */
export async function POST(req: NextRequest) {
    try {
        // 1. Validar body
        const body = await req.json().catch(() => null)
        if (!body || typeof body !== 'object') {
            return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
        }

        const { tenant_id, secret } = body as { tenant_id?: string; secret?: string }

        if (!tenant_id || !secret) {
            return NextResponse.json({ error: 'tenant_id y secret son requeridos' }, { status: 400 })
        }

        // 2. Validar el secreto compartido (timing-safe para prevenir timing attacks)
        const configuredSecret = process.env.VUELVE_SSO_SECRET || ''
        if (!configuredSecret) {
            return NextResponse.json({ error: 'SSO no configurado en el servidor' }, { status: 503 })
        }

        const secretBuffer = Buffer.from(secret)
        const configuredBuffer = Buffer.from(configuredSecret)

        // Los buffers deben ser del mismo largo para timingSafeEqual
        if (
            secretBuffer.length !== configuredBuffer.length ||
            !crypto.timingSafeEqual(secretBuffer, configuredBuffer)
        ) {
            return NextResponse.json({ error: 'Secreto inválido' }, { status: 403 })
        }

        // 3. Verificar que el tenant existe en la DB
        const supabase = getSupabase()
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('id, slug, nombre, auth_user_id, estado')
            .eq('id', tenant_id)
            .maybeSingle()

        if (tenantError || !tenant) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
        }

        if (!tenant.auth_user_id) {
            return NextResponse.json({ error: 'Negocio sin usuario vinculado' }, { status: 409 })
        }

        if (tenant.estado === 'suspended') {
            return NextResponse.json({ error: 'Negocio suspendido' }, { status: 403 })
        }

        // 4. Generar SSO token de un solo uso (no reutilizable)
        const ssoToken = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + SSO_TOKEN_TTL_SECONDS * 1000).toISOString()

        const { error: insertError } = await supabase
            .from('sso_tokens')
            .insert({
                tenant_id: tenant.id,
                token: ssoToken,
                expires_at: expiresAt
            })

        if (insertError) {
            console.error('[SSO] Error creando token:', insertError.message)
            return NextResponse.json({ error: 'Error interno al crear sesión SSO' }, { status: 500 })
        }

        // 5. Responder con el token y el slug del tenant
        return NextResponse.json({
            sso_token: ssoToken,
            tenant_slug: tenant.slug,
            tenant_nombre: tenant.nombre,
            expires_in: SSO_TOKEN_TTL_SECONDS
        })

    } catch (err) {
        console.error('[SSO] Error inesperado:', err)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}
