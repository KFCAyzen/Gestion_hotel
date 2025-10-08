import { useMemo } from 'react';

// Hook simplifié pour le cache sans complexité
export const useSimpleCache = () => {
    return useMemo(() => ({
        get: (key: string) => {
            try {
                const item = localStorage.getItem(`cache_${key}`);
                if (!item) return null;
                const parsed = JSON.parse(item);
                if (parsed.expires && Date.now() > parsed.expires) {
                    localStorage.removeItem(`cache_${key}`);
                    return null;
                }
                return parsed.data;
            } catch {
                return null;
            }
        },
        set: (key: string, data: any, ttl: number = 5 * 60 * 1000) => {
            try {
                const item = {
                    data,
                    expires: Date.now() + ttl
                };
                localStorage.setItem(`cache_${key}`, JSON.stringify(item));
            } catch {
                // Ignore cache errors
            }
        },
        clear: () => {
            try {
                const keys = Object.keys(localStorage);
                keys.forEach(key => {
                    if (key.startsWith('cache_')) {
                        localStorage.removeItem(key);
                    }
                });
            } catch {
                // Ignore errors
            }
        }
    }), []);
};