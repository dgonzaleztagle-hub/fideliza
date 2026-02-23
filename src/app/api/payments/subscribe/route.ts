import { NextResponse } from 'next/server';
import { createCustomer, createSubscription, listCustomers, registerCustomerCard } from '@/lib/flow';
import { getSupabase } from '@/lib/supabase/admin';
import { requireTenantOwnerById } from '@/lib/authz';
import { BillingPlan, getFlowPlanId, isBillingPlan } from '@/lib/plans'

function looksLikeMissingSelectedPlanColumn(error: { code?: string; message?: string; details?: string } | null): boolean {
    if (!error) return false
    const details = `${error.message || ''} ${error.details || ''}`.toLowerCase()
    return error.code === '42703' || details.includes('selected_plan')
}

type TenantBillingRow = {
    id: string
    email?: string | null
    nombre?: string | null
    selected_plan?: string | null
    plan?: string | null
}

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function getSafeFlowEmail(tenantId: string, candidate?: string | null): string {
    const fallback = `tenant-${tenantId}@vuelve.vip`
    const normalized = String(candidate || '').trim().toLowerCase()
    // Flow está siendo estricto con algunos correos reales.
    // Usamos siempre email técnico estable para evitar rechazos.
    if (isValidEmail(fallback)) return fallback
    if (isValidEmail(normalized)) return normalized
    return 'tenant-fallback@vuelve.vip'
}

function looksLikeFlowCustomerMissing(message: string): boolean {
    const text = message.toLowerCase()
    return text.includes('customer is not found')
        || text.includes('customer not found')
}

function looksLikeFlowCustomerAlreadyExists(message: string): boolean {
    const text = message.toLowerCase()
    return text.includes('already exists')
        || text.includes('already registered')
        || text.includes('exists')
}

async function ensureFlowCustomerId(externalId: string, email: string, name: string): Promise<string> {
    try {
        const created = await createCustomer(name, email, externalId)
        if (created.customerId) return created.customerId
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error || '')
        if (!looksLikeFlowCustomerAlreadyExists(message)) {
            throw error
        }
    }

    const filters = [externalId, email]
    for (const filter of filters) {
        const customers = await listCustomers(filter)
        const match = customers.find((customer) =>
            customer.externalId === externalId || customer.email === email
        )
        if (match?.customerId) return match.customerId
    }

    throw new Error('No fue posible obtener customerId en Flow para este negocio')
}

export async function POST(req: Request) {
    try {
        const { tenant_id, plan_code } = await req.json();

        const normalizedTenantId = typeof tenant_id === 'string' ? tenant_id.trim() : ''
        if (!normalizedTenantId) {
            return NextResponse.json({ error: 'Falta tenant_id' }, { status: 400 });
        }

        const owner = await requireTenantOwnerById(normalizedTenantId);
        if (!owner.ok) return owner.response;

        const supabase = getSupabase();

        // 1. Obtener datos del tenant
        const primaryLookup = await supabase
            .from('tenants')
            .select('email, nombre, id, selected_plan')
            .eq('id', normalizedTenantId)
            .maybeSingle();
        let tenant: TenantBillingRow | null = primaryLookup.data as TenantBillingRow | null
        let tError = primaryLookup.error

        if (tError && looksLikeMissingSelectedPlanColumn(tError)) {
            const fallback = await supabase
                .from('tenants')
                .select('email, nombre, id, plan')
                .eq('id', normalizedTenantId)
                .maybeSingle()

            tenant = fallback.data as TenantBillingRow | null
            tError = fallback.error
        }

        if (tError) {
            console.error('PAYMENT_SUBSCRIBE_TENANT_LOOKUP_FAILED', {
                tenant_id: normalizedTenantId,
                code: tError.code,
                message: tError.message,
                details: tError.details
            })
            return NextResponse.json({ error: 'Error consultando negocio para pago' }, { status: 500 });
        }

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
        }

        const typedTenant = tenant as TenantBillingRow
        const tenantSelectedPlan = typedTenant.selected_plan
        const tenantLegacyPlan = typedTenant.plan

        const requestedPlan: BillingPlan = isBillingPlan(plan_code)
            ? plan_code
            : isBillingPlan(tenantSelectedPlan)
                ? tenantSelectedPlan
                : isBillingPlan(tenantLegacyPlan)
                    ? tenantLegacyPlan
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

        const customerEmail = getSafeFlowEmail(typedTenant.id, typedTenant.email)
        const customerName = typedTenant.nombre || `Negocio ${typedTenant.id.slice(0, 8)}`
        let flowCustomerId = await ensureFlowCustomerId(typedTenant.id, customerEmail, customerName)

        let flowResult: unknown
        try {
            flowResult = await createSubscription(flowCustomerId, customerEmail, planId, urlCallback)
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error || '')
            if (!looksLikeFlowCustomerMissing(message)) {
                throw error
            }
            flowCustomerId = await ensureFlowCustomerId(typedTenant.id, customerEmail, customerName)
            flowResult = await createSubscription(flowCustomerId, customerEmail, planId, urlCallback)
        }

        if (typeof flowResult !== 'object' || flowResult === null) {
            return NextResponse.json({ error: 'Respuesta inválida de Flow' }, { status: 502 });
        }

        const flowData = flowResult as {
            error?: { message?: string };
            code?: number | string;
            message?: string;
            subscriptionId?: string;
            subscription_id?: string;
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

        const subscriptionId = flowData.subscriptionId || flowData.subscription_id || null

        // Si Flow no entrega URL en esta etapa, intentamos iniciar registro de tarjeta.
        // Esto ocurre cuando el cliente aún no tiene medio de pago inscrito.
        let redirectUrl = flowData.url
        let redirectToken = flowData.token
        if (!redirectUrl || !redirectToken) {
            const registerUrlReturn = `${appUrl}/cliente?slug=${encodeURIComponent(owner.tenant!.slug)}`
            try {
                const registerResult = await registerCustomerCard(flowCustomerId, registerUrlReturn)
                if (registerResult.url && registerResult.token) {
                    redirectUrl = registerResult.url
                    redirectToken = registerResult.token
                }
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error || '')
                console.warn('FLOW_CUSTOMER_REGISTER_FAILED', { tenant_id: typedTenant.id, message })
            }
        }

        // 3. Guardar el ID de suscripción temporal (o esperar al webhook)
        // Guardamos el token de flow para seguimiento si es necesario
        await supabase
            .from('tenants')
            .update({
                flow_subscription_id: subscriptionId,
                pending_plan: requestedPlan,
                selected_plan: requestedPlan
            })
            .eq('id', typedTenant.id);

        if (!redirectUrl || !redirectToken) {
            return NextResponse.json({
                ok: true,
                requires_redirect: false,
                message: flowData.message || 'Suscripción creada. Revisa el estado en tu panel de Flow.',
                plan_code: requestedPlan,
                subscription_id: subscriptionId
            })
        }

        return NextResponse.json({
            ok: true,
            requires_redirect: true,
            url: redirectUrl,
            token: redirectToken,
            plan_code: requestedPlan
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno'
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
