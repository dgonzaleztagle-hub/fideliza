'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import AyudaPanel from './AyudaPanel'
import StatusAlert from '@/components/cliente/StatusAlert'
import { generateAdvisorInsights, Insight } from '@/lib/advisor'
import './cliente.css'
import './ayuda.css'
import SetupWizard from '@/app/components/SetupWizard'

interface TenantData {
    id: string
    nombre: string
    rubro: string
    direccion: string | null
    logo_url: string | null
    color_primario: string
    slug: string
    qr_code: string
    estado: string
    plan: string
    trial_hasta: string
    telefono: string | null
    lat: number | null
    lng: number | null
    mensaje_geofencing: string | null
    google_business_url: string | null
    validation_pin: string | null
    flow_subscription_id?: string | null
    last_payment_date?: string | null
    next_billing_date?: string | null
    onboarding_completado?: boolean
}

interface ProgramData {
    puntos_meta: number
    descripcion_premio: string
    tipo_premio: string
    valor_premio: string | null
    tipo_programa: string
    config: Record<string, any>
}

interface CustomerData {
    id: string
    nombre: string
    whatsapp: string
    email: string | null
    puntos_actuales: number
    referido_por?: string | null
    total_puntos_historicos: number
    total_premios_canjeados: number
    tier?: string
    current_streak?: number
    preferences?: Record<string, any>
    last_visit_at?: string
    created_at: string
}

interface Stats {
    totalClientes: number
    totalPuntosDados: number
    totalPremiosCanjeados: number
    clientesHoy: number
    tasaRetencion: number
    ticketPromedio: number
    totalReferidos: number
}

interface AnalyticsData {
    resumen: {
        totalClientes: number
        clientesNuevosSemana: number
        visitasHoy: number
        totalPuntosDados: number
        totalPremiosCanjeados: number
        premiosPendientes: number
        tasaRetencion: number
        promedioPuntosPorCliente: number
        crecimientoMensual: number
    }
    chartData: {
        stampsPorDia: { fecha: string; visitas: number }[]
    }
    topClientes: CustomerData[]
}

type Tab = 'dashboard' | 'clientes' | 'configuracion' | 'qr' | 'analytics' | 'notificaciones' | 'ayuda' | 'personal'

export default function ClientePanel() {
    const [tab, setTab] = useState<Tab>('dashboard')
    const [loading, setLoading] = useState(false)
    const [tenantSlug, setTenantSlug] = useState('')
    const [needsSlug, setNeedsSlug] = useState(true)
    const [myTenants, setMyTenants] = useState<TenantData[]>([])
    const [loadingTenants, setLoadingTenants] = useState(false)

    const [tenant, setTenant] = useState<TenantData | null>(null)
    const [program, setProgram] = useState<ProgramData | null>(null)
    const [customers, setCustomers] = useState<CustomerData[]>([])
    const [stats, setStats] = useState<Stats>({
        totalClientes: 0,
        totalPuntosDados: 0,
        totalPremiosCanjeados: 0,
        clientesHoy: 0,
        tasaRetencion: 0,
        ticketPromedio: 0,
        totalReferidos: 0
    })

    // Search
    const [searchQuery, setSearchQuery] = useState('')

    // Canje de premio
    const [redemptionCode, setRedemptionCode] = useState('')
    const [redemptionResult, setRedemptionResult] = useState<any>(null)
    const [redeeming, setRedeeming] = useState(false)

    // Config editable
    const [editingConfig, setEditingConfig] = useState(false)
    const [configForm, setConfigForm] = useState({
        nombre: '',
        rubro: '',
        direccion: '',
        color_primario: '',
        mensaje_geofencing: '',
        lat: '',
        lng: '',
        puntos_meta: 10,
        descripcion_premio: '',
        tipo_premio: 'descuento',
        valor_premio: '',
        google_business_url: '',
        validation_pin: '',
        marketing_welcome: '',
        marketing_birthday: '',
        marketing_winback: '',
        marketing_review: ''
    })
    const [saving, setSaving] = useState(false)
    const [saveMessage, setSaveMessage] = useState('')
    const [detectingLocation, setDetectingLocation] = useState(false)

    // Scanner
    const [scannerActive, setScannerActive] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)
    const streamRef = useRef<MediaStream | null>(null)

    // Mobile sidebar
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    // Analytics
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
    const [loadingAnalytics, setLoadingAnalytics] = useState(false)

    // Notificaciones
    const [notifTitulo, setNotifTitulo] = useState('')
    const [notifMensaje, setNotifMensaje] = useState('')
    const [notifSegmento, setNotifSegmento] = useState('todos')
    const [insights, setInsights] = useState<Insight[]>([])
    const [sendingNotif, setSendingNotif] = useState(false)
    const [notifResult, setNotifResult] = useState<any>(null)
    const [notifHistorial, setNotifHistorial] = useState<any[]>([])

    // Campañas Programadas
    const [campanasProgramadas, setCampanasProgramadas] = useState<any[]>([])
    const [nuevaCampana, setNuevaCampana] = useState({
        nombre: '',
        fecha_envio: '',
        titulo_notif: '',
        mensaje_notif: '',
        segmento: 'todos'
    })
    const [guardandoCampana, setGuardandoCampana] = useState(false)

    // Membresía
    const [activatingMembership, setActivatingMembership] = useState<string | null>(null)
    const [membershipStatus, setMembershipStatus] = useState<Record<string, boolean>>({})

    // Scanner Pro (Búsqueda manual + PIN)
    const [manualSearch, setManualSearch] = useState('')
    const [foundCustomers, setFoundCustomers] = useState<CustomerData[]>([])
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null)
    const [pinInput, setPinInput] = useState('')
    const [subscribing, setSubscribing] = useState(false)
    const [staffList, setStaffList] = useState<any[]>([])
    const [loadingStaff, setLoadingStaff] = useState(false)
    const [newStaffName, setNewStaffName] = useState('')
    const [newStaffPin, setNewStaffPin] = useState('')
    const [exporting, setExporting] = useState(false)

    async function handleExportCSV() {
        if (!tenant) return
        setExporting(true)
        try {
            window.location.href = `/api/tenant/export-customers?tenant_id=${tenant.id}`
        } catch (err) {
            console.error('Error exportando:', err)
            alert('Error al exportar la base de datos')
        } finally {
            setTimeout(() => setExporting(false), 2000)
        }
    }

    async function loadMembershipStatuses() {
        if (!tenant || !customers.length) return
        const statuses: Record<string, boolean> = {}
        await Promise.all(customers.map(async (c) => {
            try {
                const res = await fetch(`/api/membership?tenant_id=${tenant.id}&whatsapp=${encodeURIComponent(c.whatsapp)}`)
                const data = await res.json()
                statuses[c.id] = data.total > 0
            } catch {
                statuses[c.id] = false
            }
        }))
        setMembershipStatus(statuses)
    }

    async function handleToggleMembership(customer: CustomerData) {
        if (!tenant) return
        const hasVIP = membershipStatus[customer.id]

        if (hasVIP) {
            const ok = confirm(`¿Desactivar la membresía VIP de ${customer.nombre}?`)
            if (!ok) return
        }

        setActivatingMembership(customer.id)
        try {
            const res = await fetch('/api/membership', {
                method: hasVIP ? 'DELETE' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant_id: tenant.id,
                    whatsapp: customer.whatsapp
                })
            })
            const data = await res.json()
            if (res.ok) {
                alert(`${hasVIP ? '❌' : '✅'} ${data.message}`)
                setMembershipStatus(prev => ({ ...prev, [customer.id]: !hasVIP }))
            } else if (res.status === 409) {
                alert('⚠️ Este cliente ya tiene una membresía activa')
                setMembershipStatus(prev => ({ ...prev, [customer.id]: true }))
            } else {
                alert(`❌ ${data.error || 'Error'}`)
            }
        } catch {
            alert('❌ Error de conexión')
        } finally {
            setActivatingMembership(null)
        }
    }

    async function loadTenantData(slug: string) {
        setLoading(true)
        try {
            const res = await fetch(`/api/tenant/${slug}`)
            if (!res.ok) throw new Error('No encontrado')
            const data = await res.json()
            setTenant(data.tenant)
            setProgram(data.program)
            setCustomers(data.customers || [])
            const newStats = {
                totalClientes: data.customers?.length || 0,
                totalPuntosDados: data.customers?.reduce((sum: number, c: CustomerData) => sum + c.total_puntos_historicos, 0) || 0,
                totalPremiosCanjeados: data.customers?.reduce((sum: number, c: CustomerData) => sum + c.total_premios_canjeados, 0) || 0,
                clientesHoy: 0,
                tasaRetencion: data.customers?.length ? Math.round((data.customers.filter((c: any) => c.total_puntos_historicos > 1).length / data.customers.length) * 100) : 0,
                ticketPromedio: 0,
                totalReferidos: data.customers?.filter((c: any) => c.referido_por).length || 0
            }
            setStats(newStats)
            setInsights(generateAdvisorInsights(newStats, data.customers || []))
            setNeedsSlug(false)
            setConfigForm({
                nombre: data.tenant.nombre || '',
                rubro: data.tenant.rubro || '',
                direccion: data.tenant.direccion || '',
                color_primario: data.tenant.color_primario || '#ff6b6b',
                mensaje_geofencing: data.tenant.mensaje_geofencing || '',
                lat: data.tenant.lat?.toString() || '',
                lng: data.tenant.lng?.toString() || '',
                puntos_meta: data.program?.puntos_meta || 10,
                descripcion_premio: data.program?.descripcion_premio || '',
                tipo_premio: data.program?.tipo_premio || 'descuento',
                valor_premio: data.program?.valor_premio || '',
                google_business_url: data.tenant.google_business_url || '',
                validation_pin: data.tenant.validation_pin || '',
                marketing_welcome: data.program?.config?.marketing?.welcome_msg || '',
                marketing_birthday: data.program?.config?.marketing?.birthday_msg || '',
                marketing_winback: data.program?.config?.marketing?.winback_msg || '',
                marketing_review: data.program?.config?.marketing?.review_msg || ''
            })
        } catch {
            alert('No se encontró el negocio. Verifica el slug.')
        } finally {
            setLoading(false)
        }
    }

    async function loadAnalytics() {
        if (!tenant) return
        setLoadingAnalytics(true)
        try {
            const res = await fetch(`/api/analytics/${tenant.slug}`)
            if (res.ok) {
                const data = await res.json()
                setAnalytics(data)
            }
        } catch (err) {
            console.error('Error cargando analytics:', err)
        } finally {
            setLoadingAnalytics(false)
        }
    }

    async function loadNotifHistorial() {
        if (!tenant) return
        try {
            const res = await fetch(`/api/notifications/send?tenant_id=${tenant.id}`)
            if (res.ok) {
                const data = await res.json()
                setNotifHistorial(data.notifications || [])
            }
        } catch (err) {
            console.error('Error cargando historial:', err)
        }
    }

    async function loadCampanasProgramadas() {
        if (!tenant) return
        try {
            const res = await fetch(`/api/notifications/scheduled?tenant_id=${tenant.id}`)
            if (res.ok) {
                const data = await res.json()
                setCampanasProgramadas(data.campaigns || [])
            }
        } catch (err) {
            console.error('Error cargando campañas:', err)
        }
    }

    async function handleSaveScheduledCampaign() {
        if (!tenant || !nuevaCampana.nombre || !nuevaCampana.fecha_envio || !nuevaCampana.titulo_notif || !nuevaCampana.mensaje_notif) {
            alert('Por favor completa todos los campos de la campaña')
            return
        }
        setGuardandoCampana(true)
        try {
            const res = await fetch('/api/notifications/scheduled', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant_id: tenant.id,
                    ...nuevaCampana
                })
            })
            if (res.ok) {
                setNuevaCampana({
                    nombre: '',
                    fecha_envio: '',
                    titulo_notif: '',
                    mensaje_notif: '',
                    segmento: 'todos'
                })
                loadCampanasProgramadas()
                alert('✅ Campaña programada con éxito')
            } else {
                const data = await res.json()
                alert(`❌ Error: ${data.error}`)
            }
        } catch (err) {
            alert('❌ Error de conexión al guardar campaña')
        } finally {
            setGuardandoCampana(false)
        }
    }

    async function handleDeleteScheduledCampaign(id: string) {
        if (!confirm('¿Seguro que quieres eliminar esta campaña programada?')) return
        try {
            const res = await fetch(`/api/notifications/scheduled?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                loadCampanasProgramadas()
            }
        } catch (err) {
            alert('❌ Error al eliminar')
        }
    }

    async function handleRedeem(code?: string) {
        const codeToRedeem = code || redemptionCode
        if (!codeToRedeem || !tenant) return
        setRedeeming(true)
        setRedemptionResult(null)
        try {
            const res = await fetch('/api/reward/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    qr_code: codeToRedeem.toUpperCase(),
                    tenant_id: tenant.id
                })
            })
            const data = await res.json()
            setRedemptionResult(data)
            if (data.valid) {
                loadTenantData(tenant.slug)
            }
        } catch {
            setRedemptionResult({ message: 'Error al validar', valid: false })
        } finally {
            setRedeeming(false)
        }
    }

    async function handleUpgrade() {
        if (!tenant) return
        setSubscribing(true)
        try {
            const res = await fetch('/api/payments/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: tenant.id })
            })
            const data = await res.json()
            if (data.url) {
                window.location.href = data.url
            } else {
                alert(`❌ Error: ${data.error || 'No se pudo iniciar la suscripción'}`)
            }
        } catch {
            alert('❌ Error de conexión con la pasarela de pagos')
        } finally {
            setSubscribing(false)
        }
    }

    async function handleSaveConfig() {
        if (!tenant) return
        setSaving(true)
        setSaveMessage('')
        try {
            const res = await fetch(`/api/tenant/${tenant.slug}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: configForm.nombre,
                    rubro: configForm.rubro,
                    direccion: configForm.direccion,
                    color_primario: configForm.color_primario,
                    mensaje_geofencing: configForm.mensaje_geofencing,
                    lat: configForm.lat ? Number(configForm.lat) : null,
                    lng: configForm.lng ? Number(configForm.lng) : null,
                    google_business_url: configForm.google_business_url,
                    validation_pin: configForm.validation_pin,
                    program: {
                        puntos_meta: Number(configForm.puntos_meta),
                        descripcion_premio: configForm.descripcion_premio,
                        tipo_premio: configForm.tipo_premio,
                        valor_premio: configForm.valor_premio,
                        config: {
                            ...(program?.config || {}),
                            marketing: {
                                welcome_msg: configForm.marketing_welcome,
                                birthday_msg: configForm.marketing_birthday,
                                winback_msg: configForm.marketing_winback,
                                review_msg: configForm.marketing_review
                            }
                        }
                    }
                })
            })
            const data = await res.json()
            if (res.ok) {
                setSaveMessage('✅ Guardado correctamente')
                setEditingConfig(false)
                loadTenantData(tenant.slug)
            } else {
                setSaveMessage(`❌ ${data.error}`)
            }
        } catch {
            setSaveMessage('❌ Error al guardar')
        } finally {
            setSaving(false)
            setTimeout(() => setSaveMessage(''), 3000)
        }
    }

    async function handleSendNotification() {
        if (!tenant || !notifTitulo || !notifMensaje) return
        setSendingNotif(true)
        setNotifResult(null)
        try {
            const res = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant_id: tenant.id,
                    titulo: notifTitulo,
                    mensaje: notifMensaje,
                    segmento: notifSegmento
                })
            })
            const data = await res.json()
            setNotifResult(data)
            if (res.ok) {
                setNotifTitulo('')
                setNotifMensaje('')
                loadNotifHistorial()
            }
        } catch {
            setNotifResult({ message: 'Error al enviar', enviadas: 0 })
        } finally {
            setSendingNotif(false)
        }
    }

    // Scanner
    const startScanner = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.play()
            }
            setScannerActive(true)
        } catch {
            alert('No se pudo acceder a la cámara. Verifica los permisos.')
        }
    }, [])

    const loadStaff = async () => {
        if (!tenant) return
        setLoadingStaff(true)
        try {
            const res = await fetch(`/api/staff?tenant_id=${tenant.id}`)
            if (res.ok) {
                const data = await res.json()
                setStaffList(data.staff || [])
            }
        } catch (err) {
            console.error('Error loading staff:', err)
        } finally {
            setLoadingStaff(false)
        }
    }

    const handleAddStaff = async () => {
        if (!tenant || !newStaffName || !newStaffPin) return
        try {
            const res = await fetch('/api/staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant_id: tenant.id,
                    nombre: newStaffName,
                    pin: newStaffPin,
                    rol: 'cajero'
                })
            })
            if (res.ok) {
                setNewStaffName('')
                setNewStaffPin('')
                loadStaff()
            }
        } catch (err) {
            console.error('Error adding staff:', err)
        }
    }

    const stopScanner = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
        setScannerActive(false)
    }, [])

    useEffect(() => {
        async function fetchMyTenants() {
            setLoadingTenants(true)
            try {
                const res = await fetch('/api/my-tenants')
                if (res.ok) {
                    const data = await res.json()
                    setMyTenants(data.tenants || [])
                    // Si solo hay uno, cargarlo automáticamente
                    if (data.tenants?.length === 1) {
                        loadTenantData(data.tenants[0].slug)
                    } else if (data.tenants?.length > 1) {
                        setNeedsSlug(false) // No necesitamos el form del slug, mostraremos el selector
                    }
                }
            } catch (err) {
                console.error('Error fetching my-tenants:', err)
            } finally {
                setLoadingTenants(false)
            }
        }
        fetchMyTenants()

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
            }
        }
    }, [])

    // Load analytics when tab changes
    useEffect(() => {
        if (tab === 'analytics' && tenant && !analytics) {
            loadAnalytics()
        }
        if (tab === 'notificaciones' && tenant) {
            loadNotifHistorial()
            loadCampanasProgramadas()
        }
        if (tab === 'clientes' && tenant && customers.length > 0 && program && ['membresia', 'multipase'].includes(program.tipo_programa)) {
            loadMembershipStatuses()
        }
    }, [tab, tenant])

    // Filtered customers
    const filteredCustomers = customers.filter(c => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return c.nombre.toLowerCase().includes(q) ||
            c.whatsapp.includes(q) ||
            (c.email && c.email.toLowerCase().includes(q))
    })

    const topClientes = [...customers].sort((a, b) => b.total_puntos_historicos - a.total_puntos_historicos).slice(0, 5)

    const clientesNuevos = customers.filter(c => {
        const daysSince = (Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24)
        return daysSince <= 7
    })

    const handleManualSearch = (query: string) => {
        setManualSearch(query)
        if (!query) {
            setFoundCustomers([])
            return
        }
        const lowerQuery = query.toLowerCase()
        const results = customers.filter(c =>
            c.whatsapp.includes(lowerQuery) ||
            (c.email && c.email.toLowerCase().includes(lowerQuery)) ||
            c.nombre.toLowerCase().includes(lowerQuery)
        )
        setFoundCustomers(results)
    }

    const detectarUbicacion = () => {
        if (!navigator.geolocation) {
            alert('Tu navegador no soporta geolocalización')
            return
        }
        setDetectingLocation(true)
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setConfigForm(prev => ({
                    ...prev,
                    lat: pos.coords.latitude.toString(),
                    lng: pos.coords.longitude.toString()
                }))
                setDetectingLocation(false)
            },
            (err) => {
                console.error('Error geolocalización:', err)
                alert('No se pudo obtener la ubicación. Asegúrate de dar permisos de GPS en tu navegador.')
                setDetectingLocation(false)
            },
            { enableHighAccuracy: true }
        )
    }

    if (loadingTenants) {
        return (
            <div className="cliente-page">
                <div className="cliente-login">
                    <div className="animate-spin">⌛</div>
                    <p>Detectando tus negocios...</p>
                </div>
            </div>
        )
    }

    if (needsSlug && myTenants.length === 0) {
        return (
            <div className="cliente-page">
                <div className="cliente-login">
                    <div className="cliente-login-icon">💎</div>
                    <h1>Panel de Negocio</h1>
                    <p>Ingresa el nombre de tu negocio para acceder</p>
                    <form onSubmit={(e) => { e.preventDefault(); loadTenantData(tenantSlug) }}>
                        <div className="cliente-login-field">
                            <input
                                type="text"
                                value={tenantSlug}
                                onChange={(e) => setTenantSlug(e.target.value)}
                                placeholder="Ej: Pizzeria El Benni"
                                autoFocus
                            />
                        </div>
                        <button type="submit" className="cliente-login-btn" disabled={!tenantSlug || loading}>
                            {loading ? '⏳ Cargando...' : 'Entrar →'}
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    if (!tenant && myTenants.length > 1) {
        return (
            <div className="cliente-page">
                <div className="cliente-login multi-selector">
                    <div className="cliente-login-icon">🏢</div>
                    <h1>Selecciona tu Local</h1>
                    <p>Tienes {myTenants.length} negocios registrados</p>
                    <div className="tenants-grid">
                        {myTenants.map(t => (
                            <button
                                key={t.id}
                                className="tenant-select-card"
                                onClick={() => loadTenantData(t.slug)}
                                style={{ '--brand-color': t.color_primario } as any}
                            >
                                <div className="tenant-logo-mini" style={{ background: t.color_primario }}>
                                    {t.nombre.charAt(0).toUpperCase()}
                                </div>
                                <span>{t.nombre}</span>
                            </button>
                        ))}
                    </div>
                    <button className="add-new-tenant-btn" onClick={() => setMyTenants([])}>
                        + Registrar otro negocio
                    </button>
                </div>
                <style jsx>{`
                    .tenants-grid {
                        display: grid;
                        grid-template-columns: 1fr;
                        gap: 1rem;
                        width: 100%;
                        max-width: 400px;
                        margin: 2rem 0;
                    }
                    .tenant-select-card {
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        padding: 1.25rem;
                        border-radius: 16px;
                        display: flex;
                        align-items: center;
                        gap: 1rem;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        text-align: left;
                        color: white;
                    }
                    .tenant-select-card:hover {
                        background: rgba(255, 255, 255, 0.1);
                        border-color: var(--brand-color);
                        transform: translateY(-2px);
                    }
                    .tenant-logo-mini {
                        width: 40px;
                        height: 40px;
                        border-radius: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 1.2rem;
                    }
                    .add-new-tenant-btn {
                        background: none;
                        border: none;
                        color: #94a3b8;
                        font-size: 0.9rem;
                        cursor: pointer;
                    }
                    .add-new-tenant-btn:hover {
                        color: white;
                    }
                `}</style>
            </div>
        )
    }

    if (!tenant) return null

    const trialDaysLeft = tenant.trial_hasta
        ? Math.max(0, Math.ceil((new Date(tenant.trial_hasta).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0

    const isVencido = tenant.plan === 'trial' && trialDaysLeft <= 0
    const isPausado = tenant.estado === 'pausado'
    const isRestricted = isVencido || isPausado

    // Template para la vista bloqueada
    const BlockedView = () => (
        <div className="cliente-blocked">
            <div className="cliente-blocked-card">
                <div className="cliente-blocked-icon">🔒</div>
                <h2>Servicio Restringido</h2>
                <p>
                    {isPausado
                        ? 'Tu cuenta ha sido pausada temporalmente por el administrador.'
                        : 'Tu periodo de prueba de 14 días ha finalizado.'}
                </p>
                <div className="cliente-blocked-info">
                    Para activar tu cuenta y seguir fidelizando a tus clientes, solicita tu plan <strong>Vuelve+ Pro ($29.990/mes)</strong>.
                </div>
                <a
                    href="https://wa.me/56972739105?text=hola%20necesito%20pagar%20la%20suscripcion%20de%20vuelve%2B"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cliente-blocked-btn"
                >
                    💬 Contactar por WhatsApp
                </a>
            </div>

            <style jsx>{`
                .cliente-blocked {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 70vh;
                    padding: 2rem;
                }
                .cliente-blocked-card {
                    background: var(--bg-card, rgba(255, 255, 255, 0.05));
                    border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
                    padding: 3rem 2rem;
                    border-radius: 24px;
                    max-width: 450px;
                    text-align: center;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                }
                .cliente-blocked-icon {
                    font-size: 3.5rem;
                    margin-bottom: 1rem;
                }
                .cliente-blocked-card h2 {
                    font-family: 'Outfit', sans-serif;
                    font-size: 1.75rem;
                    margin-bottom: 1rem;
                }
                .cliente-blocked-info {
                    background: rgba(59, 130, 246, 0.1);
                    border: 1px solid rgba(59, 130, 246, 0.2);
                    padding: 1rem;
                    border-radius: 12px;
                    font-size: 0.95rem;
                    margin: 1.5rem 0;
                    color: #93c5fd;
                }
                .cliente-blocked-btn {
                    display: inline-block;
                    width: 100%;
                    padding: 1rem;
                    background: #25d366;
                    color: white;
                    text-decoration: none;
                    border-radius: 12px;
                    font-weight: 700;
                    transition: transform 0.2s;
                }
                .cliente-blocked-btn:hover {
                    transform: translateY(-2px);
                    background: #128c7e;
                }
            `}</style>
        </div>
    )

    return (
        <div className="cliente-page">
            {tenant && !tenant.onboarding_completado && (
                <SetupWizard
                    tenant={tenant}
                    program={program}
                    onComplete={() => loadTenantData(tenant.slug)}
                />
            )}
            {/* Sidebar */}
            <aside className={`cliente-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
                <div className="cliente-sidebar-header">
                    <div className="cliente-sidebar-logo" style={{ background: tenant.color_primario }}>
                        {tenant.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="cliente-sidebar-name">{tenant.nombre}</h3>
                        <span className="cliente-sidebar-plan">
                            {tenant.plan === 'trial' ? `Trial · ${trialDaysLeft} días` : 'Plan Activo'}
                        </span>
                    </div>
                </div>

                <nav className="cliente-sidebar-nav">
                    {([
                        { key: 'dashboard' as Tab, icon: '📊', label: 'Dashboard' },
                        { key: 'clientes' as Tab, icon: '👥', label: 'Clientes', hidden: isRestricted },
                        { key: 'qr' as Tab, icon: '🎫', label: 'QR y Canje', hidden: isRestricted },
                        { key: 'analytics' as Tab, icon: '📈', label: 'Analytics', hidden: isRestricted },
                        { key: 'notificaciones' as Tab, icon: '📢', label: 'Notificaciones', hidden: isRestricted },
                        { key: 'personal' as Tab, icon: '👥', label: 'Personal', hidden: isRestricted },
                        { key: 'configuracion' as Tab, icon: '⚙️', label: 'Configuración', hidden: isRestricted },
                        { key: 'ayuda' as Tab, icon: '❓', label: 'Ayuda' },
                    ]).map((item) => (
                        <button
                            key={item.key}
                            className={`cliente-nav-btn ${tab === item.key ? 'active' : ''} ${item.hidden ? 'nav-disabled' : ''}`}
                            onClick={() => {
                                if (item.hidden) return
                                setTab(item.key)
                                setMobileMenuOpen(false)
                                if (item.key === 'personal') loadStaff()
                            }}
                            title={item.hidden ? 'Ocupas pago para acceder' : ''}
                        >
                            <span>{item.icon}</span> {item.label}
                        </button>
                    ))}
                </nav>

                <div className="cliente-sidebar-footer">
                    <button className="cliente-refresh-btn" onClick={() => loadTenantData(tenant.slug)} disabled={loading}>
                        🔄 {loading ? 'Actualizando...' : 'Refrescar datos'}
                    </button>
                </div>
            </aside>

            <button className="cliente-mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                ☰
            </button>

            <main className="cliente-main">
                {/* ═══════ DASHBOARD ═══════ */}
                {tab === 'dashboard' && (
                    <div className="cliente-content">
                        <div className="cliente-content-header">
                            <div>
                                <h1>Dashboard</h1>
                                <p className="cliente-content-subtitle">Resumen de tu programa de fidelización</p>
                            </div>
                        </div>

                        {isRestricted ? <BlockedView /> : (
                            <>
                                <StatusAlert tenant={tenant} />

                                {/* 🧠 AI ADVISOR SECTION */}
                                <div className="cliente-advisor-container">
                                    <div className="advisor-header">
                                        <span className="advisor-icon">🧠</span>
                                        <h3>Vuelve+ Advisor</h3>
                                        <span className="advisor-badge">CONSEJOS DE IA</span>
                                    </div>
                                    <div className="advisor-insights">
                                        {insights.map((insight, idx) => (
                                            <div key={idx} className={`insight-card ${insight.type}`}>
                                                <div className="insight-title">
                                                    {insight.type === 'alert' && '⚠️ '}
                                                    {insight.type === 'opportunity' && '💡 '}
                                                    {insight.type === 'success' && '✨ '}
                                                    {insight.type === 'info' && 'ℹ️ '}
                                                    {insight.title}
                                                </div>
                                                <p className="insight-message">{insight.message}</p>
                                                {insight.action && (
                                                    <div className="insight-action">
                                                        <strong>Sugerencia:</strong> {insight.action}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="cliente-stats-grid">
                                    <div className="cliente-stat-card stat-coral">
                                        <span className="cliente-stat-icon">👥</span>
                                        <span className="cliente-stat-number">{stats.totalClientes}</span>
                                        <span className="cliente-stat-label">Clientes registrados</span>
                                    </div>
                                    <div className="cliente-stat-card stat-blue">
                                        <span className="cliente-stat-icon">⭐</span>
                                        <span className="cliente-stat-number">{stats.totalPuntosDados}</span>
                                        <span className="cliente-stat-label">Puntos dados</span>
                                    </div>
                                    <div className="cliente-stat-card stat-green">
                                        <span className="cliente-stat-icon">🎁</span>
                                        <span className="cliente-stat-number">{stats.totalPremiosCanjeados}</span>
                                        <span className="cliente-stat-label">Premios canjeados</span>
                                    </div>
                                    <div className="cliente-stat-card stat-orange">
                                        <span className="cliente-stat-icon">📅</span>
                                        <span className="cliente-stat-number">{stats.clientesHoy}</span>
                                        <span className="cliente-stat-label">Visitas hoy</span>
                                    </div>
                                    <div className="cliente-stat-card stat-purple">
                                        <span className="cliente-stat-icon">🔄</span>
                                        <span className="cliente-stat-number">{stats.tasaRetencion}%</span>
                                        <span className="cliente-stat-label">Tasa de retención</span>
                                    </div>
                                    <div className="cliente-stat-card stat-pink">
                                        <span className="cliente-stat-icon">📣</span>
                                        <span className="cliente-stat-number">{stats.totalReferidos}</span>
                                        <span className="cliente-stat-label">Amigos referidos</span>
                                    </div>
                                </div>

                                {program && (
                                    <div className="cliente-program-summary">
                                        <h3>Tu programa activo</h3>
                                        <div className="cliente-program-detail">
                                            <span>🎯 {program.puntos_meta} puntos = {program.descripcion_premio}</span>
                                            {program.tipo_programa && program.tipo_programa !== 'sellos' && (
                                                <span className="cliente-program-type-badge">
                                                    {program.tipo_programa === 'cashback' && '💰 Cashback'}
                                                    {program.tipo_programa === 'membresia' && '👑 Membresía VIP'}
                                                    {program.tipo_programa === 'multipase' && '🎟️ Multipase'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {topClientes.length > 0 && (
                                    <div className="cliente-section-card">
                                        <h3>🏆 Top Clientes Más Leales</h3>
                                        <div className="cliente-top-list">
                                            {topClientes.map((c, i) => (
                                                <div key={c.id} className="cliente-top-item">
                                                    <span className="cliente-top-rank">#{i + 1}</span>
                                                    <span className="cliente-top-name">{c.nombre}</span>
                                                    <span className="cliente-top-points">{c.total_puntos_historicos} pts</span>
                                                    <span className="cliente-top-rewards">{c.total_premios_canjeados} 🎁</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {clientesNuevos.length > 0 && (
                                    <div className="cliente-section-card">
                                        <h3>🆕 Nuevos esta semana</h3>
                                        <div className="cliente-new-list">
                                            {clientesNuevos.map(c => (
                                                <span key={c.id} className="cliente-new-badge">{c.nombre}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* ═══════ CLIENTES ═══════ */}
                {tab === 'clientes' && !isRestricted && (
                    <div className="cliente-content">
                        <div className="cliente-content-header">
                            <div>
                                <h1>Clientes</h1>
                                <p className="cliente-content-subtitle">{customers.length} clientes registrados</p>
                            </div>
                            <button
                                className="cliente-export-btn"
                                onClick={handleExportCSV}
                                disabled={exporting}
                                title="Descargar toda tu base de datos en CSV"
                            >
                                {exporting ? '⏳ Generando...' : '📥 Exportar Base de Datos'}
                            </button>
                        </div>

                        <StatusAlert tenant={tenant} />

                        <div className="cliente-searchbar">
                            <span className="cliente-search-icon">🔍</span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar por nombre, WhatsApp o email..."
                                className="cliente-search-input"
                            />
                            {searchQuery && (
                                <button className="cliente-search-clear" onClick={() => setSearchQuery('')}>✕</button>
                            )}
                        </div>

                        {filteredCustomers.length === 0 ? (
                            <div className="cliente-empty">
                                <span>👥</span>
                                <p>{searchQuery ? 'No se encontraron resultados' : 'Aún no tienes clientes registrados'}</p>
                                <p className="cliente-empty-hint">
                                    {searchQuery ? 'Intenta con otro término' : 'Comparte tu QR para que empiecen a sumarse'}
                                </p>
                            </div>
                        ) : (
                            <div className="cliente-table-wrap">
                                <table className="cliente-table">
                                    <thead>
                                        <tr>
                                            <th>Cliente</th>
                                            <th>Rango</th>
                                            <th>Racha</th>
                                            <th>WhatsApp</th>
                                            <th>Puntos</th>
                                            <th>Premios</th>
                                            <th>Origen</th>
                                            <th>Preferencias</th>
                                            {program && ['membresia', 'multipase'].includes(program.tipo_programa) && (
                                                <th>Acciones</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCustomers.map((c) => (
                                            <tr key={c.id}>
                                                <td className="cliente-table-name">
                                                    <div className="cliente-table-avatar" style={{ background: tenant.color_primario }}>
                                                        {c.nombre.charAt(0).toUpperCase()}
                                                    </div>
                                                    {c.nombre}
                                                </td>
                                                <td>
                                                    <span className={`badge-tier-small ${c.tier || 'bronce'}`}>
                                                        {c.tier === 'oro' ? '🥇' : c.tier === 'plata' ? '🥈' : '🥉'} {c.tier?.toUpperCase() || 'BRONCE'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {c.current_streak && c.current_streak > 1 ? (
                                                        <span className="badge-streak-small">🔥 {c.current_streak}</span>
                                                    ) : (
                                                        <span style={{ opacity: 0.3 }}>-</span>
                                                    )}
                                                </td>
                                                <td>{c.whatsapp}</td>
                                                <td>
                                                    <span className="cliente-table-points">
                                                        {c.puntos_actuales}/{program?.puntos_meta || '?'}
                                                    </span>
                                                </td>
                                                <td>{c.total_premios_canjeados}</td>
                                                <td>
                                                    {c.referido_por ? (
                                                        <span className="badge-referral" title={`Referido por ID: ${c.referido_por}`}>
                                                            📣 Referido
                                                        </span>
                                                    ) : (
                                                        <span className="cliente-table-date" style={{ opacity: 0.5 }}>Orgánico</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {c.preferences && Object.keys(c.preferences).length > 0 ? (
                                                        <button
                                                            className="cliente-btn-prefs"
                                                            onClick={() => alert(`Gustos de ${c.nombre}:\n${Object.entries(c.preferences || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`)}
                                                            title="Ver preferencias"
                                                        >
                                                            🎯 Ver Gustos
                                                        </button>
                                                    ) : (
                                                        <span style={{ opacity: 0.3 }}>Sin datos</span>
                                                    )}
                                                </td>
                                                {program && ['membresia', 'multipase'].includes(program.tipo_programa) && (
                                                    <td>
                                                        <button
                                                            className={membershipStatus[c.id] ? 'cliente-btn-deactivate' : 'cliente-btn-activate'}
                                                            onClick={() => handleToggleMembership(c)}
                                                            disabled={activatingMembership === c.id}
                                                        >
                                                            {activatingMembership === c.id ? '⏳ ...' : membershipStatus[c.id] ? '❌ Desactivar' : '👑 Activar VIP'}
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══════ QR Y CANJE ═══════ */}
                {
                    tab === 'qr' && !isRestricted && (
                        <div className="cliente-content">
                            <h1>QR y Canje de Premios</h1>
                            <p className="cliente-content-subtitle">Tu QR y validación de premios</p>

                            <StatusAlert tenant={tenant} />

                            <div className="cliente-qr-section">
                                <div className="cliente-qr-card">
                                    <h3>📱 Tu QR para el local</h3>
                                    <p>Imprime este QR y pégalo en tu mostrador</p>
                                    <div className="cliente-qr-visual">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${window.location.origin}/qr/${tenant.slug}`)}&bgcolor=0a0a0f&color=ffffff&format=png`}
                                            alt="QR de tu negocio"
                                            className="cliente-qr-image"
                                        />
                                        <p className="cliente-qr-slug-label">{tenant.nombre}</p>
                                        <p className="cliente-qr-subtext">Escanea para sumar puntos</p>
                                    </div>
                                    <div className="cliente-qr-link">
                                        <code>{`${window.location.origin}/qr/${tenant.slug}`}</code>
                                    </div>
                                    <div className="cliente-qr-actions">
                                        <a
                                            href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`${window.location.origin}/qr/${tenant.slug}`)}&format=png`}
                                            download={`qr-${tenant.slug}.png`}
                                            className="cliente-qr-download"
                                        >
                                            ⬇️ Descargar QR
                                        </a>
                                        <a
                                            href={`/qr/${tenant.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="cliente-qr-open"
                                        >
                                            👁️ Ver página del cliente
                                        </a>
                                    </div>
                                </div>

                                <div className="cliente-redeem-card">
                                    <h3>🎁 Validar premio</h3>
                                    <p>Ingresa el código, busca al cliente o usa el escáner</p>

                                    <div className="cliente-manual-search-section">
                                        <div className="cliente-redeem-input">
                                            <input
                                                type="text"
                                                value={manualSearch}
                                                onChange={(e) => handleManualSearch(e.target.value)}
                                                placeholder="🔍 Buscar cliente por WhatsApp o nombre..."
                                            />
                                        </div>
                                        {foundCustomers.length > 0 && (
                                            <div className="cliente-manual-results">
                                                {foundCustomers.map(c => (
                                                    <button
                                                        key={c.id}
                                                        className={`cliente-manual-result-item ${selectedCustomer?.id === c.id ? 'selected' : ''}`}
                                                        onClick={() => setSelectedCustomer(c)}
                                                    >
                                                        <div className="cliente-manual-result-info">
                                                            <strong>{c.nombre}</strong>
                                                            <span>{c.whatsapp}</span>
                                                        </div>
                                                        <span className="cliente-manual-result-points">{c.puntos_actuales} pts</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {selectedCustomer && (
                                            <div className="cliente-manual-selected">
                                                <div className="cliente-manual-selected-header">
                                                    <span>Seleccionado: <strong>{selectedCustomer.nombre}</strong></span>
                                                    <button onClick={() => { setSelectedCustomer(null); setManualSearch(''); setFoundCustomers([]); }}>✕</button>
                                                </div>
                                                <div className="cliente-manual-actions">
                                                    <button className="cliente-btn-add-p" onClick={() => handleRedeem(`EXTRA-${selectedCustomer.id}`)}>
                                                        ➕ Sumar punto rápido
                                                    </button>
                                                    <div className="cliente-pin-validation">
                                                        <input
                                                            type="password"
                                                            maxLength={4}
                                                            placeholder="PIN del local"
                                                            value={pinInput}
                                                            onChange={(e) => setPinInput(e.target.value)}
                                                        />
                                                        <button
                                                            className="cliente-btn-pin"
                                                            disabled={pinInput.length !== 4}
                                                            onClick={() => {
                                                                if (pinInput === tenant?.validation_pin) {
                                                                    handleRedeem(`PIN-${selectedCustomer.id}`)
                                                                    setPinInput('')
                                                                } else {
                                                                    alert('❌ PIN Incorrecto')
                                                                }
                                                            }}
                                                        >
                                                            Validar con PIN
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="cliente-scanner-section">
                                        {!scannerActive ? (
                                            <button className="cliente-scanner-btn" onClick={startScanner}>
                                                📷 Abrir escáner de cámara
                                            </button>
                                        ) : (
                                            <div className="cliente-scanner-container">
                                                <video ref={videoRef} className="cliente-scanner-video" playsInline muted />
                                                <div className="cliente-scanner-overlay">
                                                    <div className="cliente-scanner-frame" />
                                                </div>
                                                <button className="cliente-scanner-close" onClick={stopScanner}>
                                                    ✕ Cerrar cámara
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="cliente-redeem-divider">
                                        <span>o ingresa el código manual</span>
                                    </div>

                                    <div className="cliente-redeem-input">
                                        <input
                                            type="text"
                                            value={redemptionCode}
                                            onChange={(e) => setRedemptionCode(e.target.value)}
                                            placeholder="Ej: PREMIO-AB12CD34"
                                        />
                                        <button onClick={() => handleRedeem()} disabled={!redemptionCode || redeeming}>
                                            {redeeming ? '⏳' : '✅ Validar'}
                                        </button>
                                    </div>
                                    {redemptionResult && (
                                        <div className={`cliente-redeem-result ${redemptionResult.valid ? 'valid' : 'invalid'}`}>
                                            <span>{redemptionResult.valid ? '✅' : '❌'}</span>
                                            <span>{redemptionResult.message}</span>
                                            {redemptionResult.cliente && (
                                                <span className="cliente-redeem-client">
                                                    Cliente: {redemptionResult.cliente.nombre}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* ═══════ ANALYTICS ═══════ */}
                {
                    tab === 'analytics' && !isRestricted && (
                        <div className="cliente-content">
                            <div className="cliente-content-header">
                                <div>
                                    <h1>Analytics</h1>
                                    <p className="cliente-content-subtitle">Métricas avanzadas de tu programa</p>
                                </div>

                                <StatusAlert tenant={tenant} />
                                <button className="cliente-edit-btn" onClick={loadAnalytics} disabled={loadingAnalytics}>
                                    🔄 {loadingAnalytics ? 'Cargando...' : 'Actualizar'}
                                </button>
                            </div>

                            {loadingAnalytics && !analytics && (
                                <div className="cliente-empty">
                                    <span>⏳</span>
                                    <p>Cargando métricas...</p>
                                </div>
                            )}

                            {analytics && (
                                <>
                                    {/* KPIs principales */}
                                    <div className="cliente-stats-grid">
                                        <div className="cliente-stat-card stat-coral">
                                            <span className="cliente-stat-icon">🔄</span>
                                            <span className="cliente-stat-number">{analytics.resumen.tasaRetencion}%</span>
                                            <span className="cliente-stat-label">Tasa de retención</span>
                                        </div>
                                        <div className="cliente-stat-card stat-blue">
                                            <span className="cliente-stat-icon">📈</span>
                                            <span className="cliente-stat-number">
                                                {analytics.resumen.crecimientoMensual > 0 ? '+' : ''}{analytics.resumen.crecimientoMensual}%
                                            </span>
                                            <span className="cliente-stat-label">Crecimiento mensual</span>
                                        </div>
                                        <div className="cliente-stat-card stat-green">
                                            <span className="cliente-stat-icon">🆕</span>
                                            <span className="cliente-stat-number">{analytics.resumen.clientesNuevosSemana}</span>
                                            <span className="cliente-stat-label">Nuevos esta semana</span>
                                        </div>
                                        <div className="cliente-stat-card stat-orange">
                                            <span className="cliente-stat-icon">⏳</span>
                                            <span className="cliente-stat-number">{analytics.resumen.premiosPendientes}</span>
                                            <span className="cliente-stat-label">Premios pendientes</span>
                                        </div>
                                    </div>

                                    {/* Mini métricas */}
                                    <div className="cliente-section-card">
                                        <h3>📊 Resumen detallado</h3>
                                        <div className="cliente-analytics-detail-grid">
                                            <div className="cliente-analytics-detail">
                                                <span className="cliente-analytics-detail-label">Promedio puntos por cliente</span>
                                                <span className="cliente-analytics-detail-value">{analytics.resumen.promedioPuntosPorCliente}</span>
                                            </div>
                                            <div className="cliente-analytics-detail">
                                                <span className="cliente-analytics-detail-label">Total clientes</span>
                                                <span className="cliente-analytics-detail-value">{analytics.resumen.totalClientes}</span>
                                            </div>
                                            <div className="cliente-analytics-detail">
                                                <span className="cliente-analytics-detail-label">Visitas hoy</span>
                                                <span className="cliente-analytics-detail-value">{analytics.resumen.visitasHoy}</span>
                                            </div>
                                            <div className="cliente-analytics-detail">
                                                <span className="cliente-analytics-detail-label">Total premios canjeados</span>
                                                <span className="cliente-analytics-detail-value">{analytics.resumen.totalPremiosCanjeados}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chart - Visitas últimos 30 días */}
                                    {analytics.chartData.stampsPorDia.length > 0 && (
                                        <div className="cliente-section-card">
                                            <h3>📅 Visitas - Últimos 30 días</h3>
                                            <div className="cliente-chart-container">
                                                {(() => {
                                                    const data = analytics.chartData.stampsPorDia
                                                    const maxVisitas = Math.max(...data.map(d => d.visitas), 1)
                                                    return (
                                                        <div className="cliente-chart-bars">
                                                            {data.map((d) => (
                                                                <div key={d.fecha} className="cliente-chart-bar-wrapper" title={`${d.fecha}: ${d.visitas} visitas`}>
                                                                    <div
                                                                        className="cliente-chart-bar"
                                                                        style={{ height: `${(d.visitas / maxVisitas) * 100}%` }}
                                                                    />
                                                                    <span className="cliente-chart-bar-label">
                                                                        {new Date(d.fecha + 'T12:00:00').getDate()}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )
                                                })()}
                                            </div>
                                        </div>
                                    )}

                                    {/* Top 10 */}
                                    {analytics.topClientes.length > 0 && (
                                        <div className="cliente-section-card">
                                            <h3>🏆 Top 10 Clientes</h3>
                                            <div className="cliente-top-list">
                                                {analytics.topClientes.map((c, i) => (
                                                    <div key={c.id} className="cliente-top-item">
                                                        <span className="cliente-top-rank">#{i + 1}</span>
                                                        <span className="cliente-top-name">{c.nombre}</span>
                                                        <span className="cliente-top-points">{c.total_puntos_historicos} pts</span>
                                                        <span className="cliente-top-rewards">{c.total_premios_canjeados} 🎁</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )
                }

                {/* ═══════ NOTIFICACIONES ═══════ */}
                {
                    tab === 'notificaciones' && !isRestricted && (
                        <div className="cliente-content">
                            <h1>Notificaciones</h1>
                            <p className="cliente-content-subtitle">Envía mensajes a tus clientes por segmentos</p>

                            <div className="cliente-notif-section">
                                <div className="cliente-notif-compose">
                                    <h3>📨 Nueva notificación</h3>
                                    <div className="cliente-config-form">
                                        <label>
                                            <span>Título</span>
                                            <input
                                                type="text"
                                                value={notifTitulo}
                                                onChange={e => setNotifTitulo(e.target.value)}
                                                placeholder="Ej: ¡Promo especial hoy!"
                                            />
                                        </label>
                                        <label>
                                            <span>Mensaje</span>
                                            <textarea
                                                value={notifMensaje}
                                                onChange={e => setNotifMensaje(e.target.value)}
                                                placeholder="Ej: Hoy doble puntos por compras mayores a $10.000 🎉"
                                                rows={3}
                                            />
                                        </label>
                                        <label>
                                            <span>Enviar a</span>
                                            <select value={notifSegmento} onChange={e => setNotifSegmento(e.target.value)}>
                                                <option value="todos">👥 Todos los clientes</option>
                                                <option value="activos">🟢 Activos (últimos 30 días)</option>
                                                <option value="inactivos">💤 Inactivos (sin actividad)</option>
                                                <option value="cercanos_premio">🎯 Cerca del premio (faltan 1-2 puntos)</option>
                                            </select>
                                        </label>

                                        <button
                                            className="cliente-save-btn"
                                            onClick={handleSendNotification}
                                            disabled={sendingNotif || !notifTitulo || !notifMensaje}
                                            style={{ marginTop: '0.5rem' }}
                                        >
                                            {sendingNotif ? '⏳ Enviando...' : '📨 Enviar notificación'}
                                        </button>
                                    </div>

                                    {notifResult && (
                                        <div className={`cliente-toast ${notifResult.enviadas > 0 ? 'toast-ok' : 'toast-err'}`} style={{ marginTop: '1rem' }}>
                                            {notifResult.message}
                                        </div>
                                    )}
                                </div>

                                {/* Historial */}
                                {notifHistorial.length > 0 && (
                                    <div className="cliente-section-card" style={{ marginTop: '1.5rem' }}>
                                        <h3>📋 Historial de notificaciones</h3>
                                        <div className="cliente-notif-history">
                                            {notifHistorial.map((n: any) => (
                                                <div key={n.id} className="cliente-notif-item">
                                                    <div className="cliente-notif-item-header">
                                                        <strong>{n.titulo}</strong>
                                                        <span className="cliente-notif-item-date">
                                                            {new Date(n.created_at).toLocaleDateString('es-CL')}
                                                        </span>
                                                    </div>
                                                    <p className="cliente-notif-item-msg">{n.mensaje}</p>
                                                    <div className="cliente-notif-item-meta">
                                                        <span>📤 {n.total_destinatarios} destinatarios</span>
                                                        <span>🏷️ {n.segmento}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="cliente-notif-scheduled" style={{ marginTop: '1.5rem' }}>
                                    <h3>📅 Campañas Programadas (Calendario)</h3>
                                    <p className="cliente-content-subtitle">Programa tus eventos especiales, aniversarios y promos futuras.</p>
                                    <div className="cliente-config-form" style={{ marginTop: '1rem' }}>
                                        <div className="marketing-row">
                                            <label>
                                                <span>Nombre del Evento</span>
                                                <input
                                                    type="text"
                                                    value={nuevaCampana.nombre}
                                                    onChange={e => setNuevaCampana({ ...nuevaCampana, nombre: e.target.value })}
                                                    placeholder="Ej: Aniversario del local"
                                                />
                                            </label>
                                            <label>
                                                <span>Fecha de Envío</span>
                                                <input
                                                    type="date"
                                                    value={nuevaCampana.fecha_envio}
                                                    onChange={e => setNuevaCampana({ ...nuevaCampana, fecha_envio: e.target.value })}
                                                />
                                            </label>
                                        </div>
                                        <div className="marketing-row">
                                            <label>
                                                <span>Título Notificación</span>
                                                <input
                                                    type="text"
                                                    value={nuevaCampana.titulo_notif}
                                                    onChange={e => setNuevaCampana({ ...nuevaCampana, titulo_notif: e.target.value })}
                                                    placeholder="Ej: ¡Hoy celebramos juntos!"
                                                />
                                            </label>
                                            <label>
                                                <span>Segmento</span>
                                                <select value={nuevaCampana.segmento} onChange={e => setNuevaCampana({ ...nuevaCampana, segmento: e.target.value })}>
                                                    <option value="todos">👥 Todos</option>
                                                    <option value="activos">🟢 Solo Activos</option>
                                                    <option value="inactivos">💤 Solo Inactivos</option>
                                                </select>
                                            </label>
                                        </div>
                                        <label>
                                            <span>Mensaje</span>
                                            <textarea
                                                value={nuevaCampana.mensaje_notif}
                                                onChange={e => setNuevaCampana({ ...nuevaCampana, mensaje_notif: e.target.value })}
                                                placeholder="Ej: Ven hoy y obtén un 2x1 por nuestro aniversario 🎊"
                                                rows={2}
                                            />
                                        </label>
                                        <button
                                            className="cliente-save-btn"
                                            onClick={handleSaveScheduledCampaign}
                                            disabled={guardandoCampana}
                                            style={{ marginTop: '0.5rem' }}
                                        >
                                            {guardandoCampana ? '⏳ Programando...' : '📅 Programar Campaña'}
                                        </button>
                                    </div>

                                    {campanasProgramadas.length > 0 && (
                                        <div className="cliente-section-card" style={{ marginTop: '1.5rem' }}>
                                            <h3>📋 Próximas Campañas</h3>
                                            <div className="cliente-notif-history">
                                                {campanasProgramadas.map((c: any) => (
                                                    <div key={c.id} className="cliente-notif-item">
                                                        <div className="cliente-notif-item-header">
                                                            <strong>{c.nombre}</strong>
                                                            <span className={`status-badge ${c.estado}`}>
                                                                {c.fecha_envio}
                                                            </span>
                                                        </div>
                                                        <p className="cliente-notif-item-msg">{c.mensaje_notif}</p>
                                                        <div className="cliente-notif-item-meta">
                                                            <span>📅 Envío programado</span>
                                                            <button
                                                                onClick={() => handleDeleteScheduledCampaign(c.id)}
                                                                style={{ color: '#ff4d4d', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                                                            >
                                                                🗑️ Eliminar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* ═══════ CONFIGURACIÓN ═══════ */}
                {
                    tab === 'configuracion' && !isRestricted && (
                        <div className="cliente-content">
                            <div className="cliente-content-header">
                                <div>
                                    <h1>Configuración</h1>
                                    <p className="cliente-content-subtitle">Ajustes de tu negocio y programa</p>
                                </div>
                                <StatusAlert tenant={tenant} />
                                {!editingConfig ? (
                                    <button className="cliente-edit-btn" onClick={() => setEditingConfig(true)}>
                                        ✏️ Editar
                                    </button>
                                ) : (
                                    <div className="cliente-edit-actions">
                                        <button className="cliente-save-btn" onClick={handleSaveConfig} disabled={saving}>
                                            {saving ? '⏳ Guardando...' : '💾 Guardar'}
                                        </button>
                                        <button className="cliente-cancel-btn" onClick={() => setEditingConfig(false)}>
                                            Cancelar
                                        </button>
                                    </div>
                                )}
                            </div>

                            {saveMessage && (
                                <div className={`cliente-toast ${saveMessage.includes('✅') ? 'toast-ok' : 'toast-err'}`}>
                                    {saveMessage}
                                </div>
                            )}

                            <div className="cliente-config-grid">
                                {tenant && (
                                    <div className={`cliente-config-card plan-card ${tenant.plan}`}>
                                        <div className="plan-header">
                                            <h3>💳 Plan Vuelve+</h3>
                                            <span className={`badge-plan ${tenant.plan}`}>
                                                {tenant.plan === 'pro' ? '🚀 PRO' : '🎁 TRIAL'}
                                            </span>
                                        </div>
                                        <div className="plan-body">
                                            {tenant.plan === 'trial' ? (
                                                <>
                                                    <p>Estás usando la versión de prueba técnica.</p>
                                                    {tenant.trial_hasta && (
                                                        <p className="trial-date">Vence: {new Date(tenant.trial_hasta).toLocaleDateString()}</p>
                                                    )}
                                                    <button
                                                        className="upgrade-btn"
                                                        onClick={handleUpgrade}
                                                        disabled={subscribing}
                                                    >
                                                        {subscribing ? '🚀 Preparando...' : 'Activar Vuelve+ Pro ($29.990)'}
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <p>¡Gracias por ser Pro! Tienes todas las funciones desbloqueadas.</p>
                                                    <div className="plan-stats">
                                                        <span>Próximo cobro: {tenant.next_billing_date ? new Date(tenant.next_billing_date).toLocaleDateString() : 'Ver en Flow'}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="cliente-config-card">
                                    <h3>🏪 Datos del negocio</h3>
                                    {editingConfig ? (
                                        <div className="cliente-config-form">
                                            <label>
                                                <span>Nombre</span>
                                                <input type="text" value={configForm.nombre} onChange={e => setConfigForm({ ...configForm, nombre: e.target.value })} />
                                            </label>
                                            <label>
                                                <span>Rubro</span>
                                                <input type="text" value={configForm.rubro} onChange={e => setConfigForm({ ...configForm, rubro: e.target.value })} />
                                            </label>
                                            <label>
                                                <span>Dirección</span>
                                                <input type="text" value={configForm.direccion} onChange={e => setConfigForm({ ...configForm, direccion: e.target.value })} />
                                            </label>
                                            <label>
                                                <span>Color principal</span>
                                                <div className="cliente-color-picker">
                                                    <input type="color" value={configForm.color_primario} onChange={e => setConfigForm({ ...configForm, color_primario: e.target.value })} />
                                                    <span>{configForm.color_primario}</span>
                                                </div>
                                            </label>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="cliente-config-item">
                                                <span>Nombre:</span> <strong>{tenant.nombre}</strong>
                                            </div>
                                            <div className="cliente-config-item">
                                                <span>Rubro:</span> <strong>{tenant.rubro || 'Sin definir'}</strong>
                                            </div>
                                            <div className="cliente-config-item">
                                                <span>Dirección:</span> <strong>{tenant.direccion || 'Sin definir'}</strong>
                                            </div>
                                            <div className="cliente-config-item">
                                                <span>Slug:</span> <strong>{tenant.slug}</strong>
                                            </div>
                                            <div className="cliente-config-item">
                                                <span>Estado:</span>
                                                <strong className={tenant.estado === 'activo' ? 'status-active' : 'status-inactive'}>
                                                    {tenant.estado}
                                                </strong>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="cliente-config-card">
                                    <h3>🎯 Programa de lealtad</h3>
                                    {editingConfig ? (
                                        <div className="cliente-config-form">
                                            <label>
                                                <span>Puntos para el premio</span>
                                                <input type="number" min="1" value={configForm.puntos_meta} onChange={e => setConfigForm({ ...configForm, puntos_meta: Number(e.target.value) })} />
                                            </label>
                                            <label>
                                                <span>Descripción del premio</span>
                                                <input type="text" value={configForm.descripcion_premio} onChange={e => setConfigForm({ ...configForm, descripcion_premio: e.target.value })} placeholder="Ej: 1 corte gratis" />
                                            </label>
                                            <label>
                                                <span>Tipo de premio</span>
                                                <select value={configForm.tipo_premio} onChange={e => setConfigForm({ ...configForm, tipo_premio: e.target.value })}>
                                                    <option value="descuento">Descuento</option>
                                                    <option value="gratis">Gratis</option>
                                                    <option value="regalo">Regalo</option>
                                                    <option value="otro">Otro</option>
                                                </select>
                                            </label>
                                            <label>
                                                <span>PIN de Validación (4 dígitos)</span>
                                                <input
                                                    type="text"
                                                    maxLength={4}
                                                    value={configForm.validation_pin}
                                                    onChange={e => setConfigForm({ ...configForm, validation_pin: e.target.value.replace(/\D/g, '') })}
                                                    placeholder="Ej: 1234"
                                                />
                                            </label>
                                        </div>
                                    ) : (
                                        program && (
                                            <>
                                                <div className="cliente-config-item">
                                                    <span>Puntos meta:</span> <strong>{program.puntos_meta}</strong>
                                                </div>
                                                <div className="cliente-config-item">
                                                    <span>Premio:</span> <strong>{program.descripcion_premio}</strong>
                                                </div>
                                                <div className="cliente-config-item">
                                                    <span>Tipo:</span> <strong>{program.tipo_premio}</strong>
                                                </div>
                                                {program.tipo_programa && (
                                                    <div className="cliente-config-item">
                                                        <span>Tipo de programa:</span> <strong>{program.tipo_programa}</strong>
                                                    </div>
                                                )}
                                                <div className="cliente-config-item">
                                                    <span>PIN de Validación:</span> <strong>{tenant.validation_pin || 'No definido'}</strong>
                                                </div>
                                            </>
                                        )
                                    )}
                                </div>

                                <div className="cliente-config-card">
                                    <h3>📍 Geofencing & Google Wallet</h3>
                                    {editingConfig ? (
                                        <div className="cliente-config-form">
                                            <label>
                                                <span>Latitud</span>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={configForm.lat}
                                                    onChange={e => setConfigForm({ ...configForm, lat: e.target.value })}
                                                    placeholder="Ej: -33.4489"
                                                />
                                            </label>
                                            <label>
                                                <span>Longitud</span>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={configForm.lng}
                                                    onChange={e => setConfigForm({ ...configForm, lng: e.target.value })}
                                                    placeholder="Ej: -70.6693"
                                                />
                                            </label>

                                            <button
                                                type="button"
                                                className="cliente-gps-btn"
                                                onClick={detectarUbicacion}
                                                disabled={detectingLocation}
                                            >
                                                {detectingLocation ? '📡 Detectando...' : '📍 Capturar mi ubicación actual'}
                                            </button>

                                            <label>
                                                <span>Mensaje de proximidad</span>
                                                <textarea
                                                    value={configForm.mensaje_geofencing}
                                                    onChange={e => setConfigForm({ ...configForm, mensaje_geofencing: e.target.value })}
                                                    placeholder="¡Estás cerca! Pasa a sumar puntos 🎉"
                                                    rows={3}
                                                />
                                            </label>
                                            <label>
                                                <div className="label-with-help">
                                                    <span>Google Business URL</span>
                                                    <button
                                                        className="help-icon-btn"
                                                        title="Cómo obtener mi link de reseñas"
                                                        onClick={() => alert('Para obtener tu link:\n1. Busca tu negocio en Google Maps\n2. Haz clic en "Recibir más reseñas"\n3. Copia el link corto que aparece (ej: g.page/r/...)')}
                                                    >
                                                        ❓
                                                    </button>
                                                </div>
                                                <input
                                                    type="url"
                                                    value={configForm.google_business_url}
                                                    onChange={e => setConfigForm({ ...configForm, google_business_url: e.target.value })}
                                                    placeholder="https://g.page/r/..."
                                                />
                                            </label>
                                            <p className="cliente-config-hint">
                                                💡 Tip: Usa el link directo "Recibir más reseñas" de Google para que el cliente caiga directo en las 5 estrellas.
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="cliente-config-item">
                                                <span>Coordenadas:</span>
                                                <strong>
                                                    {tenant.lat && tenant.lng
                                                        ? `${tenant.lat}, ${tenant.lng}`
                                                        : 'Sin configurar'}
                                                </strong>
                                            </div>
                                            <div className="cliente-config-item">
                                                <span>Mensaje:</span>
                                                <strong>{tenant.mensaje_geofencing || 'Sin configurar'}</strong>
                                            </div>
                                            <div className="cliente-config-item">
                                                <span>Google Review Link:</span>
                                                <strong>{tenant.google_business_url ? 'Configurado ✅' : 'Sin configurar'}</strong>
                                            </div>
                                            {(!tenant.lat || !tenant.lng) && (
                                                <p className="cliente-config-hint">
                                                    ⚠️ Configura las coordenadas para activar notificaciones por proximidad en Google Wallet.
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="cliente-config-card">
                                    <h3>💳 Plan</h3>
                                    <div className="cliente-config-item">
                                        <span>Plan actual:</span>
                                        <strong>{tenant.plan === 'trial' ? 'Trial Gratuito' : 'Activo'}</strong>
                                    </div>
                                    {tenant.plan === 'trial' && (
                                        <div className="cliente-config-item">
                                            <span>Expira:</span>
                                            <strong>
                                                {new Date(tenant.trial_hasta).toLocaleDateString('es-CL', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </strong>
                                        </div>
                                    )}
                                </div>

                                {/* --- MARKETING AUTO-PILOT SECTION --- */}
                                <div className="cliente-config-card full-width">
                                    <h3>🤖 Marketing Auto-Pilot (Personalización)</h3>
                                    <p className="cliente-config-desc">Configura los mensajes automáticos que tus clientes recibirán por Google Wallet.</p>

                                    {editingConfig ? (
                                        <div className="cliente-config-form marketing-form">
                                            <div className="marketing-row">
                                                <label>
                                                    <span>👋 Bienvenida (Registro)</span>
                                                    <textarea
                                                        value={configForm.marketing_welcome}
                                                        onChange={e => setConfigForm({ ...configForm, marketing_welcome: e.target.value })}
                                                        placeholder="¡Bienvenido a {negocio}! Gracias por sumarte..."
                                                        rows={2}
                                                    />
                                                </label>
                                                <label>
                                                    <span>🎂 Cumpleaños</span>
                                                    <textarea
                                                        value={configForm.marketing_birthday}
                                                        onChange={e => setConfigForm({ ...configForm, marketing_birthday: e.target.value })}
                                                        placeholder="¡Feliz cumple de parte de {negocio}! Te tenemos un regalo..."
                                                        rows={2}
                                                    />
                                                </label>
                                            </div>
                                            <div className="marketing-row">
                                                <label>
                                                    <span>🔄 Recuperación (Inactivo 30 días)</span>
                                                    <textarea
                                                        value={configForm.marketing_winback}
                                                        onChange={e => setConfigForm({ ...configForm, marketing_winback: e.target.value })}
                                                        placeholder="¡Te extrañamos! Vuelve pronto y recibe una sorpresa..."
                                                        rows={2}
                                                    />
                                                </label>
                                                <label>
                                                    <span>⭐ SEO Review (2h post-visita)</span>
                                                    <textarea
                                                        value={configForm.marketing_review}
                                                        onChange={e => setConfigForm({ ...configForm, marketing_review: e.target.value })}
                                                        placeholder="¿Te gustó tu visita? Apóyanos con una reseña..."
                                                        rows={2}
                                                    />
                                                </label>
                                            </div>
                                            <p className="cliente-config-hint">💡 Usa <strong>{"{negocio}"}</strong> y <strong>{"{nombre}"}</strong> para personalizar automáticamente.</p>
                                        </div>
                                    ) : (
                                        <div className="marketing-summary">
                                            <div className="m-item">
                                                <span>👋 Registro:</span>
                                                <p>{configForm.marketing_welcome || 'Por defecto'}</p>
                                            </div>
                                            <div className="m-item">
                                                <span>🎂 Cumpleaños:</span>
                                                <p>{configForm.marketing_birthday || 'Por defecto'}</p>
                                            </div>
                                            <div className="m-item">
                                                <span>⭐ Reseña:</span>
                                                <p>{configForm.marketing_review || 'Por defecto'}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    tab === 'ayuda' && (
                        <div className="cliente-content">
                            <StatusAlert tenant={tenant} />
                            <AyudaPanel />
                        </div>
                    )
                }

                {/* ═══════ PERSONAL ═══════ */}
                {
                    tab === 'personal' && (
                        <div className="cliente-content">
                            <div className="cliente-content-header">
                                <div className="cliente-content-title">
                                    <h1>Gestión de Personal</h1>
                                    <p className="cliente-content-subtitle">Administra los cajeros y accesos de tu local</p>
                                </div>
                                <div className="staff-header-actions">
                                    <a href={`/cajero/${tenant.slug}`} target="_blank" className="staff-portal-link" rel="noreferrer">
                                        🔗 Portal de Cajero
                                    </a>
                                </div>
                            </div>

                            <div className="cliente-config-grid">
                                <div className="cliente-config-card">
                                    <h3>➕ Registrar Nuevo Cajero</h3>
                                    <div className="cliente-config-form">
                                        <label>
                                            <span>Nombre completo</span>
                                            <input
                                                type="text"
                                                value={newStaffName}
                                                onChange={e => setNewStaffName(e.target.value)}
                                                placeholder="Ej: Juan Pérez"
                                            />
                                        </label>
                                        <label>
                                            <span>PIN de Acceso (4 dígitos)</span>
                                            <input
                                                type="text"
                                                maxLength={4}
                                                value={newStaffPin}
                                                onChange={e => setNewStaffPin(e.target.value.replace(/\D/g, ''))}
                                                placeholder="Ej: 1234"
                                            />
                                        </label>
                                        <button
                                            className="cliente-save-btn"
                                            onClick={handleAddStaff}
                                            disabled={!newStaffName || newStaffPin.length !== 4}
                                        >
                                            Registrar Cajero
                                        </button>
                                    </div>
                                </div>

                                <div className="cliente-config-card">
                                    <h3>👥 Equipo Actual</h3>
                                    {loadingStaff ? (
                                        <p>Cargando personal...</p>
                                    ) : staffList.length === 0 ? (
                                        <p className="text-muted">Aún no has registrado personal.</p>
                                    ) : (
                                        <div className="staff-list">
                                            {staffList.map(s => (
                                                <div key={s.id} className="staff-item">
                                                    <div className="staff-info">
                                                        <strong>{s.nombre}</strong>
                                                        <span>PIN: {s.pin} • {s.rol.toUpperCase()}</span>
                                                    </div>
                                                    <div className={`staff-status ${s.activo ? 'status-active' : 'status-inactive'}`}>
                                                        {s.activo ? '● Activo' : '○ Inactivo'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }
            </main >
        </div >
    )
}
