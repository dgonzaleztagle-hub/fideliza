import type { Metadata } from 'next'
import ClientePanel from './ClientePanel'

export const metadata: Metadata = {
    title: 'Mi Panel — Vuelve+',
    description: 'Administra tu programa de lealtad en Vuelve+, ve estadísticas y gestiona tus clientes.',
    robots: {
        index: false,
        follow: false
    }
}

export default function ClientePage() {
    return <ClientePanel />
}
