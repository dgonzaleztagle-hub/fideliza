import type { Metadata } from 'next'
import './globals.css'
import './landing.css'

export const metadata: Metadata = {
  title: 'Vuelve+ — Tus clientes siempre vuelven',
  description: 'Tarjetas de lealtad digitales en Google Wallet para tu negocio. Sin apps, sin cartón. QR en tu mostrador, puntos automáticos, premios con un escaneo.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
