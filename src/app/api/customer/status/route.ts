import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { getMotorConfig } from '@/lib/motorConfig'

function normalizeWhatsapp(value: string): string {
    return value.replace(/[^\d+]/g, '')
}

// GET /api/customer/status?whatsapp=+569...&tenant_slug=mi-cafe
// Consulta el estado de un cliente en un negocio
export async function GET(req: NextRequest) {
    const supabase = getSupabase()
    try {
        const { searchParams } = new URL(req.url)
        const whatsapp = searchParams.get('whatsapp')
        const tenantSlug = searchParams.get('tenant_slug')
        const ip = getClientIp(req.headers)

        if (!whatsapp) {
            return NextResponse.json({ error: 'Falta el parámetro whatsapp' }, { status: 400 })
        }
        if (!tenantSlug) {
            return NextResponse.json({ error: 'Falta el parámetro tenant_slug' }, { status: 400 })
        }

        const normalizedWhatsapp = normalizeWhatsapp(whatsapp)
        const normalizedTenantSlug = tenantSlug.trim().toLowerCase()
        if (normalizedWhatsapp.length < 8) {
            return NextResponse.json({ error: 'whatsapp inválido' }, { status: 400 })
        }
        if (!normalizedTenantSlug) {
            return NextResponse.json({ error: 'tenant_slug inválido' }, { status: 400 })
        }

        const rate = checkRateLimit(`customer-status:${ip}:${normalizedTenantSlug}`, 30, 10 * 60 * 1000)
        if (!rate.allowed) {
            return NextResponse.json(
                { error: 'Demasiadas consultas. Intenta nuevamente en unos minutos.' },
                { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
            )
        }

        const tenantWithAssets = await supabase
            .from('tenants')
            .select('id, nombre, slug, logo_url, card_background_url, card_background_overlay, stamp_icon_url, color_primario, rubro')
            .eq('slug', normalizedTenantSlug)
            .single()
        let tenant = tenantWithAssets.data
        if (!tenant && tenantWithAssets.error && tenantWithAssets.error.code === '42703') {
            const tenantLegacy = await supabase
                .from('tenants')
                .select('id, nombre, slug, logo_url, color_primario, rubro')
                .eq('slug', normalizedTenantSlug)
                .single()
            tenant = tenantLegacy.data
                ? { ...tenantLegacy.data, card_background_url: null, card_background_overlay: 0.22, stamp_icon_url: null }
                : null
        }

        if (!tenant) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
        }

        // Buscar cliente en ese negocio específico
        const { data: customers, error: customerError } = await supabase
            .from('customers')
            .select('id, nombre, whatsapp, puntos_actuales, total_puntos_historicos, total_premios_canjeados, tenant_id, created_at')
            .eq('whatsapp', normalizedWhatsapp)
            .eq('tenant_id', tenant.id)

        if (customerError || !customers || customers.length === 0) {
            return NextResponse.json({ tarjetas: [], total: 0 }, { status: 200 })
        }

        // Para cada customer, obtener info del tenant y programa
        const results = []
        for (const customer of customers) {
            // Obtener programa activo
            const { data: program } = await supabase
                .from('programs')
                .select('id, puntos_meta, descripcion_premio, tipo_programa, config')
                .eq('tenant_id', customer.tenant_id)
                .eq('activo', true)
                .single()

            // Obtener premios pendientes
            const { data: rewards } = await supabase
                .from('rewards')
                .select('id, qr_code, descripcion, canjeado, created_at')
                .eq('customer_id', customer.id)
                .eq('canjeado', false)
                .order('created_at', { ascending: false })
                .limit(5)

            // Obtener membresías activas
            const { data: memberships } = await supabase
                .from('memberships')
                .select('id, estado, saldo_cashback, usos_restantes, fecha_fin')
                .eq('customer_id', customer.id)
                .eq('tenant_id', customer.tenant_id)
                .eq('estado', 'activo')
                .limit(1)

            results.push({
                customer: {
                    id: customer.id,
                    nombre: customer.nombre,
                    whatsapp: customer.whatsapp,
                    puntos_actuales: customer.puntos_actuales,
                    total_puntos_historicos: customer.total_puntos_historicos,
                    total_premios_canjeados: customer.total_premios_canjeados,
                    miembro_desde: customer.created_at
                },
                negocio: tenant ? {
                    nombre: tenant.nombre,
                    slug: tenant.slug,
                    logo_url: tenant.logo_url,
                    card_background_url: tenant.card_background_url,
                    card_background_overlay: tenant.card_background_overlay,
                    stamp_icon_url: tenant.stamp_icon_url,
                    color_primario: tenant.color_primario,
                    rubro: tenant.rubro
                } : null,
                programa: program ? {
                    puntos_meta: program.puntos_meta,
                    descripcion_premio: program.descripcion_premio,
                    tipo_programa: program.tipo_programa,
                    config: getMotorConfig(program.config, program.tipo_programa)
                } : null,
                premios_pendientes: rewards || [],
                membership: memberships?.[0] || null
            })
        }

        return NextResponse.json({
            tarjetas: results,
            total: results.length
        })

    } catch (error) {
        console.error('Error en customer status:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
