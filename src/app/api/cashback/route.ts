import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { requireTenantOwnerById } from '@/lib/authz'

function normalizeWhatsapp(value: string): string {
    return value.replace(/[^\d+]/g, '')
}

async function insertDailyStampSafe(supabase: ReturnType<typeof getSupabase>, customerId: string, tenantId: string) {
    const { error } = await supabase
        .from('stamps')
        .insert({
            customer_id: customerId,
            tenant_id: tenantId,
            fecha: new Date().toISOString().split('T')[0]
        })

    if (error && error.code !== '23505') {
        throw error
    }
}

// POST /api/cashback
// Registra una compra y calcula el cashback
export async function POST(req: NextRequest) {
    const supabase = getSupabase()
    try {
        const { tenant_id, whatsapp, monto_compra } = await req.json()
        const normalizedWhatsapp = typeof whatsapp === 'string' ? normalizeWhatsapp(whatsapp) : ''
        const purchaseAmount = Number(monto_compra)

        if (!tenant_id || !normalizedWhatsapp || !monto_compra) {
            return NextResponse.json(
                { error: 'Faltan campos: tenant_id, whatsapp, monto_compra' },
                { status: 400 }
            )
        }
        if (!Number.isFinite(purchaseAmount) || purchaseAmount <= 0) {
            return NextResponse.json({ error: 'monto_compra inválido' }, { status: 400 })
        }

        const owner = await requireTenantOwnerById(tenant_id)
        if (!owner.ok) return owner.response

        // Buscar cliente
        const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('id, nombre, puntos_actuales')
            .eq('tenant_id', tenant_id)
            .eq('whatsapp', normalizedWhatsapp)
            .single()

        if (customerError || !customer) {
            return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
        }

        // Buscar programa activo tipo cashback
        const { data: program, error: programError } = await supabase
            .from('programs')
            .select('id, tipo_programa, config, nombre')
            .eq('tenant_id', tenant_id)
            .eq('activo', true)
            .single()

        if (programError || !program || program.tipo_programa !== 'cashback') {
            return NextResponse.json({ error: 'No hay programa de cashback activo' }, { status: 404 })
        }

        const config = program.config || {}
        const porcentaje = config.porcentaje || 5
        const topeMensual = config.tope_mensual || null

        // Calcular cashback
        const cashbackGanado = Math.round((purchaseAmount * porcentaje) / 100)

        // Buscar o crear membresía de cashback
        let { data: membership } = await supabase
            .from('memberships')
            .select('id, saldo_cashback')
            .eq('customer_id', customer.id)
            .eq('tenant_id', tenant_id)
            .eq('program_id', program.id)
            .eq('estado', 'activo')
            .single()

        if (!membership) {
            // Crear membresía
            const { data: newMembership, error: createError } = await supabase
                .from('memberships')
                .insert({
                    customer_id: customer.id,
                    tenant_id,
                    program_id: program.id,
                    saldo_cashback: cashbackGanado
                })
                .select()
                .single()

            if (createError) {
                console.error('Error creando membresía cashback:', createError)
                return NextResponse.json({ error: 'Error al registrar cashback' }, { status: 500 })
            }
            membership = newMembership
        } else {
            // Actualizar saldo
            let nuevoSaldo = (membership.saldo_cashback || 0) + cashbackGanado
            if (topeMensual && nuevoSaldo > topeMensual) {
                nuevoSaldo = topeMensual
            }

            await supabase
                .from('memberships')
                .update({
                    saldo_cashback: nuevoSaldo,
                    updated_at: new Date().toISOString()
                })
                .eq('id', membership.id)

            membership.saldo_cashback = nuevoSaldo
        }

        // Registrar stamp también
        await insertDailyStampSafe(supabase, customer.id, tenant_id)

        return NextResponse.json({
            message: `💰 ¡Ganaste $${cashbackGanado} de cashback!`,
            cashback_ganado: cashbackGanado,
            saldo_total: membership?.saldo_cashback || cashbackGanado,
            porcentaje,
            monto_compra: purchaseAmount
        })

    } catch (error) {
        console.error('Error en cashback:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}

// GET /api/cashback?tenant_id=...&whatsapp=...
// Consulta saldo de cashback
export async function GET(req: NextRequest) {
    const supabase = getSupabase()
    try {
        const { searchParams } = new URL(req.url)
        const tenant_id = searchParams.get('tenant_id')
        const whatsapp = searchParams.get('whatsapp')
        const normalizedWhatsapp = whatsapp ? normalizeWhatsapp(whatsapp) : ''

        if (!tenant_id || !normalizedWhatsapp) {
            return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
        }

        const owner = await requireTenantOwnerById(tenant_id)
        if (!owner.ok) return owner.response

        const { data: customer } = await supabase
            .from('customers')
            .select('id')
            .eq('tenant_id', tenant_id)
            .eq('whatsapp', normalizedWhatsapp)
            .single()

        if (!customer) {
            return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
        }

        const { data: membership } = await supabase
            .from('memberships')
            .select('saldo_cashback, created_at')
            .eq('customer_id', customer.id)
            .eq('tenant_id', tenant_id)
            .eq('estado', 'activo')
            .single()

        return NextResponse.json({
            saldo_cashback: membership?.saldo_cashback || 0,
            desde: membership?.created_at || null
        })

    } catch (error) {
        console.error('Error consultando cashback:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
