import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type AttemptState = {
    fails: number
    firstFailAt: number
    blockedUntil: number
}

const attempts = new Map<string, AttemptState>()
const WINDOW_MS = 10 * 60 * 1000
const BLOCK_MS = 15 * 60 * 1000
const MAX_FAILS = 5

export async function POST(req: Request) {
    try {
        const { slug, pin } = await req.json();
        const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim()
        const key = `${slug}:${ip}`
        const now = Date.now()

        const state = attempts.get(key)
        if (state && state.blockedUntil > now) {
            return NextResponse.json(
                { error: 'Demasiados intentos. Intenta nuevamente en unos minutos.' },
                { status: 429 }
            )
        }

        if (!slug || !pin) {
            return NextResponse.json({ error: 'Faltan credenciales' }, { status: 400 })
        }
        const supabase = await createClient();

        // 1. Buscar el tenant por slug
        const { data: tenant, error: tError } = await supabase
            .from('tenants')
            .select('id, nombre')
            .eq('slug', slug)
            .single();

        if (tError || !tenant) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
        }

        // 2. Buscar al staff por PIN dentro de ese tenant
        const { data: staff, error: sError } = await supabase
            .from('staff_profiles')
            .select('id, nombre, rol')
            .eq('tenant_id', tenant.id)
            .eq('pin', pin)
            .eq('activo', true)
            .single();

        if (sError || !staff) {
            const current = attempts.get(key)
            if (!current || now - current.firstFailAt > WINDOW_MS) {
                attempts.set(key, { fails: 1, firstFailAt: now, blockedUntil: 0 })
            } else {
                const fails = current.fails + 1
                const blockedUntil = fails >= MAX_FAILS ? now + BLOCK_MS : 0
                attempts.set(key, { fails, firstFailAt: current.firstFailAt, blockedUntil })
            }
            return NextResponse.json({ error: 'PIN incorrecto o cuenta inactiva' }, { status: 401 });
        }

        attempts.delete(key)

        // 3. Retornar éxito y datos de sesión básica
        // En Fase 2.1 podríamos usar JWT, por ahora manejo simple de sesión en cliente
        return NextResponse.json({
            success: true,
            staff: {
                id: staff.id,
                nombre: staff.nombre,
                rol: staff.rol
            },
            tenant: {
                id: tenant.id,
                nombre: tenant.nombre,
                slug: slug
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
