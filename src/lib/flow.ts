import crypto from 'crypto';

const API_KEY = process.env.FLOW_API_KEY!;
const SECRET_KEY = process.env.FLOW_SECRET_KEY!;
const BASE_URL = process.env.FLOW_URL!;

interface FlowParams {
    [key: string]: string | number | boolean;
}

export async function flowRequest(endpoint: string, params: FlowParams, method: 'GET' | 'POST' = 'POST') {
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
    const finalParams = {
        ...allParams,
        s: signature
    };

    const url = `${BASE_URL}/${endpoint}`;

    if (method === 'GET') {
        const queryString = new URLSearchParams(finalParams as any).toString();
        const response = await fetch(`${url}?${queryString}`);
        return await response.json();
    } else {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams(finalParams as any).toString()
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
