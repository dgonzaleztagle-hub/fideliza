'use client'

import { useEffect, useState } from 'react'
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
    tipo_programa: string
    config: Record<string, unknown>
}

interface Props {
    tenant: Tenant
    program: Program | null
}

type Step = 'welcome' | 'register' | 'returning' | 'result'

interface StampResult {
    message: string
    tipo_programa: string
    // sellos
    puntos_actuales?: number
    puntos_meta?: number
    llegoAMeta?: boolean
    alreadyStamped?: boolean
    reward?: { qr_code: string; descripcion: string } | null
    // cashback
    cashback_ganado?: number
    saldo_total?: number
    porcentaje?: number
    monto_compra?: number
    // multipase
    usos_restantes?: number
    pack_completado?: boolean
    necesita_compra?: boolean
    // descuento
    descuento_actual?: number
    visitas_totales?: number
    siguiente_nivel?: { faltan: number; descuento: number } | null
    subio_de_nivel?: boolean
    // membresia
    tiene_membresia?: boolean
    beneficios?: string[]
    expirada?: boolean
    // cupon
    cupon?: { qr_code: string; descripcion: string } | null
    descuento?: number
    ya_usado?: boolean
    expirado?: boolean
    // regalo
    tiene_giftcard?: boolean
    saldo?: number
}

export default function QRPageClient({ tenant, program }: Props) {
    const [step, setStep] = useState<Step>('welcome')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState<StampResult | null>(null)

    const [nombre, setNombre] = useState('')
    const [whatsapp, setWhatsapp] = useState('')
    const [email, setEmail] = useState('')
    const [fechaNacimiento, setFechaNacimiento] = useState('')

    // Referidos
    const [referrerId, setReferrerId] = useState<string | null>(null)

    // Returning
    const [returningWhatsapp, setReturningWhatsapp] = useState('')

    // Cashback input
    const [montoCompra, setMontoCompra] = useState('')

    // Google Wallet
    const [walletLink, setWalletLink] = useState<string | null>(null)
    const [walletLoading, setWalletLoading] = useState(false)

    const primaryColor = tenant.color_primario || '#6366f1'
    const tipoPrograma = program?.tipo_programa || 'sellos'
    const cashbackPorcentaje = typeof program?.config?.porcentaje === 'number' ? program.config.porcentaje : 5
    const cuponPorcentaje = typeof program?.config?.descuento_porcentaje === 'number' ? program.config.descuento_porcentaje : 15
    const cantidadUsosPrograma = typeof program?.config?.cantidad_usos === 'number' ? program.config.cantidad_usos : 10

    // Capturar referrer de la URL
    useEffect(() => {
        if (typeof window === 'undefined') return
        const params = new URLSearchParams(window.location.search)
        const ref = params.get('ref')
        if (ref) setReferrerId(ref)
    }, [])

    // Helper: texto según tipo
    function getProgramBadge(): string {
        const badges: Record<string, string> = {
            sellos: `🎯 ${program?.puntos_meta} puntos = ${program?.descripcion_premio}`,
            cashback: `💰 ${cashbackPorcentaje}% de cashback en cada compra`,
            multipase: `🎟️ Pack de usos prepagados`,
            membresia: `👑 Membresía VIP con beneficios exclusivos`,
            descuento: `📊 Más visitas = mayor descuento permanente`,
            cupon: `🎫 Cupón de ${cuponPorcentaje}% de descuento`,
            regalo: `🎁 Gift Card con saldo disponible`,
            afiliacion: `📱 Recibe promos y novedades exclusivas`
        }
        return badges[tipoPrograma] || badges.sellos
    }

    function getStampButtonText(): string {
        if (tipoPrograma === 'cashback') return '💰 Registrar compra'
        if (tipoPrograma === 'multipase') return '🎟️ Usar un pase'
        if (tipoPrograma === 'cupon') return '🎫 Obtener mi cupón'
        if (tipoPrograma === 'regalo') return '🎁 Ver mi saldo'
        if (tipoPrograma === 'membresia') return '👑 Registrar visita VIP'
        if (tipoPrograma === 'afiliacion') return '📱 Registrar visita'
        return '✅ Sumar punto'
    }

    function needsMontoCompra(): boolean {
        return tipoPrograma === 'cashback'
    }

    const [socialLoading, setSocialLoading] = useState(false)

    // Detectar si venimos de un login social exitoso
    useEffect(() => {
        const checkUser = async () => {
            const { createClient } = await import('@/lib/supabase/client')
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) return

            // Pre-completar con datos de Google/Apple
            if (user.user_metadata?.full_name) {
                setNombre(prev => prev || user.user_metadata.full_name)
            }
            if (user.email) {
                setEmail(prev => prev || user.email || '')
            }

            // Si ya tenemos los datos básicos mínimos, sugerimos paso de registro
            setStep(prev => (prev === 'welcome' || prev === 'register') ? 'register' : prev)
        }
        checkUser()
    }, [])

    async function handleSocialLogin(provider: 'google' | 'apple') {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        setSocialLoading(true)

        await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`
            }
        })
    }

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const regRes = await fetch('/api/customer/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant_id: tenant.id,
                    nombre,
                    whatsapp,
                    email: email || undefined,
                    fecha_nacimiento: fechaNacimiento || undefined,
                    referido_por: referrerId || undefined
                })
            })

            const regData = await regRes.json()
            if (!regRes.ok) throw new Error(regData.error || 'Error al registrar')

            // Si el registro fue exitoso mediante social login, podríamos querer limpiar la sesión de auth
            // Pero por ahora la mantendremos para evitar fricción si recarga.

            await handleStamp(whatsapp)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error inesperado')
            setLoading(false)
        }
    }

    async function handleReturning(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')
        await handleStamp(returningWhatsapp)
    }

    async function fetchWalletLink(wsp: string) {
        setWalletLoading(true)
        try {
            const res = await fetch('/api/wallet/save-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: tenant.id, whatsapp: wsp })
            })
            const data = await res.json()
            if (res.ok && data.saveLink) {
                setWalletLink(data.saveLink)
            }
        } catch {
            // No bloquear UX si wallet falla
        } finally {
            setWalletLoading(false)
        }
    }

    // Geolocation
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [locationError, setLocationError] = useState('')

    async function getLocation(): Promise<{ lat: number; lng: number } | null> {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Tu navegador no soporta geolocalización'))
                return
            }
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    })
                },
                (err) => {
                    let msg = 'Error obteniendo ubicación'
                    if (err.code === 1) msg = 'Debes permitir el acceso a tu ubicación para sumar puntos'
                    reject(new Error(msg))
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            )
        })
    }

    async function handleStamp(wsp: string) {
        setLoading(true)
        setError('')
        setLocationError('')

        try {
            // 1. Obtener ubicación (Obligatorio para evitar fraude)
            let coords = userLocation
            if (!coords) {
                try {
                    coords = await getLocation()
                    setUserLocation(coords)
                } catch (locErr: unknown) {
                    // Si falla la ubicación, mostramos el error pero permitimos intentar (el backend decidirá si es bloqueante o no según configuración del tenant)
                    // En este caso, para seguridad estricta, podríamos bloquear aquí. 
                    // Pero mejor enviamos null y que el backend decida.
                    console.warn('No se pudo obtener ubicación:', locErr)
                    const locationMessage = locErr instanceof Error ? locErr.message : 'No se pudo obtener ubicación'
                    setLocationError(locationMessage)
                    // Si es error de permiso (code 1), lanzamos error para bloquear en UI si queremos ser estrictos
                    if (locationMessage.includes('permitir')) {
                        throw locErr
                    }
                }
            }

            const bodyData: Record<string, unknown> = {
                tenant_id: tenant.id,
                whatsapp: wsp,
                lat: coords?.lat,
                lng: coords?.lng
            }

            // Para cashback, enviar monto
            if (needsMontoCompra() && montoCompra) {
                bodyData.monto_compra = Number(montoCompra)
            }

            const res = await fetch('/api/stamp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            })

            const data = await res.json()
            if (!res.ok) {
                if (res.status === 409 && data.already_stamped_today) {
                    setResult(data)
                    setStep('result')
                    fetchWalletLink(wsp)
                    return
                }
                throw new Error(data.error || data.message || 'Error al procesar')
            }

            setResult(data)
            setStep('result')

            // Intentar obtener link de Google Wallet en background
            fetchWalletLink(wsp)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error inesperado')
        } finally {
            setLoading(false)
        }
    }

    function resetState() {
        setStep('welcome')
        setResult(null)
        setError('')
        setNombre('')
        setWhatsapp('')
        setEmail('')
        setFechaNacimiento('')
        setReturningWhatsapp('')
        setMontoCompra('')
        setWalletLink(null)
    }

    // ═══ RENDER RESULT ═══
    function renderResult() {
        if (!result) return null

        // SELLOS
        if (result.tipo_programa === 'sellos') {
            if (result.llegoAMeta) {
                return (
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
                                <a
                                    href={`https://wa.me/?text=${encodeURIComponent(`¡Mira! Acabo de ganar un premio en ${tenant.nombre}: ${result.reward.descripcion}. Mi código es: ${result.reward.qr_code}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="qr-wa-share-btn"
                                >
                                    <span>📩 Guardar en mi WhatsApp</span>
                                </a>
                            </div>
                        )}
                    </div>
                )
            }
            if (result.alreadyStamped) {
                return (
                    <div className="qr-already">
                        <div className="qr-already-icon">😊</div>
                        <h2>{result.message}</h2>
                        {renderProgressBar()}
                    </div>
                )
            }
            return (
                <div className="qr-stamped">
                    <div className="qr-stamped-icon">✅</div>
                    <h2>{result.message}</h2>
                    {renderProgressBar()}
                    {program && result.puntos_actuales !== undefined && (
                        <p className="qr-next-prize">
                            Te faltan <strong>{(result.puntos_meta || program.puntos_meta) - result.puntos_actuales}</strong> puntos para: {program.descripcion_premio}
                        </p>
                    )}
                </div>
            )
        }

        // CASHBACK
        if (result.tipo_programa === 'cashback') {
            return (
                <div className="qr-stamped">
                    <div className="qr-stamped-icon">💰</div>
                    <h2>{result.message}</h2>
                    <div className="qr-type-info-card">
                        <div className="qr-type-info-row">
                            <span>Cashback ganado</span>
                            <strong>${result.cashback_ganado?.toLocaleString()}</strong>
                        </div>
                        <div className="qr-type-info-row">
                            <span>Saldo total acumulado</span>
                            <strong className="qr-highlight">${result.saldo_total?.toLocaleString()}</strong>
                        </div>
                    </div>
                </div>
            )
        }

        // MULTIPASE
        if (result.tipo_programa === 'multipase') {
            if (result.necesita_compra) {
                return (
                    <div className="qr-already">
                        <div className="qr-already-icon">🎟️</div>
                        <h2>{result.message}</h2>
                        <p className="qr-next-prize">Consulta en caja para comprar un nuevo pack de usos.</p>
                    </div>
                )
            }
            return (
                <div className="qr-stamped">
                    <div className="qr-stamped-icon">{result.pack_completado ? '🎉' : '🎟️'}</div>
                    <h2>{result.message}</h2>
                    {!result.pack_completado && (
                        <div className="qr-progress">
                            <div className="qr-progress-bar">
                                <div
                                    className="qr-progress-fill"
                                    style={{
                                        width: `${Math.max(10, ((result.usos_restantes || 0) / cantidadUsosPrograma) * 100)}%`,
                                        background: primaryColor
                                    }}
                                />
                            </div>
                            <p className="qr-progress-text">
                                {result.usos_restantes} usos restantes
                            </p>
                        </div>
                    )}
                </div>
            )
        }

        // DESCUENTO POR NIVELES
        if (result.tipo_programa === 'descuento') {
            return (
                <div className="qr-stamped">
                    <div className="qr-stamped-icon">{result.subio_de_nivel ? '🎉' : '📊'}</div>
                    <h2>{result.message}</h2>
                    <div className="qr-type-info-card">
                        <div className="qr-type-info-row">
                            <span>Tu descuento actual</span>
                            <strong className="qr-highlight">{result.descuento_actual}%</strong>
                        </div>
                        <div className="qr-type-info-row">
                            <span>Visitas totales</span>
                            <strong>{result.visitas_totales}</strong>
                        </div>
                        {result.siguiente_nivel && result.siguiente_nivel.faltan > 0 && (
                            <div className="qr-type-info-row">
                                <span>Siguiente nivel</span>
                                <strong>{result.siguiente_nivel.faltan} visitas más → {result.siguiente_nivel.descuento}%</strong>
                            </div>
                        )}
                    </div>
                </div>
            )
        }

        // MEMBRESÍA VIP
        if (result.tipo_programa === 'membresia') {
            if (!result.tiene_membresia) {
                return (
                    <div className="qr-already">
                        <div className="qr-already-icon">👑</div>
                        <h2>{result.message}</h2>
                        <p className="qr-next-prize">Consulta en caja para activar tu membresía VIP.</p>
                    </div>
                )
            }
            return (
                <div className="qr-stamped">
                    <div className="qr-stamped-icon">👑</div>
                    <h2>{result.message}</h2>
                    {result.beneficios && result.beneficios.length > 0 && (
                        <div className="qr-type-info-card">
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                Tus beneficios VIP:
                            </p>
                            {result.beneficios.map((b, i) => (
                                <div key={i} className="qr-type-info-row">
                                    <span>✨ {b}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )
        }

        // AFILIACIÓN
        if (result.tipo_programa === 'afiliacion') {
            return (
                <div className="qr-stamped">
                    <div className="qr-stamped-icon">📱</div>
                    <h2>{result.message}</h2>
                    <div className="qr-type-info-card">
                        <div className="qr-type-info-row">
                            <span>Visitas registradas</span>
                            <strong>{result.visitas_totales}</strong>
                        </div>
                    </div>
                </div>
            )
        }

        // CUPÓN
        if (result.tipo_programa === 'cupon') {
            if (result.ya_usado || result.expirado) {
                return (
                    <div className="qr-already">
                        <div className="qr-already-icon">🎫</div>
                        <h2>{result.message}</h2>
                    </div>
                )
            }
            return (
                <div className="qr-prize">
                    <div className="qr-prize-confetti">🎫✨</div>
                    <h2>¡Cupón generado!</h2>
                    <p className="qr-prize-desc">{result.message}</p>
                    {result.cupon && (
                        <div className="qr-reward-card">
                            <p className="qr-reward-label">Tu código de cupón:</p>
                            <div className="qr-reward-code">{result.cupon.qr_code}</div>
                            <p className="qr-reward-instructions">
                                📱 Muestra este código en caja para aplicar tu {result.descuento}% de descuento.
                            </p>
                        </div>
                    )}
                </div>
            )
        }

        // REGALO / GIFT CARD
        if (result.tipo_programa === 'regalo') {
            if (!result.tiene_giftcard) {
                return (
                    <div className="qr-already">
                        <div className="qr-already-icon">🎁</div>
                        <h2>{result.message}</h2>
                        <p className="qr-next-prize">Puedes comprar una gift card en caja.</p>
                    </div>
                )
            }
            return (
                <div className="qr-stamped">
                    <div className="qr-stamped-icon">🎁</div>
                    <h2>{result.message}</h2>
                    <div className="qr-type-info-card">
                        <div className="qr-type-info-row">
                            <span>Saldo disponible</span>
                            <strong className="qr-highlight">${result.saldo?.toLocaleString()}</strong>
                        </div>
                    </div>
                </div>
            )
        }

        // Fallback genérico
        return (
            <div className="qr-stamped">
                <div className="qr-stamped-icon">✅</div>
                <h2>{result.message}</h2>
            </div>
        )
    }

    function renderProgressBar() {
        if (result?.puntos_actuales === undefined || result?.puntos_meta === undefined) return null
        return (
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
        )
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
                    <div className="qr-program-badge">{getProgramBadge()}</div>
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

                {/* PASO 1: Bienvenida */}
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
                    <div className="qr-form-container">
                        <form onSubmit={handleRegister} className="qr-form">
                            <h2>Registro rápido ✨</h2>

                            {/* Social Signup Options */}
                            <div className="qr-social-signup">
                                <p className="qr-social-hint">Pre-completa tus datos:</p>
                                <div className="qr-social-buttons">
                                    <button
                                        type="button"
                                        className="btn-social google"
                                        onClick={() => handleSocialLogin('google')}
                                        disabled={socialLoading}
                                    >
                                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" />
                                        Google
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-social apple"
                                        onClick={() => handleSocialLogin('apple')}
                                        disabled={socialLoading}
                                    >
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" alt="" />
                                        Apple
                                    </button>
                                </div>
                                <div className="qr-social-divider">
                                    <span>o usa tus datos manuales</span>
                                </div>
                            </div>

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
                            <div className="qr-field">
                                <label htmlFor="nacimiento">Fecha de Nacimiento <span className="qr-optional">(opcional)</span></label>
                                <input
                                    id="nacimiento"
                                    type="date"
                                    value={fechaNacimiento}
                                    onChange={(e) => setFechaNacimiento(e.target.value)}
                                />
                            </div>
                            {needsMontoCompra() && (
                                <div className="qr-field">
                                    <label htmlFor="monto">Monto de tu compra ($)</label>
                                    <input
                                        id="monto"
                                        type="number"
                                        value={montoCompra}
                                        onChange={(e) => setMontoCompra(e.target.value)}
                                        placeholder="Ej: 15000"
                                        required
                                        min="1"
                                    />
                                </div>
                            )}
                            <button
                                type="submit"
                                className="qr-btn qr-btn-primary"
                                style={{ background: primaryColor }}
                                disabled={loading}
                            >
                                {loading ? '⏳ Registrando...' : `🎉 Registrarme y ${getStampButtonText().toLowerCase()}`}
                            </button>
                            <button type="button" onClick={() => setStep('welcome')} className="qr-btn-link">
                                ← Volver
                            </button>
                        </form>
                    </div>
                )}

                {/* PASO 2B: Ya tengo cuenta */}
                {step === 'returning' && (
                    <form onSubmit={handleReturning} className="qr-form">
                        <h2>¡Bienvenido de vuelta! 🙌</h2>
                        <p>Ingresa tu WhatsApp para continuar</p>
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
                        {needsMontoCompra() && (
                            <div className="qr-field">
                                <label htmlFor="monto-returning">Monto de tu compra ($)</label>
                                <input
                                    id="monto-returning"
                                    type="number"
                                    value={montoCompra}
                                    onChange={(e) => setMontoCompra(e.target.value)}
                                    placeholder="Ej: 15000"
                                    required
                                    min="1"
                                />
                            </div>
                        )}
                        <button
                            type="submit"
                            className="qr-btn qr-btn-primary"
                            style={{ background: primaryColor }}
                            disabled={loading}
                        >
                            {loading ? '⏳ Procesando...' : getStampButtonText()}
                        </button>
                        <button type="button" onClick={() => setStep('welcome')} className="qr-btn-link">
                            ← Volver
                        </button>
                    </form>
                )}

                {/* PASO 3: Resultado */}
                {step === 'result' && result && (
                    <div className="qr-result">
                        {renderResult()}

                        {/* Botón Google Wallet */}
                        {walletLink && (
                            <a
                                href={walletLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="qr-wallet-btn"
                            >
                                <img
                                    src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Wallet_Icon_2022.svg"
                                    width="24"
                                    height="24"
                                    alt="Google Wallet"
                                />
                                <span>Añadir a Google Wallet</span>
                            </a>
                        )}
                        {walletLoading && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'center' }}>
                                Generando tarjeta digital...
                            </p>
                        )}

                        <button onClick={resetState} className="qr-btn qr-btn-secondary" style={{ marginTop: '1rem' }}>
                            Cerrar
                        </button>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="qr-footer">
                <p>Potenciado por <strong>Vuelve+</strong></p>
                <p style={{ marginTop: '0.5rem' }}>
                    <a href="/mi-tarjeta" style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textDecoration: 'underline' }}>
                        📱 Ver mi tarjeta
                    </a>
                </p>
            </footer>
        </div>
    )
}
