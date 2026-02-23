/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next'
import Link from 'next/link'
import HeroLogin from './components/HeroLogin'
import {
  Store,
  LayoutDashboard,
  Wallet,
  Mail,
  Instagram,
  Youtube,
  Linkedin,
  Facebook,
  Twitter,
  QrCode,
  Users,
  BarChart3,
  BellRing,
  MapPin,
  Palette,
  ShieldCheck,
  Check,
  X
} from 'lucide-react'
import { PLAN_CATALOG } from '@/lib/plans'

const TikTokIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
)

const PinterestIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 22v-9" />
    <path d="M12 13a3 3 0 0 1 3-3c2 0 3 1.5 3 3.5 0 2.5-1.5 4.5-3.5 4.5-1.5 0-2.5-1-2.5-2.5" />
  </svg>
)

export const metadata: Metadata = {
  title: 'Vuelve+ — Tus clientes siempre vuelven',
  description: 'Plataforma de fidelización para negocios: QR, Wallet, campañas, staff y analítica. 14 días de prueba y pago seguro por Flow.',
  alternates: {
    canonical: '/'
  }
}

const comparisonRows = [
  {
    name: 'Precio mensual',
    pyme: `$${PLAN_CATALOG.pyme.monthlyPrice.toLocaleString('es-CL')}`,
    pro: `$${PLAN_CATALOG.pro.monthlyPrice.toLocaleString('es-CL')}`,
    full: `$${PLAN_CATALOG.full.monthlyPrice.toLocaleString('es-CL')}`
  },
  {
    name: 'Motores de fidelización',
    pyme: `${PLAN_CATALOG.pyme.limits.maxProgramChoices} motor`,
    pro: `${PLAN_CATALOG.pro.limits.maxProgramChoices} motores`,
    full: 'Todos (8)'
  },
  {
    name: 'Staff',
    pyme: `${PLAN_CATALOG.pyme.limits.maxStaff} usuarios`,
    pro: `${PLAN_CATALOG.pro.limits.maxStaff} usuarios`,
    full: 'Ilimitado'
  },
  {
    name: 'Campañas programadas',
    pyme: `${PLAN_CATALOG.pyme.limits.maxScheduledCampaigns}`,
    pro: `${PLAN_CATALOG.pro.limits.maxScheduledCampaigns}`,
    full: 'Ilimitadas'
  },
  {
    name: 'Alcance de notificaciones/mes',
    pyme: `${PLAN_CATALOG.pyme.limits.monthlyNotificationRecipients.toLocaleString('es-CL')}`,
    pro: `${PLAN_CATALOG.pro.limits.monthlyNotificationRecipients.toLocaleString('es-CL')}`,
    full: 'Sin tope práctico'
  },
  {
    name: 'Exportación de clientes (CSV)',
    pyme: false,
    pro: true,
    full: true
  },
  {
    name: 'Analítica avanzada',
    pyme: false,
    pro: true,
    full: true
  },
  {
    name: 'QR + página pública + Wallet',
    pyme: true,
    pro: true,
    full: true
  },
  {
    name: 'Pago seguro por Flow',
    pyme: true,
    pro: true,
    full: true
  }
] as const

export default function Home() {
  return (
    <div className="landing">
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="nav-brand">
            <span className="nav-brand-text">Vuelve</span>
            <span className="nav-brand-plus">+</span>
          </Link>
          <div className="nav-links">
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#beneficios">Panel y módulos</a>
            <a href="#precio">Planes</a>
            <Link href="/cliente" className="nav-link-panel">Panel de negocio</Link>
          </div>
          <Link href="/registro" className="nav-cta">Empezar gratis</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-bg">
          <video
            className="hero-video"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          >
            <source src="/hero.mp4" type="video/mp4" />
          </video>
          <div className="hero-video-overlay" />
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
        </div>

        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-pill">
              <span className="hero-pill-dot" />
              Nuevo · Tarjetas digitales para tu negocio
            </div>

            <h1 className="hero-title">
              Tus clientes
              <br />
              <span className="gradient-text">siempre vuelven</span>
            </h1>

            <p className="hero-subtitle">
              Crea tu programa de lealtad digital en 2 minutos.<br />
              Tus clientes suman puntos escaneando un QR, reciben su tarjeta en Google Wallet
              y vuelven por más.
            </p>

            <div className="hero-actions">
              <Link href="/registro" className="btn btn-primary btn-lg">
                Crear mi programa gratis
                <span className="btn-arrow">→</span>
              </Link>
              <a href="#como-funciona" className="btn btn-ghost">
                Ver cómo funciona
              </a>
            </div>

            <div className="hero-proof">
              <div className="hero-proof-avatars">
                <div className="hero-avatar" style={{ background: '#ff6b6b' }}>J</div>
                <div className="hero-avatar" style={{ background: '#ee5a6f' }}>M</div>
                <div className="hero-avatar" style={{ background: '#ff8e53' }}>C</div>
                <div className="hero-avatar" style={{ background: '#ffb347' }}>R</div>
              </div>
              <p className="hero-proof-text">
                <strong>14 días gratis</strong> · Sin tarjeta de crédito
              </p>
            </div>
          </div>

          <div className="hero-visual">
            <HeroLogin />
          </div>
        </div>
      </section>

      <section className="proof-bar">
        <div className="proof-bar-inner">
          <div className="proof-item">
            <span className="proof-number">14 días</span>
            <span className="proof-label">Prueba completa</span>
          </div>
          <div className="proof-divider" />
          <div className="proof-item">
            <span className="proof-number">8</span>
            <span className="proof-label">Motores disponibles</span>
          </div>
          <div className="proof-divider" />
          <div className="proof-item">
            <span className="proof-number">Flow</span>
            <span className="proof-label">Cobro seguro verificado</span>
          </div>
          <div className="proof-divider" />
          <div className="proof-item">
            <span className="proof-number">1 panel</span>
            <span className="proof-label">Operación diaria completa</span>
          </div>
        </div>
      </section>

      <section className="section section-gradient" id="como-funciona">
        <div className="section-header">
          <span className="section-tag">Cómo funciona</span>
          <h2 className="section-title">
            Del registro a fidelizar,<br /><span className="gradient-text">sin pasos confusos</span>
          </h2>
        </div>

        <div className="journey-grid">
          <article className="journey-card">
            <span className="journey-step">Paso 1</span>
            <h3>Crea tu cuenta del negocio</h3>
            <p>Entras con correo y clave. Quedas con sesión activa y vas directo al panel.</p>
          </article>
          <article className="journey-card">
            <span className="journey-step">Paso 2</span>
            <h3>Define tu plan objetivo del trial</h3>
            <p>Empiezas con prueba de 14 días y eliges desde ya Pyme, Pro o Full.</p>
          </article>
          <article className="journey-card">
            <span className="journey-step">Paso 3</span>
            <h3>Configura solo lo que contrataste</h3>
            <p>Seleccionas motores y parámetros según tu plan, sin ruido ni bloques extraños.</p>
          </article>
          <article className="journey-card">
            <span className="journey-step">Paso 4</span>
            <h3>Opera desde tu dashboard</h3>
            <p>Gestionas clientes, campañas, personal, QR y personalización visual en un mismo lugar.</p>
          </article>
        </div>
      </section>

      <section className="section section-dark" id="beneficios">
        <div className="section-header">
          <span className="section-tag">Panel y módulos</span>
          <h2 className="section-title">
            Lo que realmente puedes hacer<br /><span className="gradient-text">hoy dentro de la app</span>
          </h2>
        </div>

        <div className="feature-stack">
          <article className="feature-item">
            <QrCode size={20} />
            <div>
              <h3>QR y página pública del cliente</h3>
              <p>Compartes un QR único del negocio y el cliente entra al flujo de tarjeta sin fricción.</p>
            </div>
          </article>
          <article className="feature-item">
            <Wallet size={20} />
            <div>
              <h3>Tarjeta en Google Wallet</h3>
              <p>El cliente guarda su tarjeta en Wallet y revisa progreso, premio y estado en tiempo real.</p>
            </div>
          </article>
          <article className="feature-item">
            <Palette size={20} />
            <div>
              <h3>Personalización de tarjeta</h3>
              <p>Configuras logo, fondo y sello (stamp) para que tu marca se vea consistente.</p>
            </div>
          </article>
          <article className="feature-item">
            <BellRing size={20} />
            <div>
              <h3>Campañas y notificaciones</h3>
              <p>Envías campañas segmentadas y programadas según los límites de tu plan.</p>
            </div>
          </article>
          <article className="feature-item">
            <Users size={20} />
            <div>
              <h3>Gestión de personal</h3>
              <p>Agregas y eliminas staff para operación diaria de caja, validación y atención.</p>
            </div>
          </article>
          <article className="feature-item">
            <BarChart3 size={20} />
            <div>
              <h3>Analítica de negocio</h3>
              <p>Monitoreas clientes activos, avances a premio y uso real de tu programa.</p>
            </div>
          </article>
          <article className="feature-item">
            <MapPin size={20} />
            <div>
              <h3>Georreferencia y presencia local</h3>
              <p>Si no marcas ubicación en onboarding, luego la puedes completar desde el panel.</p>
            </div>
          </article>
          <article className="feature-item">
            <ShieldCheck size={20} />
            <div>
              <h3>Seguridad operativa</h3>
              <p>Control de acceso por cuenta, operación por tenant y cobro protegido vía Flow.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="section plan-compare" id="precio">
        <div className="section-header">
          <span className="section-tag">Comparativa real</span>
          <h2 className="section-title">
            Mismo producto, distinto alcance.<br /><span className="gradient-text">Aquí se ve claro.</span>
          </h2>
        </div>

        <div className="compare-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Qué incluye</th>
                <th>{PLAN_CATALOG.pyme.label}</th>
                <th>{PLAN_CATALOG.pro.label}</th>
                <th>{PLAN_CATALOG.full.label}</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{typeof row.pyme === 'boolean' ? (row.pyme ? <Check size={16} /> : <X size={16} />) : row.pyme}</td>
                  <td>{typeof row.pro === 'boolean' ? (row.pro ? <Check size={16} /> : <X size={16} />) : row.pro}</td>
                  <td>{typeof row.full === 'boolean' ? (row.full ? <Check size={16} /> : <X size={16} />) : row.full}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pricing">
          {(['pyme', 'pro', 'full'] as const).map((planCode) => {
            const plan = PLAN_CATALOG[planCode]
            return (
              <article key={planCode} className={`price-card ${planCode === 'pro' ? 'price-card-featured' : ''}`}>
                <div className="price-card-ribbon">
                  {planCode === 'pyme' ? 'Inicio' : planCode === 'pro' ? 'Recomendado' : 'Máximo alcance'}
                </div>
                <div className="price-top">
                  <h3>{plan.label}</h3>
                  <p>{plan.description}</p>
                </div>
                <div className="price-amount-wrapper">
                  <div className="price-amount">
                    <span className="price-currency">$</span>
                    <span className="price-number">{plan.monthlyPrice.toLocaleString('es-CL')}</span>
                    <span className="price-period">/mes</span>
                  </div>
                </div>
                <ul className="price-features">
                  <li><span className="check">✓</span> {planCode === 'full' ? 'Todos los motores habilitados' : `Hasta ${plan.limits.maxProgramChoices} motores`}</li>
                  <li><span className="check">✓</span> {planCode === 'full' ? 'Staff ilimitado' : `Staff hasta ${plan.limits.maxStaff} usuarios`}</li>
                  <li><span className="check">✓</span> Campañas: {planCode === 'full' ? 'Ilimitadas' : `${plan.limits.maxScheduledCampaigns}`}</li>
                  <li><span className="check">✓</span> {plan.limits.exportCsv ? 'Incluye exportación CSV' : 'Sin exportación CSV'}</li>
                  <li><span className="check">✓</span> {plan.limits.analyticsAdvanced ? 'Analítica avanzada' : 'Analítica base'}</li>
                </ul>
                <Link href={`/registro?plan=${planCode}`} className="btn btn-primary btn-lg btn-full">
                  Empezar con {plan.label}
                </Link>
                <p className="price-note">14 días de prueba · Se cobra el plan que dejes seleccionado al finalizar trial</p>
              </article>
            )
          })}
        </div>

        <div className="payment-methods" style={{ marginTop: '1rem' }}>
          <div className="payment-secure">
            <span className="lock-icon">🔒</span> Pagos seguros verificados por Flow
          </div>
          <div className="payment-brands">
            <span className="payment-chip">Webpay Plus</span>
            <img src="/logos/mastercard.png" alt="Mastercard" className="payment-logo" />
            <img src="/logos/visa.png" alt="Visa" className="payment-logo" />
          </div>
        </div>
      </section>

      <section className="section faq-section">
        <div className="section-header">
          <span className="section-tag">Preguntas frecuentes</span>
          <h2 className="section-title">
            Dudas típicas antes de partir<br /><span className="gradient-text">resueltas en simple</span>
          </h2>
        </div>
        <div className="faq-grid">
          <article className="faq-card">
            <h3>¿Tengo que configurar todo en el registro?</h3>
            <p>No. Puedes crear la cuenta, entrar al panel y ajustar lo demás con calma dentro del dashboard.</p>
          </article>
          <article className="faq-card">
            <h3>¿El plan queda fijo desde el día 1?</h3>
            <p>No. Durante la prueba eliges o cambias tu plan objetivo, y ese es el que se cobrará después del trial.</p>
          </article>
          <article className="faq-card">
            <h3>¿Puedo partir sin estar físicamente en mi local?</h3>
            <p>Sí. Puedes saltar la georreferencia inicial y completarla cuando estés en tu local desde configuración.</p>
          </article>
          <article className="faq-card">
            <h3>¿El cliente debe descargar una app?</h3>
            <p>No. El flujo funciona con QR + página pública + tarjeta en Google Wallet.</p>
          </article>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">
            Si hoy vendes, hoy puedes fidelizar
          </h2>
          <p className="cta-subtitle">
            Entras con correo y clave, configuras tu plan, y operas todo desde un solo panel.
          </p>
          <Link href="/registro" className="btn btn-white btn-lg">
            Crear mi cuenta y entrar al panel
            <span className="btn-arrow">→</span>
          </Link>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-grid">
            <div className="footer-brand-col">
              <div className="footer-brand">
                <span className="nav-brand-text">Vuelve</span>
                <span className="nav-brand-plus">+</span>
              </div>
              <p className="footer-text">
                Plataforma de fidelización para negocios en crecimiento.<br />
                QR, Wallet, panel de operación y pagos seguros.<br />
                Todo en una sola herramienta.
              </p>
            </div>

            <div className="footer-nav">
              <h4>Plataforma</h4>
              <Link href="/registro"><Store size={18} /> Registrar mi negocio</Link>
              <Link href="/cliente"><LayoutDashboard size={18} /> Panel de negocio</Link>
              <Link href="/mi-tarjeta"><Wallet size={18} /> Mi tarjeta</Link>
              <a href="mailto:contacto@vuelve.vip"><Mail size={18} /> contacto@vuelve.vip</a>
            </div>

            <div className="footer-socials">
              <h4>Síguenos</h4>
              <div className="socials-list">
                <a href="https://www.instagram.com/vuelve.vip/" target="_blank" rel="noopener noreferrer"><Instagram size={18} /> Instagram</a>
                <a href="http://www.tiktok.com/@vuelve.vip" target="_blank" rel="noopener noreferrer"><TikTokIcon size={18} /> TikTok</a>
                <a href="https://www.youtube.com/@Vuelvevip" target="_blank" rel="noopener noreferrer"><Youtube size={18} /> YouTube</a>
                <a href="https://www.linkedin.com/company/vuelve" target="_blank" rel="noopener noreferrer"><Linkedin size={18} /> LinkedIn</a>
                <a href="https://web.facebook.com/vuelve.vip" target="_blank" rel="noopener noreferrer"><Facebook size={18} /> Facebook</a>
                <a href="https://x.com/vuelvevip" target="_blank" rel="noopener noreferrer"><Twitter size={18} /> X (Twitter)</a>
                <a href="https://cl.pinterest.com/vuelvevip2026/" target="_blank" rel="noopener noreferrer"><PinterestIcon size={18} /> Pinterest</a>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>© 2026 Vuelve+ · Un producto de HojaCero</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
