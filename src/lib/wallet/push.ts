import { normalizeWalletMessage, sendWalletNotificationWithCandidates, type WalletMessageType } from '../walletNotifications'

interface PushOptions {
    tenant_slug: string
    customer_id?: string
    whatsapp?: string
    titulo: string
    mensaje: string
    tipologia?: WalletMessageType
}

/**
 * Función centralizada para disparar notificaciones push a Google Wallet.
 * Resuelve el ObjectID correcto basado en el tenant y el cliente.
 */
export async function triggerWalletPush(options: PushOptions) {
    const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID
    if (!issuerId) {
        console.error('❌ GOOGLE_WALLET_ISSUER_ID no configurado en .env')
        return { success: false, error: 'Issuer ID no configurado' }
    }

    if (!options.customer_id && !options.whatsapp) {
        return { success: false, error: 'Falta identificador de cliente (id o whatsapp)' }
    }
    const candidates: string[] = []
    if (options.customer_id) {
        candidates.push(`${issuerId}.vuelve-${options.tenant_slug}-${options.customer_id}`)
    }
    if (options.whatsapp) {
        candidates.push(`${issuerId}.vuelve-${options.tenant_slug}-${options.whatsapp}`)
    }
    const uniqueCandidates = Array.from(new Set(candidates))

    const normalized = normalizeWalletMessage(options.titulo, options.mensaje, {
        type: options.tipologia || 'general',
    })

    const result = await sendWalletNotificationWithCandidates(
        uniqueCandidates,
        normalized.titulo,
        normalized.mensaje,
        { maxAttemptsPerCandidate: 2 }
    )
    return { success: result.success, error: result.error }
}
