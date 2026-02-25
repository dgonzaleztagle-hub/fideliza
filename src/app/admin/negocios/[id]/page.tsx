import type { Metadata } from 'next'
import TenantDetailPage from './TenantDetailPage'

export const metadata: Metadata = {
    title: 'Detalle Negocio — HojaCero Admin',
    description: 'Detalle operativo de negocio en panel admin.',
    robots: {
        index: false,
        follow: false
    }
}

type PageParams = {
    params: Promise<{ id: string }>
}

export default async function AdminTenantDetailRoute({ params }: PageParams) {
    const { id } = await params
    return <TenantDetailPage tenantId={id} />
}
