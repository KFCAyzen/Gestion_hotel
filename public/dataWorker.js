// Web Worker optimisé pour le traitement des données en arrière-plan
const CACHE_SIZE_LIMIT = 1000;
const workerCache = new Map();

self.onmessage = function(e) {
    const { type, data, taskId } = e.data;
    
    try {
        switch (type) {
            case 'PROCESS_DASHBOARD_DATA':
                processDashboardData(data, taskId);
                break;
            case 'CALCULATE_ANALYTICS':
                calculateAnalytics(data, taskId);
                break;
            case 'OPTIMIZE_QUERIES':
                optimizeQueries(data, taskId);
                break;
            case 'BATCH_OPERATIONS':
                batchOperations(data, taskId);
                break;
            case 'CLEAR_CACHE':
                clearWorkerCache();
                self.postMessage({ type: 'CACHE_CLEARED', taskId });
                break;
            default:
                self.postMessage({ error: 'Unknown operation type', taskId });
        }
    } catch (error) {
        self.postMessage({ error: error.message, taskId });
    }
};

function processDashboardData(rawData, taskId) {
    try {
        // Vérifier le cache d'abord
        const cacheKey = `dashboard_${JSON.stringify(rawData).slice(0, 50)}`;
        if (workerCache.has(cacheKey)) {
            self.postMessage({ 
                type: 'DASHBOARD_DATA_PROCESSED', 
                data: workerCache.get(cacheKey),
                taskId,
                fromCache: true
            });
            return;
        }

        const { rooms, reservations, billing, clients } = rawData;
        
        // Traitement optimisé des données du dashboard
        const processedData = {
            totalRooms: rooms?.length || 0,
            occupiedRooms: rooms?.filter(r => r.status === 'Occupée').length || 0,
            availableRooms: rooms?.filter(r => r.status === 'Disponible').length || 0,
            maintenanceRooms: rooms?.filter(r => r.status === 'Maintenance').length || 0,
            
            // Revenus par période
            todayRevenue: calculateDayRevenue(billing, new Date()),
            weekRevenue: calculateWeekRevenue(billing),
            monthRevenue: calculateMonthRevenue(billing),
            
            // Statistiques par catégorie
            roomsByCategory: groupRoomsByCategory(rooms),
            
            // Activités récentes optimisées
            recentActivities: processRecentActivities(reservations, clients),
            
            // Données hebdomadaires
            weeklyStats: calculateWeeklyStats(billing, reservations),
            weeklyReservations: calculateWeeklyReservations(reservations)
        };
        
        // Mettre en cache le résultat
        cacheResult(cacheKey, processedData);
        
        self.postMessage({ 
            type: 'DASHBOARD_DATA_PROCESSED', 
            data: processedData,
            taskId
        });
    } catch (error) {
        self.postMessage({ 
            type: 'ERROR', 
            error: error.message,
            taskId
        });
    }
}

function calculateAnalytics(rawData, taskId) {
    try {
        const cacheKey = `analytics_${JSON.stringify(rawData).slice(0, 50)}`;
        if (workerCache.has(cacheKey)) {
            self.postMessage({ 
                type: 'ANALYTICS_CALCULATED', 
                data: workerCache.get(cacheKey),
                taskId,
                fromCache: true
            });
            return;
        }

        const { billing, reservations, rooms, clients } = rawData;
        const now = new Date();
        
        // Calculs analytiques complexes
        const analytics = {
            revenue: {
                daily: calculatePeriodRevenue(billing, 'day'),
                weekly: calculatePeriodRevenue(billing, 'week'),
                monthly: calculatePeriodRevenue(billing, 'month'),
                yearly: calculatePeriodRevenue(billing, 'year')
            },
            occupancy: {
                current: calculateCurrentOccupancy(rooms),
                average: calculateAverageOccupancy(reservations, rooms),
                trend: calculateOccupancyTrend(reservations, rooms)
            },
            clients: {
                total: clients?.length || 0,
                new: calculateNewClients(clients),
                returning: calculateReturningClients(clients, reservations)
            },
            rooms: {
                mostBooked: findBestPerformingCategory(billing, rooms),
                leastBooked: findWorstPerformingCategory(billing, rooms),
                avgStay: calculateAverageStayDuration(reservations)
            },
            monthlyData: calculateMonthlyTrends(billing, reservations, 12)
        };
        
        cacheResult(cacheKey, analytics);
        
        self.postMessage({ 
            type: 'ANALYTICS_CALCULATED', 
            data: analytics,
            taskId
        });
    } catch (error) {
        self.postMessage({ 
            type: 'ERROR', 
            error: error.message,
            taskId
        });
    }
}

function optimizeQueries(queryData, taskId) {
    try {
        const { queries, indexes } = queryData;
        
        // Optimisation des requêtes avec indexation
        const optimizedQueries = queries.map(query => {
            const optimized = {
                ...query,
                useIndex: findBestIndex(query, indexes),
                estimatedCost: calculateQueryCost(query, indexes),
                suggestions: generateOptimizationSuggestions(query)
            };
            return optimized;
        });
        
        self.postMessage({ 
            type: 'QUERIES_OPTIMIZED', 
            data: optimizedQueries,
            taskId
        });
    } catch (error) {
        self.postMessage({ 
            type: 'ERROR', 
            error: error.message,
            taskId
        });
    }
}

function batchOperations(operations, taskId) {
    try {
        const results = [];
        const batchSize = 50; // Réduit pour de meilleures performances
        
        for (let i = 0; i < operations.length; i += batchSize) {
            const batch = operations.slice(i, i + batchSize);
            const batchResults = batch.map(op => processOperation(op));
            results.push(...batchResults);
            
            // Progression
            self.postMessage({ 
                type: 'BATCH_PROGRESS', 
                progress: Math.min(100, ((i + batchSize) / operations.length) * 100),
                taskId
            });
        }
        
        self.postMessage({ 
            type: 'BATCH_COMPLETED', 
            data: results,
            taskId
        });
    } catch (error) {
        self.postMessage({ 
            type: 'ERROR', 
            error: error.message,
            taskId
        });
    }
}

// Fonctions utilitaires optimisées
function calculateDayRevenue(billing, date) {
    if (!billing) return 0;
    const today = date.toISOString().split('T')[0];
    
    return billing
        .filter(b => b.date === today)
        .reduce((sum, b) => sum + (parseInt(b.amount) || 0), 0);
}

function calculateWeekRevenue(billing) {
    if (!billing) return 0;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    return billing
        .filter(b => {
            if (!b.date) return false;
            const billDate = new Date(b.date);
            return billDate >= weekAgo;
        })
        .reduce((sum, b) => sum + (parseInt(b.amount) || 0), 0);
}

function calculateMonthRevenue(billing) {
    if (!billing) return 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return billing
        .filter(b => {
            if (!b.date) return false;
            const billDate = new Date(b.date);
            return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
        })
        .reduce((sum, b) => sum + (parseInt(b.amount) || 0), 0);
}

function groupRoomsByCategory(rooms) {
    if (!rooms) return {};
    
    return rooms.reduce((acc, room) => {
        const category = room.category || 'Standard';
        if (!acc[category]) acc[category] = [];
        acc[category].push(room);
        return acc;
    }, {});
}

function processRecentActivities(reservations, clients) {
    const activities = [];
    
    // Traitement optimisé des activités récentes
    if (reservations) {
        reservations.slice(0, 10).forEach(reservation => {
            activities.push({
                type: 'reservation',
                message: `Réservation - ${reservation.clientName}`,
                detail: `Chambre ${reservation.roomNumber}`,
                time: formatTime(reservation.createdAt)
            });
        });
    }
    
    if (clients) {
        clients.slice(0, 5).forEach(client => {
            activities.push({
                type: 'client',
                message: `Client - ${client.name}`,
                detail: client.phone,
                time: formatTime(client.createdAt)
            });
        });
    }
    
    return activities.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 15);
}

function calculateWeeklyStats(billing, reservations) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const weeklyBilling = billing?.filter(b => {
        if (!b.date) return false;
        const billDate = new Date(b.date);
        return billDate >= weekAgo;
    }) || [];
    
    const nuiteeAmount = weeklyBilling
        .filter(b => b.motif === 'Nuitée')
        .reduce((sum, b) => sum + (parseInt(b.amount) || 0), 0);
    
    const reposAmount = weeklyBilling
        .filter(b => b.motif === 'Repos')
        .reduce((sum, b) => sum + (parseInt(b.amount) || 0), 0);
    
    return {
        nuitee: {
            amount: nuiteeAmount,
            count: weeklyBilling.filter(b => b.motif === 'Nuitée').length
        },
        repos: {
            amount: reposAmount,
            count: weeklyBilling.filter(b => b.motif === 'Repos').length
        }
    };
}

function calculateWeeklyReservations(reservations) {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const weekData = days.map(day => ({ day, count: 0, maxCount: 1 }));
    
    if (reservations) {
        reservations.forEach(reservation => {
            if (!reservation.checkIn) return;
            const date = new Date(reservation.checkIn);
            const dayIndex = (date.getDay() + 6) % 7; // Lundi = 0
            weekData[dayIndex].count++;
        });
        
        const maxCount = Math.max(...weekData.map(d => d.count), 1);
        weekData.forEach(d => d.maxCount = maxCount);
    }
    
    return weekData;
}

function calculatePeriodRevenue(billing, period) {
    if (!billing) return 0;
    
    const now = new Date();
    let startDate;
    
    switch (period) {
        case 'day':
            return calculateDayRevenue(billing, now);
        case 'week':
            return calculateWeekRevenue(billing);
        case 'month':
            return calculateMonthRevenue(billing);
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        default:
            return 0;
    }
    
    return billing
        .filter(b => {
            if (!b.date) return false;
            const billDate = new Date(b.date);
            return billDate >= startDate;
        })
        .reduce((sum, b) => sum + (parseInt(b.amount) || 0), 0);
}

function calculateCurrentOccupancy(rooms) {
    if (!rooms || rooms.length === 0) return 0;
    const occupied = rooms.filter(r => r.status === 'Occupée').length;
    return (occupied / rooms.length) * 100;
}

function calculateAverageOccupancy(reservations, rooms) {
    if (!reservations || !rooms || rooms.length === 0) return 0;
    
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentReservations = reservations.filter(r => {
        const checkIn = r.checkIn ? new Date(r.checkIn) : null;
        return checkIn && checkIn >= last30Days;
    });
    
    return recentReservations.length > 0 ? (recentReservations.length / rooms.length) * 100 : 0;
}

function calculateOccupancyTrend(reservations, rooms) {
    if (!reservations || !rooms || rooms.length === 0) return 0;
    
    const now = new Date();
    const thisMonth = reservations.filter(r => {
        const checkIn = r.checkIn ? new Date(r.checkIn) : null;
        return checkIn && checkIn.getMonth() === now.getMonth();
    }).length;
    
    const lastMonth = reservations.filter(r => {
        const checkIn = r.checkIn ? new Date(r.checkIn) : null;
        return checkIn && checkIn.getMonth() === now.getMonth() - 1;
    }).length;
    
    return lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;
}

function calculateNewClients(clients) {
    if (!clients) return 0;
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return clients.filter(c => {
        const createdAt = c.createdAt ? new Date(c.createdAt) : null;
        return createdAt && createdAt >= last30Days;
    }).length;
}

function calculateReturningClients(clients, reservations) {
    if (!clients || !reservations) return 0;
    const clientsWithMultipleReservations = new Set();
    const clientReservationCount = {};
    
    reservations.forEach(r => {
        if (r.clientName) {
            clientReservationCount[r.clientName] = (clientReservationCount[r.clientName] || 0) + 1;
            if (clientReservationCount[r.clientName] > 1) {
                clientsWithMultipleReservations.add(r.clientName);
            }
        }
    });
    
    return clientsWithMultipleReservations.size;
}

function findBestPerformingCategory(billing, rooms) {
    return 'Standard';
}

function findWorstPerformingCategory(billing, rooms) {
    return 'Suite';
}

function calculateAverageStayDuration(reservations) {
    if (!reservations || reservations.length === 0) return 0;
    
    const durations = reservations
        .filter(r => r.checkIn && r.checkOut)
        .map(r => {
            const checkIn = new Date(r.checkIn);
            const checkOut = new Date(r.checkOut);
            return Math.max(1, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)));
        });
    
    return durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
}

function calculateMonthlyTrends(billing, reservations, months) {
    const trends = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const monthRevenue = billing?.filter(b => {
            if (!b.date) return false;
            const billDate = new Date(b.date);
            return billDate >= monthStart && billDate <= monthEnd;
        }).reduce((sum, b) => sum + (parseInt(b.amount) || 0), 0) || 0;
        
        const monthBookings = reservations?.filter(r => {
            if (!r.checkIn) return false;
            const checkIn = new Date(r.checkIn);
            return checkIn >= monthStart && checkIn <= monthEnd;
        }).length || 0;
        
        trends.push({
            month: monthStart.toLocaleDateString('fr-FR', { month: 'short' }),
            revenue: monthRevenue,
            bookings: monthBookings,
            occupancy: monthBookings > 0 ? Math.min((monthBookings / 27) * 100, 100) : 0
        });
    }
    
    return trends;
}

function findBestIndex(query, indexes) {
    return indexes.find(idx => 
        query.fields?.some(field => idx.fields.includes(field))
    ) || null;
}

function calculateQueryCost(query, indexes) {
    const baseComplexity = query.filters?.length || 1;
    const hasIndex = findBestIndex(query, indexes) !== null;
    return hasIndex ? baseComplexity * 0.1 : baseComplexity * 10;
}

function generateOptimizationSuggestions(query) {
    const suggestions = [];
    
    if (!query.limit) {
        suggestions.push('Ajouter une limite pour réduire les résultats');
    }
    
    if (query.filters?.length > 3) {
        suggestions.push('Considérer la création d\'un index composite');
    }
    
    return suggestions;
}

function processOperation(operation) {
    return {
        id: operation.id,
        result: 'processed',
        timestamp: Date.now()
    };
}

function formatTime(timestamp) {
    if (!timestamp) return 'Inconnu';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// Fonctions utilitaires pour le cache
function cacheResult(key, data) {
    if (workerCache.size >= CACHE_SIZE_LIMIT) {
        // Supprimer le plus ancien élément
        const firstKey = workerCache.keys().next().value;
        workerCache.delete(firstKey);
    }
    workerCache.set(key, data);
}

function clearWorkerCache() {
    workerCache.clear();
    console.log('Worker cache cleared');
}

console.log('Data Worker: Enhanced version loaded');