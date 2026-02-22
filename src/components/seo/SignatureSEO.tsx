
export function SignatureSEO() {
    // JSON-LD SoftwareApplication (SaaS)
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Vuelve+",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web, Android (Google Wallet)",
        "offers": {
            "@type": "Offer",
            "price": "19990",
            "priceCurrency": "CLP",
            "priceValidity": "2026-12-31"
        },
        "description": "El sistema de fidelización digital más simple de Chile. Crea tarjetas de puntos para Google Wallet en 2 minutos. Sin apps, sin hardware.",
        "image": "https://vuelve.vip/og-image.jpg",
        "url": "https://vuelve.vip",
        "author": {
            "@type": "Organization",
            "name": "HojaCero",
            "url": "https://hojacero.com"
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "ratingCount": "120"
        },
        // AEO: Direct Answers from Deep Research (Money Keywords)
        "mainEntity": [
            {
                "@type": "Question",
                "name": "¿Cómo crear tarjetas de puntos digitales para mi negocio?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Con Vuelve+ puedes crear tarjetas digitales en 2 minutos. Tus clientes las guardan en Google Wallet escaneando un QR, sin descargar aplicaciones extrañas."
                }
            },
            {
                "@type": "Question",
                "name": "¿Cuánto cuesta un sistema de fidelización en Chile?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Vuelve+ ofrece planes desde $19.990 CLP mensuales y escala a Pro y Full según el nivel de motores y automatización que necesite el negocio."
                }
            },
            {
                "@type": "Question",
                "name": "¿Sirve para barberías y cafeterías?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Sí. Vuelve+ está diseñado específicamente para negocios de alta recurrencia como barberías, cafeterías y centros de estética donde la rapidez en caja es crítica."
                }
            },
            {
                "@type": "Question",
                "name": "¿Qué pasa si no tengo página web?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "No necesitas página web. Vuelve+ te entrega un QR y un panel de control listo para usar. Es una solución 'llave en mano' para fidelizar clientes."
                }
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
