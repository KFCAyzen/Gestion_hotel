import { Images } from "./Images";
import Image from "next/image";
import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { formatPrice } from "../utils/formatPrice";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "./LoadingSpinner";
import { dataCache } from "../utils/dataCache";


import { generateTestData, clearAllData, resetRoomsToDefault } from "../utils/generateTestData";

interface Activity {
    type: string;
    message: string;
    detail: string;
    time: string;
}

interface WeeklyReservation {
    day: string;
    count: number;
    maxCount: number;
}

interface Room {
    id: string;
    number: string;
    price: string;
    status: string;
    category: string;
}

// Memoized stat card component
const StatCard = memo(({ stat, index }: { stat: any; index: number }) => (
    <div key={index} className={`${stat.bgColor} rounded-xl p-4 sm:p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300`}>
        <div className="flex items-center justify-between mb-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center text-white p-2`}>
                <Image src={stat.icon} alt={stat.title} width={24} height={24} className="filter brightness-0 invert" />
            </div>
            <div className="text-right">
                <div className={`text-xl sm:text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                    {stat.value}
                </div>
            </div>
        </div>
        <h3 className="text-sm sm:text-base font-semibold text-slate-700 mb-1">{stat.title}</h3>
        <p className="text-xs sm:text-sm text-slate-500">{stat.subtitle}</p>
    </div>
));

StatCard.displayName = 'StatCard';

function DashBoard() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    // Simplified metrics without hooks
    const metrics = { renderTime: 0, queryTime: 0, cacheHitRate: 0, memoryUsage: 0 };
    const isOptimizing = false;

    const [dashboardData, setDashboardData] = useState(() => {
        if (typeof window === 'undefined') {
            return {
                occupiedRooms: 0,
                todayReservations: 0,
                todayRevenue: 0,
                recentActivities: [] as Activity[],
                occupancyRate: 0,
                availableRooms: 27,
                maintenanceRooms: 0,
                cleaningRooms: 0,
                totalRooms: 27,
                roomsByCategory: {} as Record<string, Room[]>,
                weeklyReservations: [] as WeeklyReservation[],
                monthlyRevenue: 0,
                totalClients: 0,
                totalBills: 0,
                dailyStats: { nuitee: { count: 0, amount: 0 }, repos: { count: 0, amount: 0 } },
                weeklyStats: { nuitee: { count: 0, amount: 0 }, repos: { count: 0, amount: 0 } }
            };
        }
        try {
            const rooms = JSON.parse(localStorage.getItem('rooms') || '[]');
            let clients = JSON.parse(localStorage.getItem('clients') || '[]');
            let bills = JSON.parse(localStorage.getItem('bills') || '[]');
            let reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
            
            if (user?.role === 'user') {
                clients = clients.filter((c: any) => c.createdBy === user.username);
                bills = bills.filter((b: any) => b.createdBy === user.username);
                reservations = reservations.filter((r: any) => r.createdBy === user.username);
            }
            
            const roomStatusCounts = {
                'Disponible': 0,
                'Occupée': 0,
                'Maintenance': 0,
                'Nettoyage': 0
            };
            
            for (const room of rooms) {
                if (room?.status && roomStatusCounts.hasOwnProperty(room.status)) {
                    roomStatusCounts[room.status as keyof typeof roomStatusCounts]++;
                }
            }
            
            const occupiedRooms = roomStatusCounts['Occupée'];
            const availableRooms = roomStatusCounts['Disponible'];
            const totalRooms = rooms.length || 27;
            const occupancyRate = Math.round((occupiedRooms / totalRooms) * 100);
            
            return {
                occupiedRooms,
                todayReservations: 0,
                todayRevenue: 0,
                recentActivities: [] as Activity[],
                occupancyRate,
                availableRooms,
                maintenanceRooms: roomStatusCounts['Maintenance'],
                cleaningRooms: roomStatusCounts['Nettoyage'],
                totalRooms,
                roomsByCategory: (() => {
                    const categories: Record<string, Room[]> = {};
                    for (const room of rooms) {
                        if (!categories[room.category]) categories[room.category] = [];
                        categories[room.category].push(room);
                    }
                    return categories;
                })(),
                weeklyReservations: [] as WeeklyReservation[],
                monthlyRevenue: 0,
                totalClients: clients.length,
                totalBills: bills.length,
                dailyStats: { nuitee: { count: 0, amount: 0 }, repos: { count: 0, amount: 0 } },
                weeklyStats: { nuitee: { count: 0, amount: 0 }, repos: { count: 0, amount: 0 } }
            };
        } catch (error) {
            return {
                occupiedRooms: 0,
                todayReservations: 0,
                todayRevenue: 0,
                recentActivities: [] as Activity[],
                occupancyRate: 0,
                availableRooms: 27,
                maintenanceRooms: 0,
                cleaningRooms: 0,
                totalRooms: 27,
                roomsByCategory: {} as Record<string, Room[]>,
                weeklyReservations: [] as WeeklyReservation[],
                monthlyRevenue: 0,
                totalClients: 0,
                totalBills: 0,
                dailyStats: { nuitee: { count: 0, amount: 0 }, repos: { count: 0, amount: 0 } },
                weeklyStats: { nuitee: { count: 0, amount: 0 }, repos: { count: 0, amount: 0 } }
            };
        }
    });

    const getWeeklyReservations = useCallback((reservations: any[]): WeeklyReservation[] => {
        if (!Array.isArray(reservations)) return [];
        
        const counts = [0, 0, 0, 0, 0, 0, 0];
        let maxCount = 1;
        
        for (const reservation of reservations) {
            if (reservation?.checkIn) {
                const date = new Date(reservation.checkIn);
                if (!isNaN(date.getTime())) {
                    const dayIndex = (date.getDay() + 6) % 7;
                    counts[dayIndex]++;
                    if (counts[dayIndex] > maxCount) maxCount = counts[dayIndex];
                }
            }
        }
        
        return ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, index) => ({
            day,
            count: counts[index],
            maxCount
        }));
    }, []);
    
    const calculateAllStats = useCallback((bills: any[]) => {
        if (!Array.isArray(bills)) return {
            monthly: 0,
            daily: { nuitee: { count: 0, amount: 0 }, repos: { count: 0, amount: 0 } },
            weekly: { nuitee: { count: 0, amount: 0 }, repos: { count: 0, amount: 0 } }
        };
        
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
        
        let monthly = 0;
        let dailyNuitee = 0, dailyNuiteeAmount = 0, dailyRepos = 0, dailyReposAmount = 0;
        let weeklyNuitee = 0, weeklyNuiteeAmount = 0, weeklyRepos = 0, weeklyReposAmount = 0;
        
        for (const bill of bills) {
            if (!bill?.date) continue;
            
            const amount = parseInt(bill.amount) || 0;
            const billDate = new Date(bill.date);
            
            if (isNaN(billDate.getTime())) continue;
            
            // Monthly
            if (billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear) {
                monthly += amount;
            }
            
            // Daily
            if (bill.date === today) {
                if (bill.motif === 'Nuitée') {
                    dailyNuitee++;
                    dailyNuiteeAmount += amount;
                } else if (bill.motif === 'Repos') {
                    dailyRepos++;
                    dailyReposAmount += amount;
                }
            }
            
            // Weekly
            if (billDate >= weekStart && billDate <= weekEnd) {
                if (bill.motif === 'Nuitée') {
                    weeklyNuitee++;
                    weeklyNuiteeAmount += amount;
                } else if (bill.motif === 'Repos') {
                    weeklyRepos++;
                    weeklyReposAmount += amount;
                }
            }
        }
        
        return {
            monthly,
            daily: { nuitee: { count: dailyNuitee, amount: dailyNuiteeAmount }, repos: { count: dailyRepos, amount: dailyReposAmount } },
            weekly: { nuitee: { count: weeklyNuitee, amount: weeklyNuiteeAmount }, repos: { count: weeklyRepos, amount: weeklyReposAmount } }
        };
    }, []);

    const loadDashboardData = useCallback(async () => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            // Check cache first with longer TTL for production
            const cacheKey = `dashboard_${user?.username || 'all'}`;
            const cached = dataCache.get(cacheKey);
            if (cached && typeof cached === 'object') {
                setDashboardData(cached as any);
                setIsLoading(false);
                return;
            }

            // Priorité localStorage pour éviter Firebase
            let rooms = JSON.parse(localStorage.getItem('rooms') || '[]');
            let clients = JSON.parse(localStorage.getItem('clients') || '[]');
            let bills = JSON.parse(localStorage.getItem('bills') || '[]');
            let reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
            
            // Charger depuis Firebase seulement si localStorage est complètement vide
            const hasLocalData = rooms.length > 0 || clients.length > 0 || bills.length > 0;
            
            if (!hasLocalData) {
                try {
                    const [roomsSnapshot, clientsSnapshot, billsSnapshot, reservationsSnapshot] = await Promise.all([
                        getDocs(collection(db, "rooms")),
                        getDocs(collection(db, "clients")),
                        getDocs(collection(db, "bills")),
                        getDocs(collection(db, "reservations"))
                    ]);
                    
                    if (rooms.length === 0) {
                        const allRooms = roomsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Room[];
                        const roomMap = new Map();
                        allRooms.forEach(room => {
                            if (!roomMap.has(room.number)) {
                                roomMap.set(room.number, room);
                            }
                        });
                        rooms = Array.from(roomMap.values());
                    }
                    
                    if (clients.length === 0) {
                        clients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    }
                    
                    if (bills.length === 0) {
                        bills = billsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    }
                    
                    if (reservations.length === 0) {
                        reservations = reservationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    }
                } catch (firebaseError) {
                    console.warn('Firebase unavailable, using localStorage only');
                }
            }
            
            if (user?.role === 'user') {
                clients = clients.filter((c: any) => c.createdBy === user.username);
                bills = bills.filter((b: any) => b.createdBy === user.username);
                reservations = reservations.filter((r: any) => r.createdBy === user.username);
            }
            
            const today = new Date().toISOString().split('T')[0];
            const todayReservations = reservations.filter((r: any) => r.checkIn === today).length;
            const todayBills = bills.filter((b: any) => b.date === today);
            const todayRevenue = todayBills.reduce((sum: number, bill: any) => sum + (parseInt(bill.amount) || 0), 0);
            
            const roomStatusCounts = {
                'Disponible': 0,
                'Occupée': 0,
                'Maintenance': 0,
                'Nettoyage': 0
            };
            
            for (const room of rooms) {
                if (room?.status && roomStatusCounts.hasOwnProperty(room.status)) {
                    roomStatusCounts[room.status as keyof typeof roomStatusCounts]++;
                }
            }
            
            const occupiedRooms = roomStatusCounts['Occupée'];
            const availableRooms = roomStatusCounts['Disponible'];
            const maintenanceRooms = roomStatusCounts['Maintenance'];
            const cleaningRooms = roomStatusCounts['Nettoyage'];
            const totalRooms = rooms.length || 27;
            const occupancyRate = Math.round((occupiedRooms / totalRooms) * 100);
            
            const recentActivities: Activity[] = [];
            
            const recent = [...reservations.slice(-3), ...clients.slice(-2), ...bills.slice(-2)]
                .filter(item => item && typeof item === 'object')
                .slice(-5)
                .map((item: any) => {
                    if (item.clientName) return { type: 'reservation', message: `Nouvelle réservation - ${item.clientName}`, detail: `Chambre ${item.roomNumber || 'N/A'}` };
                    if (item.name) return { type: 'client', message: `Nouveau client - ${item.name}`, detail: item.phone || 'Téléphone non renseigné' };
                    return { type: 'billing', message: `Nouveau reçu - ${item.receivedFrom || 'Client'}`, detail: formatPrice(item.amount || '0') };
                })
                .map(item => ({ ...item, time: 'Il y a quelques minutes' }));
            
            recentActivities.push(...recent);
            
            const stats = calculateAllStats(bills);
            const roomsByCategory: Record<string, Room[]> = {};
            for (const room of rooms) {
                if (!roomsByCategory[room.category]) roomsByCategory[room.category] = [];
                roomsByCategory[room.category].push(room);
            }
            
            const dashboardResult = {
                occupiedRooms,
                todayReservations,
                todayRevenue,
                recentActivities: recentActivities.slice(0, 5),
                occupancyRate,
                availableRooms,
                maintenanceRooms,
                cleaningRooms,
                totalRooms,
                roomsByCategory,
                weeklyReservations: getWeeklyReservations(reservations),
                monthlyRevenue: stats.monthly,
                totalClients: clients.length,
                totalBills: bills.length,
                dailyStats: stats.daily,
                weeklyStats: stats.weekly
            };
            
            setDashboardData(dashboardResult);
            // Cache plus long pour éviter les rechargements
            const cacheTime = process.env.NODE_ENV === 'production' ? 10 * 60 * 1000 : 5 * 60 * 1000;
            dataCache.set(cacheKey, dashboardResult, cacheTime);
        } catch (error) {
            console.warn('Error loading data:', error);
            // En cas d'erreur, utiliser les valeurs par défaut
            setDashboardData({
                occupiedRooms: 0,
                todayReservations: 0,
                todayRevenue: 0,
                recentActivities: [],
                occupancyRate: 0,
                availableRooms: 27,
                maintenanceRooms: 0,
                cleaningRooms: 0,
                totalRooms: 27,
                roomsByCategory: {},
                weeklyReservations: [],
                monthlyRevenue: 0,
                totalClients: 0,
                totalBills: 0,
                dailyStats: { nuitee: { count: 0, amount: 0 }, repos: { count: 0, amount: 0 } },
                weeklyStats: { nuitee: { count: 0, amount: 0 }, repos: { count: 0, amount: 0 } }
            });
        } finally {
            setIsLoading(false);
        }
    }, [user?.role, user?.username, calculateAllStats, getWeeklyReservations, isLoading]);
    
    useEffect(() => {
        let isMounted = true;
        let intervalId: NodeJS.Timeout;
        
        const loadData = async () => {
            if (isMounted && !isLoading) {
                await loadDashboardData();
            }
        };
        
        // Chargement initial
        loadData();
        
        const handleStorageChange = (event: StorageEvent) => {
            if (event.storageArea === localStorage && event.key && isMounted && !isLoading) {
                setTimeout(loadData, 500);
            }
        };
        
        const handleDataUpdate = () => {
            if (isMounted && !isLoading) {
                setTimeout(loadData, 500);
            }
        };
        
        // Événements avec protection contre les boucles
        window.addEventListener('storage', handleStorageChange, { passive: true });
        window.addEventListener('dashboardUpdate', handleDataUpdate, { passive: true });
        window.addEventListener('roomStatusChanged', handleDataUpdate, { passive: true });
        window.addEventListener('dataChanged', handleDataUpdate, { passive: true });
        
        // Intervalle plus long pour réduire la charge
        const intervalTime = process.env.NODE_ENV === 'production' ? 120000 : 60000; // 2 minutes en prod, 1 minute en dev
        intervalId = setInterval(() => {
            if (isMounted && document.visibilityState === 'visible' && !isLoading) {
                loadData();
            }
        }, intervalTime);
        
        return () => {
            isMounted = false;
            clearInterval(intervalId);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('dashboardUpdate', handleDataUpdate);
            window.removeEventListener('roomStatusChanged', handleDataUpdate);
            window.removeEventListener('dataChanged', handleDataUpdate);
        };
    }, [user?.username, loadDashboardData]);

    // Use dashboardData directly for better performance
    const stableDashboardData = useMemo(() => dashboardData, [dashboardData]);
    
    const stats = useMemo(() => {
        if (!dashboardData) return [];
        
        return [
            {
                title: user?.role === 'user' ? "Chambres Occupées" : "Chambres Occupées",
                value: dashboardData.occupiedRooms.toString(),
                subtitle: `sur ${dashboardData.totalRooms} chambres`,
                color: "from-blue-500 to-blue-600",
                bgColor: "bg-blue-50",
                icon: Images.room
            },
            {
                title: user?.role === 'user' ? "Mes Réservations" : "Réservations Aujourd'hui",
                value: dashboardData.todayReservations.toString(),
                subtitle: user?.role === 'user' ? "mes réservations" : "nouvelles réservations",
                color: "from-green-500 to-green-600",
                bgColor: "bg-green-50",
                icon: Images.reservation
            },
            {
                title: user?.role === 'user' ? "Mes Revenus" : "Revenus du Jour",
                value: formatPrice(dashboardData.todayRevenue.toString()),
                subtitle: user?.role === 'user' ? "mes revenus" : "chiffre d'affaires",
                color: "from-purple-500 to-purple-600",
                bgColor: "bg-purple-50",
                icon: Images.billing
            }
        ];
    }, [dashboardData, user?.role]);

    if (isLoading) {
        return <LoadingSpinner size="lg" text="Chargement du tableau de bord..." />;
    }

    return (
        <div>
            <div className="mb-6 sm:mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">Tableau de Bord</h1>
                        <p className="text-sm sm:text-base text-slate-600">
                            {user?.role === 'user' 
                                ? 'Vue d\'ensemble de vos activités' 
                                : 'Vue d\'ensemble de votre établissement'
                            }
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <button
                            onClick={loadDashboardData}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm transition-colors"
                        >
                            Actualiser
                        </button>
                        {user?.role === 'super_admin' && (
                            <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                    onClick={async () => {
                                        if (confirm('Générer des données de test ? Cela ajoutera des clients, réservations et factures fictives.')) {
                                            const success = await generateTestData();
                                            if (success) {
                                                alert('Données de test générées avec succès!');
                                                loadDashboardData();
                                            } else {
                                                alert('Erreur lors de la génération des données');
                                            }
                                        }
                                    }}
                                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs sm:text-sm transition-colors"
                                >
                                    <span className="hidden sm:inline">Générer données test</span>
                                    <span className="sm:hidden">Données test</span>
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm('Réinitialiser les chambres aux 27 par défaut ?')) {
                                            resetRoomsToDefault();
                                            alert('Chambres réinitialisées aux 27 par défaut');
                                            loadDashboardData();
                                        }
                                    }}
                                    className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs sm:text-sm transition-colors"
                                >
                                    <span className="hidden sm:inline">Reset chambres</span>
                                    <span className="sm:hidden">Reset</span>
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm('Supprimer toutes les données ? Cette action est irréversible.')) {
                                            clearAllData();
                                            alert('Toutes les données ont été supprimées');
                                            loadDashboardData();
                                        }
                                    }}
                                    className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs sm:text-sm transition-colors"
                                >
                                    <span className="hidden sm:inline">Vider données</span>
                                    <span className="sm:hidden">Vider</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                {stats.map((stat, index) => (
                    <StatCard key={index} stat={stat} index={index} />
                ))}
            </div>

            {(user?.role === 'admin' || user?.role === 'super_admin') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Aperçu Rapide</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600">Taux d&apos;occupation</span>
                                    <span className={`font-semibold ${
                                        dashboardData.occupancyRate > 80 ? 'text-red-600' :
                                        dashboardData.occupancyRate > 60 ? 'text-orange-600' :
                                        dashboardData.occupancyRate > 30 ? 'text-yellow-600' :
                                        'text-green-600'
                                    }`}>
                                        {dashboardData.occupancyRate}%
                                    </span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-3">
                                    <div 
                                        className={`h-3 rounded-full transition-all duration-500 ${
                                            dashboardData.occupancyRate > 80 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                                            dashboardData.occupancyRate > 60 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                                            dashboardData.occupancyRate > 30 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                                            'bg-gradient-to-r from-green-500 to-green-600'
                                        }`}
                                        style={{width: `${dashboardData.occupancyRate}%`}}
                                    ></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                                        <div className="text-lg font-bold text-slate-800">{dashboardData.availableRooms}</div>
                                        <div className="text-xs text-slate-600">Disponibles</div>
                                    </div>
                                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                                        <div className="text-lg font-bold text-slate-800">{dashboardData.occupiedRooms}</div>
                                        <div className="text-xs text-slate-600">Occupées</div>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-slate-200">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600">Revenus aujourd&apos;hui</span>
                                        <span className="font-semibold" style={{color: '#7D3837'}}>
                                            {formatPrice(dashboardData.todayRevenue.toString())}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Statut des Chambres</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">{dashboardData.availableRooms}</div>
                                <div className="text-sm text-green-700">Disponibles</div>
                            </div>
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">{dashboardData.occupiedRooms}</div>
                                <div className="text-sm text-blue-700">Occupées</div>
                            </div>
                            <div className="text-center p-4 bg-yellow-50 rounded-lg">
                                <div className="text-2xl font-bold text-yellow-600">{dashboardData.maintenanceRooms}</div>
                                <div className="text-sm text-yellow-700">Maintenance</div>
                            </div>
                            <div className="text-center p-4 bg-purple-50 rounded-lg">
                                <div className="text-2xl font-bold text-purple-600">{dashboardData.cleaningRooms}</div>
                                <div className="text-sm text-purple-700">Nettoyage</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Statistiques de rendement - Section importante */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
                {/* Rendement journalier */}
                <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-4">Rendement Journalier</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                            <div>
                                <p className="text-sm font-medium text-blue-800">Nuitées</p>
                                <p className="text-xs text-blue-600">{dashboardData.dailyStats?.nuitee?.count || 0} chambres</p>
                            </div>
                            <p className="text-lg font-bold text-blue-600">{formatPrice((dashboardData.dailyStats?.nuitee?.amount || 0).toString())}</p>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <div>
                                <p className="text-sm font-medium text-green-800">Repos</p>
                                <p className="text-xs text-green-600">{dashboardData.dailyStats?.repos?.count || 0} chambres</p>
                            </div>
                            <p className="text-lg font-bold text-green-600">{formatPrice((dashboardData.dailyStats?.repos?.amount || 0).toString())}</p>
                        </div>
                        <div className="pt-3 border-t border-slate-200">
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-600">Total journalier</span>
                                <span className="font-bold" style={{color: '#7D3837'}}>
                                    {formatPrice(((dashboardData.dailyStats?.nuitee?.amount || 0) + (dashboardData.dailyStats?.repos?.amount || 0)).toString())}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Revenus mensuels */}
                <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-4">Revenus du Mois</h3>
                    <div className="space-y-4">
                        <div className="text-center">
                            <div className="text-3xl font-bold" style={{color: '#7D3837'}}>
                                {formatPrice(dashboardData.monthlyRevenue.toString())}
                            </div>
                            <div className="text-sm text-slate-500">Revenus du mois en cours</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                                <div className="text-lg font-bold text-green-600">{dashboardData.totalClients}</div>
                                <div className="text-xs text-slate-600">Total clients</div>
                            </div>
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                                <div className="text-lg font-bold text-blue-600">{dashboardData.totalBills}</div>
                                <div className="text-xs text-slate-600">Total reçus</div>
                            </div>
                        </div>
                        <div className="pt-3 border-t border-slate-200">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Objectif mensuel</span>
                                <span className="font-semibold text-slate-800">2,500,000 FCFA</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                                <div 
                                    className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                                    style={{width: `${Math.min((dashboardData.monthlyRevenue / 2500000) * 100, 100)}%`}}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Activités récentes et Chambres par catégorie */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800">Activités Récentes</h3>
                        <button 
                            onClick={loadDashboardData}
                            className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100"
                        >
                            Actualiser
                        </button>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                        {dashboardData.recentActivities.length === 0 ? (
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center p-1">
                                    <Image src={Images.dashboard} alt="Dashboard" width={16} height={16} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Aucune activité récente</p>
                                    <p className="text-xs text-slate-500">Les dernières actions apparaîtront ici</p>
                                </div>
                            </div>
                        ) : (
                            dashboardData.recentActivities.map((activity, index) => {
                                const getIcon = (type: string) => {
                                    switch(type) {
                                        case 'reservation': return Images.reservation;
                                        case 'client': return Images.client;
                                        case 'billing': return Images.billing;
                                        default: return Images.dashboard;
                                    }
                                };
                                
                                const getBgColor = (type: string) => {
                                    switch(type) {
                                        case 'reservation': return 'bg-green-100';
                                        case 'client': return 'bg-blue-100';
                                        case 'billing': return 'bg-purple-100';
                                        default: return 'bg-slate-100';
                                    }
                                };
                                
                                return (
                                    <div key={`activity-${index}-${activity.type}-${activity.message.slice(0, 10)}`} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                        <div className={`w-8 h-8 ${getBgColor(activity.type)} rounded-full flex items-center justify-center p-1`}>
                                            <Image src={getIcon(activity.type)} alt={activity.type} width={16} height={16} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-700">{activity.message}</p>
                                            <p className="text-xs text-slate-500">{activity.detail} • {activity.time}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Chambres par catégorie */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Chambres par Catégorie</h3>
                    <div className="space-y-3">
                        {[
                            { name: 'Standard', color: 'bg-blue-500' },
                            { name: 'Confort', color: 'bg-green-500' },
                            { name: 'VIP', color: 'bg-purple-500' },
                            { name: 'Suite', color: 'bg-amber-500' }
                        ].map((category, index) => {
                            const categoryRooms = dashboardData.roomsByCategory[category.name] || [];
                            const totalCount = categoryRooms.length;
                            const occupiedCount = categoryRooms.filter((r: Room) => r.status === 'Occupée').length;
                            const rate = totalCount > 0 ? Math.round((occupiedCount / totalCount) * 100) : 0;
                            
                            return (
                                <div key={`category-${category.name}-${index}-${totalCount}-${occupiedCount}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                                        <span className="text-sm font-medium text-slate-700">{category.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-semibold text-slate-800">{occupiedCount}/{totalCount}</div>
                                        <div className="text-xs text-slate-500">{rate}%</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            
            {/* Sections secondaires */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-4 sm:mt-6">
                {/* Rendement hebdomadaire */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Rendement Hebdomadaire</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                            <div>
                                <p className="text-sm font-medium text-purple-800">Nuitées</p>
                                <p className="text-xs text-purple-600">{dashboardData.weeklyStats?.nuitee?.count || 0} chambres</p>
                            </div>
                            <p className="text-lg font-bold text-purple-600">{formatPrice((dashboardData.weeklyStats?.nuitee?.amount || 0).toString())}</p>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                            <div>
                                <p className="text-sm font-medium text-orange-800">Repos</p>
                                <p className="text-xs text-orange-600">{dashboardData.weeklyStats?.repos?.count || 0} chambres</p>
                            </div>
                            <p className="text-lg font-bold text-orange-600">{formatPrice((dashboardData.weeklyStats?.repos?.amount || 0).toString())}</p>
                        </div>
                        <div className="pt-3 border-t border-slate-200">
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-600">Total hebdomadaire</span>
                                <span className="font-bold" style={{color: '#7D3837'}}>
                                    {formatPrice(((dashboardData.weeklyStats?.nuitee?.amount || 0) + (dashboardData.weeklyStats?.repos?.amount || 0)).toString())}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Clients récents */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Derniers Clients</h3>
                    <div className="space-y-3">
                        {dashboardData.recentActivities.filter((a: Activity) => a.type === 'client').slice(0, 4).map((client, index) => (
                            <div key={`client-${index}-${client.message}-${client.detail}`} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-semibold text-blue-600">
                                        {client.message.split(' - ')[1]?.charAt(0) || 'C'}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-700">
                                        {client.message.split(' - ')[1] || 'Client'}
                                    </p>
                                    <p className="text-xs text-slate-500">{client.detail}</p>
                                </div>
                            </div>
                        ))}
                        {dashboardData.recentActivities.filter((a: Activity) => a.type === 'client').length === 0 && (
                            <div className="text-center py-4 text-slate-500 text-sm">
                                Aucun client récent
                            </div>
                        )}
                    </div>
                </div>

                {/* Réservations par jour de la semaine */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Réservations par Jour</h3>
                    <div className="space-y-3">
                        {dashboardData.weeklyReservations.map((dayData, index) => (
                            <div key={`day-${dayData.day}-${index}-${dayData.count}-${dayData.maxCount}`} className="flex items-center gap-3">
                                <div className="w-8 text-xs text-slate-600">{dayData.day}</div>
                                <div className="flex-1 bg-slate-200 rounded-full h-2">
                                    <div 
                                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{width: `${(dayData.count / dayData.maxCount) * 100}%`}}
                                    ></div>
                                </div>
                                <div className="w-6 text-xs text-slate-700 font-medium">{dayData.count}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            

            {/* Indicateur de performance en développement - Simplifié */}
            {process.env.NODE_ENV === 'development' && user?.role === 'super_admin' && (
                <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs z-50">
                    <div>Dashboard: OK</div>
                    <div>Cache: Active</div>
                    {isOptimizing && <div className="text-yellow-400">Optimizing...</div>}
                </div>
            )}
        </div>
    );
}

export default memo(DashBoard);