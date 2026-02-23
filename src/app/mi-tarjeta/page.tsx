import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Mi Tarjeta — Vuelve+',
    description: 'Consulta tu progreso en tus programas de lealtad favoritos',
    robots: {
        index: false,
        follow: false
    }
}

export default function MiTarjetaPage() {
    return <MiTarjetaClient />
}

import MiTarjetaClient from './MiTarjetaClient'
