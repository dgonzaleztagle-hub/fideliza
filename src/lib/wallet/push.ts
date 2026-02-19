import { sendWalletNotification } from '../walletNotifications'

interface PushOptions {
    tenant_slug: string
    customer_id?: string
    whatsapp?: string
    titulo: string
    mensaje: string
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

    // El objectId sigue el patrón: ISSUER.vuelve-SLUG-CUSTOMERID
    // Usamos prioritariamente customer_id si está disponible.
    const identifier = options.customer_id || options.whatsapp

    if (!identifier) {
        return { success: false, error: 'Falta identificador de cliente (id o whatsapp)' }
    }

    const objectId = `${issuerId}.vuelve-${options.tenant_slug}-${identifier}`

    return await sendWalletNotification(objectId, options.titulo, options.mensaje)
}
