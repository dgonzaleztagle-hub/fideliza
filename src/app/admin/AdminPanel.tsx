'use client'

import React, { useState, useEffect } from 'react'
import {
    LayoutDashboard,
    Users,
    Store,
    CreditCard,
    ShieldCheck,
    History,
    Settings,
    LogOut,
    PlusCircle,
    CheckCircle,
    XCircle,
    RefreshCw,
    TrendingUp,
    Gift,
    Calendar
} from 'lucide-react'
import './admin.css'

interface AdminStats {
    totalTenants: number
    totalCustomers: number
    totalStamps: number
    totalPremios: number
    statsPlan: {
        trial: number
        pro: number
        pausados: number
    }
    mrrProyectado: number
}

interface TenantAdminData {
    id: string
    nombre: string
    slug: string
    plan: string
    estado: string
    trial_hasta: string
    created_at: string
    total_customers: number
    total_stamps: number
    total_rewards: number
}

type AdminTab = 'stats' | 'negocios' | 'logs'

export default function AdminPanel() {
    const [tab, setTab] = useState<AdminTab>('stats')
    const [stats, setStats] = useState<AdminStats | null>(null)
    const [tenants, setTenants] = useState<TenantAdminData[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState<string | null>(null)

    async function loadStats() {
        try {
            const res = await fetch('/api/admin/stats')
            const data = await res.json()
            setStats(data)
        } catch (err) {
            console.error('Error loading admin stats:', err)
        }
    }

    async function loadTenants() {
        try {
            const res = await fetch('/api/admin/tenants')
            const data = await res.json()
            setTenants(data.tenants || [])
        } catch (err) {
            console.error('Error loading admin tenants:', err)
        }
    }

    async function loadAll() {
        setLoading(true)
        await Promise.all([loadStats(), loadTenants()])
        setLoading(false)
    }

    useEffect(() => {
        loadAll()
    }, [])

    const handleAction = async (tenantId: string, action: string) => {
        setUpdating(tenantId)
        try {
            const res = await fetch(`/api/admin/tenant/${tenantId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            })
            if (res.ok) {
                await loadAll()
            }
        } catch (err) {
            console.error('Error updating tenant:', err)
        } finally {
            setUpdating(null)
        }
    }

    return (
        <div className="admin-page">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="admin-logo">
                    <ShieldCheck size={24} color="#3b82f6" />
                    <span>HojaCero <span>Admin</span></span>
                </div>

                <nav className="admin-nav">
                    <button
                        className={`admin-nav-btn ${tab === 'stats' ? 'active' : ''}`}
                        onClick={() => setTab('stats')}
                    >
                        <LayoutDashboard size={20} />
                        <span>Métricas Globales</span>
                    </button>
                    <button
                        className={`admin-nav-btn ${tab === 'negocios' ? 'active' : ''}`}
                        onClick={() => setTab('negocios')}
                    >
                        <Store size={20} />
                        <span>Gestionar Negocios</span>
                    </button>
                    <button
                        className={`admin-nav-btn ${tab === 'logs' ? 'active' : ''}`}
                        onClick={() => setTab('logs')}
                    >
                        <History size={20} />
                        <span>Logs de Auditoría</span>
                    </button>
                </nav>

                <div className="admin-sidebar-footer">
                    <button className="admin-nav-btn" onClick={() => window.location.href = '/'}>
                        <LogOut size={20} />
                        <span>Ver Landing</span>
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="admin-main">
                <header className="admin-header">
                    <div className="admin-title">
                        <h1>{tab === 'stats' ? 'Centro de Mando' : tab === 'negocios' ? 'Negocios Registrados' : 'Auditoría'}</h1>
                        <p className="admin-subtitle">Gestión global de la plataforma Vuelve+</p>
                    </div>
                    <button className="admin-btn-action" onClick={loadAll} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Actualizar
                    </button>
                </header>

                {loading ? (
                    <div className="admin-loading">Cargando datos maestros...</div>
                ) : (
                    <>
                        {tab === 'stats' && stats && (
                            <div className="admin-stats-view">
                                <div className="admin-stats-grid">
                                    <div className="admin-stat-card">
                                        <span className="admin-stat-label">Ingresos Proyectados (MRR)</span>
                                        <span className="admin-stat-value accent">
                                            ${stats.mrrProyectado.toLocaleString('es-CL')}
                                        </span>
                                        <span className="admin-stat-desc">En base a {stats.statsPlan.pro} planes Pro</span>
                                    </div>
                                    <div className="admin-stat-card">
                                        <span className="admin-stat-label">Total Negocios</span>
                                        <span className="admin-stat-value">{stats.totalTenants}</span>
                                        <div className="admin-stat-mini">
                                            <span>{stats.statsPlan.trial} Trial</span>
                                            <span>{stats.statsPlan.pro} Pro</span>
                                        </div>
                                    </div>
                                    <div className="admin-stat-card">
                                        <span className="admin-stat-label">Usuarios Finales</span>
                                        <span className="admin-stat-value">{stats.totalCustomers}</span>
                                        <span className="admin-stat-desc">Registrados en toda la red</span>
                                    </div>
                                    <div className="admin-stat-card">
                                        <span className="admin-stat-label">Actividad Total</span>
                                        <span className="admin-stat-value">{stats.totalStamps}</span>
                                        <span className="admin-stat-desc">Puntos/Sellos entregados</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {tab === 'negocios' && (
                            <div className="admin-table-container">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Negocio</th>
                                            <th>Plan</th>
                                            <th>Vencimiento</th>
                                            <th>Clientes</th>
                                            <th>Actividad</th>
                                            <th>Estado</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tenants.map(t => (
                                            <tr key={t.id}>
                                                <td>
                                                    <div className="admin-tenant-name">{t.nombre}</div>
                                                    <div className="admin-tenant-slug">/{t.slug}</div>
                                                </td>
                                                <td>
                                                    <span className={`admin-badge admin-badge-${t.plan}`}>
                                                        {t.plan}
                                                    </span>
                                                </td>
                                                <td>
                                                    {new Date(t.trial_hasta).toLocaleDateString('es-CL')}
                                                </td>
                                                <td>{t.total_customers}</td>
                                                <td>
                                                    <div className="admin-tenant-slug">{t.total_stamps} sellos</div>
                                                    <div className="admin-tenant-slug">{t.total_rewards} premios</div>
                                                </td>
                                                <td>
                                                    <span className={`admin-badge admin-badge-${t.estado}`}>
                                                        {t.estado}
                                                    </span>
                                                </td>
                                                <td className="admin-actions">
                                                    <button
                                                        className="admin-btn-action success"
                                                        title="Activar 30 días"
                                                        onClick={() => handleAction(t.id, 'activate')}
                                                        disabled={updating === t.id}
                                                    >
                                                        <CheckCircle size={16} />
                                                        {t.plan === 'trial' ? 'A Pro' : '+30d'}
                                                    </button>
                                                    {t.estado === 'activo' ? (
                                                        <button
                                                            className="admin-btn-action danger"
                                                            title="Pausar"
                                                            onClick={() => handleAction(t.id, 'pause')}
                                                            disabled={updating === t.id}
                                                        >
                                                            <XCircle size={16} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="admin-btn-action success"
                                                            title="Reactivar"
                                                            onClick={() => handleAction(t.id, 'activate')}
                                                            disabled={updating === t.id}
                                                        >
                                                            <Calendar size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    )
}
