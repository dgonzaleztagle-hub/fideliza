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
        } catch {
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

            `}</style>
        </div>
    )
}
