import { useState, useEffect, useCallback, useRef } from 'react';
import { advancedCache, dashboardCache, analyticsCache } from '../utils/advancedCache';
import { dbIndexing, queryOptimizer } from '../utils/databaseIndexing';
import { dataConsolidation } from '../utils/dataConsolidation';

interface PerformanceMetrics {
    renderTime: number;
    queryTime: number;
    cacheHitRate: number;
    memoryUsage: number;
    componentMounts: number;
    reRenders: number;
}

interface WebWorkerTask {
    id: string;
    type: string;
    data: any;
    priority: number;
    timestamp: number;
}

export const useAdvancedPerformance = (componentName: string) => {
    const [metrics, setMetrics] = useState<PerformanceMetrics>({
        renderTime: 0,
        queryTime: 0,
        cacheHitRate: 0,
        memoryUsage: 0,
        componentMounts: 0,
        reRenders: 0
    });

    const [isOptimizing, setIsOptimizing] = useState(false);
    const renderStartTime = useRef<number>(0);
    const mountCount = useRef<number>(0);
    const renderCount = useRef<number>(0);
    const workerRef = useRef<Worker | null>(null);
    const taskQueue = useRef<WebWorkerTask[]>([]);

    // Initialiser le web worker
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Worker' in window) {
            try {
                workerRef.current = new Worker('/dataWorker.js');
                
                workerRef.current.onmessage = (e) => {
                    handleWorkerMessage(e.data);
                };

                workerRef.current.onerror = (error) => {
                    console.error('Web Worker error:', error);
                };
            } catch (error) {
                console.warn('Web Worker not available:', error);
            }
        }

        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
            }
        };
    }, []);

    // Mesurer les performances de rendu
    useEffect(() => {
        renderStartTime.current = performance.now();
        mountCount.current++;
        renderCount.current++;
    }, [componentName]);

    // Traitement des messages du web worker
    const handleWorkerMessage = useCallback((message: any) => {
        const { type, data, error } = message;

        if (error) {
            console.error('Worker error:', error);
            return;
        }

        switch (type) {
            case 'DASHBOARD_DATA_PROCESSED':
                // Données du dashboard traitées
                advancedCache.set(`dashboard_${componentName}`, data, 2 * 60 * 1000);
                break;
            case 'ANALYTICS_CALCULATED':
                // Analytics calculées
                analyticsCache.set(`analytics_${componentName}`, data, 15 * 60 * 1000);
                break;
            case 'BATCH_PROGRESS':
                // Progression du traitement par batch
                console.log(`Batch progress: ${data.progress}%`);
                break;
            case 'BATCH_COMPLETED':
                setIsOptimizing(false);
                break;
        }
    }, [componentName]);

    // Exécuter une tâche dans le web worker
    const executeWorkerTask = useCallback((type: string, data: any, priority: number = 1) => {
        if (!workerRef.current) {
            console.warn('Web Worker not available');
            return Promise.reject(new Error('Web Worker not available'));
        }

        const task: WebWorkerTask = {
            id: `${Date.now()}_${Math.random()}`,
            type,
            data,
            priority,
            timestamp: Date.now()
        };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Worker task timeout'));
            }, 30000); // 30 secondes timeout

            const messageHandler = (e: MessageEvent) => {
                if (e.data.taskId === task.id) {
                    clearTimeout(timeout);
                    workerRef.current?.removeEventListener('message', messageHandler);
                    
                    if (e.data.error) {
                        reject(new Error(e.data.error));
                    } else {
                        resolve(e.data.data);
                    }
                }
            };

            workerRef.current?.addEventListener('message', messageHandler);
            workerRef.current?.postMessage({ ...task, taskId: task.id });
        });
    }, []);

    // Optimisation automatique des données
    const optimizeData = useCallback(async (data: any, type: 'dashboard' | 'analytics' | 'queries') => {
        setIsOptimizing(true);
        
        try {
            switch (type) {
                case 'dashboard':
                    return await executeWorkerTask('PROCESS_DASHBOARD_DATA', data, 1);
                case 'analytics':
                    return await executeWorkerTask('CALCULATE_ANALYTICS', data, 2);
                case 'queries':
                    return await executeWorkerTask('OPTIMIZE_QUERIES', data, 3);
                default:
                    return data;
            }
        } catch (error) {
            console.error('Data optimization failed:', error);
            return data;
        } finally {
            setIsOptimizing(false);
        }
    }, [executeWorkerTask]);

    // Cache intelligent avec invalidation
    const smartCache = useCallback({
        get: <T>(key: string, fallback?: T): T | null => {
            const cached = advancedCache.get<T>(key);
            return cached !== null ? cached : fallback || null;
        },

        set: <T>(key: string, data: T, ttl?: number, dependencies?: string[]): void => {
            advancedCache.set(key, data, ttl, dependencies);
        },

        invalidate: (pattern: string): number => {
            return advancedCache.invalidateByPattern(new RegExp(pattern));
        },

        getOrSet: async <T>(
            key: string, 
            fetcher: () => Promise<T>, 
            ttl?: number
        ): Promise<T> => {
            return advancedCache.getOrSet(key, fetcher, ttl);
        }
    }, []);

    // Requêtes optimisées avec consolidation
    const optimizedQuery = useCallback(async (
        collection: string,
        constraints: any[] = [],
        options: {
            cache?: boolean;
            cacheKey?: string;
            ttl?: number;
            useConsolidated?: boolean;
        } = {}
    ) => {
        const startTime = performance.now();
        
        try {
            let result;
            
            // Utiliser les données consolidées si demandé
            if (options.useConsolidated) {
                const consolidatedData = await dataConsolidation.getAllData();
                result = consolidatedData[collection as keyof typeof consolidatedData] || [];
            } else if (options.cache && options.cacheKey) {
                // Requête avec cache
                result = await smartCache.getOrSet(
                    options.cacheKey,
                    async () => {
                        const consolidatedData = await dataConsolidation.getAllData();
                        return consolidatedData[collection as keyof typeof consolidatedData] || [];
                    },
                    options.ttl
                );
            } else {
                // Fallback sur les données consolidées
                const consolidatedData = await dataConsolidation.getAllData();
                result = consolidatedData[collection as keyof typeof consolidatedData] || [];
            }
            
            const queryTime = performance.now() - startTime;
            updateMetrics({ queryTime });
            
            return result;
        } catch (error) {
            console.error('Optimized query failed:', error);
            // Fallback sur localStorage
            return JSON.parse(localStorage.getItem(collection) || '[]');
        }
    }, [smartCache]);

    // Batch processing optimisé
    const batchProcess = useCallback(async (operations: any[], batchSize: number = 50) => {
        setIsOptimizing(true);
        
        try {
            return await executeWorkerTask('BATCH_OPERATIONS', operations, 1);
        } finally {
            setIsOptimizing(false);
        }
    }, [executeWorkerTask]);

    // Préchargement intelligent avec consolidation
    const preloadData = useCallback(async (collections: string[] = ['rooms', 'clients', 'reservations', 'bills']) => {
        try {
            // Précharger les données consolidées
            await dataConsolidation.getAllData();
            
            // Précharger dans le cache avancé
            const consolidatedData = await dataConsolidation.getAllData();
            collections.forEach(collection => {
                const data = consolidatedData[collection as keyof typeof consolidatedData];
                if (data) {
                    smartCache.set(`${collection}_preloaded`, data, 10 * 60 * 1000);
                }
            });
        } catch (error) {
            console.error('Preload failed:', error);
        }
    }, [smartCache]);

    // Mise à jour des métriques avec protection contre les boucles infinies
    const updateMetricsRef = useRef<(newMetrics: Partial<PerformanceMetrics>) => void>();
    
    updateMetricsRef.current = (newMetrics: Partial<PerformanceMetrics>) => {
        setMetrics(prev => {
            const updated = { ...prev, ...newMetrics };
            
            // Calculer le taux de cache hit seulement si nécessaire
            try {
                const cacheStats = advancedCache.getStats();
                updated.cacheHitRate = cacheStats.hitRate || 0;
                updated.memoryUsage = cacheStats.memoryUsage || 0;
            } catch (error) {
                // Ignorer les erreurs de cache
            }
            
            updated.componentMounts = mountCount.current;
            updated.reRenders = renderCount.current;
            
            return updated;
        });
    };
    
    const updateMetrics = useCallback((newMetrics: Partial<PerformanceMetrics>) => {
        updateMetricsRef.current?.(newMetrics);
    }, []);

    // Nettoyage et optimisation automatique
    const cleanup = useCallback(() => {
        try {
            // Nettoyer tous les caches
            advancedCache.clear();
            dashboardCache.clear();
            analyticsCache.clear();
            dataConsolidation.clearCache();
            
            // Réinitialiser les compteurs
            mountCount.current = 0;
            renderCount.current = 0;
            
            // Réinitialiser les métriques directement
            setMetrics({
                renderTime: 0,
                queryTime: 0,
                cacheHitRate: 0,
                memoryUsage: 0,
                componentMounts: 0,
                reRenders: 0
            });
        } catch (error) {
            console.error('Cleanup failed:', error);
        }
    }, []);

    // Rapport de performance détaillé
    const getPerformanceReport = useCallback(() => {
        const cacheStats = {
            advanced: advancedCache.getStats(),
            dashboard: dashboardCache.getStats(),
            analytics: analyticsCache.getStats()
        };
        
        const queryReport = dbIndexing.getQueryPerformanceReport();
        
        return {
            component: componentName,
            metrics,
            cacheStats,
            queryReport,
            recommendations: generateRecommendations(metrics, cacheStats)
        };
    }, [componentName, metrics]);

    // Générer des recommandations d'optimisation
    const generateRecommendations = (
        metrics: PerformanceMetrics, 
        cacheStats: any
    ): string[] => {
        const recommendations: string[] = [];
        
        if (metrics.renderTime > 100) {
            recommendations.push('Considérer la mémorisation des composants avec React.memo');
        }
        
        if (metrics.queryTime > 500) {
            recommendations.push('Optimiser les requêtes de base de données avec des index');
        }
        
        if (cacheStats.advanced.hitRate < 50) {
            recommendations.push('Améliorer la stratégie de mise en cache');
        }
        
        if (metrics.reRenders > 10) {
            recommendations.push('Réduire les re-rendus inutiles avec useCallback et useMemo');
        }
        
        if (metrics.memoryUsage > 10 * 1024 * 1024) { // 10MB
            recommendations.push('Optimiser l\'utilisation mémoire du cache');
        }
        
        return recommendations;
    };

    return {
        metrics,
        isOptimizing,
        optimizeData,
        smartCache,
        optimizedQuery,
        batchProcess,
        preloadData,
        cleanup,
        getPerformanceReport,
        executeWorkerTask,
        // Nouvelles fonctions consolidées
        syncData: () => dataConsolidation.syncData(),
        getConsolidatedStats: () => dataConsolidation.getStats()
    };
};

export default useAdvancedPerformance;