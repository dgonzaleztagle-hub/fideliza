import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { generateSaveLink, createLoyaltyClass } from '@/lib/googleWallet'

// POST /api/wallet/save-link
// Genera el link para "Agregar a Google Wallet" de un cliente
export async function POST(req: NextRequest) {
    const supabase = getSupabase()
    try {
        const { tenant_id, whatsapp } = await req.json()

        if (!tenant_id || !whatsapp) {
            return NextResponse.json(
                { error: 'Faltan campos: tenant_id, whatsapp' },
                { status: 400 }
            )
        }

        // Verificar que Google Wallet está configurado
        if (!process.env.GOOGLE_WALLET_ISSUER_ID || !process.env.GOOGLE_WALLET_PRIVATE_KEY) {
            return NextResponse.json(
                { error: 'Google Wallet no está configurado en este servidor', configured: false },
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
            .eq('whatsapp', whatsapp)
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

    } catch (error: any) {
        console.error('Error generando save link:', error)
        return NextResponse.json(
            { error: error.message || 'Error generando link de Google Wallet' },
            { status: 500 }
        )
    }
}
