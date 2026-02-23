import type { Metadata } from 'next'
import AdminPanel from './AdminPanel'

export const metadata: Metadata = {
    title: 'Super Admin — HojaCero Admin',
    description: 'Panel de administración global para la plataforma Vuelve+.',
    robots: {
        index: false,
        follow: false
    }
}

export default function AdminPage() {
    return <AdminPanel />
}
