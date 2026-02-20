import type { Metadata } from 'next'

import './globals.css'
import './landing.css'
import { SignatureSEO } from '@/components/seo/SignatureSEO'

export const metadata: Metadata = {
  title: 'Vuelve+ — Fidelización en Google Wallet',
  description: 'Sistema de lealtad digital para negocios. Tus clientes suman puntos con su celular y tarjeta digital en Google Wallet. Sin apps, sin plástico.',
  keywords: 'fidelización, lealtad, google wallet, tarjeta digital, puntos, premios, marketing, retención',
  openGraph: {
    title: 'Vuelve+ — Tus clientes siempre vuelven',
    description: 'Convierte visitas ocasionales en clientes frecuentes con tu propia tarjeta digital.',
    url: 'https://vuelve.vip',
    siteName: 'Vuelve+',
    locale: 'es_CL',
    type: 'website',
  },
  verification: {
    google: 'Ksg9y4FmVH7dx6J5A9oYAI89o1tb0A8shOgukFziocQ',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <head>
        <SignatureSEO />
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PPDDCZ4B');`
          }}
        />
        {/* End Google Tag Manager */}
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PPDDCZ4B"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          ></iframe>
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        {children}
      </body>
    </html>
  )
}


