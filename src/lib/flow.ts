import crypto from 'crypto';

const API_KEY = process.env.FLOW_API_KEY || '';
const SECRET_KEY = process.env.FLOW_SECRET_KEY || '';
const BASE_URL = process.env.FLOW_URL || '';

interface FlowParams {
    [key: string]: string | number | boolean;
}

export async function flowRequest(endpoint: string, params: FlowParams, method: 'GET' | 'POST' = 'POST') {
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

    if (method === 'GET') {
        const queryString = new URLSearchParams(finalParams).toString();
        const response = await fetch(`${url}?${queryString}`);
        return await response.json();
    } else {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams(finalParams).toString()
        });
        return await response.json();
    }
}

// Crear una suscripción
export async function createSubscription(customerEmail: string, planId: string, urlCallback: string) {
    return await flowRequest('subscription/create', {
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
