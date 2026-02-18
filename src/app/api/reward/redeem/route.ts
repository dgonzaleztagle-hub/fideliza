import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// POST /api/reward/redeem
// Canjea un premio (el dueño del local escanea el QR del cliente)
export async function POST(req: NextRequest) {
    try {
        const { qr_code, tenant_id } = await req.json()

        if (!qr_code || !tenant_id) {
            return NextResponse.json(
                { error: 'Faltan campos: qr_code, tenant_id' },
                { status: 400 }
            )
        }

        // Buscar el reward
        const { data: reward, error: rewardError } = await supabase
            .from('rewards')
            .select('*, customers(nombre, whatsapp)')
            .eq('qr_code', qr_code)
            .eq('tenant_id', tenant_id)
            .single()

        if (rewardError || !reward) {
            return NextResponse.json({
                error: 'Premio no encontrado o no pertenece a este negocio',
                valid: false
            }, { status: 404 })
        }

        if (reward.canjeado) {
            return NextResponse.json({
                message: '❌ Este premio ya fue canjeado',
                valid: false,
                fecha_canjeado: reward.fecha_canjeado
            })
        }

        // Marcar como canjeado
        const { error: updateError } = await supabase
            .from('rewards')
            .update({
                canjeado: true,
                fecha_canjeado: new Date().toISOString()
            })
            .eq('id', reward.id)

        if (updateError) {
            console.error('Error canjeando premio:', updateError)
            return NextResponse.json({ error: 'Error al canjear premio' }, { status: 500 })
        }

        // Actualizar contador del cliente
        const { data: customer } = await supabase
            .from('customers')
            .select('total_premios_canjeados')
            .eq('id', reward.customer_id)
            .single()

        if (customer) {
            await supabase
                .from('customers')
                .update({
                    total_premios_canjeados: (customer.total_premios_canjeados || 0) + 1
                })
                .eq('id', reward.customer_id)
        }

        return NextResponse.json({
            message: '✅ ¡Premio canjeado exitosamente!',
            valid: true,
            premio: reward.descripcion,
            cliente: reward.customers
        })

    } catch (error) {
        console.error('Error en canjeo:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
