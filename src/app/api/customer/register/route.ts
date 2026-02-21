import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

function normalizeWhatsapp(value: string): string {
    return value.replace(/[^\d+]/g, '')
}

// POST /api/customer/register
// Registra un nuevo cliente para un tenant
export async function POST(req: NextRequest) {
    const supabase = getSupabase()
    try {
        const { tenant_id, nombre, whatsapp, email, referido_por, fecha_nacimiento } = await req.json()
        const normalizedWhatsapp = typeof whatsapp === 'string' ? normalizeWhatsapp(whatsapp) : ''
        const ip = getClientIp(req.headers)

        if (!tenant_id || !nombre || !normalizedWhatsapp) {
            return NextResponse.json(
                { error: 'Faltan campos requeridos: tenant_id, nombre, whatsapp' },
                { status: 400 }
            )
        }
        if (normalizedWhatsapp.length < 8) {
            return NextResponse.json({ error: 'WhatsApp inválido' }, { status: 400 })
        }
        if (typeof nombre !== 'string' || nombre.trim().length < 2 || nombre.trim().length > 120) {
            return NextResponse.json({ error: 'Nombre inválido' }, { status: 400 })
        }
        if (email && (typeof email !== 'string' || !email.includes('@'))) {
            return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
        }

        const rate = checkRateLimit(`customer-register:${ip}:${tenant_id}`, 25, 10 * 60 * 1000)
        if (!rate.allowed) {
            return NextResponse.json(
                { error: 'Demasiados intentos de registro. Intenta nuevamente en unos minutos.' },
                { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
            )
        }

        // Verificar que el tenant existe y está activo
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('id, nombre, estado')
            .eq('id', tenant_id)
            .single()

        if (tenantError || !tenant) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
        }

        if (tenant.estado !== 'activo') {
            return NextResponse.json({ error: 'Este negocio no está activo' }, { status: 403 })
        }

        // Verificar si el cliente ya existe
        const { data: existing } = await supabase
            .from('customers')
            .select('id, nombre, puntos_actuales')
            .eq('tenant_id', tenant_id)
            .eq('whatsapp', normalizedWhatsapp)
            .single()

        if (existing) {
            return NextResponse.json({
                message: 'Cliente ya registrado',
                customer: existing,
                isNew: false
            })
        }

        if (referido_por) {
            const { data: referrer } = await supabase
                .from('customers')
                .select('id')
                .eq('id', referido_por)
                .eq('tenant_id', tenant_id)
                .maybeSingle()

            if (!referrer) {
                return NextResponse.json({ error: 'Código de referido inválido' }, { status: 400 })
            }
        }

        // Crear nuevo cliente
        const { data: customer, error: createError } = await supabase
            .from('customers')
            .insert({
                tenant_id,
                nombre,
                whatsapp: normalizedWhatsapp,
                email: email || null,
                fecha_nacimiento: fecha_nacimiento || null,
                puntos_actuales: 0,
                referido_por: referido_por || null
            })
            .select()
            .single()

        if (createError) {
            console.error('Error creando cliente:', createError)
            return NextResponse.json({ error: 'Error al registrar cliente' }, { status: 500 })
        }

        return NextResponse.json({
            message: '¡Bienvenido! Te registraste correctamente',
            customer,
            isNew: true
        }, { status: 201 })

    } catch (error) {
        console.error('Error en registro:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
