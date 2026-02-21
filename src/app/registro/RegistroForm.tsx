'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import './registro.css'

type OnboardingStep = 'negocio' | 'tipo' | 'programa' | 'branding' | 'ubicacion' | 'listo'

const TIPOS_PROGRAMA = [
    {
        id: 'sellos',
        icon: '⭐',
        nombre: 'Tarjeta de Sellos',
        descripcion: 'El clásico: cada visita = 1 sello. Al completar, ganan un premio.',
        ejemplo: '10 cafés = 1 gratis'
    },
    {
        id: 'cashback',
        icon: '💰',
        nombre: 'Cashback',
        descripcion: 'Un % de cada compra se acumula como saldo a favor del cliente.',
        ejemplo: '5% de cashback en cada compra'
    },
    {
        id: 'multipase',
        icon: '🎟️',
        nombre: 'Multipase',
        descripcion: 'Pack prepagado de usos. El cliente compra X servicios por un precio especial.',
        ejemplo: '10 clases de yoga por $50.000'
    },
    {
        id: 'membresia',
        icon: '👑',
        nombre: 'Membresía VIP',
        descripcion: 'Clientes pagan una membresía mensual y obtienen beneficios exclusivos.',
        ejemplo: 'VIP $15.000/mes = 10% dcto + prioridad'
    },
    {
        id: 'descuento',
        icon: '📊',
        nombre: 'Descuento por Niveles',
        descripcion: 'Mientras más visitas, mayor descuento permanente. Gamificación pura.',
        ejemplo: '5 visitas = 5%, 15 visitas = 10%'
    },
    {
        id: 'cupon',
        icon: '🎫',
        nombre: 'Cupón de Descuento',
        descripcion: 'Cupón de un solo uso con descuento fijo. Ideal para promos puntuales.',
        ejemplo: '15% de descuento en tu primera compra'
    },
    {
        id: 'regalo',
        icon: '🎁',
        nombre: 'Gift Card',
        descripcion: 'Tarjeta de regalo con saldo precargado. Perfecta para regalos.',
        ejemplo: 'Gift card de $25.000'
    },
    {
        id: 'afiliacion',
        icon: '📱',
        nombre: 'Afiliación',
        descripcion: 'Sin puntos ni premios: solo registro y notificaciones. Para mantener el contacto.',
        ejemplo: 'Recibe nuestras promos exclusivas'
    }
]

export default function RegistroForm() {
    const [step, setStep] = useState<OnboardingStep>('negocio')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState<any>(null)
    const [hasSession, setHasSession] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session && session.user) {
                setHasSession(true)
                if (session.user.email) {
                    setEmail(session.user.email)
                }
            }
        })
    }, [])

    const handleGoogleRegister = async () => {
        setLoading(true)
        setError('')
        try {
            await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/registro`
                }
            })
        } catch (err: any) {
            setError('Error conectando con Google')
            setLoading(false)
        }
    }

    // Datos del negocio
    const [nombre, setNombre] = useState('')
    const [rubro, setRubro] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [telefono, setTelefono] = useState('')
    const [direccion, setDireccion] = useState('')

    // Tipo de programa
    const [tipoPrograma, setTipoPrograma] = useState('sellos')

    // Programa - Sellos
    const [puntosMeta, setPuntosMeta] = useState(10)
    const [descripcionPremio, setDescripcionPremio] = useState('')
    const [tipoPremio, setTipoPremio] = useState('descuento')
    const [valorPremio, setValorPremio] = useState('')

    // Programa - Cashback
    const [cashbackPorcentaje, setCashbackPorcentaje] = useState(5)
    const [cashbackTope, setCashbackTope] = useState(10000)

    // Programa - Multipase
    const [multipaseUsos, setMultipaseUsos] = useState(10)
    const [multipasePrecio, setMultipasePrecio] = useState(50000)
    const [multipaseServicio, setMultipaseServicio] = useState('')

    // Programa - Membresía
    const [membresiaPrecio, setMembresiaPrecio] = useState(15000)
    const [membresiaBeneficios, setMembresiaBeneficios] = useState('10% descuento, Prioridad en reservas')

    // Programa - Descuento por niveles
    const [descuentoNiveles, setDescuentoNiveles] = useState('5:5,15:10,30:15')

    // Programa - Cupón
    const [cuponDescuento, setCuponDescuento] = useState(15)

    // Programa - Regalo
    const [regaloValor, setRegaloValor] = useState(25000)

    // Branding
    const [colorPrimario, setColorPrimario] = useState('#6366f1')

    // Ubicación
    const [enLocal, setEnLocal] = useState<boolean | null>(null)
    const [lat, setLat] = useState('')
    const [lng, setLng] = useState('')
    const [mensajeGeo, setMensajeGeo] = useState('¡Estás cerca! Pasa a sumar puntos 🎉')
    const [detectingLocation, setDetectingLocation] = useState(false)

    function detectarUbicacion() {
        if (!navigator.geolocation) {
            setError('Tu navegador no soporta geolocalización')
            return
        }
        setDetectingLocation(true)
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLat(pos.coords.latitude.toString())
                setLng(pos.coords.longitude.toString())
                setDetectingLocation(false)
            },
            () => {
                setError('No pudimos obtener tu ubicación. Puedes ingresarla manualmente.')
                setDetectingLocation(false)
            }
        )
    }

    function buildProgramConfig() {
        switch (tipoPrograma) {
            case 'cashback':
                return {
                    porcentaje: cashbackPorcentaje,
                    tope_mensual: cashbackTope
                }
            case 'multipase':
                return {
                    cantidad_usos: multipaseUsos,
                    precio_pack: multipasePrecio,
                    servicio: multipaseServicio
                }
            case 'membresia':
                return {
                    precio_mensual: membresiaPrecio,
                    beneficios: membresiaBeneficios.split(',').map(b => b.trim())
                }
            case 'descuento':
                return {
                    niveles: descuentoNiveles.split(',').map(n => {
                        const [visitas, descuento] = n.split(':')
                        return { visitas: Number(visitas), descuento: Number(descuento) }
                    })
                }
            case 'cupon':
                return { descuento_porcentaje: cuponDescuento }
            case 'regalo':
                return { valor_maximo: regaloValor }
            default:
                return {}
        }
    }

    function buildDescripcionPremioAuto(): string {
        if (descripcionPremio) return descripcionPremio
        switch (tipoPrograma) {
            case 'sellos': return valorPremio ? `${valorPremio} de descuento` : 'Premio al completar'
            case 'cashback': return `${cashbackPorcentaje}% de cashback en cada compra`
            case 'multipase': return `Pack de ${multipaseUsos} usos por $${multipasePrecio.toLocaleString()}`
            case 'membresia': return `Membresía VIP $${membresiaPrecio.toLocaleString()}/mes`
            case 'descuento': return 'Descuento progresivo por visitas'
            case 'cupon': return `${cuponDescuento}% de descuento`
            case 'regalo': return `Gift Card hasta $${regaloValor.toLocaleString()}`
            case 'afiliacion': return 'Programa de notificaciones'
            default: return ''
        }
    }

    async function handleSubmit() {
        setLoading(true)
        setError('')
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 35000)

        try {
            const res = await fetch('/api/tenant/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    nombre,
                    rubro,
                    email,
                    password,
                    telefono,
                    direccion,
                    puntos_meta: tipoPrograma === 'sellos' ? puntosMeta : 999,
                    descripcion_premio: buildDescripcionPremioAuto(),
                    tipo_premio: tipoPremio,
                    valor_premio: valorPremio,
                    tipo_programa: tipoPrograma,
                    config: buildProgramConfig(),
                    color_primario: colorPrimario,
                    lat: lat ? parseFloat(lat) : null,
                    lng: lng ? parseFloat(lng) : null,
                    mensaje_geofencing: mensajeGeo,
                }),
            })

            const raw = await res.text()
            const data = raw ? JSON.parse(raw) : {}

            if (!res.ok) {
                throw new Error(data.error || 'Error al registrar')
            }

            setResult(data)
            setStep('listo')
        } catch (err: any) {
            if (err?.name === 'AbortError') {
                setError('La creación está tardando demasiado. Reintenta en unos segundos.')
            } else if (err?.message?.includes('JSON')) {
                setError('El servidor respondió con un formato inválido. Reintenta.')
            } else {
                setError(err.message || 'Error inesperado')
            }
        } finally {
            clearTimeout(timeoutId)
            setLoading(false)
        }
    }

    const steps: { key: OnboardingStep; label: string; number: number }[] = [
        { key: 'negocio', label: 'Tu negocio', number: 1 },
        { key: 'tipo', label: 'Tipo', number: 2 },
        { key: 'programa', label: 'Programa', number: 3 },
        { key: 'branding', label: 'Diseño', number: 4 },
        { key: 'ubicacion', label: 'Ubicación', number: 5 },
    ]

    const currentStepIndex = steps.findIndex(s => s.key === step)

    const tipoActual = TIPOS_PROGRAMA.find(t => t.id === tipoPrograma)

    return (
        <div className="registro-page">
            {/* Header */}
            <header className="registro-header">
                <a href="/" className="registro-logo">
                    <span>💎</span> Vuelve+
                </a>
            </header>

            {step !== 'listo' && (
                <>
                    {/* Progress */}
                    <div className="registro-progress">
                        {steps.map((s, i) => (
                            <div
                                key={s.key}
                                className={`registro-progress-step ${i <= currentStepIndex ? 'active' : ''} ${i < currentStepIndex ? 'completed' : ''}`}
                            >
                                <div className="registro-progress-dot">
                                    {i < currentStepIndex ? '✓' : s.number}
                                </div>
                                <span className="registro-progress-label">{s.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="registro-error">
                            ⚠️ {error}
                            <button onClick={() => setError('')}>×</button>
                        </div>
                    )}
                </>
            )}

            <main className="registro-main">
                {/* PASO 1: Datos del negocio */}
                {step === 'negocio' && (
                    <div className="registro-card">
                        <div className="registro-card-icon">🏪</div>
                        <h2>Cuéntanos de tu negocio</h2>
                        <p>La info básica para crear tu cuenta</p>

                        {!hasSession && (
                            <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                                <button
                                    type="button"
                                    onClick={handleGoogleRegister}
                                    disabled={loading}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                        background: 'white', color: '#333', border: '1px solid #e2e8f0', padding: '0.85rem', width: '100%',
                                        borderRadius: '12px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)', transition: 'all 0.2s'
                                    }}
                                >
                                    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                                        <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                                            <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                                            <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                                            <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                                            <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                                        </g>
                                    </svg>
                                    Registrarse súper rápido con Google
                                </button>
                                <div style={{ display: 'flex', alignItems: 'center', opacity: 0.5, fontSize: '0.8rem', margin: '1.5rem 0 0.5rem 0' }}>
                                    <div style={{ flex: 1, height: '1px', background: '#94a3b8' }} />
                                    <span style={{ padding: '0 10px' }}>O ingresa tus datos manuales</span>
                                    <div style={{ flex: 1, height: '1px', background: '#94a3b8' }} />
                                </div>
                            </div>
                        )}

                        <div className="registro-field">
                            <label>Nombre del negocio *</label>
                            <input
                                type="text"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                placeholder="Ej: Barbería Don Pedro"
                                autoFocus
                            />
                        </div>

                        <div className="registro-field">
                            <label>Rubro</label>
                            <select value={rubro} onChange={(e) => setRubro(e.target.value)}>
                                <option value="">Selecciona...</option>
                                <option value="barberia">Barbería / Peluquería</option>
                                <option value="cafeteria">Cafetería</option>
                                <option value="restaurant">Restaurant</option>
                                <option value="tienda">Tienda / Retail</option>
                                <option value="gym">Gimnasio</option>
                                <option value="belleza">Centro de belleza</option>
                                <option value="lavanderia">Lavandería</option>
                                <option value="fitness">Yoga / Pilates / Fitness</option>
                                <option value="salud">Salud / Clínica</option>
                                <option value="auto">Lavado de autos</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>

                        <div className="registro-field">
                            <label>Email *</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu@email.com"
                                disabled={hasSession}
                                style={hasSession ? { opacity: 0.7, background: '#f8fafc' } : {}}
                            />
                        </div>

                        {!hasSession && (
                            <div className="registro-field">
                                <label>Contraseña de acceso *</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                />
                                <p className="registro-field-hint">Con esta clave entrarás a tu panel de Vuelve+</p>
                            </div>
                        )}

                        <div className="registro-field">
                            <label>WhatsApp</label>
                            <input
                                type="tel"
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                                placeholder="+56 9 1234 5678"
                            />
                        </div>

                        <div className="registro-field">
                            <label>Dirección del local</label>
                            <input
                                type="text"
                                value={direccion}
                                onChange={(e) => setDireccion(e.target.value)}
                                placeholder="Calle, número, ciudad"
                            />
                        </div>

                        <button
                            className="registro-btn-next"
                            onClick={() => {
                                if (!nombre || !email || (!hasSession && !password)) {
                                    setError('Faltan campos obligatorios')
                                    return
                                }
                                if (!hasSession && password.length < 6) {
                                    setError('La contraseña debe tener al menos 6 caracteres')
                                    return
                                }
                                setError('')
                                setStep('tipo')
                            }}
                        >
                            Siguiente →
                        </button>
                    </div>
                )}

                {/* PASO 2: Tipo de programa */}
                {step === 'tipo' && (
                    <div className="registro-card registro-card-wide">
                        <div className="registro-card-icon">🎯</div>
                        <h2>¿Qué tipo de programa quieres?</h2>
                        <p>Elige el que mejor se adapte a tu negocio. Puedes cambiarlo después.</p>

                        <div className="registro-tipo-grid">
                            {TIPOS_PROGRAMA.map((tipo) => (
                                <button
                                    key={tipo.id}
                                    className={`registro-tipo-card ${tipoPrograma === tipo.id ? 'selected' : ''}`}
                                    onClick={() => setTipoPrograma(tipo.id)}
                                    type="button"
                                >
                                    <span className="registro-tipo-icon">{tipo.icon}</span>
                                    <strong className="registro-tipo-nombre">{tipo.nombre}</strong>
                                    <p className="registro-tipo-desc">{tipo.descripcion}</p>
                                    <span className="registro-tipo-ejemplo">Ej: {tipo.ejemplo}</span>
                                </button>
                            ))}
                        </div>

                        <div className="registro-btn-group">
                            <button className="registro-btn-back" onClick={() => setStep('negocio')}>
                                ← Atrás
                            </button>
                            <button className="registro-btn-next" onClick={() => setStep('programa')}>
                                Siguiente →
                            </button>
                        </div>
                    </div>
                )}

                {/* PASO 3: Configuración del programa */}
                {step === 'programa' && (
                    <div className="registro-card">
                        <div className="registro-card-icon">{tipoActual?.icon || '🎯'}</div>
                        <h2>Configura tu {tipoActual?.nombre}</h2>
                        <p>Ajusta los detalles de tu programa</p>

                        {/* SELLOS */}
                        {tipoPrograma === 'sellos' && (
                            <>
                                <div className="registro-field">
                                    <label>¿Cuántos puntos para ganar?</label>
                                    <div className="registro-puntos-selector">
                                        {[5, 8, 10, 12, 15, 20].map((n) => (
                                            <button
                                                key={n}
                                                className={`registro-punto-btn ${puntosMeta === n ? 'active' : ''}`}
                                                onClick={() => setPuntosMeta(n)}
                                                type="button"
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="registro-field-hint">
                                        Recomendamos entre 8 y 12 para mantener la motivación
                                    </p>
                                </div>

                                <div className="registro-field">
                                    <label>Tipo de premio</label>
                                    <select value={tipoPremio} onChange={(e) => setTipoPremio(e.target.value)}>
                                        <option value="descuento">Descuento (%)</option>
                                        <option value="gratis">Producto/Servicio gratis</option>
                                        <option value="regalo">Regalo</option>
                                        <option value="otro">Otro</option>
                                    </select>
                                </div>

                                {tipoPremio === 'descuento' && (
                                    <div className="registro-field">
                                        <label>¿Cuánto descuento?</label>
                                        <div className="registro-descuento-selector">
                                            {['10%', '15%', '20%', '25%', '30%', '50%'].map((v) => (
                                                <button
                                                    key={v}
                                                    className={`registro-punto-btn ${valorPremio === v ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setValorPremio(v)
                                                        setDescripcionPremio(`${v} de descuento en tu próxima compra`)
                                                    }}
                                                    type="button"
                                                >
                                                    {v}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {tipoPremio !== 'descuento' && (
                                    <div className="registro-field">
                                        <label>Describe el premio</label>
                                        <input
                                            type="text"
                                            value={descripcionPremio}
                                            onChange={(e) => setDescripcionPremio(e.target.value)}
                                            placeholder="Ej: Un corte de pelo gratis"
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {/* CASHBACK */}
                        {tipoPrograma === 'cashback' && (
                            <>
                                <div className="registro-field">
                                    <label>% de cashback por compra</label>
                                    <div className="registro-puntos-selector">
                                        {[3, 5, 7, 10, 15].map((n) => (
                                            <button
                                                key={n}
                                                className={`registro-punto-btn ${cashbackPorcentaje === n ? 'active' : ''}`}
                                                onClick={() => setCashbackPorcentaje(n)}
                                                type="button"
                                            >
                                                {n}%
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="registro-field">
                                    <label>Tope mensual de cashback ($)</label>
                                    <input
                                        type="number"
                                        value={cashbackTope}
                                        onChange={(e) => setCashbackTope(Number(e.target.value))}
                                        placeholder="10000"
                                    />
                                    <p className="registro-field-hint">Para proteger tu margen</p>
                                </div>
                            </>
                        )}

                        {/* MULTIPASE */}
                        {tipoPrograma === 'multipase' && (
                            <>
                                <div className="registro-field">
                                    <label>Servicio del pack</label>
                                    <input
                                        type="text"
                                        value={multipaseServicio}
                                        onChange={(e) => setMultipaseServicio(e.target.value)}
                                        placeholder="Ej: Clase de yoga, Lavado de auto"
                                    />
                                </div>
                                <div className="registro-field">
                                    <label>Cantidad de usos</label>
                                    <div className="registro-puntos-selector">
                                        {[5, 8, 10, 15, 20].map((n) => (
                                            <button
                                                key={n}
                                                className={`registro-punto-btn ${multipaseUsos === n ? 'active' : ''}`}
                                                onClick={() => setMultipaseUsos(n)}
                                                type="button"
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="registro-field">
                                    <label>Precio del pack ($)</label>
                                    <input
                                        type="number"
                                        value={multipasePrecio}
                                        onChange={(e) => setMultipasePrecio(Number(e.target.value))}
                                        placeholder="50000"
                                    />
                                </div>
                            </>
                        )}

                        {/* MEMBRESÍA */}
                        {tipoPrograma === 'membresia' && (
                            <>
                                <div className="registro-field">
                                    <label>Precio mensual ($)</label>
                                    <input
                                        type="number"
                                        value={membresiaPrecio}
                                        onChange={(e) => setMembresiaPrecio(Number(e.target.value))}
                                        placeholder="15000"
                                    />
                                </div>
                                <div className="registro-field">
                                    <label>Beneficios (separados por coma)</label>
                                    <input
                                        type="text"
                                        value={membresiaBeneficios}
                                        onChange={(e) => setMembresiaBeneficios(e.target.value)}
                                        placeholder="10% descuento, Prioridad en reservas, Promos exclusivas"
                                    />
                                    <p className="registro-field-hint">Ej: 10% descuento, Prioridad, Promos exclusivas</p>
                                </div>
                            </>
                        )}

                        {/* DESCUENTO POR NIVELES */}
                        {tipoPrograma === 'descuento' && (
                            <div className="registro-field">
                                <label>Niveles (visitas:descuento%, separados por coma)</label>
                                <input
                                    type="text"
                                    value={descuentoNiveles}
                                    onChange={(e) => setDescuentoNiveles(e.target.value)}
                                    placeholder="5:5,15:10,30:15"
                                />
                                <p className="registro-field-hint">
                                    Formato: 5 visitas = 5%, 15 visitas = 10%, etc.
                                </p>
                            </div>
                        )}

                        {/* CUPÓN */}
                        {tipoPrograma === 'cupon' && (
                            <div className="registro-field">
                                <label>% de descuento del cupón</label>
                                <div className="registro-puntos-selector">
                                    {[10, 15, 20, 25, 30, 50].map((n) => (
                                        <button
                                            key={n}
                                            className={`registro-punto-btn ${cuponDescuento === n ? 'active' : ''}`}
                                            onClick={() => setCuponDescuento(n)}
                                            type="button"
                                        >
                                            {n}%
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* REGALO */}
                        {tipoPrograma === 'regalo' && (
                            <div className="registro-field">
                                <label>Valor máximo de la gift card ($)</label>
                                <input
                                    type="number"
                                    value={regaloValor}
                                    onChange={(e) => setRegaloValor(Number(e.target.value))}
                                    placeholder="25000"
                                />
                            </div>
                        )}

                        {/* AFILIACIÓN - No necesita config */}
                        {tipoPrograma === 'afiliacion' && (
                            <div className="registro-preview">
                                <p className="registro-preview-label">Perfecto 👌</p>
                                <div className="registro-preview-card">
                                    📱 Tus clientes se registran y reciben tus promos y novedades
                                </div>
                            </div>
                        )}

                        {/* Preview genérico */}
                        {tipoPrograma !== 'afiliacion' && (
                            <div className="registro-preview">
                                <p className="registro-preview-label">Así se verá:</p>
                                <div className="registro-preview-card">
                                    {tipoActual?.icon} <strong>{tipoActual?.nombre}</strong> — {buildDescripcionPremioAuto()}
                                </div>
                            </div>
                        )}

                        <div className="registro-btn-group">
                            <button className="registro-btn-back" onClick={() => setStep('tipo')}>
                                ← Atrás
                            </button>
                            <button
                                className="registro-btn-next"
                                onClick={() => {
                                    if (tipoPrograma === 'sellos' && !descripcionPremio && !valorPremio) {
                                        setError('Define un premio para tus clientes')
                                        return
                                    }
                                    setError('')
                                    setStep('branding')
                                }}
                            >
                                Siguiente →
                            </button>
                        </div>
                    </div>
                )}

                {/* PASO 4: Branding */}
                {step === 'branding' && (
                    <div className="registro-card">
                        <div className="registro-card-icon">🎨</div>
                        <h2>Dale tu estilo</h2>
                        <p>Elige el color de tu tarjeta de lealtad</p>

                        <div className="registro-field">
                            <label>Color principal</label>
                            <div className="registro-color-grid">
                                {[
                                    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
                                    '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6',
                                    '#14b8a6', '#f97316', '#64748b', '#0f172a'
                                ].map((color) => (
                                    <button
                                        key={color}
                                        className={`registro-color-btn ${colorPrimario === color ? 'active' : ''}`}
                                        style={{ background: color }}
                                        onClick={() => setColorPrimario(color)}
                                        type="button"
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Preview de la tarjeta */}
                        <div className="registro-card-preview" style={{ borderColor: colorPrimario }}>
                            <div className="registro-card-preview-header" style={{ background: colorPrimario }}>
                                <div className="registro-card-preview-logo">
                                    {nombre.charAt(0).toUpperCase()}
                                </div>
                                <span>{nombre || 'Tu Negocio'}</span>
                            </div>
                            <div className="registro-card-preview-body">
                                <p>{tipoActual?.nombre || 'Tarjeta de Lealtad'}</p>
                                {tipoPrograma === 'sellos' && (
                                    <div className="registro-card-preview-dots">
                                        {Array.from({ length: Math.min(puntosMeta, 10) }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="registro-card-preview-dot"
                                                style={{
                                                    background: i < 3 ? colorPrimario : 'rgba(255,255,255,0.1)',
                                                    borderColor: colorPrimario
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                                {tipoPrograma !== 'sellos' && (
                                    <p className="registro-card-preview-type-info">
                                        {tipoActual?.icon} {buildDescripcionPremioAuto()}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="registro-btn-group">
                            <button className="registro-btn-back" onClick={() => setStep('programa')}>
                                ← Atrás
                            </button>
                            <button className="registro-btn-next" onClick={() => setStep('ubicacion')}>
                                Siguiente →
                            </button>
                        </div>
                    </div>
                )}

                {/* PASO 5: Ubicación */}
                {step === 'ubicacion' && (
                    <div className="registro-card">
                        <div className="registro-card-icon">📍</div>
                        <h2>Ubicación del local</h2>
                        <p>Para que tus clientes reciban notificaciones al pasar cerca</p>

                        <div className="registro-ubicacion-pregunta">
                            <p><strong>¿Estás ahora mismo en tu local?</strong></p>
                            <div className="registro-btn-group" style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
                                <button
                                    className={`registro-btn-choice ${enLocal === true ? 'active' : ''}`}
                                    onClick={() => setEnLocal(true)}
                                >
                                    Sí, aquí estoy
                                </button>
                                <button
                                    className={`registro-btn-choice ${enLocal === false ? 'active' : ''}`}
                                    onClick={() => {
                                        setEnLocal(false)
                                        setLat('')
                                        setLng('')
                                    }}
                                >
                                    No, estoy en otro lugar
                                </button>
                            </div>
                        </div>

                        {enLocal === true && (
                            <div className="registro-ubicacion-activa">
                                <button
                                    className="registro-btn-location"
                                    onClick={detectarUbicacion}
                                    disabled={detectingLocation}
                                    type="button"
                                >
                                    {detectingLocation ? '📡 Detectando...' : '📍 Capturar mi ubicación actual'}
                                </button>
                                {lat && lng && (
                                    <div className="registro-location-detected">
                                        ✅ Ubicación detectada ({parseFloat(lat).toFixed(4)}, {parseFloat(lng).toFixed(4)})
                                    </div>
                                )}
                            </div>
                        )}

                        {enLocal === false && (
                            <div className="registro-ubicacion-remota">
                                <div className="registro-info-alert">
                                    💡 <strong>No te preocupes.</strong> Puedes crear tu programa ahora y registrar la ubicación después desde tu panel cuando estés físicamente en el local.
                                </div>
                            </div>
                        )}

                        <div className="registro-field" style={{ marginTop: '1.5rem' }}>
                            <label>Mensaje de geofencing</label>
                            <input
                                type="text"
                                value={mensajeGeo}
                                onChange={(e) => setMensajeGeo(e.target.value)}
                                placeholder="¡Estás cerca! Pasa a sumar puntos 🎉"
                            />
                            <p className="registro-field-hint">
                                Mensaje que verá el cliente al pasar cerca
                            </p>
                        </div>

                        <div className="registro-btn-group">
                            <button className="registro-btn-back" onClick={() => setStep('branding')}>
                                ← Atrás
                            </button>
                            <button
                                className="registro-btn-next registro-btn-final"
                                onClick={handleSubmit}
                                disabled={loading || (enLocal === true && !lat)}
                            >
                                {loading ? '⏳ Creando...' : '🚀 Crear mi programa'}
                            </button>
                        </div>
                    </div>
                )}

                {/* PASO 6: ¡Listo! */}
                {step === 'listo' && result && (
                    <div className="registro-card registro-success">
                        <div className="registro-success-confetti">🎉🚀✨</div>
                        <h2>¡Tu programa está listo!</h2>
                        <p>Ya puedes empezar a fidelizar clientes con <strong>{tipoActual?.nombre}</strong></p>

                        <div className="registro-success-info">
                            {/* SLUG - Prominente */}
                            <div className="registro-success-item registro-success-slug">
                                <span className="registro-success-label">🔑 Tu nombre de acceso al panel:</span>
                                <div className="registro-slug-box">
                                    <code className="registro-slug-value">{result.tenant?.slug || 'N/A'}</code>
                                    <button
                                        type="button"
                                        className="registro-slug-copy"
                                        onClick={() => {
                                            navigator.clipboard.writeText(result.tenant?.slug || '')
                                            const btn = document.querySelector('.registro-slug-copy') as HTMLButtonElement
                                            if (btn) { btn.textContent = '✅ Copiado!'; setTimeout(() => { btn.textContent = '📋 Copiar' }, 2000) }
                                        }}
                                    >
                                        📋 Copiar
                                    </button>
                                </div>
                                <p className="registro-slug-warning">
                                    ⚠️ <strong>Guarda este nombre.</strong> Lo necesitas para entrar a tu panel.
                                    También puedes entrar escribiendo el nombre de tu negocio.
                                </p>
                            </div>

                            <div className="registro-success-item">
                                <span className="registro-success-label">Tu QR para el local:</span>
                                <a
                                    href={result.qr_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="registro-success-link"
                                >
                                    {result.qr_url}
                                </a>
                            </div>

                            <div className="registro-success-item">
                                <span className="registro-success-label">Trial gratis hasta:</span>
                                <span className="registro-success-value">
                                    {new Date(result.trial_hasta).toLocaleDateString('es-CL', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </span>
                            </div>

                            <div className="registro-success-item">
                                <span className="registro-success-label">Tipo de programa:</span>
                                <span className="registro-success-value">
                                    {tipoActual?.icon} {tipoActual?.nombre}
                                </span>
                            </div>

                            <div className="registro-success-item">
                                <span className="registro-success-label">Detalle:</span>
                                <span className="registro-success-value">
                                    {buildDescripcionPremioAuto()}
                                </span>
                            </div>
                        </div>

                        <div className="registro-success-next">
                            <h3>¿Qué sigue?</h3>
                            <ol>
                                <li>📱 Abre el link del QR en tu celular para probarlo</li>
                                <li>🖨️ Imprime el QR y pégalo en tu mostrador</li>
                                <li>📊 Entra a tu panel para ver las estadísticas</li>
                                <li>📢 Envía tu primera notificación a los clientes</li>
                            </ol>
                        </div>

                        <div className="registro-btn-group">
                            <a href={result.qr_url} target="_blank" rel="noopener noreferrer" className="registro-btn-next">
                                Ver mi QR →
                            </a>
                            <a href="/cliente" className="registro-btn-back" style={{ textAlign: 'center' }}>
                                Ir a mi panel
                            </a>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
