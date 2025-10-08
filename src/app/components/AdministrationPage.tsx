'use client';

import { useState, memo, useEffect } from 'react';
import UserManagement from './UserManagement';
import AnalyticsPage from './AnalyticsPage';
import { useAuth } from '../context/AuthContext';

const AdministrationPage = () => {
    const [activeSection, setActiveSection] = useState('overview');
    const { user } = useAuth();
    
    // Cache des statistiques pour éviter les recalculs
    const [stats, setStats] = useState(() => {
        try {
            const rooms = JSON.parse(localStorage.getItem('rooms') || '[]');
            const bills = JSON.parse(localStorage.getItem('bills') || '[]');
            const clients = JSON.parse(localStorage.getItem('clients') || '[]');
            
            const occupiedRooms = rooms.filter((r: any) => r.status === 'Occupée').length;
            const totalRooms = rooms.length || 27;
            const today = new Date().toISOString().split('T')[0];
            const todayRevenue = bills
                .filter((b: any) => b.date === today)
                .reduce((sum: number, b: any) => sum + (parseInt(b.amount) || 0), 0);
                
            return {
                activeUsers: 1,
                todayActions: bills.length + clients.length,
                occupiedRooms,
                totalRooms,
                todayRevenue,
                systemStatus: 'Opérationnel'
            };
        } catch {
            return {
                activeUsers: 1,
                todayActions: 0,
                occupiedRooms: 0,
                totalRooms: 27,
                todayRevenue: 0,
                systemStatus: 'Opérationnel'
            };
        }
    });

    // Actualiser les stats seulement si nécessaire
    useEffect(() => {
        const handleStorageChange = () => {
            try {
                const rooms = JSON.parse(localStorage.getItem('rooms') || '[]');
                const bills = JSON.parse(localStorage.getItem('bills') || '[]');
                const clients = JSON.parse(localStorage.getItem('clients') || '[]');
                
                const occupiedRooms = rooms.filter((r: any) => r.status === 'Occupée').length;
                const totalRooms = rooms.length || 27;
                const today = new Date().toISOString().split('T')[0];
                const todayRevenue = bills
                    .filter((b: any) => b.date === today)
                    .reduce((sum: number, b: any) => sum + (parseInt(b.amount) || 0), 0);
                    
                setStats({
                    activeUsers: 1,
                    todayActions: bills.length + clients.length,
                    occupiedRooms,
                    totalRooms,
                    todayRevenue,
                    systemStatus: 'Opérationnel'
                });
            } catch {
                // Ignorer les erreurs
            }
        };
        
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('dataChanged', handleStorageChange);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('dataChanged', handleStorageChange);
        };
    }, []);

    const renderSection = () => {
        switch (activeSection) {
            case 'users':
                return <UserManagement />;
            case 'analytics':
                return <AnalyticsPage />;
            case 'settings':
                return (
                    <div className="bg-white p-6 rounded-xl border border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Paramètres de l\'Établissement</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Nom de l\'établissement</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg" defaultValue="Mon Hôtel" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Nombre de chambres</label>
                                <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg" defaultValue="27" max="50" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Devise</label>
                                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                                    <option value="XAF">FCFA (XAF)</option>
                                    <option value="EUR">Euro (EUR)</option>
                                    <option value="USD">Dollar (USD)</option>
                                </select>
                            </div>
                            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                Sauvegarder
                            </button>
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-slate-800 mb-2">Panneau d'Administration</h2>
                            <p className="text-slate-600">Gérez tous les aspects administratifs de votre hôtel</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Gestion des utilisateurs */}
                            <div 
                                onClick={() => setActiveSection('users')}
                                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-800">Utilisateurs</h3>
                                        <p className="text-sm text-slate-600">Gérer les comptes utilisateurs</p>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500">Créer, modifier et gérer les permissions des utilisateurs du système.</p>
                            </div>

                            {/* Paramètres */}
                            <div 
                                onClick={() => setActiveSection('settings')}
                                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-800">Paramètres</h3>
                                        <p className="text-sm text-slate-600">Configuration système</p>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500">Configurer les paramètres de l'établissement et du système.</p>
                            </div>

                            {/* Analytics */}
                            <div 
                                onClick={() => setActiveSection('analytics')}
                                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                                        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-800">Analytics</h3>
                                        <p className="text-sm text-slate-600">Rapports et analyses</p>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500">Consulter les rapports détaillés et analyses de performance.</p>
                            </div>



                            {/* Statistiques temps réel */}
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center">
                                        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-800">Statistiques</h3>
                                        <p className="text-sm text-slate-600">Données temps réel</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Utilisateurs actifs</span>
                                        <span className="font-medium text-slate-800">{stats.activeUsers}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Actions aujourd'hui</span>
                                        <span className="font-medium text-slate-800">{stats.todayActions}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Chambres occupées</span>
                                        <span className="font-medium text-slate-800">{stats.occupiedRooms}/{stats.totalRooms}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Revenus du jour</span>
                                        <span className="font-medium text-green-600">{stats.todayRevenue.toLocaleString()} FCFA</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Système</span>
                                        <span className="font-medium text-green-600">{stats.systemStatus}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="space-y-6">
            {activeSection !== 'overview' && (
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => setActiveSection('overview')}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Retour à l'administration
                    </button>
                    <h1 className="text-2xl font-bold text-slate-800">
                        {activeSection === 'users' && 'Gestion des Utilisateurs'}
                        {activeSection === 'analytics' && 'Rapports & Analytics'}
                        {activeSection === 'settings' && 'Paramètres de l\'Établissement'}
                    </h1>
                </div>
            )}
            
            {renderSection()}
        </div>
    );
};

export default memo(AdministrationPage);