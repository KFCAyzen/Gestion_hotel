// Consolidation et déduplication des données
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface ConsolidatedData {
    rooms: any[];
    clients: any[];
    reservations: any[];
    bills: any[];
    users: any[];
}

class DataConsolidation {
    private static instance: DataConsolidation;
    private cache = new Map<string, { data: any; timestamp: number }>();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    static getInstance(): DataConsolidation {
        if (!DataConsolidation.instance) {
            DataConsolidation.instance = new DataConsolidation();
        }
        return DataConsolidation.instance;
    }

    // Récupérer toutes les données de manière optimisée
    async getAllData(forceRefresh = false): Promise<ConsolidatedData> {
        const cacheKey = 'consolidated_data';
        
        if (!forceRefresh && this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey)!.data;
        }

        try {
            // Charger depuis localStorage d'abord (plus rapide)
            const localData = this.getLocalData();
            
            // Si pas de données locales ou force refresh, charger depuis Firebase
            if (this.isLocalDataEmpty(localData) || forceRefresh) {
                const firebaseData = await this.getFirebaseData();
                const consolidated = this.mergeData(localData, firebaseData);
                
                // Sauvegarder en local
                this.saveLocalData(consolidated);
                this.setCache(cacheKey, consolidated);
                
                return consolidated;
            }

            this.setCache(cacheKey, localData);
            return localData;
        } catch (error) {
            console.error('Erreur lors de la consolidation des données:', error);
            return this.getLocalData(); // Fallback sur les données locales
        }
    }

    // Récupérer les données locales
    private getLocalData(): ConsolidatedData {
        return {
            rooms: this.parseLocalStorage('rooms'),
            clients: this.parseLocalStorage('clients'),
            reservations: this.parseLocalStorage('reservations'),
            bills: this.parseLocalStorage('bills'),
            users: this.parseLocalStorage('users')
        };
    }

    // Récupérer les données Firebase
    private async getFirebaseData(): Promise<ConsolidatedData> {
        const [roomsSnapshot, clientsSnapshot, reservationsSnapshot, billsSnapshot, usersSnapshot] = await Promise.all([
            getDocs(collection(db, 'rooms')),
            getDocs(collection(db, 'clients')),
            getDocs(collection(db, 'reservations')),
            getDocs(collection(db, 'bills')),
            getDocs(collection(db, 'users'))
        ]);

        return {
            rooms: roomsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            clients: clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            reservations: reservationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            bills: billsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            users: usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        };
    }

    // Fusionner les données locales et Firebase
    private mergeData(localData: ConsolidatedData, firebaseData: ConsolidatedData): ConsolidatedData {
        return {
            rooms: this.deduplicateArray([...localData.rooms, ...firebaseData.rooms], 'id'),
            clients: this.deduplicateArray([...localData.clients, ...firebaseData.clients], 'id'),
            reservations: this.deduplicateArray([...localData.reservations, ...firebaseData.reservations], 'id'),
            bills: this.deduplicateArray([...localData.bills, ...firebaseData.bills], 'id'),
            users: this.deduplicateArray([...localData.users, ...firebaseData.users], 'id')
        };
    }

    // Dédupliquer un tableau basé sur une clé
    private deduplicateArray(array: any[], key: string): any[] {
        const seen = new Set();
        return array.filter(item => {
            const keyValue = item[key];
            if (seen.has(keyValue)) {
                return false;
            }
            seen.add(keyValue);
            return true;
        });
    }

    // Vérifier si les données locales sont vides
    private isLocalDataEmpty(data: ConsolidatedData): boolean {
        return data.rooms.length === 0 && 
               data.clients.length === 0 && 
               data.reservations.length === 0 && 
               data.bills.length === 0;
    }

    // Parser localStorage avec gestion d'erreur
    private parseLocalStorage(key: string): any[] {
        try {
            return JSON.parse(localStorage.getItem(key) || '[]');
        } catch (error) {
            console.warn(`Erreur lors du parsing de ${key}:`, error);
            return [];
        }
    }

    // Sauvegarder les données consolidées en local
    private saveLocalData(data: ConsolidatedData): void {
        try {
            Object.entries(data).forEach(([key, value]) => {
                localStorage.setItem(key, JSON.stringify(value));
            });
        } catch (error) {
            console.error('Erreur lors de la sauvegarde locale:', error);
        }
    }

    // Gestion du cache
    private isCacheValid(key: string): boolean {
        const cached = this.cache.get(key);
        if (!cached) return false;
        return Date.now() - cached.timestamp < this.CACHE_TTL;
    }

    private setCache(key: string, data: any): void {
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    // Nettoyer le cache
    clearCache(): void {
        this.cache.clear();
    }

    // Obtenir des statistiques consolidées
    getStats(data?: ConsolidatedData): any {
        const consolidatedData = data || this.getLocalData();
        
        return {
            totalRooms: consolidatedData.rooms.length,
            occupiedRooms: consolidatedData.rooms.filter(r => r.status === 'Occupée').length,
            totalClients: consolidatedData.clients.length,
            totalReservations: consolidatedData.reservations.length,
            totalBills: consolidatedData.bills.length,
            totalUsers: consolidatedData.users.length,
            todayRevenue: this.calculateTodayRevenue(consolidatedData.bills),
            monthlyRevenue: this.calculateMonthlyRevenue(consolidatedData.bills)
        };
    }

    // Calculer les revenus du jour
    private calculateTodayRevenue(bills: any[]): number {
        const today = new Date().toISOString().split('T')[0];
        return bills
            .filter(bill => bill.date === today)
            .reduce((sum, bill) => sum + (parseInt(bill.amount) || 0), 0);
    }

    // Calculer les revenus du mois
    private calculateMonthlyRevenue(bills: any[]): number {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        return bills
            .filter(bill => {
                if (!bill.date) return false;
                const billDate = new Date(bill.date);
                return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
            })
            .reduce((sum, bill) => sum + (parseInt(bill.amount) || 0), 0);
    }

    // Synchroniser les données
    async syncData(): Promise<void> {
        try {
            await this.getAllData(true); // Force refresh
            console.log('Données synchronisées avec succès');
        } catch (error) {
            console.error('Erreur lors de la synchronisation:', error);
        }
    }
}

// Instance singleton
export const dataConsolidation = DataConsolidation.getInstance();

// Hook pour utiliser les données consolidées
export const useConsolidatedData = () => {
    return {
        getAllData: (forceRefresh?: boolean) => dataConsolidation.getAllData(forceRefresh),
        getStats: (data?: ConsolidatedData) => dataConsolidation.getStats(data),
        syncData: () => dataConsolidation.syncData(),
        clearCache: () => dataConsolidation.clearCache()
    };
};