import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

const PIN_HASH_PREFIX = 'scrypt'
const KEY_LEN = 32

export function isValidPin(pin: string): boolean {
    return /^\d{4}$/.test(pin)
}

export function hashPin(pin: string): string {
    const salt = randomBytes(16).toString('hex')
    const hash = scryptSync(pin, salt, KEY_LEN).toString('hex')
    return `${PIN_HASH_PREFIX}$${salt}$${hash}`
}

export function verifyPin(pin: string, storedHash?: string | null, legacyPin?: string | null): boolean {
    if (storedHash && storedHash.startsWith(`${PIN_HASH_PREFIX}$`)) {
        const parts = storedHash.split('$')
        if (parts.length !== 3) return false
        const salt = parts[1]
        const expectedHex = parts[2]
        const calculated = scryptSync(pin, salt, KEY_LEN)
        const expected = Buffer.from(expectedHex, 'hex')
        if (expected.length !== calculated.length) return false
        return timingSafeEqual(calculated, expected)
    }

    if (legacyPin) {
        return legacyPin === pin
    }

    return false
}
