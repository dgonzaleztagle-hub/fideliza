import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://vuelve.vip'

    // Páginas estáticas principales
    const routes = [
        '',
        '/cliente',
        '/login',
        '/registro',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: route === '' ? 1 : 0.8,
    }))

    return [...routes]
}
