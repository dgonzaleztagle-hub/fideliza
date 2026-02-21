'use client'

import React, { useState, useEffect } from 'react'
import { Star, MessageSquare, Send, CheckCircle } from 'lucide-react'
import { useParams } from 'next/navigation'
import './review.css'

export default function ReviewPage() {
    const params = useParams()
    const slug = params.slug as string
    const [rating, setRating] = useState(0)
    const [hover, setHover] = useState(0)
    const [comment, setComment] = useState('')
    const [status, setStatus] = useState<'rating' | 'feedback' | 'thanks'>('rating')
    const [tenant, setTenant] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchTenant()
    }, [slug])

    const fetchTenant = async () => {
        try {
            const res = await fetch(`/api/tenant/${slug}`)
            if (res.ok) {
                const data = await res.json()
                setTenant(data.tenant)
            }
        } catch (err) {
            console.error('Error fetching tenant:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleRating = (value: number) => {
        setRating(value)
        if (value >= 4) {
            // Alta calificación -> Redirigir a Google si existe
            if (tenant?.google_business_url) {
                setTimeout(() => {
                    window.location.href = tenant.google_business_url
                }, 1000)
            }
            setStatus('thanks')
        } else {
            // Calificación media/baja -> Pedir feedback privado
            setStatus('feedback')
        }
    }

    const handleSubmitFeedback = async () => {
        if (!comment.trim()) {
            return
        }
        try {
            const res = await fetch('/api/review/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slug,
                    rating,
                    comment: comment.trim()
                })
            })

            if (!res.ok) {
                const data = await res.json()
                alert(data.error || 'No pudimos guardar tu comentario')
                return
            }
            setStatus('thanks')
        } catch {
            alert('Error de conexión al enviar comentario')
        }
    }

    if (loading) return <div className="review-loading">Cargando...</div>
    if (!tenant) return <div className="review-error">Negocio no encontrado</div>

    return (
        <div className="review-container" style={{ '--primary-color': tenant.color_primario || '#6366f1' } as any}>
            <div className="review-card">
                <div className="review-header">
                    {tenant.logo_url && <img src={tenant.logo_url} alt={tenant.nombre} className="review-logo" />}
                    <h1>¿Cómo fue tu experiencia en {tenant.nombre}?</h1>
                    <p>Tu opinión nos ayuda a mejorar cada día.</p>
                </div>

                {status === 'rating' && (
                    <div className="rating-section">
                        <div className="stars-container">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    className={`star-btn ${(hover || rating) >= star ? 'active' : ''}`}
                                    onMouseEnter={() => setHover(star)}
                                    onMouseLeave={() => setHover(0)}
                                    onClick={() => handleRating(star)}
                                >
                                    <Star fill={(hover || rating) >= star ? 'currentColor' : 'none'} />
                                </button>
                            ))}
                        </div>
                        <div className="rating-labels">
                            <span>Mala</span>
                            <span>Excelente</span>
                        </div>
                    </div>
                )}

                {status === 'feedback' && (
                    <div className="feedback-section">
                        <div className="feedback-icon">
                            <MessageSquare size={48} />
                        </div>
                        <h2>Cuéntanos qué falló</h2>
                        <p>Lamentamos que no haya sido perfecto. Tu mensaje llegará directo al dueño de forma privada.</p>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Escribe tu mensaje aquí..."
                            rows={4}
                        />
                        <button className="submit-btn" onClick={handleSubmitFeedback}>
                            <Send size={18} /> Enviar Comentario
                        </button>
                    </div>
                )}

                {status === 'thanks' && (
                    <div className="thanks-section">
                        <div className="thanks-icon">
                            <CheckCircle size={64} color="#22c55e" />
                        </div>
                        <h2>¡Muchas gracias!</h2>
                        <p>Tu feedback es invaluable para nosotros.</p>
                        {rating >= 4 && tenant.google_business_url && (
                            <p className="redirect-hint">Redirigiéndote a nuestras reseñas oficiales...</p>
                        )}
                        <button className="close-btn" onClick={() => window.close()}>
                            Cerrar
                        </button>
                    </div>
                )}
            </div>
            <div className="review-footer">
                Potenciado por <span>Vuelve+</span>
            </div>
        </div>
    )
}
