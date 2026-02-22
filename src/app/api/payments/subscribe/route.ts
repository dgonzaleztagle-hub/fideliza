import { NextResponse } from 'next/server';
import { createSubscription } from '@/lib/flow';
import { getSupabase } from '@/lib/supabase/admin';
import { requireTenantOwnerById } from '@/lib/authz';
import { BillingPlan, getFlowPlanId, isBillingPlan } from '@/lib/plans'

export async function POST(req: Request) {
    try {
        const { tenant_id, plan_code } = await req.json();

        if (!tenant_id) {
            return NextResponse.json({ error: 'Falta tenant_id' }, { status: 400 });
        }

        const owner = await requireTenantOwnerById(tenant_id);
        if (!owner.ok) return owner.response;

        const supabase = getSupabase();

        // 1. Obtener datos del tenant
        const { data: tenant, error: tError } = await supabase
            .from('tenants')
            .select('email, nombre, id, selected_plan')
            .eq('id', tenant_id)
            .single();

        if (tError || !tenant) {
            return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
        }

        const requestedPlan: BillingPlan = isBillingPlan(plan_code)
            ? plan_code
            : isBillingPlan(tenant.selected_plan)
                ? tenant.selected_plan
                : 'pro'

        // 2. Crear suscripción en Flow
        const planId = getFlowPlanId(requestedPlan);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
        const webhookSecret = process.env.FLOW_WEBHOOK_SECRET;
        const isProduction = process.env.NODE_ENV === 'production';
        if (!webhookSecret && isProduction) {
            return NextResponse.json({ error: 'FLOW_WEBHOOK_SECRET no configurado' }, { status: 503 });
        }
        const urlCallback = webhookSecret
            ? `${appUrl}/api/payments/webhook?secret=${encodeURIComponent(webhookSecret)}`
            : `${appUrl}/api/payments/webhook`;

        const customerEmail = tenant.email || `tenant-${tenant.id}@vuelve.vip`
        const flowResult = await createSubscription(tenant.id, customerEmail, planId, urlCallback);

        if (typeof flowResult !== 'object' || flowResult === null) {
            return NextResponse.json({ error: 'Respuesta inválida de Flow' }, { status: 502 });
        }

        const flowData = flowResult as {
            error?: { message?: string };
            code?: number | string;
            message?: string;
            subscriptionId?: string;
            url?: string;
            token?: string;
        };

        if (flowData.error?.message) {
            return NextResponse.json({ error: flowData.error.message }, { status: 400 });
        }

        const flowCode = Number(flowData.code);
        if (!Number.isNaN(flowCode) && flowCode !== 0) {
            return NextResponse.json(
                { error: flowData.message || `Flow rechazó la suscripción (código ${flowCode})` },
                { status: 400 }
            );
        }

        if (!flowData.url || !flowData.token) {
            return NextResponse.json(
                { error: flowData.message || 'Flow no devolvió URL de pago para continuar' },
                { status: 502 }
            );
        }

        // 3. Guardar el ID de suscripción temporal (o esperar al webhook)
        // Guardamos el token de flow para seguimiento si es necesario
        await supabase
            .from('tenants')
            .update({
                flow_subscription_id: flowData.subscriptionId ?? null,
                pending_plan: requestedPlan,
                selected_plan: requestedPlan
            })
            .eq('id', tenant.id);

        return NextResponse.json({
            url: flowData.url,
            token: flowData.token,
            plan_code: requestedPlan
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno'
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
