import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'

// POST /api/admin/tenant/[id]/status
// Actualizar plan/estado del tenant (Activación manual)
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const supabase = getSupabase()
    const { id } = params

    try {
        const body = await req.json()
        const { action } = body // 'activate', 'pause', 'convert_pro'

        let updateData: any = {}

        if (action === 'activate') {
            // Dar 30 días adicionales
            const nuevaFecha = new Date()
            nuevaFecha.setDate(nuevaFecha.getDate() + 30)

            updateData = {
                estado: 'activo',
                trial_hasta: nuevaFecha.toISOString()
            }
        } else if (action === 'pause') {
            updateData = { estado: 'pausado' }
        } else if (action === 'convert_pro') {
            updateData = { plan: 'pro' }
        }

        const { data, error } = await supabase
            .from('tenants')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({
            message: 'Tenant actualizado con éxito',
            tenant: data
        })

    } catch (error) {
        console.error('Error updating tenant status:', error)
        return NextResponse.json({ error: 'Error al actualizar tenant' }, { status: 500 })
    }
}
