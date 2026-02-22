import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/authz'

type TenantAdminAction = 'activate' | 'pause' | 'convert_pro' | 'convert_plan'

// POST /api/admin/tenant/[id]/status
// Actualizar plan/estado del tenant (Activación manual)
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const admin = await requireSuperAdmin()
    if (!admin.ok) return admin.response

    const supabase = getSupabase()
    const { id } = await params

    try {
        const body = await req.json()
        const action = body?.action as TenantAdminAction | undefined

        if (!action || !['activate', 'pause', 'convert_pro', 'convert_plan'].includes(action)) {
            return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
        }

        let updateData: Record<string, string> = {}

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
        } else if (action === 'convert_plan') {
            const plan = typeof body?.plan === 'string' ? body.plan : ''
            if (!['pyme', 'pro', 'full'].includes(plan)) {
                return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
            }
            updateData = {
                plan,
                selected_plan: plan
            }
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

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error al actualizar tenant'
        console.error('Error updating tenant status:', message)
        return NextResponse.json({ error: 'Error al actualizar tenant' }, { status: 500 })
    }
}
