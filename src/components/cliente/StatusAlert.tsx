'use client'

import React from 'react'
import { AlertCircle, MessageCircle, Clock } from 'lucide-react'
import { PLAN_CATALOG, getEffectiveBillingPlan } from '@/lib/plans'

interface StatusAlertProps {
    tenant: {
        nombre: string
        slug: string
        plan: string
        selected_plan?: string | null
        trial_hasta?: string
        estado: string
    }
    onUpgrade?: () => void
    supportLink?: string
}

export default function StatusAlert({ tenant, onUpgrade, supportLink }: StatusAlertProps) {
    const isTrial = tenant.plan === 'trial'
    const planObjetivo = getEffectiveBillingPlan(tenant.plan, tenant.selected_plan)
    const isPausado = tenant.estado === 'pausado'
    const trialHasta = tenant.trial_hasta ? new Date(tenant.trial_hasta) : null
    const hoy = new Date()

    // Calcular días restantes de trial
    const diasRestantes = trialHasta
        ? Math.ceil((trialHasta.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
        : 0

    const isVencido = isTrial && diasRestantes <= 0

    const waLink = supportLink || "https://wa.me/56972739105?text=hola%20necesito%20hablar%20con%20soporte%20de%20vuelve%2B"

    if (!isTrial && !isPausado) return null

    return (
        <div
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
                            <strong>Trial Finalizado.</strong> Tu periodo de prueba ha terminado. Activa {PLAN_CATALOG[planObjetivo].label} para continuar.
                        </>
                    ) : (
                        <>
                            <strong>Periodo de Prueba Activo.</strong> Te quedan {diasRestantes} días. Activa {PLAN_CATALOG[planObjetivo].label} para no interrumpir servicio.
                        </>
                    )}
                </div>
                <div className="status-alert-actions">
                    {onUpgrade && (
                        <button type="button" className="status-alert-pay" onClick={onUpgrade}>
                            💳 Pagar con Flow
                        </button>
                    )}
                    <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="status-alert-whatsapp"
                    >
                        <MessageCircle size={18} />
                        <span>Soporte / Transferencia</span>
                    </a>
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
                    justify-content: space-between;
                }

                .status-alert-text {
                    flex: 1;
                    font-size: 0.9rem;
                    line-height: 1.4;
                }

                .status-alert-actions {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                    justify-content: flex-end;
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

                .status-alert-pay {
                    border: none;
                    cursor: pointer;
                    background: #0f766e;
                    color: #fff;
                    padding: 0.4rem 0.8rem;
                    border-radius: 999px;
                    font-size: 0.8rem;
                    font-weight: 700;
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
                    text-decoration: none;
                    color: inherit;
                }

                @media (max-width: 600px) {
                    .status-alert-content {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    .status-alert-actions {
                        width: 100%;
                        justify-content: flex-start;
                    }
                    .status-alert-whatsapp span {
                        display: inline;
                    }
                }
            `}</style>
        </div>
    )
}
