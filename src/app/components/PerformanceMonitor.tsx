'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import { useAdvancedPerformance } from '../hooks/useAdvancedPerformance';
import { cacheUtils } from '../utils/advancedCache';
import { dbIndexing } from '../utils/databaseIndexing';

const PerformanceMonitor = () => {
    const [showMonitor, setShowMonitor] = useState(false);
    const [performanceData, setPerformanceData] = useState<any>(null);
    const { getPerformanceReport } = useAdvancedPerformance('PerformanceMonitor');

    useEffect(() => {
        if (showMonitor) {
            const interval = setInterval(() => {
                updatePerformanceData();
            }, 2000); // Réduit à 2 secondes pour éviter la surcharge

            return () => clearInterval(interval);
        }
    }, [showMonitor]);

    const updatePerformanceData = useCallback(async () => {
        try {
            const report = getPerformanceReport();
            const cacheStats = cacheUtils.getGlobalStats();
            const queryReport = dbIndexing.getQueryPerformanceReport();

            setPerformanceData(prev => {
                const newData = {
                    ...report,
                    cacheStats,
                    queryReport,
                    timestamp: Date.now()
                };
                
                // Éviter les mises à jour inutiles
                if (prev && JSON.stringify(prev) === JSON.stringify(newData)) {
                    return prev;
                }
                
                return newData;
            });
        } catch (error) {
            console.error('Error updating performance data:', error);
        }
    }, [getPerformanceReport]);

    const clearAllCaches = () => {
        cacheUtils.clearAll();
        updatePerformanceData();
    };

    if (!showMonitor) {
        return (
            <button
                onClick={() => setShowMonitor(true)}
                className="fixed bottom-4 left-4 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
                title="Ouvrir le moniteur de performance"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 left-4 bg-white border border-slate-200 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto z-50">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800">Performance Monitor</h3>
                <button
                    onClick={() => setShowMonitor(false)}
                    className="text-slate-400 hover:text-slate-600"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {performanceData && (
                <div className="space-y-3">
                    {/* Métriques de base */}
                    <div className="bg-slate-50 p-3 rounded">
                        <h4 className="text-sm font-medium text-slate-700 mb-2">Métriques Composant</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <span className="text-slate-600">Render:</span>
                                <span className={`ml-1 font-medium ${
                                    performanceData.metrics.renderTime > 100 ? 'text-red-600' : 
                                    performanceData.metrics.renderTime > 50 ? 'text-yellow-600' : 'text-green-600'
                                }`}>
                                    {performanceData.metrics.renderTime.toFixed(1)}ms
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-600">Query:</span>
                                <span className={`ml-1 font-medium ${
                                    performanceData.metrics.queryTime > 500 ? 'text-red-600' : 
                                    performanceData.metrics.queryTime > 200 ? 'text-yellow-600' : 'text-green-600'
                                }`}>
                                    {performanceData.metrics.queryTime.toFixed(1)}ms
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-600">Re-renders:</span>
                                <span className="ml-1 font-medium text-slate-800">
                                    {performanceData.metrics.reRenders}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-600">Mounts:</span>
                                <span className="ml-1 font-medium text-slate-800">
                                    {performanceData.metrics.componentMounts}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Statistiques de cache */}
                    <div className="bg-slate-50 p-3 rounded">
                        <h4 className="text-sm font-medium text-slate-700 mb-2">Cache Performance</h4>
                        <div className="space-y-1 text-xs">
                            {Object.entries(performanceData.cacheStats).map(([cacheName, stats]: [string, any]) => (
                                <div key={cacheName} className="flex justify-between">
                                    <span className="text-slate-600 capitalize">{cacheName}:</span>
                                    <span className={`font-medium ${
                                        stats.hitRate > 70 ? 'text-green-600' : 
                                        stats.hitRate > 40 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                        {stats.hitRate.toFixed(1)}% ({stats.size})
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Requêtes lentes */}
                    {Object.keys(performanceData.queryReport).length > 0 && (
                        <div className="bg-slate-50 p-3 rounded">
                            <h4 className="text-sm font-medium text-slate-700 mb-2">Requêtes</h4>
                            <div className="space-y-1 text-xs max-h-20 overflow-y-auto">
                                {Object.entries(performanceData.queryReport).slice(0, 3).map(([query, stats]: [string, any]) => (
                                    <div key={query} className="flex justify-between">
                                        <span className="text-slate-600 truncate">{query.split('_')[0]}:</span>
                                        <span className={`font-medium ${
                                            stats.averageTime > 500 ? 'text-red-600' : 
                                            stats.averageTime > 200 ? 'text-yellow-600' : 'text-green-600'
                                        }`}>
                                            {stats.averageTime.toFixed(0)}ms
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recommandations */}
                    {performanceData.recommendations && performanceData.recommendations.length > 0 && (
                        <div className="bg-yellow-50 p-3 rounded">
                            <h4 className="text-sm font-medium text-yellow-800 mb-2">Recommandations</h4>
                            <ul className="text-xs text-yellow-700 space-y-1">
                                {performanceData.recommendations.slice(0, 2).map((rec: string, index: number) => (
                                    <li key={index} className="flex items-start gap-1">
                                        <span className="text-yellow-600">•</span>
                                        <span className="flex-1">{rec}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setPerformanceData(null);
                                updatePerformanceData();
                            }}
                            className="flex-1 px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                        >
                            Actualiser
                        </button>
                        <button
                            onClick={clearAllCaches}
                            className="flex-1 px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
                        >
                            Vider Cache
                        </button>
                    </div>

                    {/* Timestamp */}
                    <div className="text-xs text-slate-400 text-center">
                        Mis à jour: {new Date(performanceData.timestamp).toLocaleTimeString()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(PerformanceMonitor);