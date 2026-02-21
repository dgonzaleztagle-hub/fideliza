import { NextResponse } from 'next/server';
import { flowRequest } from '@/lib/flow';
import { getSupabase } from '@/lib/supabase/admin';

export async function POST(req: Request) {
    try {
        const configuredSecret = process.env.FLOW_WEBHOOK_SECRET
        const isProduction = process.env.NODE_ENV === 'production'
        if (!configuredSecret && isProduction) {
            return NextResponse.json({ error: 'FLOW_WEBHOOK_SECRET no configurado' }, { status: 503 })
        }
        if (configuredSecret) {
            const incomingSecret = new URL(req.url).searchParams.get('secret')
            if (incomingSecret !== configuredSecret) {
                return NextResponse.json({ error: 'Webhook no autorizado' }, { status: 401 })
            }
        }

        const formData = await req.formData();
        const token = formData.get('token');

        if (!token) {
            return NextResponse.json({ error: 'Token no proporcionado' }, { status: 400 });
        }

        // 1. Consultar el estado de la suscripción/pago en Flow usando el token
        // Nota: Flow envía el token en el POST. Debemos consultar 'subscription/getStatus' o similar.
        // Para pagos simples es 'payment/getStatus'. Para suscripciones, revisamos el estado.

        const result = await flowRequest('subscription/getStatus', { token: token.toString() }, 'GET');

        if (result.status === 1) { // 1 = Activa / Pagada (depende del endpoint de Flow)
            const supabase = getSupabase();

            // 2. Identificar al tenant (usamos el flow_subscription_id que guardamos o el email)
            const subscriptionId = result.subscriptionId;

            const { data: tenant } = await supabase
                .from('tenants')
                .select('id')
                .eq('flow_subscription_id', subscriptionId)
                .single();

            if (tenant) {
                // 3. Activar el plan Pro
                await supabase
                    .from('tenants')
                    .update({
                        plan: 'pro',
                        estado: 'activo',
                        last_payment_date: new Date().toISOString(),
                        next_billing_date: result.next_billing_date // Proporcionado por Flow
                    })
                    .eq('id', tenant.id);
            }
        }

        // Flow espera un OK para dejar de reintentar el webhook
        return new Response('OK', { status: 200 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno'
        console.error('Webhook Error:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
