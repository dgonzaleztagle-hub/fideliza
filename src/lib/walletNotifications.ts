import jwt from 'jsonwebtoken'

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID || ''
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL || ''
const PRIVATE_KEY = (process.env.GOOGLE_WALLET_PRIVATE_KEY || '').replace(/\\n/g, '\n')

type WalletNotificationResult = {
    objectId: string
    success: boolean
    error?: string
}

function getApiErrorMessage(payload: unknown, fallback: string): string {
    if (typeof payload === 'object' && payload !== null) {
        const error = (payload as { error?: { message?: string } }).error
        if (error?.message) return error.message
    }
    return fallback
}

/**
 * Obtiene un access token de Google para la API de Wallet
 */
async function getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    const jwtPayload = {
        iss: SERVICE_ACCOUNT_EMAIL,
        scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
    }

    const signedJwt = jwt.sign(jwtPayload, PRIVATE_KEY, { algorithm: 'RS256' })

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: signedJwt,
        }),
    })

    const data = await response.json()
    if (!data.access_token) {
        throw new Error(`Error obteniendo access token: ${JSON.stringify(data)}`)
    }
    return data.access_token
}

/**
 * Actualiza el mensaje de un pase de lealtad existente en Google Wallet.
 * Esto genera una notificación push en el celular del cliente.
 * 
 * @param objectId - ID del objeto de Google Wallet (formato: ISSUER_ID.OBJECT_SUFFIX)
 * @param titulo - Título de la notificación
 * @param mensaje - Cuerpo del mensaje
 */
export async function sendWalletNotification(
    objectId: string,
    titulo: string,
    mensaje: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const accessToken = await getAccessToken()

        // Actualizar el objeto del pase con un nuevo mensaje
        const response = await fetch(
            `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${objectId}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    notifyPreference: 'NOTIFY',
                    messages: [
                        {
                            header: titulo,
                            body: mensaje,
                            id: `msg-${objectId.split('.').pop() || 'wallet'}-${Date.now()}`,
                            messageType: 'TEXT',
                        }
                    ],
                }),
            }
        )

        if (!response.ok) {
            const errorData = await response.json()
            console.error('Error actualizando pase de Google Wallet:', errorData)
            return { success: false, error: errorData.error?.message || 'Error desconocido' }
        }

        return { success: true }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error enviando notificación Wallet'
        console.error('Error enviando notificación Wallet:', message)
        return { success: false, error: message }
    }
}

/**
 * Envía una notificación masiva a múltiples pases de Google Wallet.
 * 
 * @param objectIds - Array de IDs de objetos de Google Wallet
 * @param titulo - Título de la notificación
 * @param mensaje - Cuerpo del mensaje
 */
export async function sendBulkWalletNotifications(
    objectIds: string[],
    titulo: string,
    mensaje: string
): Promise<{ enviadas: number; errores: number; detalles: WalletNotificationResult[] }> {
    const resultados: WalletNotificationResult[] = []
    let enviadas = 0
    let errores = 0

    // Procesar en lotes de 10 para no saturar la API
    const batchSize = 10
    for (let i = 0; i < objectIds.length; i += batchSize) {
        const batch = objectIds.slice(i, i + batchSize)
        const promises = batch.map(async (objectId) => {
            const result = await sendWalletNotification(objectId, titulo, mensaje)
            if (result.success) {
                enviadas++
            } else {
                errores++
            }
            return { objectId, ...result }
        })

        const batchResults = await Promise.all(promises)
        resultados.push(...batchResults)

        // Pequeña pausa entre lotes
        if (i + batchSize < objectIds.length) {
            await new Promise(resolve => setTimeout(resolve, 200))
        }
    }

    return { enviadas, errores, detalles: resultados }
}

/**
 * Actualiza la clase de lealtad (compartida por todos los pases del negocio).
 * Útil para cambiar el nombre del programa, logo, colores, etc.
 * 
 * @param classId - ID de la clase (formato: ISSUER_ID.CLASS_SUFFIX)
 * @param updates - Campos a actualizar
 */
export async function updateLoyaltyClass(
    classId: string,
    updates: {
        programName?: string
        programLogo?: string
        heroImage?: string
        hexBackgroundColor?: string
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const accessToken = await getAccessToken()

        const patchBody: Record<string, unknown> = {}

        if (updates.programName) {
            patchBody.programName = updates.programName
        }
        if (updates.programLogo) {
            patchBody.programLogo = {
                sourceUri: { uri: updates.programLogo },
                contentDescription: {
                    defaultValue: { language: 'es', value: 'Logo del negocio' }
                }
            }
        }
        if (updates.heroImage) {
            patchBody.heroImage = {
                sourceUri: { uri: updates.heroImage },
                contentDescription: {
                    defaultValue: { language: 'es', value: 'Imagen del negocio' }
                }
            }
        }
        if (updates.hexBackgroundColor) {
            patchBody.hexBackgroundColor = updates.hexBackgroundColor
        }

        const response = await fetch(
            `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${classId}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(patchBody),
            }
        )

        if (!response.ok) {
            const errorData = await response.json()
            return { success: false, error: getApiErrorMessage(errorData, 'Error actualizando clase') }
        }

        return { success: true }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error actualizando clase'
        return { success: false, error: message }
    }
}

export { getAccessToken, ISSUER_ID }
