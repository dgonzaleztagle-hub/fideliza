export interface Insight {
    type: 'alert' | 'info' | 'success' | 'opportunity';
    title: string;
    message: string;
    action?: string;
}

export function generateAdvisorInsights(stats: any, topClientes: any[]): Insight[] {
    const insights: Insight[] = [];

    // 1. Heurística de Retención
    if (stats.tasaRetencion < 40) {
        insights.push({
            type: 'alert',
            title: 'Alerta de Retención',
            message: 'Tu tasa de retorno es baja (menor al 40%). Muchos clientes vienen una vez y no vuelven.',
            action: 'Envía un mensaje de "Te extrañamos" con un beneficio exclusivo.'
        });
    } else if (stats.tasaRetencion > 70) {
        insights.push({
            type: 'success',
            title: 'Fidelización Impecable',
            message: '¡Excelente! Más del 70% de tus clientes son recurrentes. Tienes una comunidad muy sólida.',
            action: 'Podrías probar subir un poco el ticket promedio ofreciendo un "Upgrade" de premio.'
        });
    }

    // 2. Heurística de Referidos
    if (stats.totalReferidos < 3) {
        insights.push({
            type: 'opportunity',
            title: 'Motor de Referidos Inactivo',
            message: 'Casi no tienes nuevos clientes por recomendación.',
            action: 'Ofrece 2 sellos de regalo a quien traiga un amigo.'
        });
    }

    // 3. Heurística de Clientes VIP
    if (topClientes.length > 0 && topClientes[0].total_puntos_historicos > 30) {
        insights.push({
            type: 'opportunity',
            title: 'Ocasión VIP: ' + topClientes[0].nombre,
            message: `${topClientes[0].nombre} es tu cliente más fiel. Ha sumado ${topClientes[0].total_puntos_historicos} puntos.`,
            action: 'Envíale un regalo sorpresa vía WhatsApp para asegurar su recomendación.'
        });
    }

    // 4. Heurística de Volumen
    if (stats.totalClientes > 50 && stats.totalPremiosCanjeados < 5) {
        insights.push({
            type: 'info',
            title: 'Barrera de Canje',
            message: 'Tienes muchos clientes pero muy pocos están llegando al premio final.',
            action: 'Prueba bajar la meta de puntos temporalmente para que sientan el beneficio rápido.'
        });
    }

    // Si no hay nada específico, dar uno genérico de bienvenida
    if (insights.length === 0) {
        insights.push({
            type: 'info',
            title: 'Analizando Datos...',
            message: 'Sigue registrando visitas para que pueda darte consejos más precisos.',
            action: 'Registra al menos 10 clientes para ver el primer informe.'
        });
    }

    return insights;
}
