import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { requireTenantOwnerBySlug } from '@/lib/authz'

type StampAnalyticsRow = {
    fecha: string
    created_at: string | null
}

const ANALYTICS_TIMEZONE = process.env.ANALYTICS_TIMEZONE || 'America/Santiago'
const WEEKDAY_INDEX: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
}

function getDayHourInTimezone(value: string, timeZone: string): { day: number; hour: number } | null {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null

    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short',
        hour: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(date)

    const weekday = parts.find((p) => p.type === 'weekday')?.value
    const hourRaw = parts.find((p) => p.type === 'hour')?.value
    if (!weekday || !hourRaw) return null

    const day = WEEKDAY_INDEX[weekday]
    const hour = Number(hourRaw)
    if (!Number.isInteger(day) || !Number.isFinite(hour) || hour < 0 || hour > 23) return null

    return { day, hour }
}

// GET /api/analytics/[slug]
// Analytics avanzados del negocio
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const supabase = getSupabase()
    try {
        const { slug } = await params
        const owner = await requireTenantOwnerBySlug(slug)
        if (!owner.ok) return owner.response

        // Buscar tenant
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('id, nombre')
            .eq('slug', slug)
            .single()

        if (tenantError || !tenant) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
        }

        const tenantId = tenant.id

        // 1. Total clientes
        const { count: totalClientes } = await supabase
            .from('customers')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)

        // 2. Clientes nuevos esta semana
        const hace7Dias = new Date()
        hace7Dias.setDate(hace7Dias.getDate() - 7)
        const { count: clientesNuevos } = await supabase
            .from('customers')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .gte('created_at', hace7Dias.toISOString())

        // 3. Clientes nuevos mes pasado (para comparación)
        const hace30Dias = new Date()
        hace30Dias.setDate(hace30Dias.getDate() - 30)
        const hace60Dias = new Date()
        hace60Dias.setDate(hace60Dias.getDate() - 60)
        const { count: clientesMesPasado } = await supabase
            .from('customers')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .gte('created_at', hace60Dias.toISOString())
            .lt('created_at', hace30Dias.toISOString())

        // 4. Stamps por día (últimos 30 días)
        const { data: stampsData } = await supabase
            .from('stamps')
            .select('fecha, created_at')
            .eq('tenant_id', tenantId)
            .gte('fecha', hace30Dias.toISOString().split('T')[0])
            .order('fecha', { ascending: true })

        // Agrupar stamps por día
        const stampsPorDia: Record<string, number> = {}
        stampsData?.forEach(s => {
            stampsPorDia[s.fecha] = (stampsPorDia[s.fecha] || 0) + 1
        })

        // 5. Visitas hoy
        const hoy = new Date().toISOString().split('T')[0]
        const visitasHoy = stampsPorDia[hoy] || 0

        // 6. Total puntos dados
        const { data: puntosData } = await supabase
            .from('customers')
            .select('total_puntos_historicos')
            .eq('tenant_id', tenantId)

        const totalPuntos = puntosData?.reduce((sum, c) => sum + (c.total_puntos_historicos || 0), 0) || 0

        // 7. Total premios canjeados
        const { count: totalRewards } = await supabase
            .from('rewards')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('canjeado', true)

        // 8. Premios pendientes  
        const { count: premiosPendientes } = await supabase
            .from('rewards')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('canjeado', false)

        // 9. Tasa de retención (clientes con más de 1 visita / total)
        const { data: retentionData } = await supabase
            .from('customers')
            .select('total_puntos_historicos')
            .eq('tenant_id', tenantId)

        const clientesRepetidos = retentionData?.filter(c => (c.total_puntos_historicos || 0) > 1).length || 0
        const tasaRetencion = totalClientes && totalClientes > 0
            ? Math.round((clientesRepetidos / totalClientes) * 100)
            : 0

        // 10. Top 10 clientes
        const { data: topClientes } = await supabase
            .from('customers')
            .select('id, nombre, whatsapp, puntos_actuales, total_puntos_historicos, total_premios_canjeados')
            .eq('tenant_id', tenantId)
            .order('total_puntos_historicos', { ascending: false })
            .limit(10)

        // 11. Promedio de puntos por cliente
        const promedioPuntos = totalClientes && totalClientes > 0
            ? Math.round(totalPuntos / totalClientes)
            : 0

        // 12. Crecimiento porcentual de clientes
        const { count: clientesMesActual } = await supabase
            .from('customers')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .gte('created_at', hace30Dias.toISOString())

        const crecimientoPct = clientesMesPasado && clientesMesPasado > 0
            ? Math.round((((clientesMesActual || 0) - clientesMesPasado) / clientesMesPasado) * 100)
            : 0

        return NextResponse.json({
            resumen: {
                totalClientes: totalClientes || 0,
                clientesNuevosSemana: clientesNuevos || 0,
                visitasHoy,
                totalPuntosDados: totalPuntos,
                totalPremiosCanjeados: totalRewards || 0,
                premiosPendientes: premiosPendientes || 0,
                tasaRetencion,
                promedioPuntosPorCliente: promedioPuntos,
                crecimientoMensual: crecimientoPct
            },
            chartData: {
                stampsPorDia: Object.entries(stampsPorDia).map(([fecha, count]) => ({
                    fecha,
                    visitas: count
                })),
                heatmap: (() => {
                    // Matriz 7x24 llena de ceros
                    // Keys: "day-hour" donde day es 0-6 (Dom-Sab) y hour es 0-23
                    const map: Record<string, number> = {}

                    ;(stampsData as StampAnalyticsRow[] | null)?.forEach((s) => {
                        if (!s.created_at) return
                        const zoned = getDayHourInTimezone(s.created_at, ANALYTICS_TIMEZONE)
                        if (!zoned) return
                        const { day, hour } = zoned

                        const key = `${day}-${hour}`
                        map[key] = (map[key] || 0) + 1
                    })
                    return map
                })()
            },
            topClientes: topClientes || [],
            periodo: {
                desde: hace30Dias.toISOString().split('T')[0],
                hasta: hoy
            }
        })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno'
        console.error('Error en analytics:', message)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
