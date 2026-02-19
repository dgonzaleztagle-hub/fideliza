import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const tenant_id = searchParams.get('tenant_id');

        if (!tenant_id) return NextResponse.json({ error: 'Falta tenant_id' }, { status: 400 });

        const supabase = await createClient();
        const { data: staff, error } = await supabase
            .from('staff_profiles')
            .select('*')
            .eq('tenant_id', tenant_id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ staff });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { tenant_id, nombre, pin, rol } = await req.json();
        const supabase = await createClient();

        const { data: staff, error } = await supabase
            .from('staff_profiles')
            .insert([{
                tenant_id,
                nombre,
                pin,
                rol: rol || 'cajero'
            }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, staff });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
