'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Camera, Search, CheckCircle, XCircle, LogOut } from 'lucide-react'
import './cajero.css'

interface StaffSession {
    id: string
    nombre: string
    rol: string
}

interface TenantInfo {
    id: string
    nombre: string
    slug: string
}

interface CustomerLookupCard {
    customer: {
        id: string
        nombre: string
        whatsapp: string
        puntos_actuales: number
        total_puntos_historicos: number
    }
    programa: {
        tipo_programa: string
        descripcion_premio: string
        puntos_meta: number
    } | null
    membership: {
        saldo_cashback?: number
        usos_restantes?: number
    } | null
}

function normalizeWhatsapp(value: string): string {
    return value.replace(/[^\d+]/g, '')
}

export default function CajeroPage() {
    const params = useParams()
    const slug = params.slug as string

    const [session, setSession] = useState<StaffSession | null>(null)
    const [tenant, setTenant] = useState<TenantInfo | null>(null)
    const [pin, setPin] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // App State
    const [activeMode, setActiveMode] = useState<'scan' | 'search'>('scan')
    const [scanWhatsapp, setScanWhatsapp] = useState('')
    const [lookupPhone, setLookupPhone] = useState('')
    const [purchaseAmount, setPurchaseAmount] = useState('')
    const [lookupLoading, setLookupLoading] = useState(false)
    const [submittingStamp, setSubmittingStamp] = useState(false)
    const [foundCard, setFoundCard] = useState<CustomerLookupCard | null>(null)

    // Transaction State
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

    useEffect(() => {
        // Recuperar sesión persistente si existe
        const saved = localStorage.getItem(`staff_session_${slug}`)
        if (!saved) return
        try {
            const data = JSON.parse(saved)
            setSession(data.staff)
            setTenant(data.tenant)
        } catch {
            localStorage.removeItem(`staff_session_${slug}`)
        }
    }, [slug])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (pin.length < 4) return

        setLoading(true)
        setError('')
        try {
            const res = await fetch('/api/staff/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, pin })
            })
            const data = await res.json()
            if (res.ok) {
                setSession(data.staff)
                setTenant(data.tenant)
                localStorage.setItem(`staff_session_${slug}`, JSON.stringify(data))
            } else {
                setError(data.error || 'Error al entrar')
            }
        } catch {
            setError('Error de conexión')
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem(`staff_session_${slug}`)
        setSession(null)
        setTenant(null)
    }

    async function findCustomerByWhatsapp(rawWhatsapp: string) {
        const normalized = normalizeWhatsapp(rawWhatsapp)
        if (!normalized) {
            setError('Ingresa un WhatsApp válido')
            return null
        }

        setLookupLoading(true)
        setError('')
        try {
            const res = await fetch(`/api/customer/status?whatsapp=${encodeURIComponent(normalized)}&tenant_slug=${encodeURIComponent(slug)}`)
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'No se pudo buscar el cliente')
                setFoundCard(null)
                return null
            }

            const card = (data.tarjetas && data.tarjetas[0]) ? data.tarjetas[0] as CustomerLookupCard : null
            if (!card) {
                setError('No encontramos cliente con ese número en este negocio')
                setFoundCard(null)
                return null
            }

            setFoundCard(card)
            setPurchaseAmount('')
            return { card, normalizedWhatsapp: normalized }
        } catch {
            setError('Error de conexión al buscar cliente')
            setFoundCard(null)
            return null
        } finally {
            setLookupLoading(false)
        }
    }

    async function submitStamp(rawWhatsapp: string) {
        if (!tenant) return
        const normalizedWhatsapp = normalizeWhatsapp(rawWhatsapp)
        if (!normalizedWhatsapp) {
            setResult({ success: false, message: 'Ingresa un WhatsApp válido' })
            return
        }

        const tipoPrograma = foundCard?.programa?.tipo_programa || ''
        const amount = Number(purchaseAmount)
        const needsAmount = tipoPrograma === 'cashback' || tipoPrograma === 'regalo'

        if (needsAmount && (!Number.isFinite(amount) || amount <= 0)) {
            setResult({ success: false, message: 'Debes ingresar el monto de la compra para este tipo de programa' })
            return
        }

        setSubmittingStamp(true)
        setError('')
        try {
            const payload: Record<string, unknown> = {
                tenant_id: tenant.id,
                whatsapp: normalizedWhatsapp
            }
            if (needsAmount) payload.monto_compra = amount

            const res = await fetch('/api/stamp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            const data = await res.json()

            setResult({
                success: res.ok,
                message: data.message || data.error || (res.ok ? 'Operación completada' : 'No se pudo registrar')
            })
        } catch {
            setResult({ success: false, message: 'Error de conexión al registrar' })
        } finally {
            setSubmittingStamp(false)
        }
    }

    async function handleSearchModeSubmit(e: React.FormEvent) {
        e.preventDefault()
        setResult(null)
        await findCustomerByWhatsapp(lookupPhone)
    }

    async function handleScanModeSubmit(e: React.FormEvent) {
        e.preventDefault()
        setResult(null)
        const lookup = await findCustomerByWhatsapp(scanWhatsapp)
        if (lookup) {
            await submitStamp(lookup.normalizedWhatsapp)
            setScanWhatsapp('')
        }
    }

    if (!session || !tenant) {
        return (
            <div className="cajero-login-container">
                <div className="cajero-login-card">
                    <div className="cajero-logo">Vuelve+</div>
                    <h1>Acceso Personal</h1>
                    <p>{slug.toUpperCase()}</p>

                    <form onSubmit={handleLogin}>
                        <div className="pin-input-group">
                            <input
                                type="password"
                                maxLength={4}
                                placeholder="PIN de 4 dígitos"
                                value={pin}
                                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                                autoFocus
                            />
                        </div>
                        {error && <p className="login-error">{error}</p>}
                        <button type="submit" disabled={loading || pin.length < 4}>
                            {loading ? '⌛ Entrando...' : 'Entrar'}
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="cajero-layout">
            <header className="cajero-header">
                <div className="cajero-header-info">
                    <span className="tenant-name">{tenant.nombre}</span>
                    <span className="staff-name">👤 {session.nombre}</span>
                </div>
                <button onClick={handleLogout} className="logout-btn"><LogOut size={18} /></button>
            </header>

            <main className="cajero-content">
                <div className="mode-selector">
                    <button
                        className={activeMode === 'scan' ? 'active' : ''}
                        onClick={() => {
                            setActiveMode('scan')
                            setError('')
                            setResult(null)
                        }}
                    >
                        <Camera size={20} /> Escáner
                    </button>
                    <button
                        className={activeMode === 'search' ? 'active' : ''}
                        onClick={() => {
                            setActiveMode('search')
                            setError('')
                            setResult(null)
                        }}
                    >
                        <Search size={20} /> Buscar
                    </button>
                </div>

                {activeMode === 'scan' ? (
                    <div className="scan-section">
                        <form onSubmit={handleScanModeSubmit} className="search-bar">
                            <input
                                type="text"
                                placeholder="WhatsApp cliente (+569...)"
                                value={scanWhatsapp}
                                onChange={e => setScanWhatsapp(e.target.value)}
                            />
                            <button type="submit" disabled={lookupLoading || submittingStamp}>
                                {lookupLoading || submittingStamp ? 'Procesando...' : 'Registrar visita'}
                            </button>
                        </form>
                        <p style={{ opacity: 0.7, marginTop: '0.75rem' }}>
                            Si usas lector QR en caja, pega aquí el dato del cliente y se registrará la visita.
                        </p>
                    </div>
                ) : (
                    <div className="search-section">
                        <form onSubmit={handleSearchModeSubmit} className="search-bar">
                            <input
                                type="text"
                                placeholder="WhatsApp cliente (+569...)"
                                value={lookupPhone}
                                onChange={e => {
                                    setLookupPhone(e.target.value)
                                }}
                            />
                            <button type="submit" disabled={lookupLoading}>
                                {lookupLoading ? 'Buscando...' : 'Buscar'}
                            </button>
                        </form>

                        {foundCard && (
                            <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px' }}>
                                <h3 style={{ marginBottom: '0.5rem' }}>{foundCard.customer.nombre}</h3>
                                <p>Puntos actuales: {foundCard.customer.puntos_actuales}</p>
                                <p>Visitas históricas: {foundCard.customer.total_puntos_historicos}</p>
                                <p>Programa: {foundCard.programa?.tipo_programa || 'sellos'}</p>

                                {(foundCard.programa?.tipo_programa === 'cashback' || foundCard.programa?.tipo_programa === 'regalo') && (
                                    <div style={{ marginTop: '0.75rem' }}>
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={purchaseAmount}
                                            onChange={e => setPurchaseAmount(e.target.value)}
                                            placeholder="Monto compra"
                                            style={{ width: '100%', padding: '0.8rem', borderRadius: '10px' }}
                                        />
                                    </div>
                                )}

                                <button
                                    style={{ marginTop: '0.75rem', width: '100%' }}
                                    onClick={() => submitStamp(foundCard.customer.whatsapp)}
                                    disabled={submittingStamp}
                                >
                                    {submittingStamp ? 'Registrando...' : 'Registrar ahora'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {result && (
                    <div className={`result-overlay ${result.success ? 'success' : 'error'}`}>
                        {result.success ? <CheckCircle size={64} /> : <XCircle size={64} />}
                        <h2>{result.message}</h2>
                        <button onClick={() => setResult(null)}>Continuar</button>
                    </div>
                )}
            </main>
        </div>
    )
}
