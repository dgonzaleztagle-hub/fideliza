import type { Metadata } from 'next'
import Link from 'next/link'
import HeroLogin from './components/HeroLogin'
import { Store, LayoutDashboard, Wallet, Mail, Instagram, Youtube, Linkedin, Facebook, Twitter } from 'lucide-react'
import { PLAN_CATALOG } from '@/lib/plans'

const TikTokIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const PinterestIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 22v-9" />
    <path d="M12 13a3 3 0 0 1 3-3c2 0 3 1.5 3 3.5 0 2.5-1.5 4.5-3.5 4.5-1.5 0-2.5-1-2.5-2.5" />
  </svg>
);

export const metadata: Metadata = {
  title: 'Vuelve+ — Tus clientes siempre vuelven',
  description: 'Tarjetas de lealtad digitales en Google Wallet. Tu negocio fideliza clientes sin apps, sin cartón, sin complicaciones. Prueba gratis 14 días.',
}

export default function Home() {
  return (
    <div className="landing">
      {/* NAV */}
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="nav-brand">
            <span className="nav-brand-text">Vuelve</span>
            <span className="nav-brand-plus">+</span>
          </Link>
          <div className="nav-links">
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#beneficios">Beneficios</a>
            <a href="#precio">Precio</a>
            <Link href="/cliente" className="nav-link-panel">Mi Panel</Link>
          </div>
          <Link href="/registro" className="nav-cta">Empezar gratis</Link>
        </div>
      </nav>

      {/* HERO */}
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

      {/* SOCIAL PROOF BAR */}
      <section className="proof-bar">
        <div className="proof-bar-inner">
          <div className="proof-item">
            <span className="proof-number">2 min</span>
            <span className="proof-label">Para crear tu programa</span>
          </div>
          <div className="proof-divider" />
          <div className="proof-item">
            <span className="proof-number">0$</span>
            <span className="proof-label">Sin costo de setup</span>
          </div>
          <div className="proof-divider" />
          <div className="proof-item">
            <span className="proof-number">3</span>
            <span className="proof-label">Planes para escalar</span>
          </div>
          <div className="proof-divider" />
          <div className="proof-item">
            <span className="proof-number">24/7</span>
            <span className="proof-label">Funciona siempre</span>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="section section-gradient" id="como-funciona">
        <div className="section-header">
          <span className="section-tag">Cómo funciona</span>
          <h2 className="section-title">
            Tan simple como<br /><span className="gradient-text">contar hasta 3</span>
          </h2>
        </div>

        <div className="steps">
          <div className="step">
            <div className="step-visual">
              <div className="step-icon-wrap step-icon-glow">
                <span className="step-icon">📱</span>
              </div>
              <div className="step-number">01</div>
            </div>
            <h3>Crea tu programa</h3>
            <p>Define cuántos puntos y qué premio. Elige tus colores. En 2 minutos tienes todo listo.</p>
          </div>

          <div className="step-connector">
            <svg width="40" height="2" viewBox="0 0 40 2"><line x1="0" y1="1" x2="40" y2="1" stroke="rgba(255,107,107,0.3)" strokeWidth="2" strokeDasharray="4 4" /></svg>
          </div>

          <div className="step">
            <div className="step-visual">
              <div className="step-icon-wrap step-icon-glow">
                <span className="step-icon">🖨️</span>
              </div>
              <div className="step-number">02</div>
            </div>
            <h3>Pega tu QR</h3>
            <p>Imprime el QR que te damos y pégalo en tu mostrador. Tus clientes lo escanean al pagar.</p>
          </div>

          <div className="step-connector">
            <svg width="40" height="2" viewBox="0 0 40 2"><line x1="0" y1="1" x2="40" y2="1" stroke="rgba(255,107,107,0.3)" strokeWidth="2" strokeDasharray="4 4" /></svg>
          </div>

          <div className="step">
            <div className="step-visual">
              <div className="step-icon-wrap step-icon-glow">
                <span className="step-icon">🎁</span>
              </div>
              <div className="step-number">03</div>
            </div>
            <h3>Fideliza automático</h3>
            <p>Los puntos se suman solos. Al llegar a la meta, el premio se genera con un QR único.</p>
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="section section-dark" id="beneficios">
        <div className="section-header">
          <span className="section-tag">Beneficios</span>
          <h2 className="section-title">
            Todo lo que necesitas,<br /><span className="gradient-text">nada que no</span>
          </h2>
        </div>

        <div className="features-grid">
          <div className="feature-card feature-card-highlight">
            <div className="feature-card-glow" />
            <span className="feature-icon">📍</span>
            <h3>Geofencing inteligente</h3>
            <p>Tus clientes reciben una notificación cuando pasan cerca de tu local. &quot;¡Estás cerca! Te falta 1 punto para tu premio&quot;.</p>
            <span className="feature-badge">Estrella</span>
          </div>

          <div className="feature-card">
            <span className="feature-icon">💳</span>
            <h3>Google Wallet</h3>
            <p>La tarjeta vive en la billetera del celular. Sin descargar apps, sin crear cuentas.</p>
          </div>

          <div className="feature-card">
            <span className="feature-icon">🔒</span>
            <h3>Anti-trampas</h3>
            <p>Máximo 1 punto por día por cliente. Nadie puede escanearte 10 veces seguidas.</p>
          </div>

          <div className="feature-card">
            <span className="feature-icon">📊</span>
            <h3>Panel con stats</h3>
            <p>Ve cuántos clientes tienes, quién está cerca del premio, cuántas visitas hoy.</p>
          </div>

          <div className="feature-card">
            <span className="feature-icon">🎯</span>
            <h3>QR de premio único</h3>
            <p>Cada premio genera un código irrepetible. Tú lo escaneas y validas al instante.</p>
          </div>

          <div className="feature-card">
            <span className="feature-icon">⚡</span>
            <h3>Cero fricción</h3>
            <p>El cliente escanea, pone su WhatsApp y listo. Sin apps, sin emails, sin esperas.</p>
          </div>
        </div>
      </section>

      {/* PARA QUIÉN */}
      <section className="section">
        <div className="section-header">
          <span className="section-tag">Para quién</span>
          <h2 className="section-title">
            Si vendes algo y quieres que<br /><span className="gradient-text">vuelvan a comprarte</span>
          </h2>
        </div>

        <div className="rubros-grid">
          {[
            { emoji: '💈', nombre: 'Barberías', ejemplo: '10 cortes = 1 gratis' },
            { emoji: '☕', nombre: 'Cafeterías', ejemplo: '8 cafés = 1 gratis' },
            { emoji: '🍕', nombre: 'Restaurants', ejemplo: '5 visitas = postre gratis' },
            { emoji: '💅', nombre: 'Centros de belleza', ejemplo: '6 sesiones = 20% off' },
            { emoji: '🧺', nombre: 'Lavanderías', ejemplo: '10 lavados = 1 gratis' },
            { emoji: '🏋️', nombre: 'Gimnasios', ejemplo: '30 visitas = 1 semana free' },
          ].map((rubro) => (
            <div key={rubro.nombre} className="rubro-card">
              <span className="rubro-emoji">{rubro.emoji}</span>
              <h4>{rubro.nombre}</h4>
              <p>{rubro.ejemplo}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="section section-dark" id="precio">
        <div className="section-header">
          <span className="section-tag">Precio</span>
          <h2 className="section-title">
            Simple y transparente.<br /><span className="gradient-text">Como debe ser.</span>
          </h2>
        </div>

        <div className="pricing">
          {([
            {
              code: 'pyme' as const,
              ribbon: '🟢 Nuevo',
              title: PLAN_CATALOG.pyme.label,
              desc: 'Ideal para empezar con foco y bajo costo.',
              features: [
                'Elige 1 motor de fidelización',
                'Geofencing incluido',
                'Hasta 2 personas de staff',
                'Hasta 5 campañas programadas'
              ]
            },
            {
              code: 'pro' as const,
              ribbon: '🚀 Recomendado',
              title: PLAN_CATALOG.pro.label,
              desc: 'El plan medio, flexible y con más potencia.',
              features: [
                'Elige hasta 4 motores',
                'Analytics avanzado',
                'Exportación CSV',
                'Hasta 8 personas de staff'
              ]
            },
            {
              code: 'full' as const,
              ribbon: '👑 Full',
              title: PLAN_CATALOG.full.label,
              desc: 'Todas las funcionalidades desbloqueadas.',
              features: [
                'Todos los motores habilitados',
                'Sin límites operativos relevantes',
                'Automatización total y soporte prioritario',
                'Escalamiento completo'
              ]
            }
          ]).map((plan) => (
            <div key={plan.code} className={`price-card ${plan.code === 'pro' ? 'price-card-featured' : ''}`}>
              <div className="price-card-ribbon">{plan.ribbon}</div>
              <div className="price-top">
                <h3>{plan.title}</h3>
                <p>{plan.desc}</p>
              </div>
              <div className="price-amount-wrapper">
                <div className="price-amount">
                  <span className="price-currency">$</span>
                  <span className="price-number">{PLAN_CATALOG[plan.code].monthlyPrice.toLocaleString('es-CL')}</span>
                  <span className="price-period">/mes</span>
                </div>
              </div>
              <ul className="price-features">
                {plan.features.map((feature) => (
                  <li key={feature}><span className="check">✓</span> {feature}</li>
                ))}
              </ul>
              <Link href={`/registro?plan=${plan.code}`} className="btn btn-primary btn-lg btn-full">
                Empezar con {plan.title}
              </Link>
              <p className="price-note">14 días gratis · Sin tarjeta de crédito para comenzar</p>
            </div>
          ))}
        </div>
        <div className="payment-methods" style={{ marginTop: '1rem' }}>
          <div className="payment-secure">
            <span className="lock-icon">🔒</span> Pagos seguros verificados por Flow
          </div>
          <div className="payment-brands">
            <img src="https://cdn.worldvectorlogo.com/logos/webpay-1.svg" alt="Webpay Plus" className="payment-logo" style={{ filter: 'brightness(1.5)' }} />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Mastercard_2019_logo.svg/1200px-Mastercard_2019_logo.svg.png" alt="Mastercard" className="payment-logo" />
            <img src="https://cdn.worldvectorlogo.com/logos/visa.svg" alt="Visa" className="payment-logo" style={{ filter: 'brightness(1.5)' }} />
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">
            ¿Listo para que tus clientes<br />siempre vuelvan?
          </h2>
          <p className="cta-subtitle">
            Crea tu programa de lealtad en 2 minutos.<br />
            14 días gratis, sin compromiso.
          </p>
          <Link href="/registro" className="btn btn-white btn-lg">
            Crear mi programa ahora
            <span className="btn-arrow">→</span>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-grid">
            {/* Columna 1: Brand & Info (Izquierda) */}
            <div className="footer-brand-col">
              <div className="footer-brand">
                <span className="nav-brand-text">Vuelve</span>
                <span className="nav-brand-plus">+</span>
              </div>
              <p className="footer-text">
                Tarjetas de lealtad digitales en Google Wallet.<br />
                Tu negocio fideliza clientes sin apps, sin cartón,<br />
                sin complicaciones.
              </p>
            </div>

            {/* Columna 2: Plataforma (Centro) */}
            <div className="footer-nav">
              <h4>Plataforma</h4>
              <Link href="/registro"><Store size={18} /> Registrar mi negocio</Link>
              <Link href="/cliente"><LayoutDashboard size={18} /> Mi Panel</Link>
              <Link href="/mi-tarjeta"><Wallet size={18} /> Mi Tarjeta</Link>
              <a href="mailto:contacto@vuelve.vip"><Mail size={18} /> contacto@vuelve.vip</a>
            </div>

            {/* Columna 3: Redes Sociales (Derecha) */}
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
            <p>© 2025 Vuelve+ · Un producto de HojaCero</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
