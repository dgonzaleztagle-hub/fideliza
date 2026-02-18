'use client'

import { useState } from 'react'
import './registro.css'

type OnboardingStep = 'negocio' | 'programa' | 'branding' | 'ubicacion' | 'listo'

export default function RegistroForm() {
    const [step, setStep] = useState<OnboardingStep>('negocio')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState<any>(null)

    // Datos del negocio
    const [nombre, setNombre] = useState('')
    const [rubro, setRubro] = useState('')
    const [email, setEmail] = useState('')
    const [telefono, setTelefono] = useState('')
    const [direccion, setDireccion] = useState('')

    // Programa
    const [puntosMeta, setPuntosMeta] = useState(10)
    const [descripcionPremio, setDescripcionPremio] = useState('')
    const [tipoPremio, setTipoPremio] = useState('descuento')
    const [valorPremio, setValorPremio] = useState('')

    // Branding
    const [colorPrimario, setColorPrimario] = useState('#6366f1')

    // Ubicación
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

    async function handleSubmit() {
        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/tenant/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre,
                    rubro,
                    email,
                    telefono,
                    direccion,
                    puntos_meta: puntosMeta,
                    descripcion_premio: descripcionPremio || `${valorPremio} de descuento`,
                    tipo_premio: tipoPremio,
                    valor_premio: valorPremio,
                    color_primario: colorPrimario,
                    lat: lat ? parseFloat(lat) : null,
                    lng: lng ? parseFloat(lng) : null,
                    mensaje_geofencing: mensajeGeo,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Error al registrar')
            }

            setResult(data)
            setStep('listo')
        } catch (err: any) {
            setError(err.message || 'Error inesperado')
        } finally {
            setLoading(false)
        }
    }

    const steps: { key: OnboardingStep; label: string; number: number }[] = [
        { key: 'negocio', label: 'Tu negocio', number: 1 },
        { key: 'programa', label: 'Programa', number: 2 },
        { key: 'branding', label: 'Diseño', number: 3 },
        { key: 'ubicacion', label: 'Ubicación', number: 4 },
    ]

    const currentStepIndex = steps.findIndex(s => s.key === step)

    return (
        <div className="registro-page">
            {/* Header */}
            <header className="registro-header">
                <a href="/" className="registro-logo">
                    <span>💎</span> Fideliza
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
                            />
                        </div>

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
                                if (!nombre || !email) {
                                    setError('Nombre y email son obligatorios')
                                    return
                                }
                                setError('')
                                setStep('programa')
                            }}
                        >
                            Siguiente →
                        </button>
                    </div>
                )}

                {/* PASO 2: Programa de lealtad */}
                {step === 'programa' && (
                    <div className="registro-card">
                        <div className="registro-card-icon">🎯</div>
                        <h2>Diseña tu programa</h2>
                        <p>¿Cuántos puntos y qué premio?</p>

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

                        {/* Preview */}
                        <div className="registro-preview">
                            <p className="registro-preview-label">Así se verá:</p>
                            <div className="registro-preview-card">
                                🎯 <strong>{puntosMeta} puntos</strong> = {descripcionPremio || valorPremio || 'Tu premio'}
                            </div>
                        </div>

                        <div className="registro-btn-group">
                            <button className="registro-btn-back" onClick={() => setStep('negocio')}>
                                ← Atrás
                            </button>
                            <button
                                className="registro-btn-next"
                                onClick={() => {
                                    if (!descripcionPremio && !valorPremio) {
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

                {/* PASO 3: Branding */}
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
                                <p>Tarjeta de Lealtad</p>
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

                {/* PASO 4: Ubicación */}
                {step === 'ubicacion' && (
                    <div className="registro-card">
                        <div className="registro-card-icon">📍</div>
                        <h2>Ubicación del local</h2>
                        <p>Para que tus clientes reciban notificaciones al pasar cerca</p>

                        <button
                            className="registro-btn-location"
                            onClick={detectarUbicacion}
                            disabled={detectingLocation}
                            type="button"
                        >
                            {detectingLocation ? '📡 Detectando...' : '📍 Usar mi ubicación actual'}
                        </button>

                        {lat && lng && (
                            <div className="registro-location-detected">
                                ✅ Ubicación detectada ({parseFloat(lat).toFixed(4)}, {parseFloat(lng).toFixed(4)})
                            </div>
                        )}

                        <div className="registro-field">
                            <label>Mensaje de geofencing</label>
                            <input
                                type="text"
                                value={mensajeGeo}
                                onChange={(e) => setMensajeGeo(e.target.value)}
                                placeholder="¡Estás cerca! Pasa a sumar puntos 🎉"
                            />
                            <p className="registro-field-hint">
                                Este mensaje aparece cuando un cliente pasa cerca de tu local
                            </p>
                        </div>

                        <p className="registro-skip-hint">
                            Si no quieres geofencing por ahora, puedes saltarte este paso
                        </p>

                        <div className="registro-btn-group">
                            <button className="registro-btn-back" onClick={() => setStep('branding')}>
                                ← Atrás
                            </button>
                            <button
                                className="registro-btn-next registro-btn-final"
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? '⏳ Creando...' : '🚀 Crear mi programa'}
                            </button>
                        </div>
                    </div>
                )}

                {/* PASO 5: ¡Listo! */}
                {step === 'listo' && result && (
                    <div className="registro-card registro-success">
                        <div className="registro-success-confetti">🎉🚀✨</div>
                        <h2>¡Tu programa está listo!</h2>
                        <p>Ya puedes empezar a fidelizar clientes</p>

                        <div className="registro-success-info">
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
                                <span className="registro-success-label">Tu programa:</span>
                                <span className="registro-success-value">
                                    {result.program?.puntos_meta} puntos = {result.program?.descripcion_premio}
                                </span>
                            </div>
                        </div>

                        <div className="registro-success-next">
                            <h3>¿Qué sigue?</h3>
                            <ol>
                                <li>📱 Abre el link del QR en tu celular para probarlo</li>
                                <li>🖨️ Imprime el QR y pégalo en tu mostrador</li>
                                <li>📊 Entra a tu panel para ver las estadísticas</li>
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
