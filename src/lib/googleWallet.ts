import jwt from 'jsonwebtoken';

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID || '';
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL || '';
const PRIVATE_KEY = (process.env.GOOGLE_WALLET_PRIVATE_KEY || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n');

function assertWalletCredentials() {
    if (!PRIVATE_KEY || !ISSUER_ID || !SERVICE_ACCOUNT_EMAIL) {
        throw new Error('WALLET_CREDENTIALS_MISSING');
    }
    const hasPemMarkers =
        PRIVATE_KEY.includes('-----BEGIN PRIVATE KEY-----')
        && PRIVATE_KEY.includes('-----END PRIVATE KEY-----')
    if (!hasPemMarkers) {
        throw new Error('WALLET_PRIVATE_KEY_INVALID_FORMAT');
    }
}

/**
 * Obtiene el token de acceso de Google mediante la cuenta de servicio
 */
async function getAccessToken(): Promise<string> {
    assertWalletCredentials();
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: SERVICE_ACCOUNT_EMAIL,
        sub: SERVICE_ACCOUNT_EMAIL,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        scope: 'https://www.googleapis.com/auth/wallet_object.issuer'
    };

    const token = jwt.sign(payload, PRIVATE_KEY, { algorithm: 'RS256' });

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: token
        })
    });

    const data = await response.json();
    if (data.error) {
        throw new Error(`Error obteniendo access token: ${data.error_description || data.error}`);
    }
    return data.access_token;
}

/**
 * Genera el enlace de "Agregar a Google Wallet" para un cliente.
 * Incluye geofencing si el negocio tiene coordenadas configuradas.
 */
export async function generateSaveLink(options: {
    classId: string
    objectId: string
    merchantName: string
    userName: string
    points: number
    logoUrl?: string
    heroImageUrl?: string
    hexBackgroundColor?: string
    lat?: number
    lng?: number
    geoMessage?: string
    tipoPrograma?: string
    programLabel?: string
    customerWhatsapp?: string
    tenantSlug?: string
}) {
    assertWalletCredentials();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vuelveplus.cl';

    const fullClassId = `${ISSUER_ID}.${options.classId}`;
    const fullObjectId = `${ISSUER_ID}.${options.objectId}`;

    // Construir el label de puntos según el tipo de programa
    const pointsLabel = options.programLabel || getLabelForType(options.tipoPrograma || 'sellos')

    // Construir locations para geofencing
    const locations: Array<{ latitude: number; longitude: number }> = []
    if (options.lat && options.lng) {
        locations.push({
            latitude: options.lat,
            longitude: options.lng
        })
    }

    // Construir el objeto de lealtad
    const miTarjetaParams = new URLSearchParams()
    if (options.customerWhatsapp) {
        miTarjetaParams.set('whatsapp', options.customerWhatsapp)
    }
    if (options.tenantSlug) {
        miTarjetaParams.set('tenant_slug', options.tenantSlug)
    }
    const miTarjetaUrl = `${appUrl}/mi-tarjeta${miTarjetaParams.toString() ? `?${miTarjetaParams.toString()}` : ''}`

    const loyaltyObject: Record<string, unknown> = {
        id: fullObjectId,
        classId: fullClassId,
        state: 'ACTIVE',
        accountHolderName: options.userName,
        accountId: options.objectId,
        barcode: {
            type: 'QR_CODE',
            value: fullObjectId,
        },
        loyaltyPoints: {
            label: pointsLabel,
            balance: {
                int: options.points
            }
        },
        linksModuleData: {
            uris: [
                {
                    uri: miTarjetaUrl,
                    description: '💎 Ver mis beneficios y medallas',
                    id: 'pwa-link'
                }
            ]
        }
    }

    // Agregar locations para geofencing
    if (locations.length > 0) {
        loyaltyObject.locations = locations
    }

    // Mensaje de geofencing
    if (options.geoMessage) {
        loyaltyObject.messages = [{
            header: options.merchantName,
            body: options.geoMessage,
            id: 'geo-welcome',
            messageType: 'TEXT'
        }]
    }

    const claims = {
        iss: SERVICE_ACCOUNT_EMAIL,
        aud: 'google',
        origins: [],
        typ: 'savetowallet',
        payload: {
            loyaltyObjects: [loyaltyObject]
        }
    };

    const token = jwt.sign(claims, PRIVATE_KEY, { algorithm: 'RS256' });
    return `https://pay.google.com/gp/v/save/${token}`;
}

/**
 * Label para los puntos según tipo de programa
 */
function getLabelForType(tipo: string): string {
    const labels: Record<string, string> = {
        sellos: 'Puntos Vuelve+',
        cashback: 'Cashback $',
        multipase: 'Usos restantes',
        membresia: 'Visitas VIP',
        descuento: 'Visitas',
        cupon: 'Cupones',
        regalo: 'Saldo $',
        afiliacion: 'Visitas'
    }
    return labels[tipo] || 'Puntos Vuelve+'
}

/**
 * Registra o actualiza una clase de lealtad en Google Wallet.
 * Incluye branding (logo, colores) y geofencing del negocio.
 */
export async function createLoyaltyClass(options: {
    classId: string
    programName: string
    logoUrl?: string
    hexBackgroundColor?: string
    lat?: number
    lng?: number
    geoMessage?: string
}) {
    const accessToken = await getAccessToken();
    const fullClassId = `${ISSUER_ID}.${options.classId}`;

    const loyaltyClass: Record<string, unknown> = {
        id: fullClassId,
        programName: options.programName,
        issuerName: 'Vuelve+',
        reviewStatus: 'UNDER_REVIEW',
        allowMultipleUsersPerObject: true,
    };

    if (options.logoUrl) {
        loyaltyClass.programLogo = {
            sourceUri: { uri: options.logoUrl },
            contentDescription: {
                defaultValue: { language: 'es', value: options.programName }
            }
        }
    }

    if (options.hexBackgroundColor) {
        loyaltyClass.hexBackgroundColor = options.hexBackgroundColor
    }

    // Geofencing locations
    if (options.lat && options.lng) {
        loyaltyClass.locations = [{
            latitude: options.lat,
            longitude: options.lng
        }]
    }

    // Mensaje de geofencing en la clase
    if (options.geoMessage) {
        loyaltyClass.messages = [{
            header: options.programName,
            body: options.geoMessage,
            id: 'geo-class',
            messageType: 'TEXT'
        }]
    }

    const response = await fetch('https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(loyaltyClass)
    });

    return await response.json();
}

export { getAccessToken, ISSUER_ID };
