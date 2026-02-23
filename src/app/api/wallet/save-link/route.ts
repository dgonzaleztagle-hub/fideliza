import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { generateSaveLink, createLoyaltyClass } from '@/lib/googleWallet'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

function normalizeWhatsapp(value: string): string {
    return value.replace(/[^\d+]/g, '')
}

// POST /api/wallet/save-link
// Genera el link para "Agregar a Google Wallet" de un cliente
export async function POST(req: NextRequest) {
    const supabase = getSupabase()
    try {
        const { tenant_id, whatsapp } = await req.json()
        const ip = getClientIp(req.headers)

        if (!tenant_id || !whatsapp) {
            return NextResponse.json(
                { error: 'Faltan campos: tenant_id, whatsapp' },
                { status: 400 }
            )
        }

        const normalizedWhatsapp = normalizeWhatsapp(String(whatsapp))
        if (!normalizedWhatsapp) {
            return NextResponse.json({ error: 'WhatsApp inválido' }, { status: 400 })
        }
        const rate = checkRateLimit(`wallet-save-link:${ip}:${tenant_id}`, 40, 10 * 60 * 1000)
        if (!rate.allowed) {
            return NextResponse.json(
                { error: 'Demasiadas solicitudes. Intenta nuevamente en unos minutos.' },
                { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
            )
        }

        // Verificar configuración mínima de Google Wallet
        const missing: string[] = []
        if (!process.env.GOOGLE_WALLET_ISSUER_ID) missing.push('GOOGLE_WALLET_ISSUER_ID')
        if (!process.env.GOOGLE_WALLET_PRIVATE_KEY) missing.push('GOOGLE_WALLET_PRIVATE_KEY')
        if (!process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL) missing.push('GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL')

        if (missing.length > 0) {
            return NextResponse.json(
                {
                    error: 'Google Wallet no está configurado en este servidor',
                    configured: false,
                    missing_env: missing
                },
                { status: 503 }
            )
        }

        // Buscar tenant
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('id, nombre, slug, logo_url, color_primario, lat, lng, mensaje_geofencing')
            .eq('id', tenant_id)
            .single()

        if (tenantError || !tenant) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
        }

        // Buscar cliente
        const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('id, nombre, whatsapp, puntos_actuales')
            .eq('tenant_id', tenant_id)
            .eq('whatsapp', normalizedWhatsapp)
            .single()

        if (customerError || !customer) {
            return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
        }

        // Buscar programa activo
        const { data: program } = await supabase
            .from('programs')
            .select('id, nombre, tipo_programa, config')
            .eq('tenant_id', tenant_id)
            .eq('activo', true)
            .single()

        // IDs para Google Wallet
        const classId = `vuelve-${tenant.slug}`
        const objectId = `vuelve-${tenant.slug}-${customer.id}`

        // Intentar crear la clase (si ya existe, Google la ignora)
        try {
            await createLoyaltyClass({
                classId,
                programName: `${tenant.nombre} - Vuelve+`,
                logoUrl: tenant.logo_url || undefined,
                hexBackgroundColor: tenant.color_primario || '#6366f1',
                lat: tenant.lat || undefined,
                lng: tenant.lng || undefined,
                geoMessage: tenant.mensaje_geofencing || undefined
            })
        } catch (classError) {
            // Si falla la creación de clase, puede que ya exista — no es crítico
            console.warn('Clase de lealtad ya existe o error:', classError)
        }

        // Generar el save link
        const saveLink = await generateSaveLink({
            classId,
            objectId,
            merchantName: tenant.nombre,
            userName: customer.nombre,
            points: customer.puntos_actuales || 0,
            logoUrl: tenant.logo_url || undefined,
            hexBackgroundColor: tenant.color_primario || '#6366f1',
            lat: tenant.lat || undefined,
            lng: tenant.lng || undefined,
            geoMessage: tenant.mensaje_geofencing || undefined,
            tipoPrograma: program?.tipo_programa || 'sellos',
            customerWhatsapp: customer.whatsapp,
            tenantSlug: tenant.slug
        })

        return NextResponse.json({
            saveLink,
            message: '✅ Link de Google Wallet generado'
        })

    } catch (error: unknown) {
        console.error('Error generando save link:', error)
        const rawMessage = error instanceof Error ? error.message : 'Error generando link de Google Wallet'
        const isPrivateKeyError =
            rawMessage.includes('secretOrPrivateKey must be an asymmetric key when using RS256')
            || rawMessage.includes('WALLET_PRIVATE_KEY_INVALID_FORMAT')
        const isMissingCredentials = rawMessage.includes('WALLET_CREDENTIALS_MISSING')
        const message = isPrivateKeyError
            ? 'La clave privada de Google Wallet está mal formateada en el servidor.'
            : isMissingCredentials
                ? 'Faltan credenciales de Google Wallet en el servidor.'
                : rawMessage
        return NextResponse.json(
            { error: message, configured: false },
            { status: 500 }
        )
    }
}
