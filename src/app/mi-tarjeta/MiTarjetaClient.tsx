'use client'

import { useState } from 'react'
import './mi-tarjeta.css'

interface TarjetaData {
    customer: {
        nombre: string
        puntos_actuales: number
        total_puntos_historicos: number
        total_premios_canjeados: number
        miembro_desde: string
    }
    negocio: {
        nombre: string
        slug: string
        logo_url: string | null
        color_primario: string
        rubro: string | null
    } | null
    programa: {
        puntos_meta: number
        descripcion_premio: string
        tipo_programa: string
        config: Record<string, any>
    } | null
    premios_pendientes: Array<{
        qr_code: string
        descripcion: string
        canjeado: boolean
    }>
    membership: {
        estado: string
        saldo_cashback?: number
        usos_restantes?: number
        fecha_fin?: string
    } | null
}

export default function MiTarjetaClient() {
    const [whatsapp, setWhatsapp] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [tarjetas, setTarjetas] = useState<TarjetaData[]>([])
    const [searched, setSearched] = useState(false)

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSearched(true)

        try {
            const res = await fetch(`/api/customer/status?whatsapp=${encodeURIComponent(whatsapp)}`)
            const data = await res.json()

            if (!res.ok) throw new Error(data.error || 'Error al consultar')

            setTarjetas(data.tarjetas || [])
        } catch (err: any) {
            setError(err.message || 'Error inesperado')
            setTarjetas([])
        } finally {
            setLoading(false)
        }
    }

    function renderTipoLabel(tipo: string): string {
        const labels: Record<string, string> = {
            sellos: '⭐ Tarjeta de Sellos',
            cashback: '💰 Cashback',
            multipase: '🎟️ Multipase',
            membresia: '👑 Membresía VIP',
            descuento: '📊 Descuento por Niveles',
            cupon: '🎫 Cupón',
            regalo: '🎁 Gift Card',
            afiliacion: '📱 Afiliación'
        }
        return labels[tipo] || tipo
    }

    function renderCardContent(tarjeta: TarjetaData) {
        const tipo = tarjeta.programa?.tipo_programa || 'sellos'
        const config = tarjeta.programa?.config || {}

        // SELLOS
        if (tipo === 'sellos') {
            const pct = tarjeta.programa
                ? Math.min(100, (tarjeta.customer.puntos_actuales / tarjeta.programa.puntos_meta) * 100)
                : 0
            return (
                <>
                    <div className="mt-progress">
                        <div className="mt-progress-bar">
                            <div
                                className="mt-progress-fill"
                                style={{
                                    width: `${pct}%`,
                                    background: tarjeta.negocio?.color_primario || '#6366f1'
                                }}
                            />
                        </div>
                        <p className="mt-progress-label">
                            {tarjeta.customer.puntos_actuales} / {tarjeta.programa?.puntos_meta} puntos
                        </p>
                    </div>
                    <p className="mt-premio">🎁 {tarjeta.programa?.descripcion_premio}</p>
                </>
            )
        }

        // CASHBACK
        if (tipo === 'cashback') {
            return (
                <div className="mt-stats-row">
                    <div className="mt-stat">
                        <span className="mt-stat-value">${tarjeta.membership?.saldo_cashback?.toLocaleString() || 0}</span>
                        <span className="mt-stat-label">Saldo cashback</span>
                    </div>
                    <div className="mt-stat">
                        <span className="mt-stat-value">{config.porcentaje || 5}%</span>
                        <span className="mt-stat-label">Por compra</span>
                    </div>
                </div>
            )
        }

        // MULTIPASE
        if (tipo === 'multipase') {
            return (
                <div className="mt-stats-row">
                    <div className="mt-stat">
                        <span className="mt-stat-value">{tarjeta.membership?.usos_restantes || 0}</span>
                        <span className="mt-stat-label">Usos restantes</span>
                    </div>
                    <div className="mt-stat">
                        <span className="mt-stat-value">{config.cantidad_usos || '?'}</span>
                        <span className="mt-stat-label">Pack total</span>
                    </div>
                </div>
            )
        }

        // DESCUENTO POR NIVELES
        if (tipo === 'descuento') {
            const niveles = config.niveles || []
            let nivelActual = { descuento: 0 }
            for (const n of niveles.sort((a: any, b: any) => a.visitas - b.visitas)) {
                if (tarjeta.customer.total_puntos_historicos >= n.visitas) {
                    nivelActual = n
                }
            }
            return (
                <div className="mt-stats-row">
                    <div className="mt-stat">
                        <span className="mt-stat-value">{nivelActual.descuento}%</span>
                        <span className="mt-stat-label">Tu descuento</span>
                    </div>
                    <div className="mt-stat">
                        <span className="mt-stat-value">{tarjeta.customer.total_puntos_historicos}</span>
                        <span className="mt-stat-label">Visitas</span>
                    </div>
                </div>
            )
        }

        // MEMBRESÍA
        if (tipo === 'membresia') {
            const activa = tarjeta.membership?.estado === 'activo'
            return (
                <div className="mt-stats-row">
                    <div className="mt-stat">
                        <span className="mt-stat-value">{activa ? '✅ Activa' : '❌ Inactiva'}</span>
                        <span className="mt-stat-label">Membresía</span>
                    </div>
                    <div className="mt-stat">
                        <span className="mt-stat-value">{tarjeta.customer.total_puntos_historicos}</span>
                        <span className="mt-stat-label">Visitas VIP</span>
                    </div>
                </div>
            )
        }

        // REGALO / GIFT CARD
        if (tipo === 'regalo') {
            return (
                <div className="mt-stats-row">
                    <div className="mt-stat">
                        <span className="mt-stat-value">${tarjeta.membership?.saldo_cashback?.toLocaleString() || 0}</span>
                        <span className="mt-stat-label">Saldo disponible</span>
                    </div>
                </div>
            )
        }

        // AFILIACIÓN / CUPÓN / DEFAULT
        return (
            <div className="mt-stats-row">
                <div className="mt-stat">
                    <span className="mt-stat-value">{tarjeta.customer.total_puntos_historicos}</span>
                    <span className="mt-stat-label">Visitas</span>
                </div>
            </div>
        )
    }

    return (
        <div className="mt-page">
            <header className="mt-header">
                <a href="/" className="mt-logo">💎 Vuelve+</a>
                <h1>Mi Tarjeta</h1>
                <p>Consulta tu progreso en tus programas de lealtad</p>
            </header>

            <main className="mt-main">
                <form onSubmit={handleSearch} className="mt-search">
                    <div className="mt-search-field">
                        <input
                            type="tel"
                            value={whatsapp}
                            onChange={(e) => setWhatsapp(e.target.value)}
                            placeholder="+56 9 1234 5678"
                            required
                            autoFocus
                        />
                        <button type="submit" disabled={loading}>
                            {loading ? '⏳' : '🔍'}
                        </button>
                    </div>
                </form>

                {error && (
                    <div className="mt-error">⚠️ {error}</div>
                )}

                {searched && tarjetas.length === 0 && !error && !loading && (
                    <div className="mt-empty">
                        <p className="mt-empty-icon">🤔</p>
                        <p>No encontramos tarjetas con ese número.</p>
                        <p className="mt-empty-hint">Escanea el QR de un negocio para registrarte.</p>
                    </div>
                )}

                {tarjetas.length > 0 && (
                    <div className="mt-cards">
                        {tarjetas.map((tarjeta, i) => (
                            <div
                                key={i}
                                className="mt-card"
                                style={{ '--card-color': tarjeta.negocio?.color_primario || '#6366f1' } as React.CSSProperties}
                            >
                                <div className="mt-card-header">
                                    {tarjeta.negocio?.logo_url ? (
                                        <img src={tarjeta.negocio.logo_url} alt="" className="mt-card-logo" />
                                    ) : (
                                        <div className="mt-card-logo-placeholder" style={{ background: tarjeta.negocio?.color_primario }}>
                                            {tarjeta.negocio?.nombre?.charAt(0) || '?'}
                                        </div>
                                    )}
                                    <div>
                                        <h3>{tarjeta.negocio?.nombre || 'Negocio'}</h3>
                                        <span className="mt-card-tipo">
                                            {renderTipoLabel(tarjeta.programa?.tipo_programa || 'sellos')}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-card-body">
                                    {renderCardContent(tarjeta)}
                                </div>

                                {tarjeta.premios_pendientes.length > 0 && (
                                    <div className="mt-card-premios">
                                        <p className="mt-premios-title">🎁 Premios por canjear:</p>
                                        {tarjeta.premios_pendientes.map((p, j) => (
                                            <div key={j} className="mt-premio-item">
                                                <code>{p.qr_code}</code>
                                                <span>{p.descripcion}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-card-footer">
                                    <span>Miembro desde {new Date(tarjeta.customer.miembro_desde).toLocaleDateString('es-CL')}</span>
                                    <a href={`/qr/${tarjeta.negocio?.slug}`} className="mt-card-link">
                                        Ir al negocio →
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <footer className="mt-footer">
                <p>Potenciado por <strong>Vuelve+</strong></p>
            </footer>
        </div>
    )
}
