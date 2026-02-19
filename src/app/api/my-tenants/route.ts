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
            .select('*')
            .eq('auth_user_id', user.id)
            .order('nombre', { ascending: true });

        if (dbError) throw dbError;

        return NextResponse.json({ tenants });
    } catch (error: any) {
        console.error('Error fetching my-tenants:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
