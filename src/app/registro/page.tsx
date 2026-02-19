import type { Metadata } from 'next'
import RegistroForm from './RegistroForm'

export const metadata: Metadata = {
    title: 'Registro — Vuelve+',
    description: 'Registra tu negocio y empieza a fidelizar clientes en 2 minutos con Vuelve+. 14 días de prueba gratis.',
}

export default function RegistroPage() {
    return <RegistroForm />
}
