import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/admin/', '/cliente', '/mi-tarjeta', '/cajero/'],
        },
        sitemap: 'https://vuelve.vip/sitemap.xml',
        host: 'https://vuelve.vip',
    }
}
