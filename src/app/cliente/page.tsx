import type { Metadata } from 'next'
import ClientePanel from './ClientePanel'

export const metadata: Metadata = {
    title: 'Mi Panel — Fideliza',
    description: 'Administra tu programa de fidelización, ve estadísticas y gestiona tus clientes.',
}

export default function ClientePage() {
    return <ClientePanel />
}
