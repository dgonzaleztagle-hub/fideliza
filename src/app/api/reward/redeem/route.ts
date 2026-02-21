import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { requireTenantOwnerById } from '@/lib/authz'

// POST /api/reward/redeem
// Canjea un premio (el dueño del local escanea el QR del cliente)
export async function POST(req: NextRequest) {
    const supabase = getSupabase()
    try {
        const { qr_code, tenant_id } = await req.json()

        if (!qr_code || !tenant_id) {
            return NextResponse.json(
                { error: 'Faltan campos: qr_code, tenant_id' },
                { status: 400 }
            )
        }

        const owner = await requireTenantOwnerById(tenant_id)
        if (!owner.ok) return owner.response

        // Llamar a la RPC atómica para el canje
        const { data, error: rpcError } = await supabase.rpc('redeem_reward_atomic', {
            p_qr_code: qr_code,
            p_tenant_id: tenant_id
        })

        if (rpcError) {
            console.error('Error en RPC redeem_reward_atomic:', rpcError)
            return NextResponse.json({ error: 'Error al procesar el canje de forma atómica' }, { status: 500 })
        }

        if (data.error) {
            return NextResponse.json({
                error: data.error,
                valid: false
            }, { status: 400 })
        }

        return NextResponse.json({
            message: data.message,
            valid: true,
            premio: data.premio,
            cliente: { nombre: data.cliente }
        })

    } catch (error) {
        console.error('Error en canjeo:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
