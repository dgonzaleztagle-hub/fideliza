import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Fidelización Digital — Tarjetas de lealtad en Google Wallet',
  description: 'Transforma la lealtad de tus clientes con tarjetas digitales en Google Wallet. Sin apps, sin cartón, sin complicaciones. Prueba gratis 14 días.',
}

export default function Home() {
  return (
    <div className="landing">
      {/* NAV */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <span className="landing-logo-icon">💎</span>
            <span className="landing-logo-text">Fideliza</span>
          </div>
          <a href="/registro" className="landing-nav-cta">
            Empezar gratis
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="landing-hero">
        <div className="landing-hero-glow" />
        <div className="landing-hero-content">
          <div className="landing-hero-badge">🚀 14 días gratis · Sin tarjeta de crédito</div>
          <h1 className="landing-hero-title">
            Tarjetas de lealtad
            <br />
            <span className="landing-hero-gradient">en el bolsillo</span>
            <br />
            de tu cliente
          </h1>
          <p className="landing-hero-subtitle">
            Tus clientes escanean un QR, suman puntos y ganan premios.
            Todo desde Google Wallet. Sin apps, sin cartón, sin complicaciones.
          </p>
          <div className="landing-hero-actions">
            <a href="/registro" className="landing-btn-primary">
              Crear mi programa gratis
            </a>
            <a href="#como-funciona" className="landing-btn-ghost">
              ¿Cómo funciona? ↓
            </a>
          </div>
          <div className="landing-hero-stats">
            <div className="landing-stat">
              <span className="landing-stat-number">2 min</span>
              <span className="landing-stat-label">Configurar</span>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <span className="landing-stat-number">$15.990</span>
              <span className="landing-stat-label">/mes después del trial</span>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <span className="landing-stat-number">0</span>
              <span className="landing-stat-label">Apps que instalar</span>
            </div>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="landing-section">
        <h2 className="landing-section-title">¿Cómo funciona?</h2>
        <p className="landing-section-subtitle">Tres pasos. Cinco minutos. Listo.</p>
        <div className="landing-steps">
          <div className="landing-step">
            <div className="landing-step-number">1</div>
            <div className="landing-step-icon">📋</div>
            <h3>Configura tu programa</h3>
            <p>Define cuántos puntos y qué premio. Sube tu logo y elige tus colores. Listo en 2 minutos.</p>
          </div>
          <div className="landing-step-arrow">→</div>
          <div className="landing-step">
            <div className="landing-step-number">2</div>
            <div className="landing-step-icon">📱</div>
            <h3>Pega el QR en tu local</h3>
            <p>Te generamos un QR único. Imprímelo y pégalo en el mostrador. Es todo lo que necesitas.</p>
          </div>
          <div className="landing-step-arrow">→</div>
          <div className="landing-step">
            <div className="landing-step-number">3</div>
            <div className="landing-step-icon">🎉</div>
            <h3>Los clientes suman puntos</h3>
            <p>Escanean, ponen su WhatsApp, suman puntos. Cuando llegan a la meta, ganan su premio.</p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="landing-section landing-section-alt">
        <h2 className="landing-section-title">Todo lo que necesitas</h2>
        <p className="landing-section-subtitle">Sin complicaciones. Sin letra chica.</p>
        <div className="landing-features">
          <div className="landing-feature">
            <div className="landing-feature-icon">📲</div>
            <h3>Google Wallet</h3>
            <p>La tarjeta se guarda en la billetera del celular. Siempre ahí, nunca se pierde.</p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon">📍</div>
            <h3>Geofencing</h3>
            <p>Cuando tu cliente pasa cerca del local, recibe un recordatorio automático.</p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon">🎨</div>
            <h3>Tu marca</h3>
            <p>Logo, colores y nombre de tu negocio en la tarjeta. Es tuya, no nuestra.</p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon">🔒</div>
            <h3>Anti-trampa</h3>
            <p>Máximo 1 punto por día. Premios con código único de un solo uso.</p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon">📊</div>
            <h3>Panel de control</h3>
            <p>Ve cuántos clientes tienes, puntos dados, premios canjeados. Todo en tiempo real.</p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon">🔌</div>
            <h3>API abierta</h3>
            <p>¿Tienes web propia? Integra la fidelización directamente vía API.</p>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="landing-section">
        <h2 className="landing-section-title">Un solo precio. Todo incluido.</h2>
        <p className="landing-section-subtitle">Sin sorpresas. Sin planes ocultos.</p>
        <div className="landing-pricing">
          <div className="landing-price-card">
            <div className="landing-price-badge">14 días gratis</div>
            <div className="landing-price-amount">
              <span className="landing-price-currency">$</span>
              <span className="landing-price-number">15.990</span>
              <span className="landing-price-period">/mes</span>
            </div>
            <ul className="landing-price-features">
              <li>✅ Clientes ilimitados</li>
              <li>✅ Puntos ilimitados</li>
              <li>✅ QR personalizado</li>
              <li>✅ Google Wallet</li>
              <li>✅ Geofencing</li>
              <li>✅ Panel de control</li>
              <li>✅ Branding personalizado</li>
              <li>✅ Soporte por WhatsApp</li>
            </ul>
            <a href="/registro" className="landing-btn-primary" style={{ width: '100%', textAlign: 'center' }}>
              Empezar mi trial gratis
            </a>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="landing-section landing-cta-section">
        <div className="landing-cta-glow" />
        <h2 className="landing-cta-title">¿Listo para fidelizar?</h2>
        <p className="landing-cta-subtitle">
          Configura tu programa en 2 minutos. Empieza a sumar clientes fieles hoy.
        </p>
        <a href="/registro" className="landing-btn-primary landing-btn-lg">
          Crear mi programa gratis →
        </a>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-logo">
            <span className="landing-logo-icon">💎</span>
            <span className="landing-logo-text">Fideliza</span>
          </div>
          <p className="landing-footer-text">
            Fidelización digital para negocios que quieren crecer.
          </p>
          <p className="landing-footer-copy">
            © 2026 Fideliza. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
