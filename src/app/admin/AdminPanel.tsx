'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
    LayoutDashboard,
    Store,
    ShieldCheck,
    History,
    LogOut,
    CheckCircle,
    XCircle,
    RefreshCw,
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
        pyme: number
        pro: number
        full: number
        pausados: number
    }
    mrrProyectado: number
    activeCustomers: number
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
    is_pilot?: boolean
    pilot_started_at?: string | null
    pilot_notes?: string | null
}

type AdminTab = 'stats' | 'negocios' | 'logs'

interface AdminAuditLog {
    id: string
    admin_email: string
    action: string
    tenant_id: string | null
    meta?: Record<string, unknown>
    created_at: string
}

interface AdminTenantDetail {
    tenant: TenantAdminData & {
        selected_plan?: string | null
        trial_hasta?: string | null
        estado: string
        plan: string
        slug: string
        nombre: string
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
    program?: {
        tipo_programa?: string
        puntos_meta?: number
        descripcion_premio?: string
    } | null
    top_customers: Array<{ id: string; nombre: string; whatsapp: string; total_puntos_historicos: number }>
    recent_stamps: Array<{ id: string; created_at: string; customer_name: string; customer_whatsapp: string }>
    notifications: Array<{ id: string; titulo: string; segmento: string; total_destinatarios: number; created_at: string }>
    scheduled_campaigns: Array<{ id: string; nombre: string; fecha_envio: string; estado: string; created_at: string }>
    audit_logs: AdminAuditLog[]
}

export default function AdminPanel() {
    const [tab, setTab] = useState<AdminTab>('stats')
    const [stats, setStats] = useState<AdminStats | null>(null)
    const [tenants, setTenants] = useState<TenantAdminData[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState<string | null>(null)
    const [errorMsg, setErrorMsg] = useState('')
    const [authChecked, setAuthChecked] = useState(false)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [adminEmail, setAdminEmail] = useState('')
    const [adminPassword, setAdminPassword] = useState('')
    const [authError, setAuthError] = useState('')
    const [signingIn, setSigningIn] = useState(false)
    const [logs, setLogs] = useState<AdminAuditLog[]>([])
    const [selectedTenantDetail, setSelectedTenantDetail] = useState<AdminTenantDetail | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)

    function isAdminStats(data: unknown): data is AdminStats {
        if (!data || typeof data !== 'object') return false
        const v = data as Partial<AdminStats>
        return !!v.statsPlan &&
            typeof v.totalTenants === 'number' &&
            typeof v.totalCustomers === 'number' &&
            typeof v.totalStamps === 'number' &&
            typeof v.totalPremios === 'number' &&
            typeof v.mrrProyectado === 'number' &&
            typeof v.activeCustomers === 'number'
    }

    const loadStats = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/stats')
            const data = await res.json()
            if (!res.ok) {
                setStats(null)
                setErrorMsg(data?.error || 'No tienes permisos para ver /admin')
                return
            }
            if (!isAdminStats(data)) {
                setStats(null)
                setErrorMsg('Respuesta inválida del módulo admin.')
                return
            }
            setStats(data)
        } catch (err) {
            console.error('Error loading admin stats:', err)
            setStats(null)
            setErrorMsg('No se pudo cargar el panel admin.')
        }
    }, [])

    const loadTenants = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/tenants')
            const data = await res.json()
            if (!res.ok) {
                setTenants([])
                setErrorMsg((prev) => prev || data?.error || 'No autorizado para listar negocios')
                return
            }
            setTenants(Array.isArray(data?.tenants) ? data.tenants : [])
        } catch (err) {
            console.error('Error loading admin tenants:', err)
            setTenants([])
        }
    }, [])

    const loadLogs = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/logs')
            const data = await res.json()
            if (!res.ok) return
            setLogs(Array.isArray(data?.logs) ? data.logs : [])
        } catch (err) {
            console.error('Error loading admin logs:', err)
            setLogs([])
        }
    }, [])

    const loadAll = useCallback(async () => {
        setErrorMsg('')
        setLoading(true)
        await Promise.all([loadStats(), loadTenants(), loadLogs()])
        setLoading(false)
    }, [loadStats, loadTenants, loadLogs])

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
        void loadAll()
    }, [authChecked, isAuthenticated, loadAll])

    const handleAction = async (tenantId: string, action: string, extra?: Record<string, unknown>) => {
        setUpdating(tenantId)
        try {
            const res = await fetch(`/api/admin/tenant/${tenantId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...(extra || {}) })
            })
            if (res.ok) {
                await loadAll()
                if (selectedTenantDetail?.tenant?.id === tenantId) {
                    await openTenantDetail(tenantId)
                }
            }
        } catch (err) {
            console.error('Error updating tenant:', err)
        } finally {
            setUpdating(null)
        }
    }

    const openTenantDetail = async (tenantId: string) => {
        setDetailLoading(true)
        try {
            const res = await fetch(`/api/admin/tenant/${tenantId}/detail`)
            const data = await res.json()
            if (!res.ok) {
                alert(data?.error || 'No se pudo cargar el detalle')
                return
            }
            setSelectedTenantDetail(data as AdminTenantDetail)
        } catch (err) {
            console.error('Error loading tenant detail:', err)
            alert('No se pudo cargar el detalle del negocio')
        } finally {
            setDetailLoading(false)
        }
    }

    const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setAuthError('')

        if (!adminEmail || !adminPassword) {
            setAuthError('Ingresa email y contraseña')
            return
        }

        setSigningIn(true)
        try {
            const res = await fetch('/api/admin/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: adminEmail.trim(),
                    password: adminPassword
                })
            })
            const data = await res.json()
            if (!res.ok) {
                setAuthError(data?.error || 'No se pudo iniciar sesión')
                return
            }
            setAdminPassword('')
            setIsAuthenticated(true)
        } finally {
            setSigningIn(false)
        }
    }

    const handleSignOut = async () => {
        try {
            await fetch('/api/admin/auth/logout', { method: 'POST' })
        } finally {
            setIsAuthenticated(false)
            setStats(null)
            setTenants([])
            setLoading(false)
            setErrorMsg('')
        }
    }

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
                <main className="admin-main admin-auth-wrap">
                    <form className="admin-auth-card" onSubmit={handleSignIn}>
                        <div className="admin-logo" style={{ marginBottom: '1rem' }}>
                            <ShieldCheck size={24} color="#3b82f6" />
                            <span>HojaCero <span>Admin</span></span>
                        </div>
                        <h1>Ingresar a Admin</h1>
                        <p className="admin-subtitle">Acceso solo para correos autorizados en SUPER_ADMIN_EMAILS.</p>
                        <label className="admin-auth-label">
                            <span>Email</span>
                            <input
                                type="email"
                                value={adminEmail}
                                onChange={(e) => setAdminEmail(e.target.value)}
                                autoComplete="email"
                                placeholder="contacto@vuelve.vip"
                            />
                        </label>
                        <label className="admin-auth-label">
                            <span>Contraseña</span>
                            <input
                                type="password"
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                autoComplete="current-password"
                                placeholder="••••••••"
                            />
                        </label>
                        {authError && <div className="admin-auth-error">{authError}</div>}
                        <button className="admin-btn-action admin-auth-submit" type="submit" disabled={signingIn}>
                            {signingIn ? 'Ingresando...' : 'Entrar'}
                        </button>
                    </form>
                </main>
            </div>
        )
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
                    <button className="admin-nav-btn" onClick={handleSignOut}>
                        <LogOut size={20} />
                        <span>Cerrar sesión</span>
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
                        {errorMsg && (
                            <div className="admin-loading" style={{ marginBottom: '1rem', color: '#ef4444' }}>
                                {errorMsg}
                            </div>
                        )}
                        {tab === 'stats' && stats && (
                            <div className="admin-stats-view">
                                <div className="admin-stats-grid">
                                    <div className="admin-stat-card">
                                        <span className="admin-stat-label">Ingresos Proyectados (MRR)</span>
                                        <span className="admin-stat-value accent">
                                            ${stats.mrrProyectado.toLocaleString('es-CL')}
                                        </span>
                                        <span className="admin-stat-desc">
                                            Basado en {stats.statsPlan.pyme} Pyme · {stats.statsPlan.pro} Pro · {stats.statsPlan.full} Full
                                        </span>
                                    </div>
                                    <div className="admin-stat-card">
                                        <span className="admin-stat-label">Usuarios Activos (30d)</span>
                                        <span className="admin-stat-value">{stats.activeCustomers}</span>
                                        <span className="admin-stat-desc">Clientes con visitas recientes</span>
                                    </div>
                                    <div className="admin-stat-card">
                                        <span className="admin-stat-label">Total Negocios</span>
                                        <span className="admin-stat-value">{stats.totalTenants}</span>
                                        <div className="admin-stat-mini">
                                            <span>{stats.statsPlan.trial} Trial</span>
                                            <span>{stats.statsPlan.pyme} Pyme</span>
                                            <span>{stats.statsPlan.pro} Pro</span>
                                            <span>{stats.statsPlan.full} Full</span>
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
                                                    {t.is_pilot && (
                                                        <span className="admin-badge admin-badge-pilot" style={{ marginLeft: '0.35rem' }}>
                                                            piloto
                                                        </span>
                                                    )}
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
                                                    <button
                                                        className="admin-btn-action"
                                                        title="Extender 7 días"
                                                        onClick={() => handleAction(t.id, 'extend_trial', { days: 7 })}
                                                        disabled={updating === t.id}
                                                    >
                                                        +7d
                                                    </button>
                                                    <button
                                                        className="admin-btn-action"
                                                        title="Extender 30 días"
                                                        onClick={() => handleAction(t.id, 'extend_trial', { days: 30 })}
                                                        disabled={updating === t.id}
                                                    >
                                                        +30d
                                                    </button>
                                                    <button
                                                        className="admin-btn-action"
                                                        title={t.is_pilot ? 'Desactivar piloto' : 'Activar piloto'}
                                                        onClick={() => handleAction(t.id, 'set_pilot', { enabled: !t.is_pilot })}
                                                        disabled={updating === t.id}
                                                    >
                                                        {t.is_pilot ? 'Piloto OFF' : 'Piloto ON'}
                                                    </button>
                                                    <button
                                                        className="admin-btn-action"
                                                        title="Ver detalle"
                                                        onClick={() => openTenantDetail(t.id)}
                                                        disabled={updating === t.id}
                                                    >
                                                        Detalle
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {tab === 'logs' && (
                            <div className="admin-table-container">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Admin</th>
                                            <th>Acción</th>
                                            <th>Tenant</th>
                                            <th>Meta</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.length === 0 ? (
                                            <tr>
                                                <td colSpan={5}>Sin actividad registrada todavía.</td>
                                            </tr>
                                        ) : logs.map((l) => (
                                            <tr key={l.id}>
                                                <td>{new Date(l.created_at).toLocaleString('es-CL')}</td>
                                                <td>{l.admin_email}</td>
                                                <td>{l.action}</td>
                                                <td>{l.tenant_id || '-'}</td>
                                                <td style={{ maxWidth: 280, whiteSpace: 'pre-wrap' }}>{JSON.stringify(l.meta || {})}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </main>

            {selectedTenantDetail && (
                <div className="admin-modal-overlay" onClick={() => setSelectedTenantDetail(null)}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 980 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Detalle: {selectedTenantDetail.tenant.nombre}</h3>
                            <button className="admin-btn-action" onClick={() => setSelectedTenantDetail(null)}>Cerrar</button>
                        </div>
                        {detailLoading ? (
                            <div className="admin-loading">Cargando detalle...</div>
                        ) : (
                            <>
                                <div className="admin-stats-grid" style={{ marginBottom: '1rem' }}>
                                    <div className="admin-stat-card"><span className="admin-stat-label">Plan</span><span className="admin-stat-value">{selectedTenantDetail.tenant.plan}</span></div>
                                    <div className="admin-stat-card"><span className="admin-stat-label">Estado</span><span className="admin-stat-value">{selectedTenantDetail.tenant.estado}</span></div>
                                    <div className="admin-stat-card"><span className="admin-stat-label">Clientes</span><span className="admin-stat-value">{selectedTenantDetail.summary.total_customers}</span></div>
                                    <div className="admin-stat-card"><span className="admin-stat-label">Stamps (muestra)</span><span className="admin-stat-value">{selectedTenantDetail.summary.total_stamps}</span></div>
                                    <div className="admin-stat-card"><span className="admin-stat-label">Notificaciones (muestra)</span><span className="admin-stat-value">{selectedTenantDetail.summary.total_notifications}</span></div>
                                    <div className="admin-stat-card"><span className="admin-stat-label">Campañas (muestra)</span><span className="admin-stat-value">{selectedTenantDetail.summary.total_campaigns}</span></div>
                                </div>
                                <div className="admin-table-container" style={{ marginBottom: '1rem' }}>
                                    <table className="admin-table">
                                        <thead>
                                            <tr><th>Top clientes</th><th>WhatsApp</th><th>Puntos</th></tr>
                                        </thead>
                                        <tbody>
                                            {selectedTenantDetail.top_customers.map((c) => (
                                                <tr key={c.id}>
                                                    <td>{c.nombre}</td><td>{c.whatsapp}</td><td>{c.total_puntos_historicos}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="admin-table-container">
                                    <table className="admin-table">
                                        <thead>
                                            <tr><th>Últimos movimientos</th><th>Cliente</th><th>Fecha</th></tr>
                                        </thead>
                                        <tbody>
                                            {selectedTenantDetail.recent_stamps.slice(0, 15).map((s) => (
                                                <tr key={s.id}>
                                                    <td>Stamp</td><td>{s.customer_name} ({s.customer_whatsapp})</td><td>{new Date(s.created_at).toLocaleString('es-CL')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
