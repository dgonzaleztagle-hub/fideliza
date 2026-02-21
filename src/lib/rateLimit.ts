type Bucket = {
    count: number
    resetAt: number
}

const buckets = new Map<string, Bucket>()

export function getClientIp(headers: Headers): string {
    const forwarded = headers.get('x-forwarded-for')
    if (forwarded) {
        return forwarded.split(',')[0].trim()
    }
    return headers.get('x-real-ip') || 'unknown'
}

export function checkRateLimit(key: string, limit: number, windowMs: number): {
    allowed: boolean
    remaining: number
    retryAfterSec: number
} {
    const now = Date.now()
    const current = buckets.get(key)

    if (!current || current.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs })
        return {
            allowed: true,
            remaining: Math.max(0, limit - 1),
            retryAfterSec: Math.ceil(windowMs / 1000)
        }
    }

    if (current.count >= limit) {
        return {
            allowed: false,
            remaining: 0,
            retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
        }
    }

    current.count += 1
    buckets.set(key, current)
    return {
        allowed: true,
        remaining: Math.max(0, limit - current.count),
        retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    }
}
