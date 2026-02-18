import type { Metadata } from 'next'
import RegistroForm from './RegistroForm'

export const metadata: Metadata = {
    title: 'Crear mi programa de fidelización — Fideliza',
    description: 'Registra tu negocio y empieza a fidelizar clientes en 2 minutos. 14 días de prueba gratis.',
}

export default function RegistroPage() {
    return <RegistroForm />
}
