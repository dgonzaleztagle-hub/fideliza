import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'

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

        // Buscar tenant
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('id, nombre, slug')
            .eq('id', tenant_id)
            .single()

        if (tenantError || !tenant) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
        }

        // Construir query de clientes según segmento
        let query = supabase
            .from('customers')
            .select('id, nombre, whatsapp, puntos_actuales, total_puntos_historicos')
            .eq('tenant_id', tenant_id)

        if (segmento === 'activos') {
            // Clientes que visitaron en los últimos 30 días
            const hace30Dias = new Date()
            hace30Dias.setDate(hace30Dias.getDate() - 30)
            // Filtramos por los que tienen stamps recientes
            const { data: recentStamps } = await supabase
                .from('stamps')
                .select('customer_id')
                .eq('tenant_id', tenant_id)
                .gte('fecha', hace30Dias.toISOString().split('T')[0])

            const activeIds = [...new Set(recentStamps?.map(s => s.customer_id) || [])]
            if (activeIds.length > 0) {
                query = query.in('id', activeIds)
            } else {
                return NextResponse.json({
                    message: 'No hay clientes activos en los últimos 30 días',
                    enviadas: 0
                })
            }
        } else if (segmento === 'inactivos') {
            // Clientes con 0 puntos y sin actividad reciente
            query = query.eq('puntos_actuales', 0)
        } else if (segmento === 'cercanos_premio') {
            // Clientes que les falta 1-2 puntos para el premio
            const { data: program } = await supabase
                .from('programs')
                .select('puntos_meta')
                .eq('tenant_id', tenant_id)
                .eq('activo', true)
                .single()

            if (program) {
                query = query.gte('puntos_actuales', program.puntos_meta - 2)
            }
        }
        // segmento === 'todos' o undefined -> sin filtro adicional

        const { data: customers } = await query

        if (!customers || customers.length === 0) {
            return NextResponse.json({
                message: 'No hay clientes en este segmento',
                enviadas: 0
            })
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
            // Los objectIds de Google Wallet se construyen con el patrón ISSUER_ID.CUSTOMER_ID
            const { sendBulkWalletNotifications, ISSUER_ID } = await import('@/lib/walletNotifications')
            const objectIds = customers.map(c => `${ISSUER_ID}.${c.id}`)
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
