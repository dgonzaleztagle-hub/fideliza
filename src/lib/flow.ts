import crypto from 'crypto';

const API_KEY = process.env.FLOW_API_KEY || '';
const SECRET_KEY = process.env.FLOW_SECRET_KEY || '';
const BASE_URL = process.env.FLOW_URL || '';

interface FlowParams {
    [key: string]: string | number | boolean;
}

export async function flowRequest(endpoint: string, params: FlowParams, method: 'GET' | 'POST' = 'POST'): Promise<unknown> {
    if (!API_KEY || !SECRET_KEY || !BASE_URL) {
        throw new Error('Flow no está configurado correctamente (FLOW_API_KEY / FLOW_SECRET_KEY / FLOW_URL)')
    }

    // 1. Añadir apiKey a los parámetros
    const allParams: FlowParams = {
        ...params,
        apiKey: API_KEY
    };

    // 2. Ordenar parámetros alfabéticamente
    const sortedKeys = Object.keys(allParams).sort();

    // 3. Crear el string a firmar (key=value&key2=value2...)
    const toSign = sortedKeys
        .map(key => `${key}=${allParams[key]}`)
        .join('&');

    // 4. Firmar con HMAC SHA256 usando el Secret Key
    const signature = crypto
        .createHmac('sha256', SECRET_KEY)
        .update(toSign)
        .digest('hex');

    // 5. Añadir la firma a los parámetros finales
    const finalParamsRaw: FlowParams = {
        ...allParams,
        s: signature
    }
    const finalParams: Record<string, string> = {}
    for (const [key, value] of Object.entries(finalParamsRaw)) {
        finalParams[key] = String(value)
    }

    const url = `${BASE_URL}/${endpoint}`;
    let response: Response;

    if (method === 'GET') {
        const queryString = new URLSearchParams(finalParams).toString();
        response = await fetch(`${url}?${queryString}`);
    } else {
        response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams(finalParams).toString()
        });
    }

    const rawBody = await response.text();
    let parsedBody: unknown = null;
    try {
        parsedBody = rawBody ? JSON.parse(rawBody) : null;
    } catch {
        parsedBody = { raw: rawBody };
    }

    if (!response.ok) {
        const errorMessage =
            typeof parsedBody === 'object' &&
            parsedBody !== null &&
            'message' in parsedBody &&
            typeof (parsedBody as { message?: unknown }).message === 'string'
                ? (parsedBody as { message: string }).message
                : `Flow respondió HTTP ${response.status}`;

        throw new Error(errorMessage);
    }

    return parsedBody;
}

// Crear una suscripción
export async function createSubscription(customerId: string, customerEmail: string, planId: string, urlCallback: string) {
    return await flowRequest('subscription/create', {
        customerId,
        planId,
        customerEmail,
        urlCallback
    });
}

// Crear un plan de suscripción
export async function createPlan(planId: string, name: string, amount: number) {
    return await flowRequest('plans/create', {
        planId,
        name,
        amount,
        currency: 'CLP',
        interval: 1, // Mensual
    });
}

type FlowCustomer = {
    customerId?: string
    email?: string
    name?: string
    externalId?: string
    status?: string | number
}

type FlowCustomerListResponse = {
    data?: FlowCustomer[] | string
}

function normalizeFlowCustomerList(raw: unknown): FlowCustomer[] {
    if (!raw || typeof raw !== 'object') return []
    const data = (raw as FlowCustomerListResponse).data
    if (Array.isArray(data)) return data
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data)
            return Array.isArray(parsed) ? parsed : []
        } catch {
            return []
        }
    }
    return []
}

export async function createCustomer(name: string, email: string, externalId: string): Promise<FlowCustomer> {
    const result = await flowRequest('customer/create', {
        name,
        email,
        externalId
    })
    return (typeof result === 'object' && result !== null ? result : {}) as FlowCustomer
}

export async function listCustomers(filter: string, start = 0, limit = 100): Promise<FlowCustomer[]> {
    const result = await flowRequest('customer/list', { start, limit, filter }, 'GET')
    return normalizeFlowCustomerList(result)
}
