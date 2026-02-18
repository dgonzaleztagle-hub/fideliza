'use client'

import { useState } from 'react'
import './qr-page.css'

interface Tenant {
    id: string
    nombre: string
    rubro: string | null
    logo_url: string | null
    color_primario: string
    slug: string
}

interface Program {
    id: string
    puntos_meta: number
    descripcion_premio: string
    tipo_premio: string
    valor_premio: string | null
}

interface Props {
    tenant: Tenant
    program: Program | null
}

type Step = 'welcome' | 'register' | 'returning' | 'result'

interface StampResult {
    message: string
    puntos_actuales: number
    puntos_meta: number
    llegoAMeta?: boolean
    alreadyStamped?: boolean
    reward?: {
        qr_code: string
        descripcion: string
    } | null
}

export default function QRPageClient({ tenant, program }: Props) {
    const [step, setStep] = useState<Step>('welcome')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState<StampResult | null>(null)

    // Registro
    const [nombre, setNombre] = useState('')
    const [whatsapp, setWhatsapp] = useState('')
    const [email, setEmail] = useState('')

    // Returning
    const [returningWhatsapp, setReturningWhatsapp] = useState('')

    const primaryColor = tenant.color_primario || '#6366f1'

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            // Paso 1: Registrar al cliente
            const regRes = await fetch('/api/customer/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant_id: tenant.id,
                    nombre,
                    whatsapp,
                    email: email || undefined
                })
            })

            const regData = await regRes.json()

            if (!regRes.ok) {
                throw new Error(regData.error || 'Error al registrar')
            }

            // Si ya existía, sumar punto directamente
            if (!regData.isNew) {
                await handleStamp(whatsapp)
                return
            }

            // Paso 2: Sumar primer punto
            await handleStamp(whatsapp)

        } catch (err: any) {
            setError(err.message || 'Error inesperado')
            setLoading(false)
        }
    }

    async function handleReturning(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')
        await handleStamp(returningWhatsapp)
    }

    async function handleStamp(wsp: string) {
        try {
            const res = await fetch('/api/stamp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant_id: tenant.id,
                    whatsapp: wsp
                })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Error al sumar punto')
            }

            setResult(data)
            setStep('result')
        } catch (err: any) {
            setError(err.message || 'Error inesperado')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="qr-page" style={{ '--primary': primaryColor } as React.CSSProperties}>
            {/* Header con branding del negocio */}
            <header className="qr-header">
                {tenant.logo_url ? (
                    <img src={tenant.logo_url} alt={tenant.nombre} className="qr-logo" />
                ) : (
                    <div className="qr-logo-placeholder" style={{ background: primaryColor }}>
                        {tenant.nombre.charAt(0).toUpperCase()}
                    </div>
                )}
                <h1 className="qr-title">{tenant.nombre}</h1>
                {tenant.rubro && <p className="qr-rubro">{tenant.rubro}</p>}
                {program && (
                    <div className="qr-program-badge">
                        🎯 {program.puntos_meta} puntos = {program.descripcion_premio}
                    </div>
                )}
            </header>

            {/* Contenido según el paso */}
            <main className="qr-main">
                {error && (
                    <div className="qr-error">
                        <span>⚠️</span> {error}
                        <button onClick={() => setError('')} className="qr-error-close">×</button>
                    </div>
                )}

                {/* PASO 1: Bienvenida - ¿Nuevo o regresa? */}
                {step === 'welcome' && (
                    <div className="qr-welcome">
                        <h2>¡Hola! 👋</h2>
                        <p>¿Es tu primera vez aquí?</p>
                        <div className="qr-buttons">
                            <button
                                onClick={() => setStep('register')}
                                className="qr-btn qr-btn-primary"
                                style={{ background: primaryColor }}
                            >
                                Sí, quiero registrarme
                            </button>
                            <button
                                onClick={() => setStep('returning')}
                                className="qr-btn qr-btn-secondary"
                            >
                                Ya tengo cuenta
                            </button>
                        </div>
                    </div>
                )}

                {/* PASO 2A: Registro */}
                {step === 'register' && (
                    <form onSubmit={handleRegister} className="qr-form">
                        <h2>Registro rápido ✨</h2>
                        <div className="qr-field">
                            <label htmlFor="nombre">Tu nombre</label>
                            <input
                                id="nombre"
                                type="text"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                placeholder="¿Cómo te llamas?"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="qr-field">
                            <label htmlFor="whatsapp">WhatsApp</label>
                            <input
                                id="whatsapp"
                                type="tel"
                                value={whatsapp}
                                onChange={(e) => setWhatsapp(e.target.value)}
                                placeholder="+56 9 1234 5678"
                                required
                            />
                        </div>
                        <div className="qr-field">
                            <label htmlFor="email">Email <span className="qr-optional">(opcional)</span></label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu@email.com"
                            />
                        </div>
                        <button
                            type="submit"
                            className="qr-btn qr-btn-primary"
                            style={{ background: primaryColor }}
                            disabled={loading}
                        >
                            {loading ? '⏳ Registrando...' : '🎉 Registrarme y sumar punto'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep('welcome')}
                            className="qr-btn-link"
                        >
                            ← Volver
                        </button>
                    </form>
                )}

                {/* PASO 2B: Ya tengo cuenta */}
                {step === 'returning' && (
                    <form onSubmit={handleReturning} className="qr-form">
                        <h2>¡Bienvenido de vuelta! 🙌</h2>
                        <p>Ingresa tu WhatsApp para sumar tu punto</p>
                        <div className="qr-field">
                            <label htmlFor="returning-whatsapp">WhatsApp</label>
                            <input
                                id="returning-whatsapp"
                                type="tel"
                                value={returningWhatsapp}
                                onChange={(e) => setReturningWhatsapp(e.target.value)}
                                placeholder="+56 9 1234 5678"
                                required
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            className="qr-btn qr-btn-primary"
                            style={{ background: primaryColor }}
                            disabled={loading}
                        >
                            {loading ? '⏳ Sumando...' : '✅ Sumar punto'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep('welcome')}
                            className="qr-btn-link"
                        >
                            ← Volver
                        </button>
                    </form>
                )}

                {/* PASO 3: Resultado */}
                {step === 'result' && result && (
                    <div className="qr-result">
                        {result.llegoAMeta ? (
                            // ¡GANÓ EL PREMIO!
                            <div className="qr-prize">
                                <div className="qr-prize-confetti">🎉🎊🥳</div>
                                <h2>¡FELICIDADES!</h2>
                                <p className="qr-prize-desc">{result.message}</p>
                                {result.reward && (
                                    <div className="qr-reward-card">
                                        <p className="qr-reward-label">Tu código de premio:</p>
                                        <div className="qr-reward-code">{result.reward.qr_code}</div>
                                        <p className="qr-reward-instructions">
                                            📱 Guarda este código. Muéstralo en tu próxima visita para canjear tu premio.
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : result.alreadyStamped ? (
                            // Ya sumó hoy
                            <div className="qr-already">
                                <div className="qr-already-icon">😊</div>
                                <h2>{result.message}</h2>
                                <div className="qr-progress">
                                    <div className="qr-progress-bar">
                                        <div
                                            className="qr-progress-fill"
                                            style={{
                                                width: `${(result.puntos_actuales / result.puntos_meta) * 100}%`,
                                                background: primaryColor
                                            }}
                                        />
                                    </div>
                                    <p className="qr-progress-text">
                                        {result.puntos_actuales} / {result.puntos_meta} puntos
                                    </p>
                                </div>
                            </div>
                        ) : (
                            // Punto sumado normal
                            <div className="qr-stamped">
                                <div className="qr-stamped-icon">✅</div>
                                <h2>{result.message}</h2>
                                <div className="qr-progress">
                                    <div className="qr-progress-bar">
                                        <div
                                            className="qr-progress-fill"
                                            style={{
                                                width: `${(result.puntos_actuales / result.puntos_meta) * 100}%`,
                                                background: primaryColor
                                            }}
                                        />
                                    </div>
                                    <p className="qr-progress-text">
                                        {result.puntos_actuales} / {result.puntos_meta} puntos
                                    </p>
                                </div>
                                {program && (
                                    <p className="qr-next-prize">
                                        Te faltan <strong>{result.puntos_meta - result.puntos_actuales}</strong> puntos para: {program.descripcion_premio}
                                    </p>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => {
                                setStep('welcome')
                                setResult(null)
                                setError('')
                                setNombre('')
                                setWhatsapp('')
                                setEmail('')
                                setReturningWhatsapp('')
                            }}
                            className="qr-btn qr-btn-secondary"
                            style={{ marginTop: '1.5rem' }}
                        >
                            Cerrar
                        </button>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="qr-footer">
                <p>Potenciado por <strong>Fidelización Digital</strong></p>
            </footer>
        </div>
    )
}
