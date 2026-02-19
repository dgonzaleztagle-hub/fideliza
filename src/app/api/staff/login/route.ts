import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
    try {
        const { slug, pin } = await req.json();
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
            return NextResponse.json({ error: 'PIN incorrecto o cuenta inactiva' }, { status: 401 });
        }

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
