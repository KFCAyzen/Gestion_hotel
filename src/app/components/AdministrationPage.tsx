'use client';

import { useState, memo } from 'react';
import UserManagement from './UserManagement';
import ActivityHistory from './ActivityHistory';
import PerformanceHistory from './PerformanceHistory';
import AnalyticsPage from './AnalyticsPage';
import StaffSchedulePage from './StaffSchedulePage';
import { useRealTimeData } from '../hooks/useRealTimeData';
import { useStableData } from '../hooks/useStableData';

const AdministrationPage = () => {
    const [activeSection, setActiveSection] = useState('overview');
    const { stats, loading } = useRealTimeData();
    const stableStats = useStableData(stats);

    const renderSection = () => {
        switch (activeSection) {
            case 'users':
                return <UserManagement />;
            case 'history':
                return <ActivityHistory />;
            case 'performance':
                return <PerformanceHistory />;
            case 'analytics':
                return <AnalyticsPage />;
            case 'staff':
                return <StaffSchedulePage />;
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

                            {/* Historique des activités */}
                            <div 
                                onClick={() => setActiveSection('history')}
                                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-800">Historique</h3>
                                        <p className="text-sm text-slate-600">Journal des activités</p>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500">Consulter l'historique complet des actions effectuées dans le système.</p>
                            </div>

                            {/* Performances */}
                            <div 
                                onClick={() => setActiveSection('performance')}
                                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-800">Performances</h3>
                                        <p className="text-sm text-slate-600">Suivi des performances</p>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500">Analyser les performances du système et optimiser les opérations.</p>
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

                            {/* Planning du personnel */}
                            <div 
                                onClick={() => setActiveSection('staff')}
                                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                                        <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-800">Personnel</h3>
                                        <p className="text-sm text-slate-600">Planning et tâches</p>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500">Gérer les horaires, tâches et disponibilités du personnel.</p>
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
                                {loading ? (
                                    <div className="animate-pulse space-y-2">
                                        <div className="h-4 bg-slate-300 rounded"></div>
                                        <div className="h-4 bg-slate-300 rounded"></div>
                                        <div className="h-4 bg-slate-300 rounded"></div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Utilisateurs actifs</span>
                                            <span className="font-medium text-slate-800">{stableStats.activeUsers}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Actions aujourd'hui</span>
                                            <span className="font-medium text-slate-800">{stableStats.todayActions}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Chambres occupées</span>
                                            <span className="font-medium text-slate-800">{stableStats.occupiedRooms}/{stableStats.totalRooms}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Revenus du jour</span>
                                            <span className="font-medium text-green-600">{stableStats.todayRevenue.toLocaleString()} FCFA</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Système</span>
                                            <span className={`font-medium ${
                                                stableStats.systemStatus === 'Opérationnel' ? 'text-green-600' :
                                                stableStats.systemStatus === 'Maintenance' ? 'text-yellow-600' : 'text-red-600'
                                            }`}>
                                                {stableStats.systemStatus}
                                            </span>
                                        </div>
                                    </div>
                                )}
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
                        {activeSection === 'history' && 'Historique des Activités'}
                        {activeSection === 'performance' && 'Performances du Système'}
                        {activeSection === 'analytics' && 'Rapports & Analytics'}
                        {activeSection === 'staff' && 'Planning du Personnel'}
                    </h1>
                </div>
            )}
            
            {renderSection()}
        </div>
    );
};

export default memo(AdministrationPage);