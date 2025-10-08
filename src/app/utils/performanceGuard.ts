// Garde-fou contre les boucles infinies et les recalculs excessifs
class PerformanceGuard {
    private static instance: PerformanceGuard;
    private callCounts = new Map<string, { count: number; lastReset: number }>();
    private readonly MAX_CALLS_PER_SECOND = 10;
    private readonly RESET_INTERVAL = 1000; // 1 seconde

    static getInstance(): PerformanceGuard {
        if (!PerformanceGuard.instance) {
            PerformanceGuard.instance = new PerformanceGuard();
        }
        return PerformanceGuard.instance;
    }

    // Vérifier si une fonction peut être exécutée
    canExecute(functionName: string): boolean {
        const now = Date.now();
        const callData = this.callCounts.get(functionName);

        if (!callData) {
            this.callCounts.set(functionName, { count: 1, lastReset: now });
            return true;
        }

        // Reset du compteur si l'intervalle est dépassé
        if (now - callData.lastReset > this.RESET_INTERVAL) {
            callData.count = 1;
            callData.lastReset = now;
            return true;
        }

        // Vérifier si le nombre maximum d'appels est atteint
        if (callData.count >= this.MAX_CALLS_PER_SECOND) {
            console.warn(`Performance Guard: ${functionName} appelée trop fréquemment (${callData.count} fois)`);
            return false;
        }

        callData.count++;
        return true;
    }

    // Wrapper pour protéger une fonction
    protect<T extends (...args: any[]) => any>(fn: T, name: string): T {
        return ((...args: any[]) => {
            if (this.canExecute(name)) {
                return fn(...args);
            }
            return undefined;
        }) as T;
    }

    // Reset manuel d'un compteur
    reset(functionName: string): void {
        this.callCounts.delete(functionName);
    }

    // Obtenir les statistiques
    getStats(): Record<string, { count: number; lastReset: number }> {
        const stats: Record<string, { count: number; lastReset: number }> = {};
        for (const [key, value] of this.callCounts.entries()) {
            stats[key] = { ...value };
        }
        return stats;
    }
}

export const performanceGuard = PerformanceGuard.getInstance();

// Hook pour protéger les fonctions React
export const usePerformanceGuard = () => {
    return {
        protect: <T extends (...args: any[]) => any>(fn: T, name: string) => 
            performanceGuard.protect(fn, name),
        canExecute: (name: string) => performanceGuard.canExecute(name),
        reset: (name: string) => performanceGuard.reset(name),
        getStats: () => performanceGuard.getStats()
    };
};