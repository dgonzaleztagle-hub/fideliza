'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { BILLING_PLAN_VALUES, PLAN_CATALOG, isBillingPlan, normalizeProgramChoices } from '@/lib/plans'
import { ProgramType, PROGRAM_TYPE_VALUES } from '@/lib/programTypes'
import './registro.css'

type OnboardingStep = 'negocio' | 'plan' | 'tipo' | 'programa' | 'branding' | 'ubicacion' | 'listo'
type RegistroApiResult = {
    message?: string
    tenant?: { slug?: string; nombre?: string; qr_code?: string }
    qr_url?: string
    trial_hasta?: string
}

type RegistroErrorMeta = {
    code: string
    status?: number
    requestId?: string
    at: string
    detail?: string
}

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
    const [errorMeta, setErrorMeta] = useState<RegistroErrorMeta | null>(null)
    const [result] = useState<RegistroApiResult | null>(null)
    const [hasSession, setHasSession] = useState(false)
    const [sessionEmail, setSessionEmail] = useState('')
    const supabase = useMemo(() => createClient(), [])

    function setLocalError(message: string) {
        setError(message)
        setErrorMeta(null)
    }

    function clearError() {
        setError('')
        setErrorMeta(null)
    }

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session && session.user) {
                setHasSession(true)
                if (session.user.email) {
                    setSessionEmail(session.user.email)
                    setEmail((prev) => prev || session.user.email || '')
                }
            }
        })
    }, [supabase])

    // Datos del negocio
    const [nombre, setNombre] = useState('')
    const [rubro, setRubro] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [telefono, setTelefono] = useState('')
    const [direccion, setDireccion] = useState('')

    // Tipo de programa
    const [selectedPlan, setSelectedPlan] = useState<'pyme' | 'pro' | 'full'>('pyme')
    const [selectedProgramTypes, setSelectedProgramTypes] = useState<string[]>(['sellos'])
    const [tipoPrograma, setTipoPrograma] = useState('sellos')

    useEffect(() => {
        if (typeof window === 'undefined') return
        const planFromQuery = new URLSearchParams(window.location.search).get('plan')
        if (isBillingPlan(planFromQuery)) {
            setSelectedPlan(planFromQuery)
        }
    }, [])

    useEffect(() => {
        const normalized = normalizeProgramChoices(selectedProgramTypes, selectedPlan)
        if (normalized.join('|') !== selectedProgramTypes.join('|')) {
            setSelectedProgramTypes(normalized)
        }
        if (!normalized.includes(tipoPrograma as ProgramType)) {
            setTipoPrograma(normalized[0])
        }
    }, [selectedPlan, selectedProgramTypes, tipoPrograma])

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
    const [logoUrl, setLogoUrl] = useState('')
    const [logoUploading, setLogoUploading] = useState(false)

    // Ubicación
    const [enLocal, setEnLocal] = useState<boolean | null>(null)
    const [lat, setLat] = useState('')
    const [lng, setLng] = useState('')
    const [mensajeGeo, setMensajeGeo] = useState('¡Estás cerca! Pasa a sumar puntos 🎉')
    const [detectingLocation, setDetectingLocation] = useState(false)

    const nombreTrimmed = nombre.trim()
    const emailTrimmed = email.trim().toLowerCase()
    const effectiveEmail = hasSession ? (emailTrimmed || sessionEmail.toLowerCase()) : emailTrimmed
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effectiveEmail)

    function detectarUbicacion() {
        if (!navigator.geolocation) {
            setLocalError('Tu navegador no soporta geolocalización')
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
                setLocalError('No pudimos obtener tu ubicación. Puedes ingresarla manualmente.')
                setDetectingLocation(false)
            }
        )
    }

    async function handleUseAnotherEmail() {
        await supabase.auth.signOut()
        setHasSession(false)
        setSessionEmail('')
        setEmail('')
        setPassword('')
        clearError()
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

    async function handleLogoUpload(file: File | null) {
        if (!file) return
        setLogoUploading(true)
        clearError()
        try {
            const fd = new FormData()
            fd.append('file', file)
            const res = await fetch('/api/upload/logo', {
                method: 'POST',
                body: fd
            })
            const data = await res.json()
            if (!res.ok) {
                setLocalError(data.error || 'No se pudo subir el logo')
                return
            }
            setLogoUrl(data.logo_url || '')
        } catch {
            setLocalError('Error de conexión al subir el logo')
        } finally {
            setLogoUploading(false)
        }
    }

    async function handleSubmit() {
        setLoading(true)
        clearError()
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 35000)
        const requestId = globalThis.crypto?.randomUUID?.()
            || `reg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

        try {
            const res = await fetch('/api/tenant/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-client-request-id': requestId
                },
                signal: controller.signal,
                body: JSON.stringify({
                    nombre,
                    rubro,
                    email: effectiveEmail,
                    password,
                    telefono,
                    direccion,
                    puntos_meta: tipoPrograma === 'sellos' ? puntosMeta : 999,
                    descripcion_premio: buildDescripcionPremioAuto(),
                    tipo_premio: tipoPremio,
                    valor_premio: valorPremio,
                    tipo_programa: tipoPrograma,
                    selected_plan: selectedPlan,
                    selected_program_types: normalizeProgramChoices(selectedProgramTypes, selectedPlan),
                    config: buildProgramConfig(),
                    color_primario: colorPrimario,
                    logo_url: logoUrl || undefined,
                    lat: lat ? parseFloat(lat) : null,
                    lng: lng ? parseFloat(lng) : null,
                    mensaje_geofencing: mensajeGeo,
                }),
            })

            const raw = await res.text()
            let data: RegistroApiResult & {
                error?: string
                error_code?: string
                request_id?: string
                error_detail?: string
            } = {}
            if (raw) {
                try {
                    data = JSON.parse(raw)
                } catch {
                    setError('El servidor respondió con un formato inválido. Reintenta.')
                    setErrorMeta({
                        code: `HTTP_${res.status}`,
                        status: res.status,
                        requestId,
                        at: new Date().toLocaleString('es-CL')
                    })
                    return
                }
            }

            if (!res.ok) {
                setError(data.error || 'Error al registrar')
                setErrorMeta({
                    code: data.error_code || `HTTP_${res.status}`,
                    status: res.status,
                    requestId: data.request_id || requestId,
                    at: new Date().toLocaleString('es-CL'),
                    detail: data.error_detail
                })
                return
            }

            if (!hasSession && effectiveEmail && password) {
                const { error: loginError } = await supabase.auth.signInWithPassword({
                    email: effectiveEmail,
                    password
                })
                if (loginError) {
                    setError('No pudimos dejar tu sesión activa automáticamente. Inicia sesión con tu correo y clave.')
                    setErrorMeta({
                        code: 'AUTH_AUTO_LOGIN_FAILED',
                        requestId,
                        at: new Date().toLocaleString('es-CL'),
                        detail: loginError.message
                    })
                    return
                }
                setHasSession(true)
            }

            const slug = data.tenant?.slug
            window.location.href = slug ? `/cliente?slug=${encodeURIComponent(slug)}` : '/cliente'
            return
        } catch (err: unknown) {
            if (err instanceof Error && err.name === 'AbortError') {
                setError('La creación está tardando demasiado. Reintenta en unos segundos.')
                setErrorMeta({
                    code: 'CLIENT_TIMEOUT',
                    requestId,
                    at: new Date().toLocaleString('es-CL')
                })
            } else {
                setError(err instanceof Error ? err.message : 'Error inesperado')
                setErrorMeta({
                    code: 'CLIENT_UNEXPECTED',
                    requestId,
                    at: new Date().toLocaleString('es-CL')
                })
            }
        } finally {
            clearTimeout(timeoutId)
            setLoading(false)
        }
    }

    async function goToPanel() {
        clearError()
        const emailToUse = effectiveEmail
        if (!emailToUse) {
            setLocalError('No encontramos el correo de la sesión. Inicia sesión nuevamente.')
            return
        }
        if (!hasSession && password) {
            const { error: loginError } = await supabase.auth.signInWithPassword({
                email: emailToUse,
                password
            })
            if (loginError) {
                setLocalError('No pudimos dejar tu sesión activa automáticamente. Inicia sesión con tu correo y clave.')
                return
            }
            setHasSession(true)
        }
        const slug = result?.tenant?.slug
        window.location.href = slug ? `/cliente?slug=${encodeURIComponent(slug)}` : '/cliente'
    }

    function validateNegocioStep(): boolean {
        if (!nombreTrimmed || !effectiveEmail || (!hasSession && !password)) {
            setLocalError('Faltan campos obligatorios')
            return false
        }
        if (nombreTrimmed.length < 3) {
            setLocalError('El nombre del negocio debe tener al menos 3 caracteres')
            return false
        }
        if (!emailValido) {
            setLocalError('Ingresa un email válido')
            return false
        }
        if (!hasSession && password.length < 8) {
            setLocalError('La contraseña debe tener al menos 8 caracteres')
            return false
        }
        return true
    }

    const steps: { key: OnboardingStep; label: string; number: number }[] = [
        { key: 'negocio', label: 'Crear cuenta', number: 1 }
    ]

    const currentStepIndex = steps.findIndex(s => s.key === step)

    const tipoActual = TIPOS_PROGRAMA.find(t => t.id === tipoPrograma)
    const qrUrl = result?.qr_url || result?.tenant?.qr_code || ''
    const qrPreviewUrl = qrUrl
        ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qrUrl)}&bgcolor=0a0a0f&color=ffffff&format=png`
        : ''

    return (
        <div className="registro-page">
            {/* Header */}
            <header className="registro-header">
                <Link href="/" className="registro-logo">
                    <span>💎</span> Vuelve+
                </Link>
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
                            <div className="registro-error-content">
                                <p className="registro-error-main">⚠️ {error}</p>
                                {errorMeta && (
                                    <p className="registro-error-meta">
                                        Código: <strong>{errorMeta.code}</strong>
                                        {errorMeta.status ? ` | HTTP: ${errorMeta.status}` : ''}
                                        {errorMeta.requestId ? ` | Ref: ${errorMeta.requestId}` : ''}
                                        {` | Hora: ${errorMeta.at}`}
                                        {errorMeta.detail ? ` | Detalle: ${errorMeta.detail}` : ''}
                                    </p>
                                )}
                            </div>
                            <button type="button" onClick={clearError}>×</button>
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
                        <p>Solo la info basica para crear tu cuenta. El resto lo configuras en el panel con wizard guiado.</p>

                        <div className="registro-field">
                            <label>Nombre del negocio *</label>
                            <input
                                type="text"
                                value={nombre}
                                onChange={(e) => {
                                    setNombre(e.target.value)
                                    if (error) clearError()
                                }}
                                placeholder="Ej: Barbería Don Pedro"
                                autoFocus
                            />
                            {nombre.length > 0 && nombreTrimmed.length < 3 && (
                                <p className="registro-field-hint registro-field-hint-error">
                                    El nombre debe tener al menos 3 caracteres.
                                </p>
                            )}
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
                                onChange={(e) => {
                                    setEmail(e.target.value)
                                    if (error) clearError()
                                }}
                                placeholder="tu@email.com"
                            />
                            {email.length > 0 && !emailValido && (
                                <p className="registro-field-hint registro-field-hint-error">
                                    Ingresa un correo válido (ejemplo: nombre@dominio.com).
                                </p>
                            )}
                            {hasSession && (
                                <p className="registro-field-hint">
                                    Sesión activa con <strong>{sessionEmail}</strong>. Para usar otro correo en una prueba nueva,{' '}
                                    <button
                                        type="button"
                                        onClick={handleUseAnotherEmail}
                                        style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: 0 }}
                                    >
                                        cerrar sesión
                                    </button>.
                                </p>
                            )}
                        </div>

                        {!hasSession && (
                            <div className="registro-field">
                                <label>Contraseña de acceso * (mínimo 8 caracteres)</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value)
                                        if (error) clearError()
                                    }}
                                    placeholder="Mínimo 8 caracteres"
                                />
                                <p className="registro-field-hint">Con esta clave entrarás a tu panel de Vuelve+</p>
                                {password.length > 0 && password.length < 8 && (
                                    <p className="registro-field-hint registro-field-hint-error">
                                        La contraseña debe tener al menos 8 caracteres.
                                    </p>
                                )}
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
                                if (!validateNegocioStep()) return
                                clearError()
                                handleSubmit()
                            }}
                            disabled={loading}
                        >
                            {loading ? 'Creando cuenta...' : 'Crear cuenta y entrar al panel'}
                        </button>
                    </div>
                )}

                {/* PASO 2: Plan */}
                {step === 'plan' && (
                    <div className="registro-card registro-card-wide">
                        <div className="registro-card-icon">💳</div>
                        <h2>Elige tu plan desde ahora</h2>
                        <p>Partes con 14 días de trial, pero defines desde ya el plan y alcance de motores.</p>

                        <div className="registro-tipo-grid">
                            {BILLING_PLAN_VALUES.map((planCode) => (
                                <button
                                    key={planCode}
                                    className={`registro-tipo-card ${selectedPlan === planCode ? 'selected' : ''}`}
                                    onClick={() => setSelectedPlan(planCode)}
                                    type="button"
                                >
                                    <span className="registro-tipo-icon">💠</span>
                                    <strong className="registro-tipo-nombre">{PLAN_CATALOG[planCode].label}</strong>
                                    <p className="registro-tipo-desc">${PLAN_CATALOG[planCode].monthlyPrice.toLocaleString('es-CL')} / mes</p>
                                    <span className="registro-tipo-ejemplo">
                                        Hasta {PLAN_CATALOG[planCode].limits.maxProgramChoices >= PROGRAM_TYPE_VALUES.length
                                            ? 'todos los motores'
                                            : `${PLAN_CATALOG[planCode].limits.maxProgramChoices} motores`}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="registro-preview">
                            <p className="registro-preview-label">Incluye en este plan:</p>
                            <div className="registro-preview-card">
                                • Geofencing incluido
                                <br />
                                • Staff: {PLAN_CATALOG[selectedPlan].limits.maxStaff >= 9999 ? 'Ilimitado' : PLAN_CATALOG[selectedPlan].limits.maxStaff}
                                <br />
                                • Campañas programadas: {PLAN_CATALOG[selectedPlan].limits.maxScheduledCampaigns >= 9999 ? 'Ilimitadas' : PLAN_CATALOG[selectedPlan].limits.maxScheduledCampaigns}
                                <br />
                                • Exportación CSV: {PLAN_CATALOG[selectedPlan].limits.exportCsv ? 'Sí' : 'No'}
                            </div>
                        </div>

                        <div className="registro-btn-group">
                            <button className="registro-btn-back" onClick={() => setStep('negocio')}>
                                ← Atrás
                            </button>
                            <button className="registro-btn-next" onClick={() => setStep('tipo')}>
                                Siguiente →
                            </button>
                        </div>
                    </div>
                )}

                {/* PASO 3: Motores habilitados */}
                {step === 'tipo' && (
                    <div className="registro-card registro-card-wide">
                        <div className="registro-card-icon">🎯</div>
                        <h2>Define los motores habilitados</h2>
                        <p>
                            {selectedPlan === 'full'
                                ? 'En Full tienes todos los motores habilitados.'
                                : `Puedes elegir hasta ${PLAN_CATALOG[selectedPlan].limits.maxProgramChoices} motores en ${PLAN_CATALOG[selectedPlan].label}.`}
                        </p>
                        <p className="registro-field-hint">
                            Aquí defines los motores que quedarán habilitados. En el siguiente paso configuras uno inicial y luego podrás crear los otros desde el panel.
                        </p>

                        <div className="registro-tipo-grid">
                            {TIPOS_PROGRAMA.map((tipo) => (
                                <button
                                    key={tipo.id}
                                    className={`registro-tipo-card ${selectedProgramTypes.includes(tipo.id) ? 'selected' : ''} ${tipoPrograma === tipo.id ? 'active' : ''}`}
                                    onClick={() => {
                                        const already = selectedProgramTypes.includes(tipo.id)
                                        if (selectedPlan === 'full') {
                                            setSelectedProgramTypes([...PROGRAM_TYPE_VALUES])
                                            setTipoPrograma(tipo.id)
                                            if (error) clearError()
                                            return
                                        }

                                        if (!already && selectedProgramTypes.length >= PLAN_CATALOG[selectedPlan].limits.maxProgramChoices) {
                                            setLocalError(`Tu plan permite hasta ${PLAN_CATALOG[selectedPlan].limits.maxProgramChoices} motores.`)
                                            return
                                        }

                                        const next = already
                                            ? selectedProgramTypes.filter((x) => x !== tipo.id)
                                            : [...selectedProgramTypes, tipo.id]
                                        const normalized = normalizeProgramChoices(next, selectedPlan)
                                        setSelectedProgramTypes(normalized)
                                        if (!normalized.includes(tipoPrograma as ProgramType)) {
                                            setTipoPrograma(normalized[0])
                                        } else if (!already) {
                                            setTipoPrograma(tipo.id)
                                        }
                                        if (error) clearError()
                                    }}
                                    type="button"
                                >
                                    <span className="registro-tipo-icon">{tipo.icon}</span>
                                    <strong className="registro-tipo-nombre">{tipo.nombre}</strong>
                                    <p className="registro-tipo-desc">{tipo.descripcion}</p>
                                    <span className="registro-tipo-ejemplo">Ej: {tipo.ejemplo}</span>
                                    <span className="registro-field-hint">
                                        {selectedProgramTypes.includes(tipo.id)
                                            ? (tipoPrograma === tipo.id ? '✅ Habilitado + configurando ahora' : '✅ Habilitado')
                                            : '⬜ No habilitado'}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="registro-preview">
                            <p className="registro-preview-label">Motores seleccionados:</p>
                            <div className="registro-preview-card">
                                {normalizeProgramChoices(selectedProgramTypes, selectedPlan).map((id) => TIPOS_PROGRAMA.find((t) => t.id === id)?.nombre || id).join(' · ')}
                            </div>
                        </div>

                        <div className="registro-btn-group">
                            <button className="registro-btn-back" onClick={() => setStep('plan')}>
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
                                        setLocalError('Define un premio para tus clientes')
                                        return
                                    }
                                    clearError()
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

                        <div className="registro-field">
                            <label>Logo del negocio</label>
                            <label className="registro-upload-btn">
                                {logoUploading ? 'Subiendo logo...' : 'Subir logo desde tu equipo'}
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    disabled={logoUploading}
                                    onChange={(e) => handleLogoUpload(e.target.files?.[0] || null)}
                                />
                            </label>
                            <input
                                type="text"
                                value={logoUrl}
                                onChange={(e) => setLogoUrl(e.target.value)}
                                placeholder="O pega una URL de logo (opcional)"
                            />
                            <p className="registro-field-hint">Formatos: PNG, JPG o WEBP (máximo 3 MB)</p>
                        </div>

                        {/* Preview de la tarjeta */}
                        <div className="registro-card-preview" style={{ borderColor: colorPrimario }}>
                            <div className="registro-card-preview-header" style={{ background: colorPrimario }}>
                                <div className="registro-card-preview-logo">
                                    {logoUrl
                                        ? <img src={logoUrl} alt="Logo negocio" className="registro-card-preview-logo-image" />
                                        : nombre.charAt(0).toUpperCase()}
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
                        <h2>¡Tu cuenta está lista!</h2>
                        <p>Ahora solo falta configurar el negocio desde tu panel (wizard guiado).</p>

                        <div className="registro-success-info">
                            <div className="registro-success-item">
                                <span className="registro-success-label">Acceso al panel:</span>
                                <span className="registro-success-value">
                                    Ingresa con tu correo y contraseña.
                                </span>
                            </div>

                            <div className="registro-success-item">
                                <span className="registro-success-label">Link público para tus clientes:</span>
                                <a
                                    href={qrUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="registro-success-link"
                                >
                                    {qrUrl}
                                </a>
                                <p className="registro-field-hint" style={{ marginBottom: 0 }}>
                                    Sí: este link es el mismo que codifica el QR. Eso es lo que verán tus clientes.
                                </p>
                            </div>

                            <div className="registro-success-item">
                                <span className="registro-success-label">QR listo para imprimir:</span>
                                {qrPreviewUrl ? (
                                    <>
                                        <img
                                            src={qrPreviewUrl}
                                            alt={`QR público de ${result.tenant?.nombre || 'tu negocio'}`}
                                            className="registro-success-qr-image"
                                        />
                                        <a
                                            href={qrPreviewUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="registro-success-link"
                                        >
                                            Abrir/descargar QR en PNG
                                        </a>
                                    </>
                                ) : (
                                    <span className="registro-success-value">No disponible</span>
                                )}
                            </div>

                            <div className="registro-success-item">
                                <span className="registro-success-label">Trial gratis hasta:</span>
                                <span className="registro-success-value">
                                    {result.trial_hasta
                                        ? new Date(result.trial_hasta).toLocaleDateString('es-CL', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        })
                                        : 'No disponible'}
                                </span>
                            </div>
                        </div>

                        <div className="registro-success-next">
                            <h3>¿Qué sigue?</h3>
                            <ol>
                                <li>⚙️ Entra al panel y completa el wizard de configuración</li>
                                <li>📱 Prueba el link público en tu celular (flujo cliente)</li>
                                <li>🖨️ Imprime el QR de arriba y pégalo en tu mostrador</li>
                                <li>📢 Envía tu primera notificación a los clientes</li>
                            </ol>
                        </div>

                        <div className="registro-btn-group">
                            <a href={qrUrl} target="_blank" rel="noopener noreferrer" className="registro-btn-next">
                                Abrir flujo cliente (link público) →
                            </a>
                            <button type="button" onClick={goToPanel} className="registro-btn-back" style={{ textAlign: 'center' }}>
                                Ir a configurar mi negocio
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
