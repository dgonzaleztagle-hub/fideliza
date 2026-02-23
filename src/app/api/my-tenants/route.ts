import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
    try {
        let userId: string | null = null
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        const authHeader = req.headers.get('authorization') || ''
        const bearer = authHeader.toLowerCase().startsWith('bearer ')
            ? authHeader.slice(7).trim()
            : ''

        if (bearer && url && anonKey) {
            const anonClient = createSupabaseClient(url, anonKey)
            const { data, error } = await anonClient.auth.getUser(bearer)
            if (!error && data?.user) {
                userId = data.user.id
            }
        }

        const supabase = await createClient()

        if (!userId) {
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            if (authError || !user) {
                return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
            }
            userId = user.id
        }

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
