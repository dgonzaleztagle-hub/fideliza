import { NextResponse } from 'next/server';
import { createSubscription } from '@/lib/flow';
import { getSupabase } from '@/lib/supabase/admin';
import { requireTenantOwnerById } from '@/lib/authz';

export async function POST(req: Request) {
    try {
        const { tenant_id } = await req.json();

        if (!tenant_id) {
            return NextResponse.json({ error: 'Falta tenant_id' }, { status: 400 });
        }

        const owner = await requireTenantOwnerById(tenant_id);
        if (!owner.ok) return owner.response;

        const supabase = getSupabase();

        // 1. Obtener datos del tenant
        const { data: tenant, error: tError } = await supabase
            .from('tenants')
            .select('email, nombre, id')
            .eq('id', tenant_id)
            .single();

        if (tError || !tenant) {
            return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
        }

        // 2. Crear suscripción en Flow (Plan Pro Mensual)
        const planId = 'vuelve_pro_mensual';
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
        const webhookSecret = process.env.FLOW_WEBHOOK_SECRET;
        const isProduction = process.env.NODE_ENV === 'production';
        if (!webhookSecret && isProduction) {
            return NextResponse.json({ error: 'FLOW_WEBHOOK_SECRET no configurado' }, { status: 503 });
        }
        const urlCallback = webhookSecret
            ? `${appUrl}/api/payments/webhook?secret=${encodeURIComponent(webhookSecret)}`
            : `${appUrl}/api/payments/webhook`;

        const flowResult = await createSubscription(tenant.email, planId, urlCallback);

        if (flowResult.error) {
            return NextResponse.json({ error: flowResult.error.message }, { status: 400 });
        }

        // 3. Guardar el ID de suscripción temporal (o esperar al webhook)
        // Guardamos el token de flow para seguimiento si es necesario
        await supabase
            .from('tenants')
            .update({
                flow_subscription_id: flowResult.subscriptionId
            })
            .eq('id', tenant.id);

        return NextResponse.json({
            url: flowResult.url,
            token: flowResult.token
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno'
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
