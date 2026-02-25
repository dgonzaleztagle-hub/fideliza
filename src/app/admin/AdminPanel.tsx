'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
    LayoutDashboard,
    Store,
    ShieldCheck,
    History,
    LogOut,
    CheckCircle,
    XCircle,
    RefreshCw,
    Calendar,
    Search,
    ChevronLeft,
    ChevronRight
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

interface TenantsPagination {
    total: number
    page: number
    pageSize: number
    totalPages: number
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

export default function AdminPanel() {
    const [tab, setTab] = useState<AdminTab>('stats')
    const [stats, setStats] = useState<AdminStats | null>(null)
    const [tenants, setTenants] = useState<TenantAdminData[]>([])
    const [tenantsPage, setTenantsPage] = useState<TenantsPagination>({
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 1
    })
    const [loadingStats, setLoadingStats] = useState(false)
    const [loadingTenants, setLoadingTenants] = useState(false)
    const [loadingLogs, setLoadingLogs] = useState(false)
    const [updating, setUpdating] = useState<string | null>(null)
    const [errorMsg, setErrorMsg] = useState('')
    const [successMsg, setSuccessMsg] = useState('')
    const [authChecked, setAuthChecked] = useState(false)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [adminEmail, setAdminEmail] = useState('')
    const [adminPassword, setAdminPassword] = useState('')
    const [authError, setAuthError] = useState('')
    const [signingIn, setSigningIn] = useState(false)
    const [logs, setLogs] = useState<AdminAuditLog[]>([])
    const [query, setQuery] = useState('')
    const [planFilter, setPlanFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [pilotFilter, setPilotFilter] = useState('')
    const [sortBy, setSortBy] = useState<'created_at' | 'nombre' | 'plan' | 'estado' | 'trial_hasta'>('created_at')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

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

    const isLoading = loadingStats || loadingTenants || loadingLogs

    const safeDate = (value?: string | null) => {
        if (!value) return '-'
        const dt = new Date(value)
        if (Number.isNaN(dt.getTime())) return '-'
        return dt.toLocaleDateString('es-CL')
    }

    const safeDateTime = (value?: string | null) => {
        if (!value) return '-'
        const dt = new Date(value)
        if (Number.isNaN(dt.getTime())) return '-'
        return dt.toLocaleString('es-CL')
    }

    const loadStats = useCallback(async () => {
        setLoadingStats(true)
        try {
            const res = await fetch('/api/admin/stats', { cache: 'no-store' })
            const data = await res.json()
            if (!res.ok) {
                setStats(null)
                setErrorMsg(data?.error || 'No tienes permisos para ver métricas globales.')
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
            setErrorMsg('No se pudo cargar el módulo de métricas.')
        } finally {
            setLoadingStats(false)
        }
    }, [])

    const loadTenants = useCallback(async (opts?: { keepPage?: boolean; page?: number }) => {
        setLoadingTenants(true)
        try {
            const page = typeof opts?.page === 'number'
                ? opts.page
                : (opts?.keepPage ? tenantsPage.page : 1)
            const params = new URLSearchParams({
                q: query.trim(),
                plan: planFilter,
                estado: statusFilter,
                pilot: pilotFilter,
                page: String(page),
                pageSize: String(tenantsPage.pageSize),
                sortBy,
                sortDir
            })
            const res = await fetch(`/api/admin/tenants?${params.toString()}`, { cache: 'no-store' })
            const data = await res.json()
            if (!res.ok) {
                setTenants([])
                setErrorMsg((prev) => prev || data?.error || 'No autorizado para listar negocios')
                return
            }
            setTenants(Array.isArray(data?.tenants) ? data.tenants : [])
            setTenantsPage({
                total: Number(data?.pagination?.total || 0),
                page: Number(data?.pagination?.page || 1),
                pageSize: Number(data?.pagination?.pageSize || 20),
                totalPages: Number(data?.pagination?.totalPages || 1)
            })
        } catch (err) {
            console.error('Error loading admin tenants:', err)
            setTenants([])
            setErrorMsg((prev) => prev || 'No se pudo cargar la lista de negocios.')
        } finally {
            setLoadingTenants(false)
        }
    }, [pilotFilter, planFilter, query, sortBy, sortDir, statusFilter, tenantsPage.page, tenantsPage.pageSize])

    const loadLogs = useCallback(async () => {
        setLoadingLogs(true)
        try {
            const res = await fetch('/api/admin/logs', { cache: 'no-store' })
            const data = await res.json()
            if (!res.ok) {
                setLogs([])
                setErrorMsg((prev) => prev || data?.error || 'No fue posible cargar los logs.')
                return
            }
            setLogs(Array.isArray(data?.logs) ? data.logs : [])
        } catch (err) {
            console.error('Error loading admin logs:', err)
            setLogs([])
            setErrorMsg((prev) => prev || 'No se pudo cargar el módulo de auditoría.')
        } finally {
            setLoadingLogs(false)
        }
    }, [])

    const loadCurrentTab = useCallback(async () => {
        setErrorMsg('')
        setSuccessMsg('')
        if (tab === 'stats') {
            await loadStats()
            return
        }
        if (tab === 'negocios') {
            await loadTenants({ keepPage: true })
            return
        }
        await loadLogs()
    }, [loadLogs, loadStats, loadTenants, tab])

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
        if (!authChecked || !isAuthenticated) return
        void loadCurrentTab()
    }, [authChecked, isAuthenticated, loadCurrentTab, tab])

    useEffect(() => {
        if (!authChecked || !isAuthenticated || tab !== 'negocios') return
        const timer = setTimeout(() => {
            void loadTenants()
        }, 250)
        return () => clearTimeout(timer)
    }, [authChecked, isAuthenticated, loadTenants, pilotFilter, planFilter, query, sortBy, sortDir, statusFilter, tab])

    const handleAction = async (tenantId: string, action: string, extra?: Record<string, unknown>) => {
        setUpdating(tenantId)
        setErrorMsg('')
        setSuccessMsg('')
        try {
            const res = await fetch(`/api/admin/tenant/${tenantId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...(extra || {}) })
            })
            const data = await res.json()
            if (!res.ok) {
                setErrorMsg(data?.error || 'No se pudo aplicar la acción.')
                return
            }
            setSuccessMsg('Acción aplicada correctamente.')
            await loadTenants({ keepPage: true })
            if (tab === 'logs') {
                await loadLogs()
            }
        } catch (err) {
            console.error('Error updating tenant:', err)
            setErrorMsg('Error al actualizar el negocio.')
        } finally {
            setUpdating(null)
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
            setLogs([])
            setErrorMsg('')
            setSuccessMsg('')
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
                    <button className="admin-btn-action" onClick={loadCurrentTab} disabled={isLoading}>
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        Actualizar
                    </button>
                </header>

                {successMsg && <div className="admin-message success">{successMsg}</div>}
                {errorMsg && <div className="admin-message error">{errorMsg}</div>}

                {tab === 'stats' && (
                    <>
                        {loadingStats ? (
                            <div className="admin-loading">Cargando métricas globales...</div>
                        ) : stats && (
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
                    </>
                )}

                {tab === 'negocios' && (
                    <>
                        <section className="admin-filters">
                            <div className="admin-filter-search">
                                <Search size={16} />
                                <input
                                    value={query}
                                    onChange={(e) => {
                                        setTenantsPage((prev) => ({ ...prev, page: 1 }))
                                        setQuery(e.target.value)
                                    }}
                                    placeholder="Buscar por nombre o slug..."
                                />
                            </div>
                            <select value={planFilter} onChange={(e) => { setTenantsPage((prev) => ({ ...prev, page: 1 })); setPlanFilter(e.target.value) }}>
                                <option value="">Todos los planes</option>
                                <option value="trial">Trial</option>
                                <option value="pyme">Pyme</option>
                                <option value="pro">Pro</option>
                                <option value="full">Full</option>
                            </select>
                            <select value={statusFilter} onChange={(e) => { setTenantsPage((prev) => ({ ...prev, page: 1 })); setStatusFilter(e.target.value) }}>
                                <option value="">Todos los estados</option>
                                <option value="activo">Activo</option>
                                <option value="pausado">Pausado</option>
                            </select>
                            <select value={pilotFilter} onChange={(e) => { setTenantsPage((prev) => ({ ...prev, page: 1 })); setPilotFilter(e.target.value) }}>
                                <option value="">Piloto: todos</option>
                                <option value="on">Solo piloto</option>
                                <option value="off">Sin piloto</option>
                            </select>
                            <select
                                value={`${sortBy}:${sortDir}`}
                                onChange={(e) => {
                                    const [nextSortBy, nextSortDir] = e.target.value.split(':')
                                    setSortBy(nextSortBy as typeof sortBy)
                                    setSortDir(nextSortDir as typeof sortDir)
                                }}
                            >
                                <option value="created_at:desc">Más nuevos</option>
                                <option value="created_at:asc">Más antiguos</option>
                                <option value="trial_hasta:asc">Trial por vencer</option>
                                <option value="nombre:asc">Nombre A-Z</option>
                                <option value="nombre:desc">Nombre Z-A</option>
                            </select>
                        </section>

                        <div className="admin-table-toolbar">
                            <div>{tenantsPage.total} negocios encontrados</div>
                            <div className="admin-pagination">
                                <button
                                    className="admin-btn-action"
                                    disabled={loadingTenants || tenantsPage.page <= 1}
                                    onClick={() => {
                                        const nextPage = Math.max(1, tenantsPage.page - 1)
                                        setTenantsPage((prev) => ({ ...prev, page: nextPage }))
                                        void loadTenants({ keepPage: true, page: nextPage })
                                    }}
                                >
                                    <ChevronLeft size={14} /> Anterior
                                </button>
                                <span>Página {tenantsPage.page} / {tenantsPage.totalPages}</span>
                                <button
                                    className="admin-btn-action"
                                    disabled={loadingTenants || tenantsPage.page >= tenantsPage.totalPages}
                                    onClick={() => {
                                        const nextPage = Math.min(tenantsPage.totalPages, tenantsPage.page + 1)
                                        setTenantsPage((prev) => ({ ...prev, page: nextPage }))
                                        void loadTenants({ keepPage: true, page: nextPage })
                                    }}
                                >
                                    Siguiente <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>

                        {loadingTenants ? (
                            <div className="admin-loading">Cargando negocios...</div>
                        ) : (
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
                                        {tenants.length === 0 ? (
                                            <tr>
                                                <td colSpan={7}>No hay negocios con ese filtro.</td>
                                            </tr>
                                        ) : tenants.map(t => (
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
                                                    {safeDate(t.trial_hasta)}
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
                                                    <Link className="admin-btn-action" href={`/admin/negocios/${t.id}`} title="Ver detalle">
                                                        Detalle
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {tab === 'logs' && (
                    <>
                        {loadingLogs ? (
                            <div className="admin-loading">Cargando logs de auditoría...</div>
                        ) : (
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
                                                <td>{safeDateTime(l.created_at)}</td>
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
        </div>
    )
}
