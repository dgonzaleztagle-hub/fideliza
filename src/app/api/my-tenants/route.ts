import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabase } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
    try {
        let userId: string | null = null

        const authHeader = req.headers.get('authorization') || ''
        const bearer = authHeader.toLowerCase().startsWith('bearer ')
            ? authHeader.slice(7).trim()
            : ''

        if (bearer) {
            const admin = getSupabase()
            const { data, error } = await admin.auth.getUser(bearer)
            if (!error && data.user) {
                userId = data.user.id
            }
        }

        if (!userId) {
            const supabase = await createClient()
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            if (authError || !user) {
                return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
            }
            userId = user.id
        }

        const supabase = getSupabase()

        // 2. Buscar todos los tenants asociados a su ID
        const { data: tenants, error: dbError } = await supabase
            .from('tenants')
            .select('id, nombre, slug, color_primario, estado, plan, selected_plan, selected_program_types, trial_hasta, logo_url')
            .eq('auth_user_id', userId)
            .order('nombre', { ascending: true });

        if (dbError) throw dbError;

        return NextResponse.json({ tenants });
    } catch (error: unknown) {
        console.error('Error fetching my-tenants:', error);
        const message = error instanceof Error ? error.message : 'Error interno'
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
