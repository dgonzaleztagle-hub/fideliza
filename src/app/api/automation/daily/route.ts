import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { triggerWalletPush } from '@/lib/wallet/push'

// GET /api/automation/daily
// Este endpoint debe ser llamado por un Cron Job cada mañana (ej: 9:00 AM)

export async function GET(req: NextRequest) {
    const supabase = getSupabase()
    const results = {
        birthdays: 0,
        scheduled: 0,
        errors: [] as string[]
    }

    try {
        const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
        const [month, day] = [today.split('-')[1], today.split('-')[2]]

        // 1. PROCESAR CUMPLEAÑOS
        // Buscamos clientes que cumplen años hoy (ignorando el año)
        const { data: birthdayCustomers, error: bdayError } = await supabase
            .from('customers')
            .select(`
                id, nombre, whatsapp, tenant_id,
                tenants:tenant_id (
                    slug, nombre, 
                    programs:programs (
                        config
                    )
                )
            `)
            .filter('fecha_nacimiento', 'not.is', null)

        if (bdayError) results.errors.push(`Error cumpleaños: ${bdayError.message}`)

        if (birthdayCustomers) {
            // Filtrado manual por mes y día (Postgres no tiene una forma súper sencilla de ignorar el año sin funciones personalizadas)
            const todayBdays = birthdayCustomers.filter((c: any) => {
                const bdate = c.fecha_nacimiento.split('-')
                return bdate[1] === month && bdate[2] === day
            })

            for (const c of todayBdays) {
                const tenantInfo = c.tenants as any
                const program = tenantInfo.programs?.[0]
                const bdayMsg = program?.config?.marketing?.birthday_msg || `¡Feliz cumpleaños ${c.nombre}! 🎉 Ven a celebrar con nosotros.`

                try {
                    await triggerWalletPush({
                        tenant_slug: tenantInfo.slug,
                        whatsapp: c.whatsapp,
                        titulo: `¡Feliz Cumpleaños! 🎂`,
                        mensaje: bdayMsg
                    })
                    results.birthdays++
                } catch (err: any) {
                    results.errors.push(`Error push bday ${c.id}: ${err.message}`)
                }
            }
        }

        // 2. PROCESAR CAMPAÑAS PROGRAMADAS
        const { data: campaigns, error: campError } = await supabase
            .from('scheduled_campaigns')
            .select(`
                *,
                tenants:tenant_id (slug)
            `)
            .eq('fecha_envio', today)
            .eq('activo', true)
            .eq('estado', 'pendiente')

        if (campError) results.errors.push(`Error campañas: ${campError.message}`)

        if (campaigns) {
            for (const camp of campaigns) {
                // Obtener todos los clientes según segmento
                let query = supabase.from('customers').select('whatsapp').eq('tenant_id', camp.tenant_id)

                // Aplicar segmentación básica
                if (camp.segmento === 'activos') {
                    const thirtyDaysAgo = new Date()
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                    query = query.gte('updated_at', thirtyDaysAgo.toISOString())
                } else if (camp.segmento === 'inactivos') {
                    const thirtyDaysAgo = new Date()
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                    query = query.lt('updated_at', thirtyDaysAgo.toISOString())
                }

                const { data: customers } = await query

                if (customers) {
                    for (const cust of customers) {
                        try {
                            await triggerWalletPush({
                                tenant_slug: (camp.tenants as any).slug,
                                whatsapp: cust.whatsapp,
                                titulo: camp.titulo_notif,
                                mensaje: camp.mensaje_notif
                            })
                        } catch { /* Ignorar errores individuales */ }
                    }

                    // Marcar campaña como enviada
                    await supabase
                        .from('scheduled_campaigns')
                        .update({ estado: 'enviada' })
                        .eq('id', camp.id)

                    results.scheduled++
                }
            }
        }

        return NextResponse.json({
            success: true,
            processed: results,
            date: today
        })

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
