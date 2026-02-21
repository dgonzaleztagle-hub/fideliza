export default function AuthCodeErrorPage() {
    return (
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem' }}>
            <section style={{ maxWidth: 520, textAlign: 'center' }}>
                <h1 style={{ marginBottom: '0.75rem' }}>No pudimos iniciar sesión</h1>
                <p style={{ marginBottom: '1.25rem', opacity: 0.8 }}>
                    Ocurrió un problema al validar tu acceso. Vuelve a intentarlo desde el registro o inicio de sesión.
                </p>
                <a href="/registro" style={{ textDecoration: 'underline' }}>Volver a registro</a>
            </section>
        </main>
    )
}
