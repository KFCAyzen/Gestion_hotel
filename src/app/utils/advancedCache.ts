// Système de cache avancé avec TTL et invalidation intelligente
interface CacheItem<T> {
    data: T;
    timestamp: number;
    ttl: number;
    accessCount: number;
    lastAccess: number;
    dependencies?: string[];
}

interface CacheConfig {
    maxSize: number;
    defaultTTL: number;
    cleanupInterval: number;
}

class AdvancedCache {
    private cache = new Map<string, CacheItem<any>>();
    private config: CacheConfig;
    private cleanupTimer?: NodeJS.Timeout;
    private hitCount = 0;
    private missCount = 0;

    constructor(config: Partial<CacheConfig> = {}) {
        this.config = {
            maxSize: config.maxSize || 1000,
            defaultTTL: config.defaultTTL || 5 * 60 * 1000, // 5 minutes
            cleanupInterval: config.cleanupInterval || 60 * 1000 // 1 minute
        };
        
        this.startCleanup();
    }

    set<T>(key: string, data: T, ttl?: number, dependencies?: string[]): void {
        // Éviction LRU si nécessaire
        if (this.cache.size >= this.config.maxSize) {
            this.evictLRU();
        }

        const item: CacheItem<T> = {
            data,
            timestamp: Date.now(),
            ttl: ttl || this.config.defaultTTL,
            accessCount: 0,
            lastAccess: Date.now(),
            dependencies
        };

        this.cache.set(key, item);
    }

    get<T>(key: string): T | null {
        const item = this.cache.get(key);
        
        if (!item) {
            this.missCount++;
            return null;
        }

        // Vérifier l'expiration
        if (this.isExpired(item)) {
            this.cache.delete(key);
            this.missCount++;
            return null;
        }

        // Mettre à jour les statistiques d'accès
        item.accessCount++;
        item.lastAccess = Date.now();
        this.hitCount++;

        return item.data as T;
    }

    invalidate(key: string): boolean {
        return this.cache.delete(key);
    }

    invalidateByDependency(dependency: string): number {
        let invalidated = 0;
        
        for (const [key, item] of this.cache.entries()) {
            if (item.dependencies?.includes(dependency)) {
                this.cache.delete(key);
                invalidated++;
            }
        }
        
        return invalidated;
    }

    invalidateByPattern(pattern: RegExp): number {
        let invalidated = 0;
        
        for (const key of this.cache.keys()) {
            if (pattern.test(key)) {
                this.cache.delete(key);
                invalidated++;
            }
        }
        
        return invalidated;
    }

    clear(): void {
        this.cache.clear();
        this.hitCount = 0;
        this.missCount = 0;
    }

    getStats() {
        const total = this.hitCount + this.missCount;
        return {
            size: this.cache.size,
            hitRate: total > 0 ? (this.hitCount / total) * 100 : 0,
            hitCount: this.hitCount,
            missCount: this.missCount,
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    // Méthodes pour le cache intelligent
    async getOrSet<T>(
        key: string, 
        fetcher: () => Promise<T>, 
        ttl?: number,
        dependencies?: string[]
    ): Promise<T> {
        const cached = this.get<T>(key);
        
        if (cached !== null) {
            return cached;
        }

        const data = await fetcher();
        this.set(key, data, ttl, dependencies);
        return data;
    }

    // Préchargement intelligent
    async preload<T>(
        key: string, 
        fetcher: () => Promise<T>,
        ttl?: number,
        dependencies?: string[]
    ): Promise<void> {
        if (!this.cache.has(key)) {
            try {
                const data = await fetcher();
                this.set(key, data, ttl, dependencies);
            } catch (error) {
                console.warn(`Preload failed for key ${key}:`, error);
            }
        }
    }

    // Cache conditionnel
    setConditional<T>(
        key: string, 
        data: T, 
        condition: (existing?: T) => boolean,
        ttl?: number,
        dependencies?: string[]
    ): boolean {
        const existing = this.get<T>(key);
        
        if (condition(existing || undefined)) {
            this.set(key, data, ttl, dependencies);
            return true;
        }
        
        return false;
    }

    private isExpired(item: CacheItem<any>): boolean {
        return Date.now() - item.timestamp > item.ttl;
    }

    private evictLRU(): void {
        let oldestKey = '';
        let oldestAccess = Date.now();

        for (const [key, item] of this.cache.entries()) {
            if (item.lastAccess < oldestAccess) {
                oldestAccess = item.lastAccess;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }

    private startCleanup(): void {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
    }

    private cleanup(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];

        for (const [key, item] of this.cache.entries()) {
            if (this.isExpired(item)) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));
    }

    private estimateMemoryUsage(): number {
        let size = 0;
        
        for (const [key, item] of this.cache.entries()) {
            size += key.length * 2; // UTF-16
            size += JSON.stringify(item.data).length * 2;
            size += 64; // Métadonnées approximatives
        }
        
        return size;
    }

    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.clear();
    }
}

// Instance globale du cache
export const advancedCache = new AdvancedCache({
    maxSize: 2000,
    defaultTTL: 10 * 60 * 1000, // 10 minutes
    cleanupInterval: 2 * 60 * 1000 // 2 minutes
});

// Cache spécialisés
export const dashboardCache = new AdvancedCache({
    maxSize: 100,
    defaultTTL: 2 * 60 * 1000, // 2 minutes
    cleanupInterval: 30 * 1000 // 30 secondes
});

export const analyticsCache = new AdvancedCache({
    maxSize: 500,
    defaultTTL: 15 * 60 * 1000, // 15 minutes
    cleanupInterval: 5 * 60 * 1000 // 5 minutes
});

export const queryCache = new AdvancedCache({
    maxSize: 1000,
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    cleanupInterval: 60 * 1000 // 1 minute
});

// Utilitaires de cache
export const cacheUtils = {
    // Génération de clés de cache intelligentes
    generateKey: (prefix: string, params: Record<string, any>): string => {
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${key}:${JSON.stringify(params[key])}`)
            .join('|');
        return `${prefix}:${sortedParams}`;
    },

    // Invalidation en cascade
    invalidateCascade: (pattern: string, caches: AdvancedCache[] = [advancedCache]) => {
        const regex = new RegExp(pattern);
        let totalInvalidated = 0;
        
        caches.forEach(cache => {
            totalInvalidated += cache.invalidateByPattern(regex);
        });
        
        return totalInvalidated;
    },

    // Statistiques globales
    getGlobalStats: () => {
        return {
            advanced: advancedCache.getStats(),
            dashboard: dashboardCache.getStats(),
            analytics: analyticsCache.getStats(),
            query: queryCache.getStats()
        };
    },

    // Nettoyage global
    clearAll: () => {
        advancedCache.clear();
        dashboardCache.clear();
        analyticsCache.clear();
        queryCache.clear();
    }
};

export default AdvancedCache;