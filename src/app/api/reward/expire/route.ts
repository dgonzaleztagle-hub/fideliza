import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'

// GET /api/reward/expire
// Endpoint CRON — expira premios no canjeados después de X días
// Protegido con CRON_SECRET (configurar en Vercel)
export async function GET(req: NextRequest) {
    // Verificar autorización del cron
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = getSupabase()
    try {
        const DIAS_EXPIRACION = Number(process.env.REWARD_EXPIRATION_DAYS) || 30

        const fechaLimite = new Date()
        fechaLimite.setDate(fechaLimite.getDate() - DIAS_EXPIRACION)

        // Buscar premios no canjeados que pasaron la fecha límite
        const { data: premiosExpirados, error: selectError } = await supabase
            .from('rewards')
            .select('id, customer_id, tenant_id, qr_code')
            .eq('canjeado', false)
            .lt('created_at', fechaLimite.toISOString())

        if (selectError) {
            console.error('Error buscando premios expirados:', selectError)
            return NextResponse.json({ error: 'Error al buscar premios' }, { status: 500 })
        }

        if (!premiosExpirados || premiosExpirados.length === 0) {
            return NextResponse.json({
                message: '✅ No hay premios por expirar',
                expirados: 0
            })
        }

        const ids = premiosExpirados.map(p => p.id)

        // Marcar como canjeados (o podrías crear un estado 'expirado' si la tabla lo permite)
        const { error: updateError } = await supabase
            .from('rewards')
            .update({ canjeado: true })
            .in('id', ids)

        if (updateError) {
            console.error('Error expirando premios:', updateError)
            return NextResponse.json({ error: 'Error al expirar premios' }, { status: 500 })
        }

        // También expirar membresías vencidas
        const { data: membresiasExpiradas } = await supabase
            .from('memberships')
            .select('id')
            .eq('estado', 'activo')
            .lt('fecha_fin', new Date().toISOString())

        if (membresiasExpiradas && membresiasExpiradas.length > 0) {
            const memberIds = membresiasExpiradas.map(m => m.id)
            await supabase
                .from('memberships')
                .update({ estado: 'expirado' })
                .in('id', memberIds)
        }

        return NextResponse.json({
            message: `✅ ${premiosExpirados.length} premios expirados, ${membresiasExpiradas?.length || 0} membresías expiradas`,
            premios_expirados: premiosExpirados.length,
            membresias_expiradas: membresiasExpiradas?.length || 0,
            dias_limite: DIAS_EXPIRACION
        })

    } catch (error) {
        console.error('Error en cron de expiración:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
