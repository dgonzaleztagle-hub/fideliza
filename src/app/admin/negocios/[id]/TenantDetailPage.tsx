'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react'
import '../../admin.css'

interface AdminAuditLog {
    id: string
    admin_email: string
    action: string
    tenant_id: string | null
    meta?: Record<string, unknown>
    created_at: string
}

interface TenantDetailData {
    tenant: {
        id: string
        nombre: string
        slug: string
        plan: string
        estado: string
        trial_hasta?: string | null
        rubro?: string | null
        direccion?: string | null
        telefono?: string | null
    }
    summary: {
        total_customers: number
        total_stamps: number
        total_rewards: number
        total_rewards_redeemed: number
        total_notifications: number
        total_campaigns: number
        last_customer_at: string | null
        last_stamp_at: string | null
        last_notification_at: string | null
    }
    top_customers: Array<{ id: string; nombre: string; whatsapp: string; total_puntos_historicos: number }>
    recent_stamps: Array<{ id: string; created_at: string; customer_name: string; customer_whatsapp: string }>
    notifications: Array<{ id: string; titulo: string; segmento: string; total_destinatarios: number; created_at: string }>
    scheduled_campaigns: Array<{ id: string; nombre: string; fecha_envio: string; estado: string; created_at: string }>
    audit_logs: AdminAuditLog[]
}

function safeDateTime(value?: string | null) {
    if (!value) return '-'
    const dt = new Date(value)
    if (Number.isNaN(dt.getTime())) return '-'
    return dt.toLocaleString('es-CL')
}

export default function TenantDetailPage({ tenantId }: { tenantId: string }) {
    const [authChecked, setAuthChecked] = useState(false)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [loading, setLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState('')
    const [detail, setDetail] = useState<TenantDetailData | null>(null)

    const loadDetail = useCallback(async () => {
        setLoading(true)
        setErrorMsg('')
        try {
            const res = await fetch(`/api/admin/tenant/${tenantId}/detail`, { cache: 'no-store' })
            const data = await res.json()
            if (!res.ok) {
                setDetail(null)
                setErrorMsg(data?.error || 'No se pudo cargar el detalle del negocio.')
                return
            }
            setDetail(data as TenantDetailData)
        } catch {
            setDetail(null)
            setErrorMsg('Error de red cargando el detalle.')
        } finally {
            setLoading(false)
        }
    }, [tenantId])

    useEffect(() => {
        let mounted = true
        ;(async () => {
            const res = await fetch('/api/admin/auth/session', { cache: 'no-store' })
            if (!mounted) return
            setIsAuthenticated(res.ok)
            setAuthChecked(true)
        })()
        return () => {
            mounted = false
        }
    }, [])

    useEffect(() => {
        if (!authChecked || !isAuthenticated) {
            setLoading(false)
            return
        }
        void loadDetail()
    }, [authChecked, isAuthenticated, loadDetail])

    if (!authChecked) {
        return (
            <div className="admin-page">
                <main className="admin-main">
                    <div className="admin-loading">Validando sesión admin...</div>
                </main>
            </div>
        )
    }

    if (!isAuthenticated) {
        return (
            <div className="admin-page">
                <main className="admin-main">
                    <div className="admin-message error">
                        Sesión admin no válida. Vuelve a iniciar sesión en <Link href="/admin">/admin</Link>.
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="admin-page">
            <aside className="admin-sidebar">
                <div className="admin-logo">
                    <ShieldCheck size={24} color="#3b82f6" />
                    <span>HojaCero <span>Admin</span></span>
                </div>
                <nav className="admin-nav">
                    <Link className="admin-nav-btn active" href="/admin">
                        <ArrowLeft size={20} />
                        <span>Volver al Panel</span>
                    </Link>
                </nav>
            </aside>

            <main className="admin-main">
                <header className="admin-header">
                    <div className="admin-title">
                        <h1>Detalle de Negocio</h1>
                        <p className="admin-subtitle">
                            {detail?.tenant?.nombre || 'Cargando...'}
                        </p>
                    </div>
                    <button className="admin-btn-action" onClick={loadDetail} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Actualizar
                    </button>
                </header>

                {errorMsg && <div className="admin-message error">{errorMsg}</div>}

                {loading ? (
                    <div className="admin-loading">Cargando detalle...</div>
                ) : detail ? (
                    <>
                        <div className="admin-stats-grid" style={{ marginBottom: '1rem' }}>
                            <div className="admin-stat-card"><span className="admin-stat-label">Plan</span><span className="admin-stat-value">{detail.tenant.plan}</span></div>
                            <div className="admin-stat-card"><span className="admin-stat-label">Estado</span><span className="admin-stat-value">{detail.tenant.estado}</span></div>
                            <div className="admin-stat-card"><span className="admin-stat-label">Clientes</span><span className="admin-stat-value">{detail.summary.total_customers}</span></div>
                            <div className="admin-stat-card"><span className="admin-stat-label">Stamps</span><span className="admin-stat-value">{detail.summary.total_stamps}</span></div>
                            <div className="admin-stat-card"><span className="admin-stat-label">Notificaciones</span><span className="admin-stat-value">{detail.summary.total_notifications}</span></div>
                            <div className="admin-stat-card"><span className="admin-stat-label">Campañas</span><span className="admin-stat-value">{detail.summary.total_campaigns}</span></div>
                        </div>

                        <div className="admin-table-container" style={{ marginBottom: '1rem' }}>
                            <table className="admin-table">
                                <thead>
                                    <tr><th>Top clientes</th><th>WhatsApp</th><th>Puntos</th></tr>
                                </thead>
                                <tbody>
                                    {detail.top_customers.length === 0 ? (
                                        <tr><td colSpan={3}>Sin clientes top todavía.</td></tr>
                                    ) : detail.top_customers.map((c) => (
                                        <tr key={c.id}>
                                            <td>{c.nombre}</td>
                                            <td>{c.whatsapp}</td>
                                            <td>{c.total_puntos_historicos}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="admin-table-container" style={{ marginBottom: '1rem' }}>
                            <table className="admin-table">
                                <thead>
                                    <tr><th>Últimos stamps</th><th>Cliente</th><th>Fecha</th></tr>
                                </thead>
                                <tbody>
                                    {detail.recent_stamps.length === 0 ? (
                                        <tr><td colSpan={3}>Sin actividad reciente.</td></tr>
                                    ) : detail.recent_stamps.slice(0, 20).map((s) => (
                                        <tr key={s.id}>
                                            <td>Stamp</td>
                                            <td>{s.customer_name} ({s.customer_whatsapp})</td>
                                            <td>{safeDateTime(s.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="admin-table-container" style={{ marginBottom: '1rem' }}>
                            <table className="admin-table">
                                <thead>
                                    <tr><th>Notificación</th><th>Segmento</th><th>Destinatarios</th><th>Fecha</th></tr>
                                </thead>
                                <tbody>
                                    {detail.notifications.length === 0 ? (
                                        <tr><td colSpan={4}>Sin notificaciones registradas.</td></tr>
                                    ) : detail.notifications.slice(0, 20).map((n) => (
                                        <tr key={n.id}>
                                            <td>{n.titulo}</td>
                                            <td>{n.segmento}</td>
                                            <td>{n.total_destinatarios}</td>
                                            <td>{safeDateTime(n.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr><th>Campaña</th><th>Estado</th><th>Fecha envío</th><th>Creada</th></tr>
                                </thead>
                                <tbody>
                                    {detail.scheduled_campaigns.length === 0 ? (
                                        <tr><td colSpan={4}>Sin campañas registradas.</td></tr>
                                    ) : detail.scheduled_campaigns.slice(0, 20).map((c) => (
                                        <tr key={c.id}>
                                            <td>{c.nombre}</td>
                                            <td>{c.estado}</td>
                                            <td>{safeDateTime(c.fecha_envio)}</td>
                                            <td>{safeDateTime(c.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : null}
            </main>
        </div>
    )
}
