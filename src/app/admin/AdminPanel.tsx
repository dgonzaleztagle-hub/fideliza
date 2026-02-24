'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
import { createClient } from '@/lib/supabase/client'
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
}

type AdminTab = 'stats' | 'negocios' | 'logs'

export default function AdminPanel() {
    const supabase = useMemo(() => createClient(), [])
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

    const loadAll = useCallback(async () => {
        setErrorMsg('')
        setLoading(true)
        await Promise.all([loadStats(), loadTenants()])
        setLoading(false)
    }, [loadStats, loadTenants])

    useEffect(() => {
        let mounted = true
        ;(async () => {
            const { data } = await supabase.auth.getSession()
            if (!mounted) return
            setIsAuthenticated(!!data.session)
            setAuthChecked(true)
        })()

        const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsAuthenticated(!!session)
        })

        return () => {
            mounted = false
            subscription.subscription.unsubscribe()
        }
    }, [supabase])

    useEffect(() => {
        if (!authChecked || !isAuthenticated) {
            setLoading(false)
            return
        }
        void loadAll()
    }, [authChecked, isAuthenticated, loadAll])

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

    const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setAuthError('')

        if (!adminEmail || !adminPassword) {
            setAuthError('Ingresa email y contraseña')
            return
        }

        setSigningIn(true)
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: adminEmail.trim(),
                password: adminPassword
            })
            if (error) {
                setAuthError(error.message || 'No se pudo iniciar sesión')
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
            await supabase.auth.signOut()
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
