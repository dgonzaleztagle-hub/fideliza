import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();

        // 1. Obtener el usuario actual
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // 2. Buscar todos los tenants asociados a su ID
        const { data: tenants, error: dbError } = await supabase
            .from('tenants')
            .select('id, nombre, slug, color_primario, estado, plan, selected_plan, selected_program_types, trial_hasta, logo_url')
            .eq('auth_user_id', user.id)
            .order('nombre', { ascending: true });

        if (dbError) throw dbError;

        return NextResponse.json({ tenants });
    } catch (error: unknown) {
        console.error('Error fetching my-tenants:', error);
        const message = error instanceof Error ? error.message : 'Error interno'
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
