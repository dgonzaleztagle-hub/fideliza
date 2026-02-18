import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'

// POST /api/membership
// Crear membresía o multipase para un cliente
export async function POST(req: NextRequest) {
    const supabase = getSupabase()
    try {
        const { tenant_id, whatsapp, program_id } = await req.json()

        if (!tenant_id || !whatsapp) {
            return NextResponse.json(
                { error: 'Faltan campos: tenant_id, whatsapp' },
                { status: 400 }
            )
        }

        // Buscar cliente
        const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('id, nombre')
            .eq('tenant_id', tenant_id)
            .eq('whatsapp', whatsapp)
            .single()

        if (customerError || !customer) {
            return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
        }

        // Buscar programa
        const programQuery = supabase
            .from('programs')
            .select('id, tipo_programa, config, nombre, descripcion_premio')
            .eq('tenant_id', tenant_id)
            .eq('activo', true)

        if (program_id) {
            programQuery.eq('id', program_id)
        }

        const { data: program, error: programError } = await programQuery.single()

        if (programError || !program) {
            return NextResponse.json({ error: 'Programa no encontrado' }, { status: 404 })
        }

        if (!['membresia', 'multipase'].includes(program.tipo_programa)) {
            return NextResponse.json({ error: 'Este programa no es de tipo membresía o multipase' }, { status: 400 })
        }

        // Verificar si ya tiene membresía activa para este programa
        const { data: existingMembership } = await supabase
            .from('memberships')
            .select('id, estado')
            .eq('customer_id', customer.id)
            .eq('program_id', program.id)
            .eq('estado', 'activo')
            .single()

        if (existingMembership) {
            return NextResponse.json({
                error: 'El cliente ya tiene una membresía activa para este programa',
                membership_id: existingMembership.id
            }, { status: 409 })
        }

        const config = program.config || {}

        // Calcular datos según tipo
        let usos_restantes = null
        let fecha_fin = null

        if (program.tipo_programa === 'multipase') {
            usos_restantes = config.cantidad_usos || 10
        }

        if (program.tipo_programa === 'membresia') {
            // Membresía mensual por defecto
            const duracionDias = config.duracion_dias || 30
            const fin = new Date()
            fin.setDate(fin.getDate() + duracionDias)
            fecha_fin = fin.toISOString()
        }

        // Crear membresía
        const { data: membership, error: membershipError } = await supabase
            .from('memberships')
            .insert({
                customer_id: customer.id,
                tenant_id,
                program_id: program.id,
                usos_restantes,
                fecha_fin,
                saldo_cashback: 0
            })
            .select()
            .single()

        if (membershipError) {
            console.error('Error creando membresía:', membershipError)
            return NextResponse.json({ error: 'Error al crear membresía' }, { status: 500 })
        }

        const tipoLabel = program.tipo_programa === 'multipase' ? 'Multipase' : 'Membresía VIP'

        return NextResponse.json({
            message: `✅ ${tipoLabel} activada para ${customer.nombre}`,
            membership,
            tipo: program.tipo_programa,
            beneficios: config.beneficios || [],
            usos_restantes,
            fecha_fin
        }, { status: 201 })

    } catch (error) {
        console.error('Error en membresía:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}

// GET /api/membership?tenant_id=...&whatsapp=...
// Consultar membresía activa del cliente
export async function GET(req: NextRequest) {
    const supabase = getSupabase()
    try {
        const { searchParams } = new URL(req.url)
        const tenant_id = searchParams.get('tenant_id')
        const whatsapp = searchParams.get('whatsapp')

        if (!tenant_id || !whatsapp) {
            return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
        }

        const { data: customer } = await supabase
            .from('customers')
            .select('id')
            .eq('tenant_id', tenant_id)
            .eq('whatsapp', whatsapp)
            .single()

        if (!customer) {
            return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
        }

        const { data: memberships } = await supabase
            .from('memberships')
            .select('*, programs:program_id(nombre, tipo_programa, config, descripcion_premio)')
            .eq('customer_id', customer.id)
            .eq('tenant_id', tenant_id)
            .eq('estado', 'activo')

        return NextResponse.json({
            memberships: memberships || [],
            total: memberships?.length || 0
        })

    } catch (error) {
        console.error('Error consultando membresía:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}

// PUT /api/membership
// Usar un uso del multipase
export async function PUT(req: NextRequest) {
    const supabase = getSupabase()
    try {
        const { membership_id, tenant_id } = await req.json()

        if (!membership_id || !tenant_id) {
            return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
        }

        const { data: membership, error } = await supabase
            .from('memberships')
            .select('id, usos_restantes, estado, customer_id, program_id')
            .eq('id', membership_id)
            .eq('tenant_id', tenant_id)
            .single()

        if (error || !membership) {
            return NextResponse.json({ error: 'Membresía no encontrada' }, { status: 404 })
        }

        if (membership.estado !== 'activo') {
            return NextResponse.json({ error: 'La membresía no está activa' }, { status: 400 })
        }

        if (membership.usos_restantes !== null) {
            if (membership.usos_restantes <= 0) {
                // Expirar membresía
                await supabase
                    .from('memberships')
                    .update({ estado: 'expirado', updated_at: new Date().toISOString() })
                    .eq('id', membership_id)

                return NextResponse.json({
                    message: '❌ Se agotaron los usos del multipase',
                    usos_restantes: 0,
                    expirado: true
                })
            }

            const nuevosUsos = membership.usos_restantes - 1

            await supabase
                .from('memberships')
                .update({
                    usos_restantes: nuevosUsos,
                    updated_at: new Date().toISOString(),
                    ...(nuevosUsos === 0 ? { estado: 'expirado' } : {})
                })
                .eq('id', membership_id)

            // Registrar stamp
            await supabase
                .from('stamps')
                .insert({
                    customer_id: membership.customer_id,
                    tenant_id,
                    fecha: new Date().toISOString().split('T')[0]
                })

            return NextResponse.json({
                message: nuevosUsos > 0
                    ? `✅ Uso registrado. Quedan ${nuevosUsos} usos`
                    : '🎉 ¡Último uso! El multipase ha sido completado',
                usos_restantes: nuevosUsos,
                expirado: nuevosUsos === 0
            })
        }

        return NextResponse.json({ message: 'Membresía actualizada' })

    } catch (error) {
        console.error('Error actualizando membresía:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
