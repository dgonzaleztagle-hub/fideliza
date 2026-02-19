'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Camera, Search, User, CheckCircle, XCircle, LogOut } from 'lucide-react'
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
    const [searchQuery, setSearchQuery] = useState('')
    const [foundCustomers, setFoundCustomers] = useState<any[]>([])
    const [searching, setSearching] = useState(false)

    // Transaction State
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

    useEffect(() => {
        // Recuperar sesión persistente si existe
        const saved = localStorage.getItem(`staff_session_${slug}`)
        if (saved) {
            const data = JSON.parse(saved)
            setSession(data.staff)
            setTenant(data.tenant)
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
                        onClick={() => setActiveMode('scan')}
                    >
                        <Camera size={20} /> Escáner
                    </button>
                    <button
                        className={activeMode === 'search' ? 'active' : ''}
                        onClick={() => setActiveMode('search')}
                    >
                        <Search size={20} /> Buscar
                    </button>
                </div>

                {activeMode === 'scan' ? (
                    <div className="scan-section">
                        <div className="scanner-mock">
                            {/* Aquí IRÁ el componente Scanner real en el siguiente paso */}
                            <div className="scanner-placeholder">
                                <LucideCamera size={48} />
                                <p>Escanea el código del cliente</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="search-section">
                        <div className="search-bar">
                            <input
                                type="text"
                                placeholder="Nombre o WhatsApp..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {/* Resultados de búsqueda... */}
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
