import jwt from 'jsonwebtoken'

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID || ''
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL || ''
const PRIVATE_KEY = (process.env.GOOGLE_WALLET_PRIVATE_KEY || '').replace(/\\n/g, '\n')

type WalletNotificationResult = {
    objectId: string
    success: boolean
    error?: string
}

export type WalletMessageType =
    | 'promocion'
    | 'recordatorio'
    | 'cumpleanos'
    | 'beneficio'
    | 'general'

type NormalizeOptions = {
    type?: WalletMessageType
}

type NormalizedWalletMessage = {
    titulo: string
    mensaje: string
    type: WalletMessageType
    warnings: string[]
}

type CandidateSendResult = {
    success: boolean
    objectId?: string
    attempts: number
    error?: string
}

const TITLE_MAX = 45
const TITLE_MIN = 6
const BODY_MAX = 140
const BODY_MIN = 12

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeSpaces(text: string): string {
    return text.replace(/\s+/g, ' ').trim()
}

function clampText(text: string, max: number): string {
    if (text.length <= max) return text
    return `${text.slice(0, Math.max(0, max - 1)).trim()}…`
}

function getDefaultTitle(type: WalletMessageType): string {
    switch (type) {
        case 'promocion':
            return 'Promo especial para ti'
        case 'recordatorio':
            return 'Te esperamos hoy'
        case 'cumpleanos':
            return 'Feliz cumpleaños'
        case 'beneficio':
            return 'Tienes un beneficio activo'
        default:
            return 'Actualización de tu tarjeta'
    }
}

export function normalizeWalletMessage(
    tituloRaw: string,
    mensajeRaw: string,
    options: NormalizeOptions = {}
): NormalizedWalletMessage {
    const warnings: string[] = []
    const type = options.type || 'general'

    let titulo = normalizeSpaces(tituloRaw || '')
    let mensaje = normalizeSpaces(mensajeRaw || '')

    if (!titulo) {
        titulo = getDefaultTitle(type)
        warnings.push('Título vacío: se aplicó título por defecto.')
    }
    if (!mensaje) {
        mensaje = 'Revisa tu tarjeta para ver esta actualización.'
        warnings.push('Mensaje vacío: se aplicó texto por defecto.')
    }

    if (titulo.length < TITLE_MIN) {
        titulo = `${titulo} ahora`
        warnings.push('Título muy corto: se normalizó para mejor legibilidad.')
    }
    if (mensaje.length < BODY_MIN) {
        mensaje = `${mensaje} Abre tu tarjeta para más detalle.`
        warnings.push('Mensaje muy corto: se expandió para mayor contexto.')
    }

    if (titulo.length > TITLE_MAX) {
        titulo = clampText(titulo, TITLE_MAX)
        warnings.push(`Título recortado a ${TITLE_MAX} caracteres.`)
    }
    if (mensaje.length > BODY_MAX) {
        mensaje = clampText(mensaje, BODY_MAX)
        warnings.push(`Mensaje recortado a ${BODY_MAX} caracteres.`)
    }

    return { titulo, mensaje, type, warnings }
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
    if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
        throw new Error('Google Wallet no está configurado (SERVICE_ACCOUNT_EMAIL / PRIVATE_KEY)')
    }
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
        const messagePayload = {
            message: {
                header: titulo,
                body: mensaje,
                id: `msg-${objectId.split('.').pop() || 'wallet'}-${Date.now()}`,
                messageType: 'TEXT_AND_NOTIFY',
            }
        }

        // Camino principal: endpoint dedicado de mensaje (más confiable para notificación visible).
        const addMessageResponse = await fetch(
            `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${objectId}/addMessage?notifyPreference=NOTIFY`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(messagePayload),
            }
        )
        if (addMessageResponse.ok) {
            return { success: true }
        }

        let addMessageError = 'Error desconocido en addMessage'
        try {
            const errorData = await addMessageResponse.json()
            addMessageError = errorData?.error?.message || addMessageError
        } catch {
            // no-op
        }

        // Fallback: PATCH directo del objeto (compatibilidad).
        const patchResponse = await fetch(
            `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${objectId}?notifyPreference=NOTIFY`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [
                        {
                            header: titulo,
                            body: mensaje,
                            id: `msg-${objectId.split('.').pop() || 'wallet'}-${Date.now()}`,
                            messageType: 'TEXT_AND_NOTIFY',
                        }
                    ],
                }),
            }
        )
        if (patchResponse.ok) {
            return { success: true }
        }

        let patchError = 'Error desconocido en PATCH'
        try {
            const patchErrorData = await patchResponse.json()
            patchError = patchErrorData?.error?.message || patchError
        } catch {
            // no-op
        }

        console.error('Error enviando notificación Wallet:', { addMessageError, patchError, objectId })
        return { success: false, error: `${addMessageError} | fallback: ${patchError}` }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error enviando notificación Wallet'
        console.error('Error enviando notificación Wallet:', message)
        return { success: false, error: message }
    }
}

export async function sendWalletNotificationWithCandidates(
    objectIds: string[],
    titulo: string,
    mensaje: string,
    opts?: { maxAttemptsPerCandidate?: number }
): Promise<CandidateSendResult> {
    const maxAttemptsPerCandidate = Math.max(1, opts?.maxAttemptsPerCandidate || 2)

    if (!objectIds.length) {
        return {
            success: false,
            attempts: 0,
            error: 'No hay objectId candidato para notificar',
        }
    }

    let attempts = 0
    let lastError = ''

    for (const objectId of objectIds) {
        for (let attempt = 1; attempt <= maxAttemptsPerCandidate; attempt++) {
            attempts += 1
            const result = await sendWalletNotification(objectId, titulo, mensaje)
            if (result.success) {
                return { success: true, objectId, attempts }
            }
            lastError = result.error || 'Error desconocido'
            if (attempt < maxAttemptsPerCandidate) {
                await sleep(200 * attempt)
            }
        }
    }

    return { success: false, attempts, error: lastError }
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

    // Modo estable: secuencial y con pausa corta para no gatillar límites.
    for (let i = 0; i < objectIds.length; i++) {
        const objectId = objectIds[i]
        const result = await sendWalletNotification(objectId, titulo, mensaje)
        if (result.success) {
            enviadas++
        } else {
            errores++
        }
        resultados.push({ objectId, ...result })

        if (i < objectIds.length - 1) {
            await sleep(150)
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
