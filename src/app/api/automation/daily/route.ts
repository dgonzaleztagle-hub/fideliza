import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { triggerWalletPush } from '@/lib/wallet/push'

// GET /api/automation/daily
// Este endpoint debe ser llamado por un Cron Job cada mañana (ej: 9:00 AM)

type ProgramConfig = {
    marketing?: {
        birthday_msg?: string
    }
}

type BirthdayTenantRow = {
    slug: string
    nombre: string | null
    programs?: Array<{ config?: ProgramConfig | null }> | null
}

type BirthdayCustomerRow = {
    id: string
    nombre: string
    whatsapp: string | null
    fecha_nacimiento: string | null
    tenant_id: string
    tenants: BirthdayTenantRow | BirthdayTenantRow[] | null
}

type CampaignRow = {
    id: string
    tenant_id: string
    titulo_notif: string
    mensaje_notif: string
    segmento: string | null
    tenants: { slug: string } | { slug: string }[] | null
}

function getTenantRow<T>(value: T | T[] | null | undefined): T | null {
    if (!value) return null
    return Array.isArray(value) ? (value[0] || null) : value
}

export async function GET(req: NextRequest) {
    const cronSecret = process.env.AUTOMATION_CRON_SECRET
    const providedSecret = req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('secret')

    if (!cronSecret) {
        return NextResponse.json({ error: 'AUTOMATION_CRON_SECRET no configurado' }, { status: 503 })
    }
    if (providedSecret !== cronSecret) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

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
                id, nombre, whatsapp, fecha_nacimiento, tenant_id,
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
            const typedBirthdayCustomers = birthdayCustomers as BirthdayCustomerRow[]
            const todayBdays = typedBirthdayCustomers.filter((c) => {
                if (!c.fecha_nacimiento) return false
                const bdate = c.fecha_nacimiento.split('-')
                return bdate[1] === month && bdate[2] === day
            })

            for (const c of todayBdays) {
                const tenantInfo = getTenantRow(c.tenants)
                if (!tenantInfo?.slug) continue
                const program = tenantInfo.programs?.[0]
                const bdayMsg = program?.config?.marketing?.birthday_msg || `¡Feliz cumpleaños ${c.nombre}! 🎉 Ven a celebrar con nosotros.`

                try {
                    await triggerWalletPush({
                        tenant_slug: tenantInfo.slug,
                        customer_id: c.id,
                        titulo: `¡Feliz Cumpleaños! 🎂`,
                        mensaje: bdayMsg,
                        tipologia: 'cumpleanos',
                    })
                    results.birthdays++
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'error desconocido'
                    results.errors.push(`Error push bday ${c.id}: ${message}`)
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
            for (const camp of campaigns as CampaignRow[]) {
                // Obtener todos los clientes del tenant y luego aplicar la misma
                // lógica de segmentación que el envío manual.
                const { data: allCustomers } = await supabase
                    .from('customers')
                    .select('id, whatsapp, puntos_actuales')
                    .eq('tenant_id', camp.tenant_id)

                let customers = allCustomers || []
                if (camp.segmento === 'activos' || camp.segmento === 'inactivos') {
                    const hace30Dias = new Date()
                    hace30Dias.setDate(hace30Dias.getDate() - 30)
                    const { data: recentStamps } = await supabase
                        .from('stamps')
                        .select('customer_id')
                        .eq('tenant_id', camp.tenant_id)
                        .gte('fecha', hace30Dias.toISOString().split('T')[0])
                    const activeIds = new Set((recentStamps || []).map((s) => s.customer_id))
                    customers = camp.segmento === 'activos'
                        ? customers.filter((c) => activeIds.has(c.id))
                        : customers.filter((c) => !activeIds.has(c.id))
                } else if (camp.segmento === 'cercanos_premio') {
                    const { data: program } = await supabase
                        .from('programs')
                        .select('puntos_meta')
                        .eq('tenant_id', camp.tenant_id)
                        .eq('activo', true)
                        .single()
                    if (program?.puntos_meta) {
                        customers = customers.filter((c) => c.puntos_actuales >= program.puntos_meta - 2)
                    } else {
                        customers = []
                    }
                }

                if (customers) {
                    for (const cust of customers) {
                        try {
                            const tenantInfo = getTenantRow(camp.tenants)
                            if (!tenantInfo?.slug) continue
                            await triggerWalletPush({
                                tenant_slug: tenantInfo.slug,
                                customer_id: cust.id,
                                whatsapp: cust.whatsapp || undefined,
                                titulo: camp.titulo_notif,
                                mensaje: camp.mensaje_notif,
                                tipologia: 'promocion',
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

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error interno'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
