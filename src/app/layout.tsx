import type { Metadata } from 'next'
import './globals.css'
import './landing.css'

export const metadata: Metadata = {
  title: 'Fideliza — Tarjetas de lealtad digitales para tu negocio',
  description: 'Transforma la lealtad de tus clientes con tarjetas digitales en Google Wallet. Sin apps, sin cartón, sin complicaciones.',
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
