interface SEOHeadProps {
    title: string;
    description: string;
    keywords?: string;
    image?: string;
    url?: string;
    type?: 'website' | 'article' | 'product';
    // SaaS Specific
    applicationName?: string;
    priceAmount?: string;
    priceCurrency?: string;
    operatingSystem?: string;
    category?: string;
}

export function SEOHead({
    title,
    description,
    keywords,
    image = 'https://vuelve.vip/og-image.jpg',
    url = 'https://vuelve.vip',
    type = 'website',
    applicationName = 'Vuelve+',
    priceAmount = '34990',
    priceCurrency = 'CLP',
    operatingSystem = 'Web, Android (Google Wallet)',
    category = 'BusinessApplication',
}: SEOHeadProps) {

    // JSON-LD SoftwareApplication (SaaS)
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": applicationName,
        "applicationCategory": category,
        "operatingSystem": operatingSystem,
        "offers": {
            "@type": "Offer",
            "price": priceAmount,
            "priceCurrency": priceCurrency
        },
        "description": description,
        "image": image,
        "url": url,
        "author": {
            "@type": "Organization",
            "name": "HojaCero",
            "url": "https://hojacero.com"
        },
        // AEO: Direct Answers embedded in schema
        "mainEntity": [
            {
                "@type": "Question",
                "name": "¿Qué es Vuelve+?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Vuelve+ es un sistema de fidelización digital que permite a negocios crear tarjetas de sellos para Google Wallet sin necesidad de desarrollar una App propia."
                }
            },
            {
                "@type": "Question",
                "name": "¿Cuánto cuesta Vuelve+?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "El plan lanzamiento cuesta $34.990 CLP mensuales e incluye clientes ilimitados, notificaciones push y panel de control."
                }
            }
        ]
    };

    return (
        <>
            <title>{title}</title>
            <meta name="description" content={description} />
            {keywords && <meta name="keywords" content={keywords} />}
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta property="og:locale" content="es_CL" />

            {/* Open Graph */}
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:type" content={type} />
            {image && <meta property="og:image" content={image} />}
            {url && <meta property="og:url" content={url} />}

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            {image && <meta name="twitter:image" content={image} />}

            {/* JSON-LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
        </>
    );
}
