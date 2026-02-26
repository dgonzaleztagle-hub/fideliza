import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * POST /api/sso/redeem
 *
 * Segunda parte del flujo SSO: el iframe de Vuelve+ llama este endpoint
 * con el sso_token de la URL. El endpoint:
 * 1. Verifica que el token existe, no fue usado y no expiró
 * 2. Marca el token como usado (one-time)
 * 3. Genera un link mágico de Supabase para el auth_user_id del tenant
 * 4. Devuelve un session_url que el frontend usa para autenticarse
 *
 * Body: { sso_token: string }
 * Response: { access_token: string, refresh_token: string, tenant_slug: string }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null)
        if (!body || typeof body !== 'object') {
            return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
        }

        const { sso_token } = body as { sso_token?: string }
        if (!sso_token || typeof sso_token !== 'string') {
            return NextResponse.json({ error: 'sso_token requerido' }, { status: 400 })
        }

        const supabase = getSupabase()

        // 1. Buscar el token y verificar validez
        const { data: tokenRecord, error: tokenError } = await supabase
            .from('sso_tokens')
            .select('id, tenant_id, used, expires_at')
            .eq('token', sso_token)
            .maybeSingle()

        if (tokenError || !tokenRecord) {
            return NextResponse.json({ error: 'Token SSO inválido' }, { status: 401 })
        }

        if (tokenRecord.used) {
            return NextResponse.json({ error: 'Token SSO ya fue utilizado' }, { status: 401 })
        }

        if (new Date(tokenRecord.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Token SSO expirado' }, { status: 401 })
        }

        // 2. Marcar como usado ANTES de emitir la sesión (previene race conditions)
        const { error: updateError } = await supabase
            .from('sso_tokens')
            .update({ used: true })
            .eq('id', tokenRecord.id)

        if (updateError) {
            console.error('[SSO/redeem] Error marcando token como usado:', updateError.message)
            return NextResponse.json({ error: 'Error interno SSO' }, { status: 500 })
        }

        // 3. Obtener el auth_user_id del tenant
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('id, slug, nombre, auth_user_id')
            .eq('id', tokenRecord.tenant_id)
            .maybeSingle()

        if (tenantError || !tenant || !tenant.auth_user_id) {
            return NextResponse.json({ error: 'Tenant no encontrado o sin usuario vinculado' }, { status: 404 })
        }

        // 4. Crear sesión usando el Admin SDK de Supabase
        // Generamos un link de magic link para el user y lo intercambiamos por tokens
        const adminClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
            type: 'magiclink',
            email: '', // Se sobreescribe con el user_id abajo
        })

        // Enfoque más directo: usar signInWithPassword no aplica aquí.
        // Usamos createSession con el user_id directamente (Supabase Admin API)
        // Nota: Esta API no está en el SDK oficial de JS todavía, pero podemos
        // usar el REST endpoint directamente.
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

        const sessionRes = await fetch(
            `${url}/auth/v1/admin/users/${tenant.auth_user_id}`,
            {
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                    'Content-Type': 'application/json'
                }
            }
        )

        if (!sessionRes.ok) {
            console.error('[SSO/redeem] Error obteniendo usuario admin:', await sessionRes.text())
            return NextResponse.json({ error: 'Error al generar sesión SSO' }, { status: 500 })
        }

        // Generar token de sesión usando el endpoint de impersonación de Supabase
        // POST /auth/v1/admin/users/:id/generate-link no existe, usamos generate_link
        // con el email del usuario
        const userData = await sessionRes.json()
        const userEmail = userData?.email

        if (!userEmail) {
            return NextResponse.json({ error: 'Usuario sin email configurado' }, { status: 409 })
        }

        // Generamos el magic link y extraemos los tokens de la URL
        const { data: magicData, error: magicError } = await adminClient.auth.admin.generateLink({
            type: 'magiclink',
            email: userEmail,
            options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/cliente` }
        })

        if (magicError || !magicData?.properties) {
            console.error('[SSO/redeem] Error generando magic link:', magicError?.message)
            return NextResponse.json({ error: 'Error generando sesión de acceso' }, { status: 500 })
        }

        // Limpiar referencia
        void linkData
        void linkError

        // El hashed_token del magic link permite hacer el exchange por una sesión real
        const hashedToken = magicData.properties.hashed_token

        // Intercambiamos el hashed_token por access_token + refresh_token
        const exchangeRes = await fetch(
            `${url}/auth/v1/verify`,
            {
                method: 'POST',
                headers: {
                    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'magiclink',
                    token_hash: hashedToken
                })
            }
        )

        if (!exchangeRes.ok) {
            const errText = await exchangeRes.text()
            console.error('[SSO/redeem] Error exchanging hashed_token:', errText)
            return NextResponse.json({ error: 'Error intercambiando token de sesión' }, { status: 500 })
        }

        const sessionData = await exchangeRes.json()

        return NextResponse.json({
            access_token: sessionData.access_token,
            refresh_token: sessionData.refresh_token,
            tenant_slug: tenant.slug,
            tenant_nombre: tenant.nombre
        })

    } catch (err) {
        console.error('[SSO/redeem] Error inesperado:', err)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}
