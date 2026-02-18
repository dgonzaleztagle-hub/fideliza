'use client'

import { useState, useEffect } from 'react'
import './cliente.css'

interface TenantData {
    id: string
    nombre: string
    rubro: string
    logo_url: string | null
    color_primario: string
    slug: string
    qr_code: string
    estado: string
    plan: string
    trial_hasta: string
}

interface ProgramData {
    puntos_meta: number
    descripcion_premio: string
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

type Tab = 'dashboard' | 'clientes' | 'configuracion' | 'qr'

export default function ClientePanel() {
    const [tab, setTab] = useState<Tab>('dashboard')
    const [loading, setLoading] = useState(false)
    const [tenantSlug, setTenantSlug] = useState('')
    const [needsSlug, setNeedsSlug] = useState(true)

    // Demo data (en producción vendría de la API con auth)
    const [tenant, setTenant] = useState<TenantData | null>(null)
    const [program, setProgram] = useState<ProgramData | null>(null)
    const [customers, setCustomers] = useState<CustomerData[]>([])
    const [stats, setStats] = useState<Stats>({
        totalClientes: 0,
        totalPuntosDados: 0,
        totalPremiosCanjeados: 0,
        clientesHoy: 0
    })

    // Canje de premio
    const [redemptionCode, setRedemptionCode] = useState('')
    const [redemptionResult, setRedemptionResult] = useState<any>(null)
    const [redeeming, setRedeeming] = useState(false)

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
        } catch {
            alert('No se encontró el negocio. Verifica el slug.')
        } finally {
            setLoading(false)
        }
    }

    async function handleRedeem() {
        if (!redemptionCode || !tenant) return
        setRedeeming(true)
        setRedemptionResult(null)
        try {
            const res = await fetch('/api/reward/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    qr_code: redemptionCode.toUpperCase(),
                    tenant_id: tenant.id
                })
            })
            const data = await res.json()
            setRedemptionResult(data)
        } catch {
            setRedemptionResult({ message: 'Error al validar', valid: false })
        } finally {
            setRedeeming(false)
        }
    }

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
            <aside className="cliente-sidebar">
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
                        { key: 'configuracion' as Tab, icon: '⚙️', label: 'Configuración' },
                    ]).map((item) => (
                        <button
                            key={item.key}
                            className={`cliente-nav-btn ${tab === item.key ? 'active' : ''}`}
                            onClick={() => setTab(item.key)}
                        >
                            <span>{item.icon}</span> {item.label}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main */}
            <main className="cliente-main">
                {/* DASHBOARD */}
                {tab === 'dashboard' && (
                    <div className="cliente-content">
                        <h1>Dashboard</h1>
                        <p className="cliente-content-subtitle">Resumen de tu programa de fidelización</p>

                        <div className="cliente-stats-grid">
                            <div className="cliente-stat-card">
                                <span className="cliente-stat-icon">👥</span>
                                <span className="cliente-stat-number">{stats.totalClientes}</span>
                                <span className="cliente-stat-label">Clientes registrados</span>
                            </div>
                            <div className="cliente-stat-card">
                                <span className="cliente-stat-icon">⭐</span>
                                <span className="cliente-stat-number">{stats.totalPuntosDados}</span>
                                <span className="cliente-stat-label">Puntos dados</span>
                            </div>
                            <div className="cliente-stat-card">
                                <span className="cliente-stat-icon">🎁</span>
                                <span className="cliente-stat-number">{stats.totalPremiosCanjeados}</span>
                                <span className="cliente-stat-label">Premios canjeados</span>
                            </div>
                            <div className="cliente-stat-card">
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
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* CLIENTES */}
                {tab === 'clientes' && (
                    <div className="cliente-content">
                        <h1>Clientes</h1>
                        <p className="cliente-content-subtitle">{customers.length} clientes registrados</p>

                        {customers.length === 0 ? (
                            <div className="cliente-empty">
                                <span>👥</span>
                                <p>Aún no tienes clientes registrados</p>
                                <p className="cliente-empty-hint">Comparte tu QR para que empiecen a sumarse</p>
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
                                        {customers.map((c) => (
                                            <tr key={c.id}>
                                                <td className="cliente-table-name">{c.nombre}</td>
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

                {/* QR Y CANJE */}
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
                                <p>Ingresa el código del premio que te muestra el cliente</p>
                                <div className="cliente-redeem-input">
                                    <input
                                        type="text"
                                        value={redemptionCode}
                                        onChange={(e) => setRedemptionCode(e.target.value)}
                                        placeholder="Ej: PREMIO-AB12CD34"
                                    />
                                    <button onClick={handleRedeem} disabled={!redemptionCode || redeeming}>
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

                {/* CONFIGURACIÓN */}
                {tab === 'configuracion' && (
                    <div className="cliente-content">
                        <h1>Configuración</h1>
                        <p className="cliente-content-subtitle">Ajustes de tu negocio y programa</p>

                        <div className="cliente-config-grid">
                            <div className="cliente-config-card">
                                <h3>🏪 Datos del negocio</h3>
                                <div className="cliente-config-item">
                                    <span>Nombre:</span> <strong>{tenant.nombre}</strong>
                                </div>
                                <div className="cliente-config-item">
                                    <span>Rubro:</span> <strong>{tenant.rubro || 'Sin definir'}</strong>
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
                            </div>

                            <div className="cliente-config-card">
                                <h3>🎯 Programa de lealtad</h3>
                                {program && (
                                    <>
                                        <div className="cliente-config-item">
                                            <span>Puntos meta:</span> <strong>{program.puntos_meta}</strong>
                                        </div>
                                        <div className="cliente-config-item">
                                            <span>Premio:</span> <strong>{program.descripcion_premio}</strong>
                                        </div>
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
