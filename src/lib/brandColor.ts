const DEFAULT_BRAND_COLOR = '#6366f1'

function expandHex(color: string): string {
    const clean = color.replace('#', '').toLowerCase()
    if (clean.length === 3) {
        return `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`
    }
    return `#${clean}`
}

function channelToLinear(value: number): number {
    const c = value / 255
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function luminance(hexColor: string): number {
    const color = expandHex(hexColor).replace('#', '')
    const r = parseInt(color.slice(0, 2), 16)
    const g = parseInt(color.slice(2, 4), 16)
    const b = parseInt(color.slice(4, 6), 16)

    const rl = channelToLinear(r)
    const gl = channelToLinear(g)
    const bl = channelToLinear(b)

    return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl
}

export function normalizeBrandColor(input: unknown): string {
    if (typeof input !== 'string') return DEFAULT_BRAND_COLOR
    const trimmed = input.trim()
    const isHex = /^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/.test(trimmed)
    if (!isHex) return DEFAULT_BRAND_COLOR

    const normalized = expandHex(trimmed)
    // Evita colores demasiado claros para no romper contraste en botones/tarjetas.
    if (luminance(normalized) > 0.78) return DEFAULT_BRAND_COLOR
    return normalized
}

export const BRAND_COLOR_FALLBACK = DEFAULT_BRAND_COLOR
