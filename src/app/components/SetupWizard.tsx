'use client'
/* eslint-disable @next/next/no-img-element */

import React, { useMemo, useState, type CSSProperties } from 'react'
import { Layout, Palette, Star, Award, Smartphone, CheckCircle2, ArrowRight, Check } from 'lucide-react'
import { PLAN_CATALOG, type BillingPlan, normalizeProgramChoices } from '@/lib/plans'
import { PROGRAM_TYPE_VALUES, type ProgramType } from '@/lib/programTypes'
import './setup-wizard.css'

interface SetupWizardProps {
  tenant: { nombre?: string | null; color_primario?: string | null; logo_url?: string | null; slug?: string } | null
  program: {
    tipo_programa?: string | null
    puntos_meta?: number | null
    descripcion_premio?: string | null
    tipo_premio?: string | null
    valor_premio?: string | null
    config?: Record<string, unknown> | null
  } | null
  selectedPlan: BillingPlan
  selectedProgramTypes: string[]
  onComplete: () => void
}

type WizardStep = 'welcome' | 'identity' | 'strategy' | 'reward' | 'preview' | 'finish'

const STEPS: { id: WizardStep; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'welcome', label: 'Bienvenida', icon: Layout },
  { id: 'identity', label: 'Identidad', icon: Palette },
  { id: 'strategy', label: 'Motores', icon: Star },
  { id: 'reward', label: 'Programa', icon: Award },
  { id: 'preview', label: 'Vista Previa', icon: Smartphone },
  { id: 'finish', label: 'Listo', icon: CheckCircle2 }
]

const STRATEGIES: { id: ProgramType; name: string; desc: string; icon: string }[] = [
  { id: 'sellos', name: 'Tarjeta de Sellos', desc: 'Clasico y efectivo. Por cada visita, un sello.', icon: '⭐' },
  { id: 'cashback', name: 'Cashback', desc: 'Devuelve un % de la compra para uso futuro.', icon: '💰' },
  { id: 'multipase', name: 'Multipase', desc: 'Packs de servicios prepagados.', icon: '🎟️' },
  { id: 'membresia', name: 'Membresia VIP', desc: 'Membresia mensual con beneficios exclusivos.', icon: '👑' },
  { id: 'descuento', name: 'Descuento por Niveles', desc: 'Mientras mas visitas, mayor descuento.', icon: '📊' },
  { id: 'cupon', name: 'Cupon de Descuento', desc: 'Cupon de un solo uso para promociones.', icon: '🎫' },
  { id: 'regalo', name: 'Gift Card', desc: 'Saldo precargado para regalar y consumir.', icon: '🎁' },
  { id: 'afiliacion', name: 'Afiliacion', desc: 'Registro y notificaciones sin puntos.', icon: '📱' }
]

function asNumber(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export default function SetupWizard({ tenant, program, selectedPlan, selectedProgramTypes, onComplete }: SetupWizardProps) {
  const [step, setStep] = useState<WizardStep>('welcome')
  const [loading, setLoading] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)

  const normalizedInitialTypes = useMemo(() => normalizeProgramChoices(selectedProgramTypes, selectedPlan), [selectedProgramTypes, selectedPlan])

  const [formData, setFormData] = useState(() => {
    const currentType = program?.tipo_programa && PROGRAM_TYPE_VALUES.includes(program.tipo_programa as ProgramType)
      ? (program.tipo_programa as ProgramType)
      : normalizedInitialTypes[0]
    return {
      nombre: tenant?.nombre || '',
      color: tenant?.color_primario || '#6366f1',
      logo_url: tenant?.logo_url || '',
      selectedTypes: normalizedInitialTypes,
      tipoPrograma: currentType,
      puntosMeta: asNumber(program?.puntos_meta, 10),
      descripcionPremio: program?.descripcion_premio || '',
      tipoPremio: program?.tipo_premio || 'descuento',
      valorPremio: program?.valor_premio || '',
      cashbackPorcentaje: asNumber(program?.config?.porcentaje, 5),
      cashbackTope: asNumber(program?.config?.tope_mensual, 10000),
      multipaseUsos: asNumber(program?.config?.cantidad_usos, 10),
      multipasePrecio: asNumber(program?.config?.precio_pack, 50000),
      membresiaPrecio: asNumber(program?.config?.precio_mensual, 15000),
      membresiaBeneficios: Array.isArray(program?.config?.beneficios) ? (program?.config?.beneficios as string[]).join(', ') : '10% descuento, Prioridad',
      descuentoNiveles: Array.isArray(program?.config?.niveles) ? (program?.config?.niveles as Array<{ visitas: number; descuento: number }>).map((n) => `${n.visitas}:${n.descuento}`).join(',') : '5:5,15:10,30:15',
      cuponDescuento: asNumber(program?.config?.descuento_porcentaje, 15),
      regaloValor: asNumber(program?.config?.valor_maximo, 25000)
    }
  })

  const currentStepIndex = STEPS.findIndex((s) => s.id === step)
  const walletCardStyle = { '--accent': formData.color } as CSSProperties & Record<'--accent', string>
  const maxChoices = PLAN_CATALOG[selectedPlan].limits.maxProgramChoices
  const selectedCount = formData.selectedTypes.length
  const selectedStrategyName = STRATEGIES.find((s) => s.id === formData.tipoPrograma)?.name || formData.tipoPrograma

  const buildProgramConfig = () => {
    switch (formData.tipoPrograma) {
      case 'cashback': return { porcentaje: formData.cashbackPorcentaje, tope_mensual: formData.cashbackTope }
      case 'multipase': return { cantidad_usos: formData.multipaseUsos, precio_pack: formData.multipasePrecio }
      case 'membresia': return { precio_mensual: formData.membresiaPrecio, beneficios: formData.membresiaBeneficios.split(',').map((x) => x.trim()).filter(Boolean) }
      case 'descuento':
        return {
          niveles: formData.descuentoNiveles.split(',').map((x) => x.trim()).filter(Boolean).map((x) => {
            const [visitas, descuento] = x.split(':')
            return { visitas: Number(visitas), descuento: Number(descuento) }
          })
        }
      case 'cupon': return { descuento_porcentaje: formData.cuponDescuento }
      case 'regalo': return { valor_maximo: formData.regaloValor }
      default: return {}
    }
  }

  const handleLogoUpload = async (file: File | null) => {
    if (!file) return
    setLogoUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload/logo', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'No se pudo subir el logo')
        return
      }
      setFormData((prev) => ({ ...prev, logo_url: data.logo_url }))
    } catch {
      alert('Error de red al subir el logo')
    } finally {
      setLogoUploading(false)
    }
  }

  const toggleStrategy = (strategyId: ProgramType) => {
    if (selectedPlan === 'full') {
      setFormData((prev) => ({ ...prev, selectedTypes: [...PROGRAM_TYPE_VALUES], tipoPrograma: strategyId }))
      return
    }
    setFormData((prev) => {
      const exists = prev.selectedTypes.includes(strategyId)
      const next = exists ? prev.selectedTypes.filter((item) => item !== strategyId) : [...prev.selectedTypes, strategyId]
      const normalized = normalizeProgramChoices(next, selectedPlan)
      const activeType = normalized.includes(prev.tipoPrograma) ? prev.tipoPrograma : normalized[0]
      return { ...prev, selectedTypes: normalized, tipoPrograma: activeType }
    })
  }

  const handleNext = () => {
    if (step === 'identity' && !formData.nombre.trim()) return alert('Ingresa el nombre del negocio.')
    if (step === 'strategy' && !formData.selectedTypes.length) return alert('Debes habilitar al menos un motor.')
    if (step === 'reward' && formData.tipoPrograma !== 'afiliacion' && !formData.descripcionPremio.trim()) return alert('Describe el premio para continuar.')
    const nextStep = STEPS[currentStepIndex + 1]?.id
    if (nextStep) setStep(nextStep)
  }

  const handleBack = () => {
    const prevStep = STEPS[currentStepIndex - 1]?.id
    if (prevStep) setStep(prevStep)
  }

  const finalizeOnboarding = async () => {
    if (!formData.nombre.trim()) return alert('Ingresa el nombre del negocio.')
    if (!tenant?.slug) return alert('No encontramos el identificador del negocio.')
    const normalizedTypes = normalizeProgramChoices(formData.selectedTypes, selectedPlan)
    const activeProgramType = normalizedTypes.includes(formData.tipoPrograma) ? formData.tipoPrograma : normalizedTypes[0]

    setLoading(true)
    try {
      const res = await fetch(`/api/tenant/${tenant.slug}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre,
          color_primario: formData.color,
          logo_url: formData.logo_url,
          selected_plan: selectedPlan,
          selected_program_types: normalizedTypes,
          program: {
            tipo_programa: activeProgramType,
            puntos_meta: formData.puntosMeta,
            descripcion_premio: formData.tipoPrograma === 'afiliacion' ? (formData.descripcionPremio || 'Programa de afiliacion y notificaciones') : formData.descripcionPremio,
            tipo_premio: formData.tipoPremio,
            valor_premio: formData.valorPremio,
            config: buildProgramConfig()
          },
          onboarding_completado: true
        })
      })
      const data = await res.json()
      if (res.ok) onComplete()
      else alert(`Error al activar: ${data.error || 'Hubo un problema de conexion.'}`)
    } catch {
      alert('Error de conexion con el servidor. Reintenta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sw-overlay">
      <div className="sw-container">
        <aside className="sw-sidebar">
          <div className="sw-logo">💎 Vuelve+</div>
          <nav className="sw-steps">
            {STEPS.map((s, i) => (
              <div key={s.id} className={`sw-step-item ${step === s.id ? 'active' : ''} ${i < currentStepIndex ? 'completed' : ''}`}>
                <div className="sw-step-icon">{i < currentStepIndex ? <Check size={16} /> : <s.icon size={18} />}</div>
                <span className="sw-step-label">{s.label}</span>
              </div>
            ))}
          </nav>
        </aside>

        <main className="sw-content">
          <div className="sw-plan-banner">
            <strong>Plan contratado: {PLAN_CATALOG[selectedPlan].label}</strong>
            <span>{selectedPlan === 'full' ? 'Tienes todos los motores habilitados.' : `Puedes habilitar hasta ${maxChoices} motores.`}</span>
          </div>

          {step === 'welcome' && <div className="sw-view animate-fade-in"><span className="sw-badge">Bienvenida guiada</span><h1>Hola, {formData.nombre || 'equipo'} 👋</h1><p className="sw-lead">Configura con calma dentro del panel. Solo veras lo que tu plan permite.</p><div className="sw-intro-grid"><div className="sw-intro-card"><Palette className="icon-blue" /><h3>Marca lista</h3><p>Logo y color para una experiencia profesional.</p></div><div className="sw-intro-card"><Award className="icon-purple" /><h3>Motores segun plan</h3><p>Configuras lo contratado, sin ruido.</p></div></div><button className="sw-btn-primary" onClick={handleNext}>Empezar configuracion <ArrowRight size={18} /></button></div>}

          {step === 'identity' && <div className="sw-view animate-slide-up"><h2>Identidad de tu negocio</h2><p>Define como te veran tus clientes dentro de su wallet.</p><div className="sw-form"><label><span>Nombre del negocio</span><input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} /></label><label><span>Color de marca</span><div className="sw-color-picker"><input type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} /><code>{formData.color}</code></div></label><div className="sw-logo-upload"><div className="sw-logo-preview" style={{ background: formData.color }}>{formData.logo_url ? <img src={formData.logo_url} alt="Logo" /> : (formData.nombre.charAt(0) || 'V')}</div><div className="sw-logo-info"><h3>Logo del negocio</h3><p>Sube una imagen (PNG/JPG/WEBP, maximo 3 MB).</p><label className="sw-upload-btn">{logoUploading ? 'Subiendo logo...' : 'Subir logo desde tu equipo'}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={logoUploading} onChange={(e) => handleLogoUpload(e.target.files?.[0] || null)} /></label><input type="text" placeholder="O pega una URL de logo (opcional)" value={formData.logo_url} onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })} /></div></div></div><div className="sw-footer"><button className="sw-btn-ghost" onClick={handleBack}>Atras</button><button className="sw-btn-primary" onClick={handleNext}>Continuar</button></div></div>}

          {step === 'strategy' && <div className="sw-view animate-slide-up"><h2>Motores de fidelizacion</h2><p>Elige motores habilitados segun tu plan y cual sera el inicial.</p><div className="sw-limit-row"><span className="sw-limit-chip">Seleccionados: {selectedCount}</span><span className="sw-limit-chip">Maximo: {selectedPlan === 'full' ? 'Todos' : maxChoices}</span></div><div className="sw-strategies">{STRATEGIES.map((strategy) => {const enabled = formData.selectedTypes.includes(strategy.id); const limitReached = selectedPlan !== 'full' && !enabled && selectedCount >= maxChoices; return <div key={strategy.id} className={`sw-strategy-card ${enabled ? 'active' : ''} ${limitReached ? 'disabled' : ''}`}><button type="button" className="sw-strategy-toggle" onClick={() => toggleStrategy(strategy.id)} disabled={limitReached}><span className="sw-strategy-icon">{strategy.icon}</span><div className="sw-strategy-text"><h3>{strategy.name}</h3><p>{strategy.desc}</p></div>{enabled ? <CheckCircle2 className="sw-check" /> : null}</button>{enabled && <label className="sw-radio-row"><input type="radio" name="active-program" checked={formData.tipoPrograma === strategy.id} onChange={() => setFormData({ ...formData, tipoPrograma: strategy.id })} /><span>Usar este como motor inicial</span></label>}</div>})}</div><div className="sw-footer"><button className="sw-btn-ghost" onClick={handleBack}>Atras</button><button className="sw-btn-primary" onClick={handleNext}>Continuar</button></div></div>}

          {step === 'reward' && <div className="sw-view animate-slide-up"><h2>Configurar motor inicial</h2><p>Ahora ajustamos el motor con el que arrancaras: <strong>{selectedStrategyName}</strong>.</p><div className="sw-form"><label><span>Meta (puntos/sellos)</span><input type="number" min={1} value={formData.puntosMeta} onChange={(e) => setFormData({ ...formData, puntosMeta: Number(e.target.value) || 1 })} /></label><label><span>Descripcion del premio</span><textarea value={formData.descripcionPremio} onChange={(e) => setFormData({ ...formData, descripcionPremio: e.target.value })} placeholder="Ej: Un cafe gratis, 20% de descuento, etc." /></label>{formData.tipoPrograma === 'cashback' && <div className="sw-inline-fields"><label><span>% Cashback</span><input type="number" min={1} max={100} value={formData.cashbackPorcentaje} onChange={(e) => setFormData({ ...formData, cashbackPorcentaje: Number(e.target.value) || 1 })} /></label><label><span>Tope mensual</span><input type="number" min={0} value={formData.cashbackTope} onChange={(e) => setFormData({ ...formData, cashbackTope: Number(e.target.value) || 0 })} /></label></div>}{formData.tipoPrograma === 'multipase' && <div className="sw-inline-fields"><label><span>Cantidad de usos</span><input type="number" min={1} value={formData.multipaseUsos} onChange={(e) => setFormData({ ...formData, multipaseUsos: Number(e.target.value) || 1 })} /></label><label><span>Precio pack</span><input type="number" min={0} value={formData.multipasePrecio} onChange={(e) => setFormData({ ...formData, multipasePrecio: Number(e.target.value) || 0 })} /></label></div>}{formData.tipoPrograma === 'membresia' && <div className="sw-inline-fields"><label><span>Precio mensual</span><input type="number" min={0} value={formData.membresiaPrecio} onChange={(e) => setFormData({ ...formData, membresiaPrecio: Number(e.target.value) || 0 })} /></label><label><span>Beneficios (separados por coma)</span><input type="text" value={formData.membresiaBeneficios} onChange={(e) => setFormData({ ...formData, membresiaBeneficios: e.target.value })} /></label></div>}{formData.tipoPrograma === 'descuento' && <label><span>Niveles (formato visitas:descuento)</span><input type="text" value={formData.descuentoNiveles} onChange={(e) => setFormData({ ...formData, descuentoNiveles: e.target.value })} placeholder="5:5,15:10,30:15" /></label>}{formData.tipoPrograma === 'cupon' && <label><span>% del cupon</span><input type="number" min={1} max={100} value={formData.cuponDescuento} onChange={(e) => setFormData({ ...formData, cuponDescuento: Number(e.target.value) || 1 })} /></label>}{formData.tipoPrograma === 'regalo' && <label><span>Valor maximo gift card</span><input type="number" min={0} value={formData.regaloValor} onChange={(e) => setFormData({ ...formData, regaloValor: Number(e.target.value) || 0 })} /></label>}</div><div className="sw-footer"><button className="sw-btn-ghost" onClick={handleBack}>Atras</button><button className="sw-btn-primary" onClick={handleNext}>Ver vista previa</button></div></div>}

          {step === 'preview' && <div className="sw-view animate-slide-up"><h2>Vista previa</h2><p>Asi se vera tu programa inicial. Luego podras editarlo cuando quieras.</p><div className="sw-preview-container"><div className="sw-phone-mock"><div className="sw-wallet-card" style={walletCardStyle}><div className="sw-wallet-header"><div className="sw-wallet-logo">{formData.logo_url ? <img src={formData.logo_url} alt="" /> : (formData.nombre.charAt(0) || 'V')}</div><span>{formData.nombre}</span><Smartphone size={14} /></div><div className="sw-wallet-body"><div className="sw-wallet-progress"><div className="sw-wallet-dots">{[...Array(6)].map((_, i) => <div key={i} className={`sw-dot ${i < 3 ? 'full' : ''}`} />)}</div><p>3 / {formData.puntosMeta} progresos</p></div><div className="sw-wallet-award"><Award size={32} /><p>{formData.descripcionPremio || 'Tu premio aqui'}</p></div></div></div></div><div className="sw-preview-info"><div className="sw-info-item"><Star className="icon-blue" /><div><h4>Motores habilitados</h4><p>{formData.selectedTypes.map((id) => STRATEGIES.find((s) => s.id === id)?.name || id).join(' · ')}</p></div></div><div className="sw-info-item"><Smartphone className="icon-purple" /><div><h4>Motor inicial</h4><p>{selectedStrategyName}</p></div></div></div></div><div className="sw-footer"><button className="sw-btn-ghost" onClick={handleBack}>Atras</button><button className="sw-btn-primary" onClick={handleNext}>Todo se ve bien</button></div></div>}

          {step === 'finish' && <div className="sw-view animate-fade-in sw-finish"><div className="sw-success-icon">🚀</div><h2>Configuracion lista</h2><p>Vas a entrar al panel con tu plan y motores ya ajustados segun lo contratado.</p><div className="sw-summary"><div className="sw-summary-item"><span>Negocio</span><strong>{formData.nombre}</strong></div><div className="sw-summary-item"><span>Plan</span><strong>{PLAN_CATALOG[selectedPlan].label}</strong></div><div className="sw-summary-item"><span>Motores</span><strong>{formData.selectedTypes.length}</strong></div><div className="sw-summary-item"><span>Motor inicial</span><strong>{selectedStrategyName}</strong></div></div><button className="sw-btn-primary sw-btn-finish" onClick={finalizeOnboarding} disabled={loading}>{loading ? 'Guardando configuracion...' : 'Entrar al panel completo'}</button></div>}
        </main>
      </div>
    </div>
  )
}
