export type Tier = 'bronce' | 'plata' | 'oro';

interface TierThresholds {
    plata: number;
    oro: number;
}

const THRESHOLDS: TierThresholds = {
    plata: 30, // 30 puntos históricos
    oro: 100   // 100 puntos históricos
};

/**
 * Calcula el rango basado en puntos históricos
 */
export function calculateTier(totalPoints: number): Tier {
    if (totalPoints >= THRESHOLDS.oro) return 'oro';
    if (totalPoints >= THRESHOLDS.plata) return 'plata';
    return 'bronce';
}

/**
 * Gestiona el sistema de rachas (Streaks) basado en semanas
 */
export function processStreak(lastVisitAt: string | null, currentStreak: number): { newStreak: number; streakUpdated: boolean } {
    if (!lastVisitAt) {
        return { newStreak: 1, streakUpdated: true };
    }

    const lastVisit = new Date(lastVisitAt);
    const now = new Date();

    // Calculamos la diferencia en semanas
    const diffTime = Math.abs(now.getTime() - lastVisit.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Si la última visita fue hace menos de 7 días, es la misma racha o todavía no cuenta para la siguiente semana
    if (diffDays < 7) {
        // Si visitó en la misma semana calendario, mantenemos la racha pero no sumamos
        return { newStreak: currentStreak, streakUpdated: false };
    }

    // Si la última visita fue hace entre 7 y 14 días, la racha continúa (semana siguiente)
    if (diffDays >= 7 && diffDays <= 14) {
        return { newStreak: currentStreak + 1, streakUpdated: true };
    }

    // Si pasó más de 14 días, la racha se rompe y reinicia
    return { newStreak: 1, streakUpdated: true };
}

/**
 * Retorna el ícono visual del rango
 */
export function getTierBadge(tier: Tier): string {
    switch (tier) {
        case 'oro': return '🥇';
        case 'plata': return '🥈';
        default: return '🥉';
    }
}
