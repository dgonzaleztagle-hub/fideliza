'use client'

import React from 'react'
import { AlertCircle, MessageCircle, Clock } from 'lucide-react'

interface StatusAlertProps {
    tenant: {
        nombre: string
        slug: string
        plan: string
        trial_hasta?: string
        estado: string
    }
}

export default function StatusAlert({ tenant }: StatusAlertProps) {
    const isTrial = tenant.plan === 'trial'
    const isPausado = tenant.estado === 'pausado'
    const trialHasta = tenant.trial_hasta ? new Date(tenant.trial_hasta) : null
    const hoy = new Date()

    // Calcular días restantes de trial
    const diasRestantes = trialHasta
        ? Math.ceil((trialHasta.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
        : 0

    const isVencido = isTrial && diasRestantes <= 0

    // WhatsApp Link
    const waLink = "https://wa.me/56972739105?text=hola%20necesito%20pagar%20la%20suscripcion%20de%20vuelve%2B"

    if (!isTrial && !isPausado) return null

    return (
        <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`status-alert-banner ${isPausado || isVencido ? 'status-error' : 'status-warning'}`}
        >
            <div className="status-alert-content">
                <div className="status-alert-icon">
                    {isPausado || isVencido ? <AlertCircle size={20} /> : <Clock size={20} />}
                </div>
                <div className="status-alert-text">
                    {isPausado ? (
                        <>
                            <strong>Servicio Pausado.</strong> Haz click aquí para gestionar tu pago de suscripción vía WhatsApp.
                        </>
                    ) : isVencido ? (
                        <>
                            <strong>Trial Finalizado.</strong> Tu periodo de prueba ha terminado. Haz click aquí para activar tu plan Pro.
                        </>
                    ) : (
                        <>
                            <strong>Periodo de Prueba Activo.</strong> Te quedan {diasRestantes} días. Haz click aquí para asegurar tu servicio Pro.
                        </>
                    )}
                </div>
                <div className="status-alert-whatsapp">
                    <MessageCircle size={18} />
                    <span>Contactar</span>
                </div>
            </div>

            <style jsx>{`
                .status-alert-banner {
                    display: block;
                    width: 100%;
                    padding: 0.75rem 1rem;
                    text-decoration: none;
                    transition: all 0.2s ease;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                }

                .status-alert-content {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .status-alert-text {
                    flex: 1;
                    font-size: 0.9rem;
                    line-height: 1.4;
                }

                .status-warning {
                    background: rgba(245, 158, 11, 0.1);
                    border: 1px solid rgba(245, 158, 11, 0.2);
                    color: #f59e0b;
                }

                .status-warning:hover {
                    background: rgba(245, 158, 11, 0.15);
                }

                .status-error {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    color: #f87171;
                }

                .status-error:hover {
                    background: rgba(239, 68, 68, 0.15);
                }

                .status-alert-whatsapp {
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 0.4rem 0.75rem;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 700;
                }

                @media (max-width: 600px) {
                    .status-alert-whatsapp span {
                        display: none;
                    }
                }
            `}</style>
        </a>
    )
}
