import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { requireTenantOwnerById } from '@/lib/authz'
import { hashPin, isValidPin } from '@/lib/security/pin'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const tenant_id = searchParams.get('tenant_id')

        if (!tenant_id) {
            return NextResponse.json({ error: 'Falta tenant_id' }, { status: 400 })
        }

        const owner = await requireTenantOwnerById(tenant_id)
        if (!owner.ok) return owner.response

        const supabase = getSupabase()
        const { data: staff, error } = await supabase
            .from('staff_profiles')
            .select('id, nombre, rol, activo, created_at')
            .eq('tenant_id', tenant_id)
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json({ staff })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const { tenant_id, nombre, pin, rol } = await req.json()

        if (!tenant_id || !nombre || !pin) {
            return NextResponse.json({ error: 'Faltan campos: tenant_id, nombre, pin' }, { status: 400 })
        }
        if (!isValidPin(pin)) {
            return NextResponse.json({ error: 'El PIN debe tener 4 dígitos numéricos' }, { status: 400 })
        }

        const owner = await requireTenantOwnerById(tenant_id)
        if (!owner.ok) return owner.response

        const supabase = getSupabase()
        const pinHash = hashPin(pin)
        const { data: staff, error } = await supabase
            .from('staff_profiles')
            .insert([{
                tenant_id,
                nombre,
                pin_hash: pinHash,
                pin: null,
                rol: rol || 'cajero'
            }])
            .select('id, nombre, rol, activo, created_at')
            .single()

        if (error) {
            if (error.message?.includes('pin_hash')) {
                return NextResponse.json(
                    { error: 'Falta aplicar migración de seguridad de PIN (pin_hash).' },
                    { status: 503 }
                )
            }
            throw error
        }

        return NextResponse.json({ success: true, staff })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
