import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { v4 as uuidv4 } from 'uuid'

// POST /api/stamp
// Suma un punto al cliente (máximo 1 por día)
// Si llega a la meta, genera premio automáticamente
export async function POST(req: NextRequest) {
    const supabase = getSupabase()
    try {
        const { tenant_id, whatsapp } = await req.json()

        if (!tenant_id || !whatsapp) {
            return NextResponse.json(
                { error: 'Faltan campos: tenant_id, whatsapp' },
                { status: 400 }
            )
        }

        // Buscar al cliente
        const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('id, nombre, puntos_actuales, total_puntos_historicos')
            .eq('tenant_id', tenant_id)
            .eq('whatsapp', whatsapp)
            .single()

        if (customerError || !customer) {
            return NextResponse.json({ error: 'Cliente no encontrado. ¿Ya te registraste?' }, { status: 404 })
        }

        // Buscar el programa activo del tenant
        const { data: program, error: programError } = await supabase
            .from('programs')
            .select('id, puntos_meta, descripcion_premio, tipo_premio, valor_premio')
            .eq('tenant_id', tenant_id)
            .eq('activo', true)
            .single()

        if (programError || !program) {
            return NextResponse.json({ error: 'No hay programa de lealtad activo' }, { status: 404 })
        }

        // Intentar insertar el stamp (la constraint UNIQUE evita duplicados del mismo día)
        const { error: stampError } = await supabase
            .from('stamps')
            .insert({
                customer_id: customer.id,
                tenant_id,
                fecha: new Date().toISOString().split('T')[0] // Solo la fecha YYYY-MM-DD
            })

        if (stampError) {
            if (stampError.code === '23505') {
                // Violación de UNIQUE = ya sumó punto hoy
                return NextResponse.json({
                    message: '¡Ya sumaste tu punto hoy! Vuelve mañana 😊',
                    puntos_actuales: customer.puntos_actuales,
                    puntos_meta: program.puntos_meta,
                    alreadyStamped: true
                })
            }
            console.error('Error insertando stamp:', stampError)
            return NextResponse.json({ error: 'Error sumando punto' }, { status: 500 })
        }

        // Actualizar puntos del cliente
        const nuevosPuntos = customer.puntos_actuales + 1
        const nuevoTotal = (customer.total_puntos_historicos || 0) + 1

        // ¿Llegó a la meta?
        const llegoAMeta = nuevosPuntos >= program.puntos_meta

        let reward = null

        if (llegoAMeta) {
            // Generar QR de premio único
            const rewardQR = `PREMIO-${uuidv4().slice(0, 8).toUpperCase()}`

            const { data: newReward, error: rewardError } = await supabase
                .from('rewards')
                .insert({
                    customer_id: customer.id,
                    tenant_id,
                    program_id: program.id,
                    qr_code: rewardQR,
                    descripcion: program.descripcion_premio
                })
                .select()
                .single()

            if (rewardError) {
                console.error('Error generando premio:', rewardError)
            } else {
                reward = newReward
            }

            // Resetear puntos a 0
            await supabase
                .from('customers')
                .update({
                    puntos_actuales: 0,
                    total_puntos_historicos: nuevoTotal,
                    total_premios_canjeados: (customer as any).total_premios_canjeados || 0
                })
                .eq('id', customer.id)
        } else {
            // Simplemente sumar el punto
            await supabase
                .from('customers')
                .update({
                    puntos_actuales: nuevosPuntos,
                    total_puntos_historicos: nuevoTotal
                })
                .eq('id', customer.id)
        }

        return NextResponse.json({
            message: llegoAMeta
                ? `🎉 ¡Felicidades! Llegaste a ${program.puntos_meta} puntos. ${program.descripcion_premio}`
                : `✅ ¡Punto sumado! Llevas ${nuevosPuntos}/${program.puntos_meta}`,
            puntos_actuales: llegoAMeta ? 0 : nuevosPuntos,
            puntos_meta: program.puntos_meta,
            llegoAMeta,
            reward: reward ? {
                qr_code: reward.qr_code,
                descripcion: reward.descripcion
            } : null
        })

    } catch (error) {
        console.error('Error en stamp:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
