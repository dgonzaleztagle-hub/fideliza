import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'

// GET /api/customer/status?whatsapp=+569...&tenant_slug=mi-cafe
// Consulta el estado de un cliente en un negocio
export async function GET(req: NextRequest) {
    const supabase = getSupabase()
    try {
        const { searchParams } = new URL(req.url)
        const whatsapp = searchParams.get('whatsapp')
        const tenantSlug = searchParams.get('tenant_slug')

        if (!whatsapp) {
            return NextResponse.json({ error: 'Falta el parámetro whatsapp' }, { status: 400 })
        }

        // Si viene tenant_slug, buscar en un negocio específico
        let tenantId: string | null = null
        let tenantInfo: any = null

        if (tenantSlug) {
            const { data: tenant } = await supabase
                .from('tenants')
                .select('id, nombre, slug, logo_url, color_primario, rubro')
                .eq('slug', tenantSlug)
                .single()

            if (!tenant) {
                return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
            }
            tenantId = tenant.id
            tenantInfo = tenant
        }

        // Buscar clientes con ese WhatsApp
        let query = supabase
            .from('customers')
            .select('id, nombre, whatsapp, puntos_actuales, total_puntos_historicos, total_premios_canjeados, tenant_id, created_at')
            .eq('whatsapp', whatsapp)

        if (tenantId) {
            query = query.eq('tenant_id', tenantId)
        }

        const { data: customers, error: customerError } = await query

        if (customerError || !customers || customers.length === 0) {
            return NextResponse.json({ error: 'No encontramos un registro con ese WhatsApp' }, { status: 404 })
        }

        // Para cada customer, obtener info del tenant y programa
        const results = []
        for (const customer of customers) {
            // Obtener tenant si no lo tenemos
            let tInfo = tenantInfo
            if (!tInfo) {
                const { data: t } = await supabase
                    .from('tenants')
                    .select('id, nombre, slug, logo_url, color_primario, rubro')
                    .eq('id', customer.tenant_id)
                    .single()
                tInfo = t
            }

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
                    puntos_actuales: customer.puntos_actuales,
                    total_puntos_historicos: customer.total_puntos_historicos,
                    total_premios_canjeados: customer.total_premios_canjeados,
                    miembro_desde: customer.created_at
                },
                negocio: tInfo ? {
                    nombre: tInfo.nombre,
                    slug: tInfo.slug,
                    logo_url: tInfo.logo_url,
                    color_primario: tInfo.color_primario,
                    rubro: tInfo.rubro
                } : null,
                programa: program ? {
                    puntos_meta: program.puntos_meta,
                    descripcion_premio: program.descripcion_premio,
                    tipo_programa: program.tipo_programa,
                    config: program.config
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
