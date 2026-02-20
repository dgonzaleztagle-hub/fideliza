import type { Metadata } from 'next'
import HeroLogin from './components/HeroLogin'

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
          <a href="/" className="nav-brand">
            <span className="nav-brand-text">Vuelve</span>
            <span className="nav-brand-plus">+</span>
          </a>
          <div className="nav-links">
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#beneficios">Beneficios</a>
            <a href="#precio">Precio</a>
            <a href="/cliente" className="nav-link-panel">Mi Panel</a>
          </div>
          <a href="/registro" className="nav-cta">Empezar gratis</a>
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
              <a href="/registro" className="btn btn-primary btn-lg">
                Crear mi programa gratis
                <span className="btn-arrow">→</span>
              </a>
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
            <span className="proof-number">∞</span>
            <span className="proof-label">Clientes ilimitados</span>
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
          <div className="price-card">
            <div className="price-card-ribbon">🚀 Lanzamiento</div>
            <div className="price-top">
              <h3>Plan Único</h3>
              <p>Todo lo que necesitas para fidelizar</p>
            </div>
            <div className="price-amount-wrapper">
              <div className="price-old">
                $60.000
              </div>
              <div className="price-amount">
                <span className="price-currency">$</span>
                <span className="price-number">34.990</span>
                <span className="price-period">/mes</span>
              </div>
            </div>
            <ul className="price-features">
              <li><span className="check">✓</span> Clientes ilimitados</li>
              <li><span className="check">✓</span> QR personalizado</li>
              <li><span className="check">✓</span> Google Wallet integrado</li>
              <li><span className="check">✓</span> Geofencing incluido</li>
              <li><span className="check">✓</span> Panel de estadísticas</li>
              <li><span className="check">✓</span> Validación de premios por QR</li>
              <li><span className="check">✓</span> Notificaciones automáticas</li>
              <li><span className="check">✓</span> Soporte por WhatsApp</li>
            </ul>
            <a href="/registro" className="btn btn-primary btn-lg btn-full">
              Empezar 14 días gratis
            </a>
            <p className="price-note">Sin tarjeta de crédito · Cancela cuando quieras</p>

            <div className="payment-methods">
              <div className="payment-secure">
                <span className="lock-icon">🔒</span> Pagos seguros vía Flow
              </div>
              <div className="payment-brands">
                <span>Webpay</span>
                <span>·</span>
                <span>Visa</span>
                <span>·</span>
                <span>Mastercard</span>
              </div>
            </div>
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
          <a href="/registro" className="btn btn-white btn-lg">
            Crear mi programa ahora
            <span className="btn-arrow">→</span>
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="nav-brand-text">Vuelve</span>
            <span className="nav-brand-plus">+</span>
          </div>
          <p className="footer-text">Tarjetas de lealtad digitales para negocios que quieren crecer.</p>
          <div className="footer-links">
            <a href="/registro">Registrar mi negocio</a>
            <a href="/cliente">Mi Panel</a>
            <a href="/mi-tarjeta">Mi Tarjeta</a>
          </div>
          <div className="footer-bottom">
            <p>© 2025 Vuelve+ · Un producto de HojaCero</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
