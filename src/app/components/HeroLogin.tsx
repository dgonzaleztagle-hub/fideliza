'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function HeroLogin() {
    const supabase = createClient()
    const router = useRouter()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (authError) {
                setError('Credenciales inválidas')
                setLoading(false)
                return
            }

            // Redirigir al panel de cliente (allí se maneja el auto-load del tenant)
            router.push('/cliente')
        } catch (err) {
            setError('Error de conexión')
            setLoading(false)
        }
    }

    async function handleGoogleLogin() {
        setLoading(true)
        setError('')

        try {
            const { error: authError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent('/cliente')}`
                }
            })

            if (authError) {
                setError('Error al conectar con Google')
                setLoading(false)
            }
        } catch (err) {
            setError('Error de conexión')
            setLoading(false)
        }
    }

    return (
        <div className="hero-login-card">
            <div className="hero-login-header">
                <h3>Acceso Dueños</h3>
                <p>Gestiona tu programa de lealtad</p>
            </div>

            <form onSubmit={handleLogin} className="hero-login-form">
                <div className="login-field">
                    <label>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        required
                    />
                </div>
                <div className="login-field">
                    <label>Contraseña</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />
                </div>

                {error && <p className="login-error">❌ {error}</p>}

                <button type="submit" className="login-submit" disabled={loading}>
                    {loading ? 'Cargando...' : 'Ingresar al Panel →'}
                </button>

                <div className="login-divider">O ingresa con</div>

                <button type="button" className="login-google" onClick={handleGoogleLogin} disabled={loading}>
                    <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                        <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                            <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                            <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                            <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                            <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                        </g>
                    </svg>
                    Google
                </button>
            </form>

            <div className="hero-login-footer">
                <a href="/registro">¿No tienes cuenta? Registra tu negocio aquí</a>
            </div>

            <style jsx>{`
                .hero-login-card {
                    background: rgba(16, 16, 24, 0.4);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 2.5rem;
                    border-radius: 32px;
                    width: 100%;
                    max-width: 400px;
                    animation: fadeInRight 0.8s ease both;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }

                @keyframes fadeInRight {
                    from { opacity: 0; transform: translateX(30px); }
                    to { opacity: 1; transform: translateX(0); }
                }

                .hero-login-header {
                    margin-bottom: 2rem;
                    text-align: center;
                }

                .hero-login-header h3 {
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: white;
                    margin-bottom: 0.5rem;
                }

                .hero-login-header p {
                    font-size: 0.9rem;
                    color: rgba(255, 255, 255, 0.6);
                }

                .hero-login-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }

                .login-field {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .login-field label {
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: rgba(255, 255, 255, 0.8);
                    margin-left: 0.5rem;
                }

                .login-field input {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 0.85rem 1rem;
                    border-radius: 12px;
                    color: white;
                    font-size: 0.95rem;
                    transition: all 0.2s;
                }

                .login-field input:focus {
                    outline: none;
                    border-color: #ff6b6b;
                    background: rgba(255, 255, 255, 0.08);
                    box-shadow: 0 0 0 4px rgba(255, 107, 107, 0.1);
                }

                .login-error {
                    font-size: 0.85rem;
                    color: #ff6b6b;
                    text-align: center;
                    background: rgba(255, 107, 107, 0.1);
                    padding: 0.75rem;
                    border-radius: 10px;
                }

                .login-submit {
                    background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
                    color: white;
                    border: none;
                    padding: 1rem;
                    border-radius: 14px;
                    font-weight: 700;
                    font-size: 1rem;
                    margin-top: 0.5rem;
                    transition: all 0.3s;
                    box-shadow: 0 8px 20px rgba(255, 107, 107, 0.3);
                }

                .login-submit:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 25px rgba(255, 107, 107, 0.4);
                }

                .login-submit:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .hero-login-footer {
                    margin-top: 1.5rem;
                    text-align: center;
                }

                .hero-login-footer a {
                    font-size: 0.85rem;
                    color: rgba(255, 255, 255, 0.5);
                    transition: color 0.2s;
                }

                .hero-login-footer a:hover {
                    color: white;
                }

                .login-divider {
                    text-align: center;
                    font-size: 0.8rem;
                    color: rgba(255, 255, 255, 0.4);
                    margin: 0.25rem 0;
                    position: relative;
                }

                .login-divider::before, 
                .login-divider::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    width: 30%;
                    height: 1px;
                    background: rgba(255, 255, 255, 0.1);
                }

                .login-divider::before { left: 0; }
                .login-divider::after { right: 0; }

                .login-google {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    background: white;
                    color: #333;
                    border: none;
                    padding: 0.85rem;
                    border-radius: 14px;
                    font-weight: 600;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: all 0.3s;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
                }

                .login-google:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.3);
                }

                .login-google:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    )
}
