'use client'

import React, { useState } from 'react'
import {
    Layout,
    Palette,
    Star,
    Award,
    Smartphone,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Upload,
    Check
} from 'lucide-react'
import './setup-wizard.css'

interface SetupWizardProps {
    tenant: any
    program: any
    onComplete: () => void
}

type WizardStep = 'welcome' | 'identity' | 'strategy' | 'reward' | 'preview' | 'finish'

const STEPS: { id: WizardStep; label: string; icon: any }[] = [
    { id: 'welcome', label: 'Bienvenida', icon: Layout },
    { id: 'identity', label: 'Identidad', icon: Palette },
    { id: 'strategy', label: 'Estrategia', icon: Star },
    { id: 'reward', label: 'Premio', icon: Award },
    { id: 'preview', label: 'Vista Previa', icon: Smartphone },
    { id: 'finish', label: '¡Listo!', icon: CheckCircle2 }
]

const STRATEGIES = [
    { id: 'sellos', name: 'Tarjeta de Sellos', desc: 'Clásico y efectivo. Por cada visita, un sello.', icon: '⭐' },
    { id: 'cashback', name: 'Cashback', desc: 'Devuelve un % de la compra para uso futuro.', icon: '💰' },
    { id: 'multipase', name: 'Multipase', desc: 'Packs de servicios prepagados.', icon: '🎟️' }
]

export default function SetupWizard({ tenant, program, onComplete }: SetupWizardProps) {
    const [step, setStep] = useState<WizardStep>('welcome')
    const [loading, setLoading] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        nombre: tenant?.nombre || '',
        color: tenant?.color_primario || '#6366f1',
        tipoPrograma: program?.tipo_programa || 'sellos',
        puntosMeta: program?.puntos_meta || 10,
        descripcionPremio: program?.descripcion_premio || '',
        logo_url: tenant?.logo_url || ''
    })

    const currentStepIndex = STEPS.findIndex(s => s.id === step)

    const handleNext = () => {
        const nextStep = STEPS[currentStepIndex + 1]?.id
        if (nextStep) setStep(nextStep)
    }

    const handleBack = () => {
        const prevStep = STEPS[currentStepIndex - 1]?.id
        if (prevStep) setStep(prevStep)
    }

    const finalizeOnboarding = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/tenant/${tenant.slug}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    program: {
                        tipo_programa: formData.tipoPrograma,
                        puntos_meta: formData.puntosMeta,
                        descripcion_premio: formData.descripcionPremio
                    },
                    onboarding_completado: true
                })
            })

            if (res.ok) {
                onComplete()
            } else {
                alert('Hubo un error al guardar tu configuración.')
            }
        } catch (error) {
            console.error('Error finalizing onboarding:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="sw-overlay">
            <div className="sw-container">
                {/* Lateral: Progreso */}
                <aside className="sw-sidebar">
                    <div className="sw-logo">💎 Vuelve+</div>
                    <nav className="sw-steps">
                        {STEPS.map((s, i) => (
                            <div
                                key={s.id}
                                className={`sw-step-item ${step === s.id ? 'active' : ''} ${i < currentStepIndex ? 'completed' : ''}`}
                            >
                                <div className="sw-step-icon">
                                    {i < currentStepIndex ? <Check size={16} /> : <s.icon size={18} />}
                                </div>
                                <span className="sw-step-label">{s.label}</span>
                            </div>
                        ))}
                    </nav>
                </aside>

                {/* Principal: Contenido */}
                <main className="sw-content">
                    {step === 'welcome' && (
                        <div className="sw-view animate-fade-in">
                            <span className="sw-badge">¡Bienvenido!</span>
                            <h1>Hola, {formData.nombre} 👋</h1>
                            <p className="sw-lead">
                                Estamos muy felices de tenerte en **Vuelve+**. Vamos a dejar tu programa
                                configurado de forma profesional en menos de 2 minutos.
                            </p>
                            <div className="sw-intro-grid">
                                <div className="sw-intro-card">
                                    <Palette className="icon-blue" />
                                    <h3>Personaliza tu marca</h3>
                                    <p>Tu logo y colores se verán directo en la Google Wallet de tus clientes.</p>
                                </div>
                                <div className="sw-intro-card">
                                    <Award className="icon-purple" />
                                    <h3>Define tus premios</h3>
                                    <p>Configura metas claras para que tus clientes vuelvan felices.</p>
                                </div>
                            </div>
                            <button className="sw-btn-primary" onClick={handleNext}>
                                Empezar Configuración <ArrowRight size={18} />
                            </button>
                        </div>
                    )}

                    {step === 'identity' && (
                        <div className="sw-view animate-slide-up">
                            <h2>Identidad de tu Negocio</h2>
                            <p>¿Cómo verán tus clientes tu negocio en su celular?</p>

                            <div className="sw-form">
                                <label>
                                    <span>Nombre del Negocio</span>
                                    <input
                                        type="text"
                                        value={formData.nombre}
                                        onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    />
                                </label>

                                <label>
                                    <span>Color de Marca</span>
                                    <div className="sw-color-picker">
                                        <input
                                            type="color"
                                            value={formData.color}
                                            onChange={e => setFormData({ ...formData, color: e.target.value })}
                                        />
                                        <code>{formData.color}</code>
                                    </div>
                                </label>

                                <div className="sw-logo-upload">
                                    <div className="sw-logo-preview" style={{ background: formData.color }}>
                                        {formData.logo_url ? <img src={formData.logo_url} alt="Logo" /> : formData.nombre.charAt(0)}
                                    </div>
                                    <div className="sw-logo-info">
                                        <h3>Logo del Negocio</h3>
                                        <p>Recomendamos fondo transparente (PNG), cuadrado, 500x500px.</p>
                                        <input
                                            type="text"
                                            placeholder="URL de tu logo (opcional por ahora)"
                                            value={formData.logo_url}
                                            onChange={e => setFormData({ ...formData, logo_url: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="sw-footer">
                                <button className="sw-btn-ghost" onClick={handleBack}>Atrás</button>
                                <button className="sw-btn-primary" onClick={handleNext}>Continuar</button>
                            </div>
                        </div>
                    )}

                    {step === 'strategy' && (
                        <div className="sw-view animate-slide-up">
                            <h2>Tu Estrategia de Lealtad</h2>
                            <p>¿Qué método usarás para motivar a tus clientes?</p>

                            <div className="sw-strategies">
                                {STRATEGIES.map(s => (
                                    <button
                                        key={s.id}
                                        className={`sw-strategy-card ${formData.tipoPrograma === s.id ? 'active' : ''}`}
                                        onClick={() => setFormData({ ...formData, tipoPrograma: s.id })}
                                    >
                                        <span className="sw-strategy-icon">{s.icon}</span>
                                        <div className="sw-strategy-text">
                                            <h3>{s.name}</h3>
                                            <p>{s.desc}</p>
                                        </div>
                                        {formData.tipoPrograma === s.id && <CheckCircle2 className="sw-check" />}
                                    </button>
                                ))}
                            </div>

                            <div className="sw-footer">
                                <button className="sw-btn-ghost" onClick={handleBack}>Atrás</button>
                                <button className="sw-btn-primary" onClick={handleNext}>Continuar</button>
                            </div>
                        </div>
                    )}

                    {step === 'reward' && (
                        <div className="sw-view animate-slide-up">
                            <h2>Configurar la Recompensa</h2>
                            <p>¿Qué ganan tus clientes al completar el objetivo?</p>

                            <div className="sw-form">
                                <label>
                                    <span>Meta (Símbolos/Sellos/Puntos)</span>
                                    <input
                                        type="number"
                                        value={formData.puntosMeta}
                                        onChange={e => setFormData({ ...formData, puntosMeta: parseInt(e.target.value) })}
                                    />
                                    <p className="sw-field-hint">Ej: 10 sellos para obtener el premio.</p>
                                </label>

                                <label>
                                    <span>Descripción del Premio</span>
                                    <textarea
                                        value={formData.descripcionPremio}
                                        onChange={e => setFormData({ ...formData, descripcionPremio: e.target.value })}
                                        placeholder="Ej: Un café gratis de cualquier tamaño o 20% de descuento en tu próxima compra."
                                    />
                                </label>
                            </div>

                            <div className="sw-footer">
                                <button className="sw-btn-ghost" onClick={handleBack}>Atrás</button>
                                <button className="sw-btn-primary" onClick={handleNext}>Ver Vista Previa</button>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="sw-view animate-slide-up">
                            <h2>Vista Previa del Cliente</h2>
                            <p>Así es como se verá tu programa en la Google Wallet de tus clientes.</p>

                            <div className="sw-preview-container">
                                <div className="sw-phone-mock">
                                    <div className="sw-wallet-card" style={{ '--accent': formData.color } as any}>
                                        <div className="sw-wallet-header">
                                            <div className="sw-wallet-logo">
                                                {formData.logo_url ? <img src={formData.logo_url} alt="" /> : formData.nombre.charAt(0)}
                                            </div>
                                            <span>{formData.nombre}</span>
                                            <Smartphone size={14} />
                                        </div>
                                        <div className="sw-wallet-body">
                                            <div className="sw-wallet-progress">
                                                <div className="sw-wallet-dots">
                                                    {[...Array(6)].map((_, i) => (
                                                        <div key={i} className={`sw-dot ${i < 3 ? 'full' : ''}`} />
                                                    ))}
                                                </div>
                                                <p>3 / {formData.puntosMeta} sellos</p>
                                            </div>
                                            <div className="sw-wallet-award">
                                                <Award size={32} />
                                                <p>{formData.descripcionPremio || 'Tu premio aquí'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="sw-preview-info">
                                    <div className="sw-info-item">
                                        <Smartphone className="icon-blue" />
                                        <div>
                                            <h4>Notificaciones Push</h4>
                                            <p>Al estar en la Wallet, podrás enviar mensajes gratis a tus clientes.</p>
                                        </div>
                                    </div>
                                    <div className="sw-info-item">
                                        <Palette className="icon-purple" />
                                        <div>
                                            <h4>Diseño Coherente</h4>
                                            <p>Todo el sistema se adaptará a tu color de marca: {formData.color}.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="sw-footer">
                                <button className="sw-btn-ghost" onClick={handleBack}>Atrás</button>
                                <button className="sw-btn-primary" onClick={handleNext}>Todo se ve bien</button>
                            </div>
                        </div>
                    )}

                    {step === 'finish' && (
                        <div className="sw-view animate-fade-in sw-finish">
                            <div className="sw-success-icon">🚀</div>
                            <h2>¡Todo listo para brillar!</h2>
                            <p>
                                Has completado la configuración inicial. Al hacer clic en el botón de abajo,
                                se activará tu panel de control y tu QR oficial.
                            </p>

                            <div className="sw-summary">
                                <div className="sw-summary-item">
                                    <span>Negocio</span>
                                    <strong>{formData.nombre}</strong>
                                </div>
                                <div className="sw-summary-item">
                                    <span>Estrategia</span>
                                    <strong>{STRATEGIES.find(s => s.id === formData.tipoPrograma)?.name}</strong>
                                </div>
                                <div className="sw-summary-item">
                                    <span>Premio</span>
                                    <strong>{formData.descripcionPremio}</strong>
                                </div>
                            </div>

                            <button
                                className="sw-btn-primary sw-btn-finish"
                                onClick={finalizeOnboarding}
                                disabled={loading}
                            >
                                {loading ? '⌛ Activando...' : 'Activar mi Negocio Ahora'}
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}
