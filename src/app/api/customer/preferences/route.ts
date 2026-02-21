import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

function normalizeWhatsapp(value: string): string {
    return value.replace(/[^\d+]/g, '')
}

export async function POST(req: NextRequest) {
    const supabase = getSupabase()
    try {
        const { customer_id, preferences, whatsapp, tenant_slug } = await req.json()
        const ip = getClientIp(req.headers)
        const normalizedWhatsapp = typeof whatsapp === 'string' ? normalizeWhatsapp(whatsapp) : ''
        const normalizedTenantSlug = typeof tenant_slug === 'string' ? tenant_slug.trim().toLowerCase() : ''

        if (!customer_id || !preferences || !normalizedWhatsapp || !normalizedTenantSlug) {
            return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
        }
        if (typeof preferences !== 'object' || Array.isArray(preferences)) {
            return NextResponse.json({ error: 'Formato de preferencias inválido' }, { status: 400 })
        }
        const serialized = JSON.stringify(preferences)
        if (serialized.length > 5000) {
            return NextResponse.json({ error: 'Preferencias demasiado extensas' }, { status: 400 })
        }

        const rate = checkRateLimit(`customer-preferences:${ip}:${normalizedTenantSlug}`, 20, 10 * 60 * 1000)
        if (!rate.allowed) {
            return NextResponse.json(
                { error: 'Demasiadas solicitudes. Intenta nuevamente en unos minutos.' },
                { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
            )
        }

        const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('id, whatsapp, tenant_id')
            .eq('id', customer_id)
            .eq('whatsapp', normalizedWhatsapp)
            .single()

        if (customerError || !customer) {
            return NextResponse.json({ error: 'Cliente no válido' }, { status: 403 })
        }

        const { data: tenant } = await supabase
            .from('tenants')
            .select('id, slug')
            .eq('id', customer.tenant_id)
            .eq('slug', normalizedTenantSlug)
            .single()

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant no válido' }, { status: 403 })
        }

        const { error } = await supabase
            .from('customers')
            .update({ preferences })
            .eq('id', customer_id)

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Preferencias guardadas' })
    } catch (error) {
        console.error('Error saving preferences:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
