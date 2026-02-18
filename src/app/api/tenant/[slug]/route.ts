import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'

// GET /api/tenant/[slug]
// Obtiene datos completos de un tenant por su slug
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const supabase = getSupabase()
    try {
        const { slug } = await params

        // Buscar tenant
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('*')
            .eq('slug', slug)
            .single()

        if (tenantError || !tenant) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
        }

        // Buscar programa activo
        const { data: program } = await supabase
            .from('programs')
            .select('*')
            .eq('tenant_id', tenant.id)
            .eq('activo', true)
            .single()

        // Buscar clientes
        const { data: customers } = await supabase
            .from('customers')
            .select('*')
            .eq('tenant_id', tenant.id)
            .order('created_at', { ascending: false })

        // Contar stamps de hoy
        const today = new Date().toISOString().split('T')[0]
        const { count: stampsHoy } = await supabase
            .from('stamps')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id)
            .eq('fecha', today)

        // Calcular stats
        const stats = {
            totalClientes: customers?.length || 0,
            totalPuntosDados: customers?.reduce((sum, c) => sum + (c.total_puntos_historicos || 0), 0) || 0,
            totalPremiosCanjeados: customers?.reduce((sum, c) => sum + (c.total_premios_canjeados || 0), 0) || 0,
            clientesHoy: stampsHoy || 0
        }

        return NextResponse.json({
            tenant,
            program,
            customers: customers || [],
            stats
        })

    } catch (error) {
        console.error('Error obteniendo tenant:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
