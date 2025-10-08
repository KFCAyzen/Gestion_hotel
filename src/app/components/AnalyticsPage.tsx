'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface AnalyticsData {
    revenue: {
        daily: number;
        weekly: number;
        monthly: number;
        yearly: number;
    };
    occupancy: {
        current: number;
        average: number;
        trend: number;
    };
    clients: {
        total: number;
        new: number;
        returning: number;
    };
    rooms: {
        mostBooked: string;
        leastBooked: string;
        avgStay: number;
    };
    monthlyData: Array<{
        month: string;
        revenue: number;
        bookings: number;
        occupancy: number;
    }>;
}

const AnalyticsPage = () => {
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState('monthly');

    useEffect(() => {
        let isMounted = true;
        const loadData = async () => {
            if (isMounted) {
                await fetchAnalyticsData();
            }
        };
        loadData();
        return () => { isMounted = false; };
    }, [selectedPeriod]);

    const fetchAnalyticsData = useCallback(async () => {
        setLoading(true);
        try {
            // Données depuis localStorage uniquement pour éviter Firebase
            const rooms = JSON.parse(localStorage.getItem('rooms') || '[]');
            const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
            const bills = JSON.parse(localStorage.getItem('bills') || '[]');
            
            const analytics = calculateAnalytics(bills, reservations, rooms);
            setAnalyticsData(analytics);
        } catch (error) {
            console.warn('Analytics error:', error);
            // Fallback simple
            setAnalyticsData({
                revenue: { daily: 0, weekly: 0, monthly: 0, yearly: 0 },
                occupancy: { current: 0, average: 0, trend: 0 },
                clients: { total: 0, new: 0, returning: 0 },
                rooms: { mostBooked: 'Standard', leastBooked: 'Suite', avgStay: 2.5 },
                monthlyData: []
            });
        } finally {
            setLoading(false);
        }
    }, [selectedPeriod, calculateAnalytics]);

    const calculateAnalytics = useCallback((billing: any[], reservations: any[], rooms: any[]): AnalyticsData => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Revenus réels depuis localStorage
        const dailyRevenue = billing
            .filter((b: any) => b.date === today)
            .reduce((sum: number, b: any) => sum + (parseInt(b.amount) || 0), 0);

        const weeklyRevenue = billing
            .filter((b: any) => {
                if (!b.date) return false;
                const billDate = new Date(b.date);
                return billDate >= weekAgo;
            })
            .reduce((sum: number, b: any) => sum + (parseInt(b.amount) || 0), 0);

        const monthlyRevenue = billing
            .filter((b: any) => {
                if (!b.date) return false;
                const billDate = new Date(b.date);
                return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
            })
            .reduce((sum: number, b: any) => sum + (parseInt(b.amount) || 0), 0);

        const yearlyRevenue = billing
            .filter((b: any) => {
                if (!b.date) return false;
                const billDate = new Date(b.date);
                return billDate.getFullYear() === currentYear;
            })
            .reduce((sum: number, b: any) => sum + (parseInt(b.amount) || 0), 0);

        // Taux d'occupation réel
        const occupiedRooms = rooms.filter((r: any) => r.status === 'Occupée').length;
        const totalRooms = rooms.length || 27;
        const currentOccupancy = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

        // Analyse des catégories les plus réservées
        const categoryStats = rooms.reduce((acc: any, room: any) => {
            const category = room.category || 'Standard';
            if (!acc[category]) acc[category] = { total: 0, occupied: 0 };
            acc[category].total++;
            if (room.status === 'Occupée') acc[category].occupied++;
            return acc;
        }, {});

        const mostBooked = Object.entries(categoryStats)
            .sort(([,a]: any, [,b]: any) => b.occupied - a.occupied)[0]?.[0] || 'Standard';
        const leastBooked = Object.entries(categoryStats)
            .sort(([,a]: any, [,b]: any) => a.occupied - b.occupied)[0]?.[0] || 'Suite';

        // Durée moyenne de séjour réelle
        const avgStay = reservations
            .filter((r: any) => r.checkIn && r.checkOut)
            .reduce((acc: number, r: any, _, arr: any[]) => {
                const checkIn = new Date(r.checkIn);
                const checkOut = new Date(r.checkOut);
                const days = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
                return acc + days / arr.length;
            }, 0) || 2.5;

        // Données mensuelles réelles
        const monthlyData = [];
        for (let i = 11; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            
            const monthRevenue = billing
                .filter((b: any) => {
                    if (!b.date) return false;
                    const billDate = new Date(b.date);
                    return billDate >= monthStart && billDate <= monthEnd;
                })
                .reduce((sum: number, b: any) => sum + (parseInt(b.amount) || 0), 0);

            const monthBookings = reservations
                .filter((r: any) => {
                    if (!r.checkIn) return false;
                    const checkIn = new Date(r.checkIn);
                    return checkIn >= monthStart && checkIn <= monthEnd;
                })
                .length;

            // Calcul du taux d'occupation mensuel
            const monthOccupancy = monthBookings > 0 ? Math.min((monthBookings / totalRooms) * 100, 100) : 0;

            monthlyData.push({
                month: monthStart.toLocaleDateString('fr-FR', { month: 'short' }),
                revenue: monthRevenue,
                bookings: monthBookings,
                occupancy: monthOccupancy
            });
        }

        return {
            revenue: {
                daily: dailyRevenue,
                weekly: weeklyRevenue,
                monthly: monthlyRevenue,
                yearly: yearlyRevenue
            },
            occupancy: {
                current: currentOccupancy,
                average: monthlyData.reduce((sum, m) => sum + m.occupancy, 0) / monthlyData.length || 0,
                trend: currentOccupancy - (monthlyData[monthlyData.length - 2]?.occupancy || currentOccupancy)
            },
            clients: {
                total: JSON.parse(localStorage.getItem('clients') || '[]').length,
                new: reservations.filter((r: any) => {
                    if (!r.checkIn) return false;
                    const checkIn = new Date(r.checkIn);
                    return checkIn >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                }).length,
                returning: reservations.length - reservations.filter((r: any) => {
                    if (!r.checkIn) return false;
                    const checkIn = new Date(r.checkIn);
                    return checkIn >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                }).length
            },
            rooms: {
                mostBooked,
                leastBooked,
                avgStay: Math.round(avgStay * 10) / 10
            },
            monthlyData
        };
    }, []);

    const formatPrice = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XAF',
            minimumFractionDigits: 0
        }).format(amount);
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!analyticsData) {
        return <div className="p-6 text-center">Erreur lors du chargement des données</div>;
    }

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-800">Rapports & Analytics</h1>
                <select 
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                    <option value="daily">Aujourd'hui</option>
                    <option value="weekly">Cette semaine</option>
                    <option value="monthly">Ce mois</option>
                    <option value="yearly">Cette année</option>
                </select>
            </div>

            {/* KPIs principaux */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Revenus du mois</p>
                            <p className="text-2xl font-bold text-green-600">
                                {formatPrice(analyticsData.revenue.monthly)}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{analyticsData.occupancy.trend > 0 ? '+' : ''}{analyticsData.occupancy.trend.toFixed(1)}% vs mois dernier</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Taux d'occupation</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {analyticsData.occupancy.current.toFixed(1)}%
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Moyenne: {analyticsData.occupancy.average.toFixed(1)}%</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Total clients</p>
                            <p className="text-2xl font-bold text-purple-600">
                                {analyticsData.clients.total}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{analyticsData.clients.new} nouveaux clients</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Séjour moyen</p>
                            <p className="text-2xl font-bold text-orange-600">
                                {analyticsData.rooms.avgStay} jours
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Durée moyenne de séjour</p>
                </div>
            </div>

            {/* Graphiques */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Évolution des revenus */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Évolution des Revenus</h3>
                    <div className="space-y-3">
                        {analyticsData.monthlyData.slice(-6).map((data, index) => (
                            <div key={`revenue-${data.month}-${index}`} className="flex items-center gap-3">
                                <div className="w-8 text-xs text-slate-600">{data.month}</div>
                                <div className="flex-1 bg-slate-200 rounded-full h-3">
                                    <div 
                                        className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full"
                                        style={{width: `${Math.min((data.revenue / Math.max(...analyticsData.monthlyData.map(d => d.revenue))) * 100, 100)}%`}}
                                    ></div>
                                </div>
                                <div className="text-xs text-slate-700 font-medium w-20 text-right">
                                    {formatPrice(data.revenue)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Répartition des réservations */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Réservations par Mois</h3>
                    <div className="space-y-3">
                        {analyticsData.monthlyData.slice(-6).map((data, index) => (
                            <div key={`bookings-${data.month}-${index}`} className="flex items-center gap-3">
                                <div className="w-8 text-xs text-slate-600">{data.month}</div>
                                <div className="flex-1 bg-slate-200 rounded-full h-3">
                                    <div 
                                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full"
                                        style={{width: `${Math.min((data.bookings / Math.max(...analyticsData.monthlyData.map(d => d.bookings))) * 100, 100)}%`}}
                                    ></div>
                                </div>
                                <div className="text-xs text-slate-700 font-medium w-12 text-right">
                                    {data.bookings}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Détails par catégorie */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Performance par Catégorie</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {['Standard', 'Confort', 'VIP', 'Suite'].map((category, index) => {
                        const rooms = JSON.parse(localStorage.getItem('rooms') || '[]');
                        const bills = JSON.parse(localStorage.getItem('bills') || '[]');
                        const categoryRooms = rooms.filter((r: any) => r.category === category);
                        const occupiedCount = categoryRooms.filter((r: any) => r.status === 'Occupée').length;
                        const totalCount = categoryRooms.length;
                        const occupancyRate = totalCount > 0 ? (occupiedCount / totalCount) * 100 : 0;
                        
                        // Revenus approximatifs par catégorie (basé sur le prix moyen)
                        const avgPrice = categoryRooms.reduce((sum: number, r: any) => sum + (parseInt(r.price) || 0), 0) / (totalCount || 1);
                        const categoryRevenue = occupiedCount * avgPrice * 30; // Estimation mensuelle
                        
                        return (
                            <div key={`category-${category}-${index}`} className="p-4 bg-slate-50 rounded-lg">
                                <h4 className="font-medium text-slate-800">{category}</h4>
                                <div className="mt-2 space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Revenus estimés</span>
                                        <span className="font-medium">{formatPrice(categoryRevenue)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Chambres occupées</span>
                                        <span className="font-medium">{occupiedCount}/{totalCount}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Taux d'occupation</span>
                                        <span className="font-medium">{occupancyRate.toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default memo(AnalyticsPage);