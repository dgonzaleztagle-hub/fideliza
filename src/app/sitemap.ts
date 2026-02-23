import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://vuelve.vip'
    const now = new Date()

    // Solo páginas canónicas e indexables.
    const routes = [
        '',
        '/registro',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: now,
        changeFrequency: route === '' ? ('daily' as const) : ('weekly' as const),
        priority: route === '' ? 1 : 0.9,
    }))

    return [...routes]
}
