import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { requireTenantOwnerById } from '@/lib/authz'
import { PLAN_CATALOG, getEffectiveBillingPlan } from '@/lib/plans'

// POST /api/notifications/send
// Envía notificación manual a clientes vía Google Wallet
export async function POST(req: NextRequest) {
    const supabase = getSupabase()
    try {
        const { tenant_id, titulo, mensaje, segmento } = await req.json()

        if (!tenant_id || !titulo || !mensaje) {
            return NextResponse.json(
                { error: 'Faltan campos: tenant_id, titulo, mensaje' },
                { status: 400 }
            )
        }

        const owner = await requireTenantOwnerById(tenant_id)
        if (!owner.ok) return owner.response

        const { data: tenantPlan } = await supabase
            .from('tenants')
            .select('plan, selected_plan')
            .eq('id', tenant_id)
            .maybeSingle()
        const effectivePlan = getEffectiveBillingPlan(tenantPlan?.plan, tenantPlan?.selected_plan)
        const maxRecipients = PLAN_CATALOG[effectivePlan].limits.monthlyNotificationRecipients
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)
        const { data: monthNotifications } = await supabase
            .from('notifications')
            .select('total_destinatarios')
            .eq('tenant_id', tenant_id)
            .gte('created_at', startOfMonth.toISOString())
        const usedRecipients = (monthNotifications || []).reduce((sum, n) => sum + (n.total_destinatarios || 0), 0)

        // Buscar tenant
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('id, nombre, slug')
            .eq('id', tenant_id)
            .single()

        if (tenantError || !tenant) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
        }

        const { data: allCustomers } = await supabase
            .from('customers')
            .select('id, nombre, whatsapp, puntos_actuales, total_puntos_historicos')
            .eq('tenant_id', tenant_id)

        const customersBase = allCustomers || []
        let customers = customersBase

        if (segmento === 'activos' || segmento === 'inactivos') {
            const hace30Dias = new Date()
            hace30Dias.setDate(hace30Dias.getDate() - 30)
            const { data: recentStamps } = await supabase
                .from('stamps')
                .select('customer_id')
                .eq('tenant_id', tenant_id)
                .gte('fecha', hace30Dias.toISOString().split('T')[0])

            const activeIds = new Set((recentStamps || []).map(s => s.customer_id))
            customers = segmento === 'activos'
                ? customersBase.filter(c => activeIds.has(c.id))
                : customersBase.filter(c => !activeIds.has(c.id))
        } else if (segmento === 'cercanos_premio') {
            const { data: program } = await supabase
                .from('programs')
                .select('puntos_meta')
                .eq('tenant_id', tenant_id)
                .eq('activo', true)
                .single()

            if (program?.puntos_meta) {
                customers = customersBase.filter(c => c.puntos_actuales >= program.puntos_meta - 2)
            } else {
                customers = []
            }
        }

        if (!customers || customers.length === 0) {
            return NextResponse.json({
                message: 'No hay clientes en este segmento',
                enviadas: 0
            })
        }

        if (usedRecipients + customers.length > maxRecipients) {
            const disponibles = Math.max(0, maxRecipients - usedRecipients)
            return NextResponse.json(
                { error: `Límite mensual alcanzado. Te quedan ${disponibles} envíos de destinatario este mes.` },
                { status: 403 }
            )
        }

        // Guardar la notificación en la tabla
        const { data: notification, error: notifError } = await supabase
            .from('notifications')
            .insert({
                tenant_id,
                titulo,
                mensaje,
                segmento: segmento || 'todos',
                total_destinatarios: customers.length,
                estado: 'enviada'
            })
            .select()
            .single()

        if (notifError) {
            // Si la tabla no existe aún, igualmente responder con éxito parcial
            console.warn('Tabla notifications no existe todavía:', notifError.message)
        }

        // Intentar enviar via Google Wallet (degradación elegante si falla)
        let walletResult: { enviadas: number; errores: number } = { enviadas: 0, errores: 0 }
        try {
            // El objectId real es: ISSUER_ID.vuelve-SLUG-CUSTOMER_ID
            const { sendBulkWalletNotifications, ISSUER_ID } = await import('@/lib/walletNotifications')
            const objectIds = customers.map(c => `${ISSUER_ID}.vuelve-${tenant.slug}-${c.id}`)
            walletResult = await sendBulkWalletNotifications(objectIds, titulo, mensaje)
        } catch (walletError) {
            console.warn('Google Wallet push no disponible, notificación registrada:', walletError)
        }

        return NextResponse.json({
            message: `📨 Notificación "${titulo}" enviada a ${customers.length} clientes`,
            enviadas: customers.length,
            wallet_push: walletResult.enviadas,
            wallet_errores: walletResult.errores,
            segmento: segmento || 'todos',
            notification_id: notification?.id || null,
            destinatarios: customers.map(c => ({
                nombre: c.nombre,
                whatsapp: c.whatsapp
            }))
        })

    } catch (error) {
        console.error('Error enviando notificación:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}

// GET /api/notifications/send?tenant_id=...
// Historial de notificaciones enviadas
export async function GET(req: NextRequest) {
    const supabase = getSupabase()
    try {
        const { searchParams } = new URL(req.url)
        const tenant_id = searchParams.get('tenant_id')

        if (!tenant_id) {
            return NextResponse.json({ error: 'Falta tenant_id' }, { status: 400 })
        }

        const owner = await requireTenantOwnerById(tenant_id)
        if (!owner.ok) return owner.response

        const { data: notifications } = await supabase
            .from('notifications')
            .select('*')
            .eq('tenant_id', tenant_id)
            .order('created_at', { ascending: false })
            .limit(50)

        return NextResponse.json({
            notifications: notifications || [],
            total: notifications?.length || 0
        })

    } catch (error) {
        console.error('Error listando notificaciones:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
