'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import './cliente.css'

interface TenantData {
    id: string
    nombre: string
    rubro: string
    direccion: string | null
    logo_url: string | null
    color_primario: string
    slug: string
    qr_code: string
    estado: string
    plan: string
    trial_hasta: string
    telefono: string | null
    lat: number | null
    lng: number | null
    mensaje_geofencing: string | null
}

interface ProgramData {
    puntos_meta: number
    descripcion_premio: string
    tipo_premio: string
    valor_premio: string | null
    tipo_programa: string
    config: Record<string, any>
}

interface CustomerData {
    id: string
    nombre: string
    whatsapp: string
    email: string | null
    puntos_actuales: number
    total_puntos_historicos: number
    total_premios_canjeados: number
    created_at: string
}

interface Stats {
    totalClientes: number
    totalPuntosDados: number
    totalPremiosCanjeados: number
    clientesHoy: number
}

interface AnalyticsData {
    resumen: {
        totalClientes: number
        clientesNuevosSemana: number
        visitasHoy: number
        totalPuntosDados: number
        totalPremiosCanjeados: number
        premiosPendientes: number
        tasaRetencion: number
        promedioPuntosPorCliente: number
        crecimientoMensual: number
    }
    chartData: {
        stampsPorDia: { fecha: string; visitas: number }[]
    }
    topClientes: CustomerData[]
}

type Tab = 'dashboard' | 'clientes' | 'configuracion' | 'qr' | 'analytics' | 'notificaciones'

export default function ClientePanel() {
    const [tab, setTab] = useState<Tab>('dashboard')
    const [loading, setLoading] = useState(false)
    const [tenantSlug, setTenantSlug] = useState('')
    const [needsSlug, setNeedsSlug] = useState(true)

    const [tenant, setTenant] = useState<TenantData | null>(null)
    const [program, setProgram] = useState<ProgramData | null>(null)
    const [customers, setCustomers] = useState<CustomerData[]>([])
    const [stats, setStats] = useState<Stats>({
        totalClientes: 0,
        totalPuntosDados: 0,
        totalPremiosCanjeados: 0,
        clientesHoy: 0
    })

    // Search
    const [searchQuery, setSearchQuery] = useState('')

    // Canje de premio
    const [redemptionCode, setRedemptionCode] = useState('')
    const [redemptionResult, setRedemptionResult] = useState<any>(null)
    const [redeeming, setRedeeming] = useState(false)

    // Config editable
    const [editingConfig, setEditingConfig] = useState(false)
    const [configForm, setConfigForm] = useState({
        nombre: '',
        rubro: '',
        direccion: '',
        color_primario: '',
        mensaje_geofencing: '',
        lat: '',
        lng: '',
        puntos_meta: 10,
        descripcion_premio: '',
        tipo_premio: 'descuento',
        valor_premio: ''
    })
    const [saving, setSaving] = useState(false)
    const [saveMessage, setSaveMessage] = useState('')

    // Scanner
    const [scannerActive, setScannerActive] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)
    const streamRef = useRef<MediaStream | null>(null)

    // Mobile sidebar
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    // Analytics
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
    const [loadingAnalytics, setLoadingAnalytics] = useState(false)

    // Notificaciones
    const [notifTitulo, setNotifTitulo] = useState('')
    const [notifMensaje, setNotifMensaje] = useState('')
    const [notifSegmento, setNotifSegmento] = useState('todos')
    const [sendingNotif, setSendingNotif] = useState(false)
    const [notifResult, setNotifResult] = useState<any>(null)
    const [notifHistorial, setNotifHistorial] = useState<any[]>([])

    async function loadTenantData(slug: string) {
        setLoading(true)
        try {
            const res = await fetch(`/api/tenant/${slug}`)
            if (!res.ok) throw new Error('No encontrado')
            const data = await res.json()
            setTenant(data.tenant)
            setProgram(data.program)
            setCustomers(data.customers || [])
            setStats(data.stats || {
                totalClientes: data.customers?.length || 0,
                totalPuntosDados: data.customers?.reduce((sum: number, c: CustomerData) => sum + c.total_puntos_historicos, 0) || 0,
                totalPremiosCanjeados: data.customers?.reduce((sum: number, c: CustomerData) => sum + c.total_premios_canjeados, 0) || 0,
                clientesHoy: 0
            })
            setNeedsSlug(false)
            setConfigForm({
                nombre: data.tenant.nombre || '',
                rubro: data.tenant.rubro || '',
                direccion: data.tenant.direccion || '',
                color_primario: data.tenant.color_primario || '#ff6b6b',
                mensaje_geofencing: data.tenant.mensaje_geofencing || '',
                lat: data.tenant.lat?.toString() || '',
                lng: data.tenant.lng?.toString() || '',
                puntos_meta: data.program?.puntos_meta || 10,
                descripcion_premio: data.program?.descripcion_premio || '',
                tipo_premio: data.program?.tipo_premio || 'descuento',
                valor_premio: data.program?.valor_premio || ''
            })
        } catch {
            alert('No se encontró el negocio. Verifica el slug.')
        } finally {
            setLoading(false)
        }
    }

    async function loadAnalytics() {
        if (!tenant) return
        setLoadingAnalytics(true)
        try {
            const res = await fetch(`/api/analytics/${tenant.slug}`)
            if (res.ok) {
                const data = await res.json()
                setAnalytics(data)
            }
        } catch (err) {
            console.error('Error cargando analytics:', err)
        } finally {
            setLoadingAnalytics(false)
        }
    }

    async function loadNotifHistorial() {
        if (!tenant) return
        try {
            const res = await fetch(`/api/notifications/send?tenant_id=${tenant.id}`)
            if (res.ok) {
                const data = await res.json()
                setNotifHistorial(data.notifications || [])
            }
        } catch (err) {
            console.error('Error cargando historial:', err)
        }
    }

    async function handleRedeem(code?: string) {
        const codeToRedeem = code || redemptionCode
        if (!codeToRedeem || !tenant) return
        setRedeeming(true)
        setRedemptionResult(null)
        try {
            const res = await fetch('/api/reward/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    qr_code: codeToRedeem.toUpperCase(),
                    tenant_id: tenant.id
                })
            })
            const data = await res.json()
            setRedemptionResult(data)
            if (data.valid) {
                loadTenantData(tenant.slug)
            }
        } catch {
            setRedemptionResult({ message: 'Error al validar', valid: false })
        } finally {
            setRedeeming(false)
        }
    }

    async function handleSaveConfig() {
        if (!tenant) return
        setSaving(true)
        setSaveMessage('')
        try {
            const res = await fetch(`/api/tenant/${tenant.slug}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: configForm.nombre,
                    rubro: configForm.rubro,
                    direccion: configForm.direccion,
                    color_primario: configForm.color_primario,
                    mensaje_geofencing: configForm.mensaje_geofencing,
                    lat: configForm.lat ? Number(configForm.lat) : null,
                    lng: configForm.lng ? Number(configForm.lng) : null,
                    program: {
                        puntos_meta: Number(configForm.puntos_meta),
                        descripcion_premio: configForm.descripcion_premio,
                        tipo_premio: configForm.tipo_premio,
                        valor_premio: configForm.valor_premio
                    }
                })
            })
            const data = await res.json()
            if (res.ok) {
                setSaveMessage('✅ Guardado correctamente')
                setEditingConfig(false)
                loadTenantData(tenant.slug)
            } else {
                setSaveMessage(`❌ ${data.error}`)
            }
        } catch {
            setSaveMessage('❌ Error al guardar')
        } finally {
            setSaving(false)
            setTimeout(() => setSaveMessage(''), 3000)
        }
    }

    async function handleSendNotification() {
        if (!tenant || !notifTitulo || !notifMensaje) return
        setSendingNotif(true)
        setNotifResult(null)
        try {
            const res = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant_id: tenant.id,
                    titulo: notifTitulo,
                    mensaje: notifMensaje,
                    segmento: notifSegmento
                })
            })
            const data = await res.json()
            setNotifResult(data)
            if (res.ok) {
                setNotifTitulo('')
                setNotifMensaje('')
                loadNotifHistorial()
            }
        } catch {
            setNotifResult({ message: 'Error al enviar', enviadas: 0 })
        } finally {
            setSendingNotif(false)
        }
    }

    // Scanner
    const startScanner = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.play()
            }
            setScannerActive(true)
        } catch {
            alert('No se pudo acceder a la cámara. Verifica los permisos.')
        }
    }, [])

    const stopScanner = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
        setScannerActive(false)
    }, [])

    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
            }
        }
    }, [])

    // Load analytics when tab changes
    useEffect(() => {
        if (tab === 'analytics' && tenant && !analytics) {
            loadAnalytics()
        }
        if (tab === 'notificaciones' && tenant) {
            loadNotifHistorial()
        }
    }, [tab, tenant])

    // Filtered customers
    const filteredCustomers = customers.filter(c => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return c.nombre.toLowerCase().includes(q) ||
            c.whatsapp.includes(q) ||
            (c.email && c.email.toLowerCase().includes(q))
    })

    const topClientes = [...customers].sort((a, b) => b.total_puntos_historicos - a.total_puntos_historicos).slice(0, 5)
    const clientesNuevos = customers.filter(c => {
        const daysSince = (Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24)
        return daysSince <= 7
    })

    if (needsSlug) {
        return (
            <div className="cliente-page">
                <div className="cliente-login">
                    <div className="cliente-login-icon">💎</div>
                    <h1>Panel de Negocio</h1>
                    <p>Ingresa el slug de tu negocio para acceder</p>
                    <form onSubmit={(e) => { e.preventDefault(); loadTenantData(tenantSlug) }}>
                        <div className="cliente-login-field">
                            <input
                                type="text"
                                value={tenantSlug}
                                onChange={(e) => setTenantSlug(e.target.value)}
                                placeholder="ej: barberia-don-pedro"
                                autoFocus
                            />
                        </div>
                        <button type="submit" className="cliente-login-btn" disabled={!tenantSlug || loading}>
                            {loading ? '⏳ Cargando...' : 'Entrar →'}
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    if (!tenant) return null

    const trialDaysLeft = tenant.trial_hasta
        ? Math.max(0, Math.ceil((new Date(tenant.trial_hasta).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0

    return (
        <div className="cliente-page">
            {/* Sidebar */}
            <aside className={`cliente-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
                <div className="cliente-sidebar-header">
                    <div className="cliente-sidebar-logo" style={{ background: tenant.color_primario }}>
                        {tenant.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="cliente-sidebar-name">{tenant.nombre}</h3>
                        <span className="cliente-sidebar-plan">
                            {tenant.plan === 'trial' ? `Trial · ${trialDaysLeft} días` : 'Plan Activo'}
                        </span>
                    </div>
                </div>

                <nav className="cliente-sidebar-nav">
                    {([
                        { key: 'dashboard' as Tab, icon: '📊', label: 'Dashboard' },
                        { key: 'clientes' as Tab, icon: '👥', label: 'Clientes' },
                        { key: 'qr' as Tab, icon: '🎫', label: 'QR y Canje' },
                        { key: 'analytics' as Tab, icon: '📈', label: 'Analytics' },
                        { key: 'notificaciones' as Tab, icon: '📢', label: 'Notificaciones' },
                        { key: 'configuracion' as Tab, icon: '⚙️', label: 'Configuración' },
                    ]).map((item) => (
                        <button
                            key={item.key}
                            className={`cliente-nav-btn ${tab === item.key ? 'active' : ''}`}
                            onClick={() => { setTab(item.key); setMobileMenuOpen(false) }}
                        >
                            <span>{item.icon}</span> {item.label}
                        </button>
                    ))}
                </nav>

                <div className="cliente-sidebar-footer">
                    <button className="cliente-refresh-btn" onClick={() => loadTenantData(tenant.slug)} disabled={loading}>
                        🔄 {loading ? 'Actualizando...' : 'Refrescar datos'}
                    </button>
                </div>
            </aside>

            <button className="cliente-mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                ☰
            </button>

            <main className="cliente-main">
                {/* ═══════ DASHBOARD ═══════ */}
                {tab === 'dashboard' && (
                    <div className="cliente-content">
                        <div className="cliente-content-header">
                            <div>
                                <h1>Dashboard</h1>
                                <p className="cliente-content-subtitle">Resumen de tu programa de fidelización</p>
                            </div>
                        </div>

                        <div className="cliente-stats-grid">
                            <div className="cliente-stat-card stat-coral">
                                <span className="cliente-stat-icon">👥</span>
                                <span className="cliente-stat-number">{stats.totalClientes}</span>
                                <span className="cliente-stat-label">Clientes registrados</span>
                            </div>
                            <div className="cliente-stat-card stat-blue">
                                <span className="cliente-stat-icon">⭐</span>
                                <span className="cliente-stat-number">{stats.totalPuntosDados}</span>
                                <span className="cliente-stat-label">Puntos dados</span>
                            </div>
                            <div className="cliente-stat-card stat-green">
                                <span className="cliente-stat-icon">🎁</span>
                                <span className="cliente-stat-number">{stats.totalPremiosCanjeados}</span>
                                <span className="cliente-stat-label">Premios canjeados</span>
                            </div>
                            <div className="cliente-stat-card stat-orange">
                                <span className="cliente-stat-icon">📅</span>
                                <span className="cliente-stat-number">{stats.clientesHoy}</span>
                                <span className="cliente-stat-label">Visitas hoy</span>
                            </div>
                        </div>

                        {program && (
                            <div className="cliente-program-summary">
                                <h3>Tu programa activo</h3>
                                <div className="cliente-program-detail">
                                    <span>🎯 {program.puntos_meta} puntos = {program.descripcion_premio}</span>
                                    {program.tipo_programa && program.tipo_programa !== 'sellos' && (
                                        <span className="cliente-program-type-badge">
                                            {program.tipo_programa === 'cashback' && '💰 Cashback'}
                                            {program.tipo_programa === 'membresia' && '👑 Membresía VIP'}
                                            {program.tipo_programa === 'multipase' && '🎟️ Multipase'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {topClientes.length > 0 && (
                            <div className="cliente-section-card">
                                <h3>🏆 Top Clientes Más Leales</h3>
                                <div className="cliente-top-list">
                                    {topClientes.map((c, i) => (
                                        <div key={c.id} className="cliente-top-item">
                                            <span className="cliente-top-rank">#{i + 1}</span>
                                            <span className="cliente-top-name">{c.nombre}</span>
                                            <span className="cliente-top-points">{c.total_puntos_historicos} pts</span>
                                            <span className="cliente-top-rewards">{c.total_premios_canjeados} 🎁</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {clientesNuevos.length > 0 && (
                            <div className="cliente-section-card">
                                <h3>🆕 Nuevos esta semana</h3>
                                <div className="cliente-new-list">
                                    {clientesNuevos.map(c => (
                                        <span key={c.id} className="cliente-new-badge">{c.nombre}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══════ CLIENTES ═══════ */}
                {tab === 'clientes' && (
                    <div className="cliente-content">
                        <div className="cliente-content-header">
                            <div>
                                <h1>Clientes</h1>
                                <p className="cliente-content-subtitle">{customers.length} clientes registrados</p>
                            </div>
                        </div>

                        <div className="cliente-searchbar">
                            <span className="cliente-search-icon">🔍</span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar por nombre, WhatsApp o email..."
                                className="cliente-search-input"
                            />
                            {searchQuery && (
                                <button className="cliente-search-clear" onClick={() => setSearchQuery('')}>✕</button>
                            )}
                        </div>

                        {filteredCustomers.length === 0 ? (
                            <div className="cliente-empty">
                                <span>👥</span>
                                <p>{searchQuery ? 'No se encontraron resultados' : 'Aún no tienes clientes registrados'}</p>
                                <p className="cliente-empty-hint">
                                    {searchQuery ? 'Intenta con otro término' : 'Comparte tu QR para que empiecen a sumarse'}
                                </p>
                            </div>
                        ) : (
                            <div className="cliente-table-wrap">
                                <table className="cliente-table">
                                    <thead>
                                        <tr>
                                            <th>Cliente</th>
                                            <th>WhatsApp</th>
                                            <th>Puntos</th>
                                            <th>Premios</th>
                                            <th>Registro</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCustomers.map((c) => (
                                            <tr key={c.id}>
                                                <td className="cliente-table-name">
                                                    <div className="cliente-table-avatar" style={{ background: tenant.color_primario }}>
                                                        {c.nombre.charAt(0).toUpperCase()}
                                                    </div>
                                                    {c.nombre}
                                                </td>
                                                <td>{c.whatsapp}</td>
                                                <td>
                                                    <span className="cliente-table-points">
                                                        {c.puntos_actuales}/{program?.puntos_meta || '?'}
                                                    </span>
                                                </td>
                                                <td>{c.total_premios_canjeados}</td>
                                                <td className="cliente-table-date">
                                                    {new Date(c.created_at).toLocaleDateString('es-CL')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══════ QR Y CANJE ═══════ */}
                {tab === 'qr' && (
                    <div className="cliente-content">
                        <h1>QR y Canje de Premios</h1>
                        <p className="cliente-content-subtitle">Tu QR y validación de premios</p>

                        <div className="cliente-qr-section">
                            <div className="cliente-qr-card">
                                <h3>📱 Tu QR para el local</h3>
                                <p>Imprime este QR y pégalo en tu mostrador</p>
                                <div className="cliente-qr-visual">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${window.location.origin}/qr/${tenant.slug}`)}&bgcolor=0a0a0f&color=ffffff&format=png`}
                                        alt="QR de tu negocio"
                                        className="cliente-qr-image"
                                    />
                                    <p className="cliente-qr-slug-label">{tenant.nombre}</p>
                                    <p className="cliente-qr-subtext">Escanea para sumar puntos</p>
                                </div>
                                <div className="cliente-qr-link">
                                    <code>{`${window.location.origin}/qr/${tenant.slug}`}</code>
                                </div>
                                <div className="cliente-qr-actions">
                                    <a
                                        href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`${window.location.origin}/qr/${tenant.slug}`)}&format=png`}
                                        download={`qr-${tenant.slug}.png`}
                                        className="cliente-qr-download"
                                    >
                                        ⬇️ Descargar QR
                                    </a>
                                    <a
                                        href={`/qr/${tenant.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="cliente-qr-open"
                                    >
                                        👁️ Ver página del cliente
                                    </a>
                                </div>
                            </div>

                            <div className="cliente-redeem-card">
                                <h3>🎁 Validar premio</h3>
                                <p>Ingresa el código del premio o escanea con la cámara</p>

                                <div className="cliente-scanner-section">
                                    {!scannerActive ? (
                                        <button className="cliente-scanner-btn" onClick={startScanner}>
                                            📷 Abrir escáner de cámara
                                        </button>
                                    ) : (
                                        <div className="cliente-scanner-container">
                                            <video ref={videoRef} className="cliente-scanner-video" playsInline muted />
                                            <div className="cliente-scanner-overlay">
                                                <div className="cliente-scanner-frame" />
                                            </div>
                                            <button className="cliente-scanner-close" onClick={stopScanner}>
                                                ✕ Cerrar cámara
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="cliente-redeem-divider">
                                    <span>o ingresa el código manual</span>
                                </div>

                                <div className="cliente-redeem-input">
                                    <input
                                        type="text"
                                        value={redemptionCode}
                                        onChange={(e) => setRedemptionCode(e.target.value)}
                                        placeholder="Ej: PREMIO-AB12CD34"
                                    />
                                    <button onClick={() => handleRedeem()} disabled={!redemptionCode || redeeming}>
                                        {redeeming ? '⏳' : '✅ Validar'}
                                    </button>
                                </div>
                                {redemptionResult && (
                                    <div className={`cliente-redeem-result ${redemptionResult.valid ? 'valid' : 'invalid'}`}>
                                        <span>{redemptionResult.valid ? '✅' : '❌'}</span>
                                        <span>{redemptionResult.message}</span>
                                        {redemptionResult.cliente && (
                                            <span className="cliente-redeem-client">
                                                Cliente: {redemptionResult.cliente.nombre}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══════ ANALYTICS ═══════ */}
                {tab === 'analytics' && (
                    <div className="cliente-content">
                        <div className="cliente-content-header">
                            <div>
                                <h1>Analytics</h1>
                                <p className="cliente-content-subtitle">Métricas avanzadas de tu programa</p>
                            </div>
                            <button className="cliente-edit-btn" onClick={loadAnalytics} disabled={loadingAnalytics}>
                                🔄 {loadingAnalytics ? 'Cargando...' : 'Actualizar'}
                            </button>
                        </div>

                        {loadingAnalytics && !analytics && (
                            <div className="cliente-empty">
                                <span>⏳</span>
                                <p>Cargando métricas...</p>
                            </div>
                        )}

                        {analytics && (
                            <>
                                {/* KPIs principales */}
                                <div className="cliente-stats-grid">
                                    <div className="cliente-stat-card stat-coral">
                                        <span className="cliente-stat-icon">🔄</span>
                                        <span className="cliente-stat-number">{analytics.resumen.tasaRetencion}%</span>
                                        <span className="cliente-stat-label">Tasa de retención</span>
                                    </div>
                                    <div className="cliente-stat-card stat-blue">
                                        <span className="cliente-stat-icon">📈</span>
                                        <span className="cliente-stat-number">
                                            {analytics.resumen.crecimientoMensual > 0 ? '+' : ''}{analytics.resumen.crecimientoMensual}%
                                        </span>
                                        <span className="cliente-stat-label">Crecimiento mensual</span>
                                    </div>
                                    <div className="cliente-stat-card stat-green">
                                        <span className="cliente-stat-icon">🆕</span>
                                        <span className="cliente-stat-number">{analytics.resumen.clientesNuevosSemana}</span>
                                        <span className="cliente-stat-label">Nuevos esta semana</span>
                                    </div>
                                    <div className="cliente-stat-card stat-orange">
                                        <span className="cliente-stat-icon">⏳</span>
                                        <span className="cliente-stat-number">{analytics.resumen.premiosPendientes}</span>
                                        <span className="cliente-stat-label">Premios pendientes</span>
                                    </div>
                                </div>

                                {/* Mini métricas */}
                                <div className="cliente-section-card">
                                    <h3>📊 Resumen detallado</h3>
                                    <div className="cliente-analytics-detail-grid">
                                        <div className="cliente-analytics-detail">
                                            <span className="cliente-analytics-detail-label">Promedio puntos por cliente</span>
                                            <span className="cliente-analytics-detail-value">{analytics.resumen.promedioPuntosPorCliente}</span>
                                        </div>
                                        <div className="cliente-analytics-detail">
                                            <span className="cliente-analytics-detail-label">Total clientes</span>
                                            <span className="cliente-analytics-detail-value">{analytics.resumen.totalClientes}</span>
                                        </div>
                                        <div className="cliente-analytics-detail">
                                            <span className="cliente-analytics-detail-label">Visitas hoy</span>
                                            <span className="cliente-analytics-detail-value">{analytics.resumen.visitasHoy}</span>
                                        </div>
                                        <div className="cliente-analytics-detail">
                                            <span className="cliente-analytics-detail-label">Total premios canjeados</span>
                                            <span className="cliente-analytics-detail-value">{analytics.resumen.totalPremiosCanjeados}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Chart - Visitas últimos 30 días */}
                                {analytics.chartData.stampsPorDia.length > 0 && (
                                    <div className="cliente-section-card">
                                        <h3>📅 Visitas - Últimos 30 días</h3>
                                        <div className="cliente-chart-container">
                                            {(() => {
                                                const data = analytics.chartData.stampsPorDia
                                                const maxVisitas = Math.max(...data.map(d => d.visitas), 1)
                                                return (
                                                    <div className="cliente-chart-bars">
                                                        {data.map((d) => (
                                                            <div key={d.fecha} className="cliente-chart-bar-wrapper" title={`${d.fecha}: ${d.visitas} visitas`}>
                                                                <div
                                                                    className="cliente-chart-bar"
                                                                    style={{ height: `${(d.visitas / maxVisitas) * 100}%` }}
                                                                />
                                                                <span className="cliente-chart-bar-label">
                                                                    {new Date(d.fecha + 'T12:00:00').getDate()}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    </div>
                                )}

                                {/* Top 10 */}
                                {analytics.topClientes.length > 0 && (
                                    <div className="cliente-section-card">
                                        <h3>🏆 Top 10 Clientes</h3>
                                        <div className="cliente-top-list">
                                            {analytics.topClientes.map((c, i) => (
                                                <div key={c.id} className="cliente-top-item">
                                                    <span className="cliente-top-rank">#{i + 1}</span>
                                                    <span className="cliente-top-name">{c.nombre}</span>
                                                    <span className="cliente-top-points">{c.total_puntos_historicos} pts</span>
                                                    <span className="cliente-top-rewards">{c.total_premios_canjeados} 🎁</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* ═══════ NOTIFICACIONES ═══════ */}
                {tab === 'notificaciones' && (
                    <div className="cliente-content">
                        <h1>Notificaciones</h1>
                        <p className="cliente-content-subtitle">Envía mensajes a tus clientes por segmentos</p>

                        <div className="cliente-notif-section">
                            <div className="cliente-notif-compose">
                                <h3>📨 Nueva notificación</h3>
                                <div className="cliente-config-form">
                                    <label>
                                        <span>Título</span>
                                        <input
                                            type="text"
                                            value={notifTitulo}
                                            onChange={e => setNotifTitulo(e.target.value)}
                                            placeholder="Ej: ¡Promo especial hoy!"
                                        />
                                    </label>
                                    <label>
                                        <span>Mensaje</span>
                                        <textarea
                                            value={notifMensaje}
                                            onChange={e => setNotifMensaje(e.target.value)}
                                            placeholder="Ej: Hoy doble puntos por compras mayores a $10.000 🎉"
                                            rows={3}
                                        />
                                    </label>
                                    <label>
                                        <span>Enviar a</span>
                                        <select value={notifSegmento} onChange={e => setNotifSegmento(e.target.value)}>
                                            <option value="todos">👥 Todos los clientes</option>
                                            <option value="activos">🟢 Activos (últimos 30 días)</option>
                                            <option value="inactivos">💤 Inactivos (sin actividad)</option>
                                            <option value="cercanos_premio">🎯 Cerca del premio (faltan 1-2 puntos)</option>
                                        </select>
                                    </label>

                                    <button
                                        className="cliente-save-btn"
                                        onClick={handleSendNotification}
                                        disabled={sendingNotif || !notifTitulo || !notifMensaje}
                                        style={{ marginTop: '0.5rem' }}
                                    >
                                        {sendingNotif ? '⏳ Enviando...' : '📨 Enviar notificación'}
                                    </button>
                                </div>

                                {notifResult && (
                                    <div className={`cliente-toast ${notifResult.enviadas > 0 ? 'toast-ok' : 'toast-err'}`} style={{ marginTop: '1rem' }}>
                                        {notifResult.message}
                                    </div>
                                )}
                            </div>

                            {/* Historial */}
                            {notifHistorial.length > 0 && (
                                <div className="cliente-section-card" style={{ marginTop: '1.5rem' }}>
                                    <h3>📋 Historial de notificaciones</h3>
                                    <div className="cliente-notif-history">
                                        {notifHistorial.map((n: any) => (
                                            <div key={n.id} className="cliente-notif-item">
                                                <div className="cliente-notif-item-header">
                                                    <strong>{n.titulo}</strong>
                                                    <span className="cliente-notif-item-date">
                                                        {new Date(n.created_at).toLocaleDateString('es-CL')}
                                                    </span>
                                                </div>
                                                <p className="cliente-notif-item-msg">{n.mensaje}</p>
                                                <div className="cliente-notif-item-meta">
                                                    <span>📤 {n.total_destinatarios} destinatarios</span>
                                                    <span>🏷️ {n.segmento}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ═══════ CONFIGURACIÓN ═══════ */}
                {tab === 'configuracion' && (
                    <div className="cliente-content">
                        <div className="cliente-content-header">
                            <div>
                                <h1>Configuración</h1>
                                <p className="cliente-content-subtitle">Ajustes de tu negocio y programa</p>
                            </div>
                            {!editingConfig ? (
                                <button className="cliente-edit-btn" onClick={() => setEditingConfig(true)}>
                                    ✏️ Editar
                                </button>
                            ) : (
                                <div className="cliente-edit-actions">
                                    <button className="cliente-save-btn" onClick={handleSaveConfig} disabled={saving}>
                                        {saving ? '⏳ Guardando...' : '💾 Guardar'}
                                    </button>
                                    <button className="cliente-cancel-btn" onClick={() => setEditingConfig(false)}>
                                        Cancelar
                                    </button>
                                </div>
                            )}
                        </div>

                        {saveMessage && (
                            <div className={`cliente-toast ${saveMessage.includes('✅') ? 'toast-ok' : 'toast-err'}`}>
                                {saveMessage}
                            </div>
                        )}

                        <div className="cliente-config-grid">
                            <div className="cliente-config-card">
                                <h3>🏪 Datos del negocio</h3>
                                {editingConfig ? (
                                    <div className="cliente-config-form">
                                        <label>
                                            <span>Nombre</span>
                                            <input type="text" value={configForm.nombre} onChange={e => setConfigForm({ ...configForm, nombre: e.target.value })} />
                                        </label>
                                        <label>
                                            <span>Rubro</span>
                                            <input type="text" value={configForm.rubro} onChange={e => setConfigForm({ ...configForm, rubro: e.target.value })} />
                                        </label>
                                        <label>
                                            <span>Dirección</span>
                                            <input type="text" value={configForm.direccion} onChange={e => setConfigForm({ ...configForm, direccion: e.target.value })} />
                                        </label>
                                        <label>
                                            <span>Color principal</span>
                                            <div className="cliente-color-picker">
                                                <input type="color" value={configForm.color_primario} onChange={e => setConfigForm({ ...configForm, color_primario: e.target.value })} />
                                                <span>{configForm.color_primario}</span>
                                            </div>
                                        </label>
                                    </div>
                                ) : (
                                    <>
                                        <div className="cliente-config-item">
                                            <span>Nombre:</span> <strong>{tenant.nombre}</strong>
                                        </div>
                                        <div className="cliente-config-item">
                                            <span>Rubro:</span> <strong>{tenant.rubro || 'Sin definir'}</strong>
                                        </div>
                                        <div className="cliente-config-item">
                                            <span>Dirección:</span> <strong>{tenant.direccion || 'Sin definir'}</strong>
                                        </div>
                                        <div className="cliente-config-item">
                                            <span>Slug:</span> <strong>{tenant.slug}</strong>
                                        </div>
                                        <div className="cliente-config-item">
                                            <span>Estado:</span>
                                            <strong className={tenant.estado === 'activo' ? 'status-active' : 'status-inactive'}>
                                                {tenant.estado}
                                            </strong>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="cliente-config-card">
                                <h3>🎯 Programa de lealtad</h3>
                                {editingConfig ? (
                                    <div className="cliente-config-form">
                                        <label>
                                            <span>Puntos para el premio</span>
                                            <input type="number" min="1" value={configForm.puntos_meta} onChange={e => setConfigForm({ ...configForm, puntos_meta: Number(e.target.value) })} />
                                        </label>
                                        <label>
                                            <span>Descripción del premio</span>
                                            <input type="text" value={configForm.descripcion_premio} onChange={e => setConfigForm({ ...configForm, descripcion_premio: e.target.value })} placeholder="Ej: 1 corte gratis" />
                                        </label>
                                        <label>
                                            <span>Tipo de premio</span>
                                            <select value={configForm.tipo_premio} onChange={e => setConfigForm({ ...configForm, tipo_premio: e.target.value })}>
                                                <option value="descuento">Descuento</option>
                                                <option value="gratis">Gratis</option>
                                                <option value="regalo">Regalo</option>
                                                <option value="otro">Otro</option>
                                            </select>
                                        </label>
                                    </div>
                                ) : (
                                    program && (
                                        <>
                                            <div className="cliente-config-item">
                                                <span>Puntos meta:</span> <strong>{program.puntos_meta}</strong>
                                            </div>
                                            <div className="cliente-config-item">
                                                <span>Premio:</span> <strong>{program.descripcion_premio}</strong>
                                            </div>
                                            <div className="cliente-config-item">
                                                <span>Tipo:</span> <strong>{program.tipo_premio}</strong>
                                            </div>
                                            {program.tipo_programa && (
                                                <div className="cliente-config-item">
                                                    <span>Tipo de programa:</span> <strong>{program.tipo_programa}</strong>
                                                </div>
                                            )}
                                        </>
                                    )
                                )}
                            </div>

                            <div className="cliente-config-card">
                                <h3>📍 Geofencing & Google Wallet</h3>
                                {editingConfig ? (
                                    <div className="cliente-config-form">
                                        <label>
                                            <span>Latitud</span>
                                            <input
                                                type="number"
                                                step="any"
                                                value={configForm.lat}
                                                onChange={e => setConfigForm({ ...configForm, lat: e.target.value })}
                                                placeholder="Ej: -33.4489"
                                            />
                                        </label>
                                        <label>
                                            <span>Longitud</span>
                                            <input
                                                type="number"
                                                step="any"
                                                value={configForm.lng}
                                                onChange={e => setConfigForm({ ...configForm, lng: e.target.value })}
                                                placeholder="Ej: -70.6693"
                                            />
                                        </label>
                                        <label>
                                            <span>Mensaje de proximidad</span>
                                            <textarea
                                                value={configForm.mensaje_geofencing}
                                                onChange={e => setConfigForm({ ...configForm, mensaje_geofencing: e.target.value })}
                                                placeholder="¡Estás cerca! Pasa a sumar puntos 🎉"
                                                rows={3}
                                            />
                                        </label>
                                        <p className="cliente-config-hint">
                                            💡 Tip: Busca las coordenadas de tu negocio en Google Maps, haz clic derecho y copia la latitud y longitud.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="cliente-config-item">
                                            <span>Coordenadas:</span>
                                            <strong>
                                                {tenant.lat && tenant.lng
                                                    ? `${tenant.lat}, ${tenant.lng}`
                                                    : 'Sin configurar'}
                                            </strong>
                                        </div>
                                        <div className="cliente-config-item">
                                            <span>Mensaje:</span>
                                            <strong>{tenant.mensaje_geofencing || 'Sin configurar'}</strong>
                                        </div>
                                        {(!tenant.lat || !tenant.lng) && (
                                            <p className="cliente-config-hint">
                                                ⚠️ Configura las coordenadas para activar notificaciones por proximidad en Google Wallet.
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="cliente-config-card">
                                <h3>💳 Plan</h3>
                                <div className="cliente-config-item">
                                    <span>Plan actual:</span>
                                    <strong>{tenant.plan === 'trial' ? 'Trial Gratuito' : 'Activo'}</strong>
                                </div>
                                {tenant.plan === 'trial' && (
                                    <div className="cliente-config-item">
                                        <span>Expira:</span>
                                        <strong>
                                            {new Date(tenant.trial_hasta).toLocaleDateString('es-CL', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric'
                                            })}
                                        </strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
