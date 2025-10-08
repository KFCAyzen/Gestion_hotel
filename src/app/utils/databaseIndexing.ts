// Système d'indexation et d'optimisation des requêtes Firebase
import { collection, query, where, orderBy, limit, startAfter, getDocs, QueryConstraint } from 'firebase/firestore';
import { db } from '../firebase';

interface IndexDefinition {
    collection: string;
    fields: string[];
    type: 'single' | 'composite';
    priority: number;
}

interface QueryOptimization {
    originalQuery: any;
    optimizedQuery: any;
    estimatedImprovement: number;
    suggestedIndexes: IndexDefinition[];
}

class DatabaseIndexing {
    private indexes: Map<string, IndexDefinition[]> = new Map();
    private queryStats: Map<string, { count: number; avgTime: number; lastUsed: number }> = new Map();

    constructor() {
        this.initializeRecommendedIndexes();
    }

    // Initialiser les index recommandés pour l'application hôtelière
    private initializeRecommendedIndexes(): void {
        const recommendedIndexes: IndexDefinition[] = [
            // Réservations
            { collection: 'reservations', fields: ['status'], type: 'single', priority: 1 },
            { collection: 'reservations', fields: ['checkIn'], type: 'single', priority: 2 },
            { collection: 'reservations', fields: ['checkOut'], type: 'single', priority: 2 },
            { collection: 'reservations', fields: ['clientId'], type: 'single', priority: 3 },
            { collection: 'reservations', fields: ['status', 'checkIn'], type: 'composite', priority: 1 },
            { collection: 'reservations', fields: ['clientId', 'status'], type: 'composite', priority: 2 },
            { collection: 'reservations', fields: ['createdAt', 'status'], type: 'composite', priority: 2 },

            // Chambres
            { collection: 'rooms', fields: ['status'], type: 'single', priority: 1 },
            { collection: 'rooms', fields: ['category'], type: 'single', priority: 2 },
            { collection: 'rooms', fields: ['floor'], type: 'single', priority: 3 },
            { collection: 'rooms', fields: ['status', 'category'], type: 'composite', priority: 1 },
            { collection: 'rooms', fields: ['category', 'floor'], type: 'composite', priority: 2 },

            // Facturation
            { collection: 'billing', fields: ['createdAt'], type: 'single', priority: 1 },
            { collection: 'billing', fields: ['clientId'], type: 'single', priority: 2 },
            { collection: 'billing', fields: ['serviceType'], type: 'single', priority: 2 },
            { collection: 'billing', fields: ['status'], type: 'single', priority: 3 },
            { collection: 'billing', fields: ['createdAt', 'serviceType'], type: 'composite', priority: 1 },
            { collection: 'billing', fields: ['clientId', 'createdAt'], type: 'composite', priority: 2 },

            // Clients
            { collection: 'clients', fields: ['createdAt'], type: 'single', priority: 2 },
            { collection: 'clients', fields: ['phone'], type: 'single', priority: 1 },
            { collection: 'clients', fields: ['email'], type: 'single', priority: 2 },

            // Personnel
            { collection: 'staff', fields: ['status'], type: 'single', priority: 1 },
            { collection: 'staff', fields: ['role'], type: 'single', priority: 2 },
            { collection: 'schedules', fields: ['staffId'], type: 'single', priority: 1 },
            { collection: 'schedules', fields: ['date'], type: 'single', priority: 1 },
            { collection: 'schedules', fields: ['staffId', 'date'], type: 'composite', priority: 1 },

            // Tâches
            { collection: 'tasks', fields: ['status'], type: 'single', priority: 1 },
            { collection: 'tasks', fields: ['assignedTo'], type: 'single', priority: 1 },
            { collection: 'tasks', fields: ['dueDate'], type: 'single', priority: 2 },
            { collection: 'tasks', fields: ['priority'], type: 'single', priority: 3 },
            { collection: 'tasks', fields: ['status', 'assignedTo'], type: 'composite', priority: 1 },

            // Historique
            { collection: 'activityLog', fields: ['timestamp'], type: 'single', priority: 1 },
            { collection: 'activityLog', fields: ['userId'], type: 'single', priority: 2 },
            { collection: 'activityLog', fields: ['action'], type: 'single', priority: 3 },
            { collection: 'activityLog', fields: ['timestamp', 'userId'], type: 'composite', priority: 1 }
        ];

        // Grouper par collection
        recommendedIndexes.forEach(index => {
            if (!this.indexes.has(index.collection)) {
                this.indexes.set(index.collection, []);
            }
            this.indexes.get(index.collection)!.push(index);
        });
    }

    // Optimiser une requête
    optimizeQuery(collectionName: string, constraints: any[]): QueryOptimization {
        const startTime = performance.now();
        
        // Analyser les contraintes de la requête
        const queryFields = this.extractQueryFields(constraints);
        const availableIndexes = this.indexes.get(collectionName) || [];
        
        // Trouver le meilleur index
        const bestIndex = this.findBestIndex(queryFields, availableIndexes);
        
        // Générer des suggestions d'optimisation
        const suggestions = this.generateOptimizationSuggestions(queryFields, availableIndexes);
        
        const endTime = performance.now();
        
        // Enregistrer les statistiques
        this.recordQueryStats(collectionName, endTime - startTime);

        return {
            originalQuery: constraints,
            optimizedQuery: this.buildOptimizedQuery(constraints, bestIndex),
            estimatedImprovement: this.calculateImprovement(queryFields, bestIndex),
            suggestedIndexes: suggestions
        };
    }

    // Construire une requête optimisée
    buildOptimizedQuery(constraints: any[], bestIndex?: IndexDefinition): QueryConstraint[] {
        const optimizedConstraints: QueryConstraint[] = [];
        
        // Réorganiser les contraintes selon l'index optimal
        if (bestIndex) {
            // Placer les contraintes indexées en premier
            const indexedConstraints = constraints.filter(c => 
                bestIndex.fields.includes(this.getFieldFromConstraint(c))
            );
            const otherConstraints = constraints.filter(c => 
                !bestIndex.fields.includes(this.getFieldFromConstraint(c))
            );
            
            optimizedConstraints.push(...indexedConstraints, ...otherConstraints);
        } else {
            optimizedConstraints.push(...constraints);
        }

        return optimizedConstraints;
    }

    // Requête paginée optimisée
    async getPaginatedData(
        collectionName: string,
        constraints: QueryConstraint[],
        pageSize: number = 20,
        lastDoc?: any
    ) {
        const optimization = this.optimizeQuery(collectionName, constraints);
        
        let q = query(collection(db, collectionName), ...optimization.optimizedQuery);
        
        if (lastDoc) {
            q = query(q, startAfter(lastDoc));
        }
        
        q = query(q, limit(pageSize));
        
        const startTime = performance.now();
        const snapshot = await getDocs(q);
        const endTime = performance.now();
        
        // Enregistrer les performances
        this.recordQueryStats(`${collectionName}_paginated`, endTime - startTime);
        
        return {
            docs: snapshot.docs,
            lastDoc: snapshot.docs[snapshot.docs.length - 1],
            hasMore: snapshot.docs.length === pageSize,
            queryTime: endTime - startTime,
            optimization
        };
    }

    // Requête avec cache intelligent
    async getCachedQuery(
        collectionName: string,
        constraints: QueryConstraint[],
        cacheKey: string,
        ttl: number = 5 * 60 * 1000 // 5 minutes
    ) {
        // Vérifier le cache d'abord
        const cached = this.getFromCache(cacheKey);
        if (cached && Date.now() - cached.timestamp < ttl) {
            return cached.data;
        }

        // Exécuter la requête optimisée
        const optimization = this.optimizeQuery(collectionName, constraints);
        const q = query(collection(db, collectionName), ...optimization.optimizedQuery);
        
        const startTime = performance.now();
        const snapshot = await getDocs(q);
        const endTime = performance.now();
        
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Mettre en cache
        this.setCache(cacheKey, data);
        
        // Enregistrer les statistiques
        this.recordQueryStats(`${collectionName}_cached`, endTime - startTime);
        
        return data;
    }

    // Batch queries optimisées
    async batchQueries(queries: Array<{
        collection: string;
        constraints: QueryConstraint[];
        key: string;
    }>) {
        const results: Record<string, any> = {};
        const promises = queries.map(async ({ collection: collectionName, constraints, key }) => {
            const optimization = this.optimizeQuery(collectionName, constraints);
            const q = query(collection(db, collectionName), ...optimization.optimizedQuery);
            
            const snapshot = await getDocs(q);
            results[key] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });

        await Promise.all(promises);
        return results;
    }

    // Analyser les performances des requêtes
    getQueryPerformanceReport(): any {
        const report: any = {};
        
        for (const [queryKey, stats] of this.queryStats.entries()) {
            report[queryKey] = {
                totalQueries: stats.count,
                averageTime: stats.avgTime,
                lastUsed: new Date(stats.lastUsed).toISOString(),
                performance: stats.avgTime < 100 ? 'Excellent' : 
                           stats.avgTime < 500 ? 'Bon' : 
                           stats.avgTime < 1000 ? 'Moyen' : 'Lent'
            };
        }
        
        return report;
    }

    // Recommandations d'index
    getIndexRecommendations(collectionName: string): IndexDefinition[] {
        const stats = Array.from(this.queryStats.entries())
            .filter(([key]) => key.includes(collectionName))
            .sort(([,a], [,b]) => b.count - a.count);
        
        const recommendations: IndexDefinition[] = [];
        
        // Analyser les requêtes les plus fréquentes
        stats.slice(0, 5).forEach(([queryKey, stat]) => {
            if (stat.avgTime > 200) { // Requêtes lentes
                recommendations.push({
                    collection: collectionName,
                    fields: ['createdAt'], // Exemple générique
                    type: 'single',
                    priority: Math.floor(stat.count / 10)
                });
            }
        });
        
        return recommendations;
    }

    // Méthodes utilitaires privées
    private extractQueryFields(constraints: any[]): string[] {
        return constraints
            .map(c => this.getFieldFromConstraint(c))
            .filter(field => field !== null);
    }

    private getFieldFromConstraint(constraint: any): string {
        // Extraction du nom de champ selon le type de contrainte
        if (constraint._field) {
            return constraint._field.segments?.join('.') || '';
        }
        return '';
    }

    private findBestIndex(queryFields: string[], availableIndexes: IndexDefinition[]): IndexDefinition | undefined {
        // Trouver l'index qui couvre le plus de champs de la requête
        let bestIndex: IndexDefinition | undefined;
        let bestScore = 0;

        availableIndexes.forEach(index => {
            const matchingFields = queryFields.filter(field => index.fields.includes(field));
            const score = matchingFields.length * index.priority;
            
            if (score > bestScore) {
                bestScore = score;
                bestIndex = index;
            }
        });

        return bestIndex;
    }

    private generateOptimizationSuggestions(queryFields: string[], availableIndexes: IndexDefinition[]): IndexDefinition[] {
        const suggestions: IndexDefinition[] = [];
        
        // Suggérer des index composites pour les requêtes multi-champs
        if (queryFields.length > 1) {
            suggestions.push({
                collection: '',
                fields: queryFields,
                type: 'composite',
                priority: 1
            });
        }
        
        return suggestions;
    }

    private calculateImprovement(queryFields: string[], bestIndex?: IndexDefinition): number {
        if (!bestIndex) return 0;
        
        const matchingFields = queryFields.filter(field => bestIndex.fields.includes(field));
        return (matchingFields.length / queryFields.length) * 100;
    }

    private recordQueryStats(queryKey: string, executionTime: number): void {
        const existing = this.queryStats.get(queryKey);
        
        if (existing) {
            existing.count++;
            existing.avgTime = (existing.avgTime * (existing.count - 1) + executionTime) / existing.count;
            existing.lastUsed = Date.now();
        } else {
            this.queryStats.set(queryKey, {
                count: 1,
                avgTime: executionTime,
                lastUsed: Date.now()
            });
        }
    }

    // Cache simple pour les requêtes
    private cache = new Map<string, { data: any; timestamp: number }>();

    private getFromCache(key: string): { data: any; timestamp: number } | undefined {
        return this.cache.get(key);
    }

    private setCache(key: string, data: any): void {
        this.cache.set(key, { data, timestamp: Date.now() });
        
        // Limiter la taille du cache
        if (this.cache.size > 100) {
            const oldestKey = Array.from(this.cache.keys())[0];
            this.cache.delete(oldestKey);
        }
    }
}

// Instance globale
export const dbIndexing = new DatabaseIndexing();

// Utilitaires d'optimisation
export const queryOptimizer = {
    // Optimiser une requête simple
    optimize: (collectionName: string, constraints: QueryConstraint[]) => {
        return dbIndexing.optimizeQuery(collectionName, constraints);
    },

    // Requête paginée
    paginate: (collectionName: string, constraints: QueryConstraint[], pageSize?: number, lastDoc?: any) => {
        return dbIndexing.getPaginatedData(collectionName, constraints, pageSize, lastDoc);
    },

    // Requête avec cache
    cached: (collectionName: string, constraints: QueryConstraint[], cacheKey: string, ttl?: number) => {
        return dbIndexing.getCachedQuery(collectionName, constraints, cacheKey, ttl);
    },

    // Batch de requêtes
    batch: (queries: Array<{ collection: string; constraints: QueryConstraint[]; key: string }>) => {
        return dbIndexing.batchQueries(queries);
    },

    // Rapport de performance
    getReport: () => {
        return dbIndexing.getQueryPerformanceReport();
    }
};

export default DatabaseIndexing;