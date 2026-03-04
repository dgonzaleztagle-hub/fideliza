
export function SignatureSEO() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "@id": "https://vuelve.vip/#organization",
                "name": "Vuelve+",
                "url": "https://vuelve.vip",
                "logo": "https://vuelve.vip/og-image.jpg",
                "image": "https://vuelve.vip/og-image.jpg",
                "description": "Sistema de fidelización digital con Google Wallet para negocios en Chile. Tarjetas de puntos digitales sin apps, sin plástico.",
                "email": "contacto@vuelve.vip",
                "address": {
                    "@type": "PostalAddress",
                    "addressLocality": "Santiago",
                    "addressRegion": "Región Metropolitana",
                    "addressCountry": "CL"
                },
                "areaServed": {
                    "@type": "Country",
                    "name": "Chile"
                },
                "sameAs": [
                    "https://hojacero.cl"
                ]
            },
            {
                "@type": "WebSite",
                "@id": "https://vuelve.vip/#website",
                "url": "https://vuelve.vip",
                "name": "Vuelve+ | Fidelización Digital",
                "publisher": { "@id": "https://vuelve.vip/#organization" },
                "inLanguage": "es-CL"
            },
            {
                "@type": "SoftwareApplication",
                "@id": "https://vuelve.vip/#app",
                "name": "Vuelve+",
                "applicationCategory": "BusinessApplication",
                "operatingSystem": "Web, Android (Google Wallet)",
                "offers": {
                    "@type": "Offer",
                    "price": "19990",
                    "priceCurrency": "CLP",
                    "priceValidUntil": "2026-12-31"
                },
                "description": "El sistema de fidelización digital más simple de Chile. Crea tarjetas de puntos para Google Wallet en 2 minutos. Sin apps, sin hardware.",
                "image": "https://vuelve.vip/og-image.jpg",
                "url": "https://vuelve.vip",
                "author": { "@id": "https://hojacero.cl/#organization" },
                "publisher": { "@id": "https://hojacero.cl/#organization" },
                "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": "4.9",
                    "ratingCount": "120"
                }
            },
            {
                "@type": "FAQPage",
                "@id": "https://vuelve.vip/#faq",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": "¿Cómo crear tarjetas de puntos digitales para mi negocio?",
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": "Con Vuelve+ puedes crear tarjetas de fidelización digitales en menos de 2 minutos. Solo necesitas registrarte en vuelve.vip, configurar tu programa de puntos (nombre del negocio, cantidad de sellos para el premio, y el premio en sí), y compartir el QR con tus clientes. Ellos escanean el código con su celular y la tarjeta se guarda automáticamente en Google Wallet. No necesitan descargar ninguna aplicación externa ni cargar con tarjetas de cartón. Cada vez que visitan tu local, el cajero escanea su código y se suman los puntos automáticamente."
                        }
                    },
                    {
                        "@type": "Question",
                        "name": "¿Cuánto cuesta un sistema de fidelización en Chile?",
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": "Vuelve+ ofrece planes accesibles para negocios de todos los tamaños en Chile. El plan Pyme comienza desde $19.990 CLP mensuales e incluye el motor de sellos digital, tarjetas ilimitadas para clientes, QR personalizado y panel de administración. Para negocios con mayor volumen existen los planes Pro y Full que agregan automatización avanzada, integraciones con punto de venta (POS), reportes de retención y múltiples sucursales. A diferencia de sistemas tradicionales que requieren hardware costoso o tarjetas plásticas, Vuelve+ funciona 100% digital sin inversión inicial en equipos."
                        }
                    },
                    {
                        "@type": "Question",
                        "name": "¿Sirve para barberías, cafeterías y centros de estética?",
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": "Sí, Vuelve+ está diseñado específicamente para negocios de alta recurrencia como barberías, cafeterías, centros de estética, peluquerías, restaurantes y tiendas de barrio. Estos negocios dependen de que sus clientes vuelvan semana a semana, y un programa de fidelización digital les ayuda a convertir visitas esporádicas en clientes frecuentes. El sistema de sellos es tan rápido que no interrumpe el flujo de caja — el cajero escanea el código del cliente en menos de 3 segundos. Además, las notificaciones automáticas de Google Wallet recuerdan al cliente que tiene puntos acumulados."
                        }
                    },
                    {
                        "@type": "Question",
                        "name": "¿Qué pasa si no tengo página web?",
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": "No necesitas tener página web para usar Vuelve+. El sistema es completamente autónomo: te entregamos un QR personalizado que puedes imprimir y poner en tu caja, un panel de control online donde administras tu programa de puntos, y tus clientes acceden a su tarjeta digital directamente desde Google Wallet en su celular. Es una solución 'llave en mano' diseñada para negocios que quieren fidelizar clientes sin complicaciones técnicas. Si en el futuro decides tener un sitio web, Vuelve+ se integra fácilmente como módulo dentro de tu plataforma."
                        }
                    }
                ]
            }
        ]
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}
