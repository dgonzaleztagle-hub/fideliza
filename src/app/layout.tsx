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
      </head>
      <body>{children}</body>
    </html>
  )
}

