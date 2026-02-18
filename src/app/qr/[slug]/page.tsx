import { getSupabase } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import QRPageClient from './QRPageClient'

interface Props {
    params: Promise<{ slug: string }>
}

export default async function QRPage({ params }: Props) {
    const supabase = getSupabase()
    const { slug } = await params

    // Buscar el tenant por slug
    const { data: tenant, error } = await supabase
        .from('tenants')
        .select('id, nombre, rubro, logo_url, color_primario, estado, slug')
        .eq('slug', slug)
        .single()

    if (error || !tenant || tenant.estado !== 'activo') {
        notFound()
    }

    // Buscar programa activo
    const { data: program } = await supabase
        .from('programs')
        .select('id, puntos_meta, descripcion_premio, tipo_premio, valor_premio')
        .eq('tenant_id', tenant.id)
        .eq('activo', true)
        .single()

    return <QRPageClient tenant={tenant} program={program} />
}
