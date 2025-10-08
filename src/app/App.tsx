"use client";

import { useState, useEffect } from "react";
import DashBoard from "./components/DashBoard";
import ReservationPage from "./components/ReservationPage";
import RoomsPage from "./components/RoomsPage";
import ClientsPage from "./components/ClientsPage";
import BillingPage from "./components/BillingPage";
import UserManagement from "./components/UserManagement";
import ActivityHistory from "./components/ActivityHistory";
import PerformanceHistory from "./components/PerformanceHistory";
import { Images } from "./components/Images";
import { useActivityLog } from "./context/ActivityLogContext";
import Image from "next/image";
import { syncLocalStorageToFirebase } from "./utils/syncData";
import { useNotification } from "./hooks/useNotification";
import Notification from "./components/Notification";
import { NotificationProvider } from "./context/NotificationContext";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./components/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import ChangePasswordModal from "./components/ChangePasswordModal";
import CheckoutAlertModal from "./components/CheckoutAlertModal";
import ChangePassword from "./components/ChangePassword";
import NotificationsPage from "./components/NotificationsPage";
import WelcomeScreen from "./components/WelcomeScreen";
import PWAInstaller from "./components/PWAInstaller";
import AnalyticsPage from "./components/AnalyticsPage";
import StaffSchedulePage from "./components/StaffSchedulePage";
import AdministrationPage from "./components/AdministrationPage";
import PerformanceMonitor from "./components/PerformanceMonitor";

/**
 * Composant principal de l'application de gestion d'hôtel
 * Gère l'authentification, la navigation et l'affichage des pages
 */
export default function App() {
    // État de la page actuelle
    const [currentPage, setCurrentPage] = useState("home");
    // État du menu mobile (ouvert/fermé)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    // Hooks personnalisés
    const { notifications, showNotification, removeNotification } = useNotification();
    const { user, logout } = useAuth();
    useActivityLog();
    const [showLogin, setShowLogin] = useState(!user);
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [showCheckoutAlert, setShowCheckoutAlert] = useState(false);
    const [showUserPasswordChange, setShowUserPasswordChange] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        if (user && user.mustChangePassword) {
            setShowPasswordChange(true);
        } else {
            setShowPasswordChange(false);
        }
    }, [user]);

    useEffect(() => {
        if (user && !showPasswordChange) {
            setShowWelcome(true);
        }
    }, [user, showPasswordChange]);

    useEffect(() => {
        // Initialiser la synchronisation des données au démarrage
        syncLocalStorageToFirebase();
        
        // Démarrer la synchronisation automatique périodique (toutes les 30 secondes)
        const syncInterval = setInterval(() => {
            syncLocalStorageToFirebase();
        }, 30000);
        
        // Synchroniser avant fermeture de page
        const handleBeforeUnload = () => {
            syncLocalStorageToFirebase();
        };
        
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        // Nettoyer les listeners au démontage
        return () => {
            clearInterval(syncInterval);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    /**
     * Fonction pour rendre la page correspondant à l'état actuel
     * @returns Composant de la page à afficher
     */
    const renderPage = () => {
        switch (currentPage) {
            case "home":
                return <DashBoard />;
            case "reservations":
                return <ReservationPage />;
            case "chambres":
                return <RoomsPage />;
            case "clients":
                return <ClientsPage />;
            case "facturation":
                return <BillingPage />;
            case "users":
                return <UserManagement />;
            case "history":
                return <ActivityHistory />;
            case "performance":
                return <PerformanceHistory />;
            case "notifications":
                return <NotificationsPage />;
            case "analytics":
                return <AnalyticsPage />;
            case "staff":
                return <StaffSchedulePage />;
            case "administration":
                return <AdministrationPage />;
            default:
                return <DashBoard />;
        }
    };

    // Affichage de la page de connexion si non authentifié
    if (showLogin || !user) {
        return (
            <>
                <LoginPage onLoginSuccess={() => setShowLogin(false)} />
                {notifications.map((notification, index) => (
                    <Notification
                        key={`login-notification-${notification.id}-${index}`}
                        message={notification.message}
                        type={notification.type}
                        onClose={() => removeNotification(notification.id)}
                    />
                ))}
            </>
        );
    }

    // Affichage du modal de changement de mot de passe si requis
    if (showPasswordChange) {
        return (
            <>
                <ChangePasswordModal onPasswordChanged={() => setShowPasswordChange(false)} />
                {notifications.map((notification, index) => (
                    <Notification
                        key={`password-notification-${notification.id}-${index}`}
                        message={notification.message}
                        type={notification.type}
                        onClose={() => removeNotification(notification.id)}
                    />
                ))}
            </>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
            {/* Top Navigation Bar */}
            <header className="bg-gradient-to-r from-[#7D3837] via-[#8B4A49] to-[#7D3837] shadow-xl border-b border-white/10">
                <div className="px-4 sm:px-6 py-1">
                    <div className="flex items-center justify-between">
                        {/* Logo et titre */}
                        <button onClick={() => setCurrentPage("home")} className="flex items-center gap-2 sm:gap-3 cursor-pointer">
                            <Image src={Images.logo} alt="Logo PAULINA HÔTEL" width={32} height={32} className="sm:w-10 sm:h-10 rounded-lg" />
                            <h1 className="text-lg sm:text-xl font-bold text-white">
                                PAULINA HÔTEL
                            </h1>
                        </button>
                        
                        {/* Navigation horizontale - Desktop */}
                        <nav className="hidden lg:flex items-center gap-1">
                            {/* Section principale */}
                            <div className="flex items-center gap-1 mr-4">
                            <button onClick={() => setCurrentPage("home")} className={`px-4 py-4 flex items-center gap-2 transition-all duration-300 font-medium text-sm cursor-pointer relative ${
                                currentPage === "home" 
                                    ? 'bg-white text-[#7D3837] rounded-t-xl shadow-lg border-b-4 border-white -mb-1 z-10' 
                                    : 'text-white hover:bg-white/15 hover:text-amber-200 rounded-lg'
                            }`}>
                                    <Image src={currentPage === "home" ? Images.dashboard : Images.dashboardActif} alt="Dashboard" width={16} height={16} />
                                    Dashboard
                                </button>
                            <button onClick={() => setCurrentPage("reservations")} className={`px-4 py-4 flex items-center gap-2 transition-all duration-300 font-medium text-sm cursor-pointer relative ${
                                currentPage === "reservations" 
                                    ? 'bg-white text-[#7D3837] rounded-t-xl shadow-lg border-b-4 border-white -mb-1 z-10' 
                                    : 'text-white hover:bg-white/15 hover:text-amber-200 rounded-lg'
                            }`}>
                                    <Image src={currentPage === "reservations" ? Images.reservation : Images.reservationActif} alt="Reservations" width={16} height={16} />
                                    Réservations
                                </button>
                            <button onClick={() => setCurrentPage("chambres")} className={`px-4 py-4 flex items-center gap-2 transition-all duration-300 font-medium text-sm cursor-pointer relative ${
                                currentPage === "chambres" 
                                    ? 'bg-white text-[#7D3837] rounded-t-xl shadow-lg border-b-4 border-white -mb-1 z-10' 
                                    : 'text-white hover:bg-white/15 hover:text-amber-200 rounded-lg'
                            }`}>
                                    <Image src={currentPage === "chambres" ? Images.room : Images.roomActif} alt="Chambres" width={16} height={16} />
                                    Chambres
                                </button>
                            <button onClick={() => setCurrentPage("clients")} className={`px-4 py-4 flex items-center gap-2 transition-all duration-300 font-medium text-sm cursor-pointer relative ${
                                currentPage === "clients" 
                                    ? 'bg-white text-[#7D3837] rounded-t-xl shadow-lg border-b-4 border-white -mb-1 z-10' 
                                    : 'text-white hover:bg-white/15 hover:text-amber-200 rounded-lg'
                            }`}>
                                    <Image src={currentPage === "clients" ? Images.client : Images.clientActif} alt="Clients" width={16} height={16} />
                                    Clients
                                </button>
                            </div>
                            
                            {/* Section secondaire */}
                            <div className="flex items-center gap-1">
                            <button onClick={() => setCurrentPage("facturation")} className={`px-4 py-4 flex items-center gap-2 transition-all duration-300 font-medium text-sm cursor-pointer relative ${
                                currentPage === "facturation" 
                                    ? 'bg-white text-[#7D3837] rounded-t-xl shadow-lg border-b-4 border-white -mb-1 z-10' 
                                    : 'text-white hover:bg-white/15 hover:text-amber-200 rounded-lg'
                            }`}>
                                    <Image src={currentPage === "facturation" ? Images.billing : Images.billingActif} alt="Facturation" width={16} height={16} />
                                    Facturation
                                </button>
                                <div className="relative">
                                <button onClick={() => setCurrentPage("notifications")} className={`p-2 rounded-lg transition-all duration-300 cursor-pointer relative overflow-hidden ${
                                    currentPage === "notifications" 
                                        ? 'bg-gradient-to-r from-white/95 to-white/90 text-[#7D3837] shadow-lg border-b-2 border-amber-400 transform scale-110 backdrop-blur-sm' 
                                        : 'text-white hover:bg-white/15 hover:text-amber-200 hover:shadow-md hover:scale-105'
                                }`} title="Notifications">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 515.5-7.21" />
                                        </svg>
                                    </button>
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">3</span>
                                </div>
                                {(user?.role === 'admin' || user?.role === 'super_admin') && (
                                    <>
                                        <div className="w-px h-6 bg-white bg-opacity-30 mx-2"></div>
                                        <button onClick={() => setCurrentPage("administration")} className={`px-4 py-4 flex items-center gap-2 transition-all duration-300 font-medium text-sm cursor-pointer relative ${
                                            currentPage === "administration" 
                                                ? 'bg-white text-[#7D3837] rounded-t-xl shadow-lg border-b-4 border-white -mb-1 z-10' 
                                                : 'text-white hover:bg-white/15 hover:text-amber-200 rounded-lg'
                                        }`}>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            Administration
                                        </button>
                                    </>
                                )}
                            </div>
                        </nav>
                        
                        {/* Boutons mobile et déconnexion */}
                        <div className="flex items-center gap-2">
                            {/* Informations utilisateur */}
                            <div className="hidden md:flex items-center gap-3 text-white text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-medium">{user?.name}</span>
                                    <span className={`px-2 py-1 rounded text-xs ${
                                        user?.role === 'super_admin' ? 'bg-red-100 text-red-800 sm:text-red-800 text-amber-800' :
                                        user?.role === 'admin' ? 'bg-orange-100 text-orange-800 sm:text-orange-800 text-amber-800' :
                                        'bg-green-100 text-green-800 sm:text-green-800 text-amber-800'
                                    }`}>
                                        {user?.role === 'super_admin' ? 'Super Admin' :
                                         user?.role === 'admin' ? 'Admin' : 'Utilisateur'}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Bouton modifier mot de passe - Desktop */}
                            <button
                                onClick={() => setShowUserPasswordChange(true)}
                                className="hidden sm:block p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors cursor-pointer"
                                title="Modifier mot de passe"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                            </button>
                            
                            {/* Bouton de déconnexion - Desktop */}
                            <button
                                onClick={() => {logout(); setShowLogin(true);}}
                                className="hidden sm:block p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors cursor-pointer"
                                title="Déconnexion"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                            
                            {/* Menu hamburger - Mobile */}
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="lg:hidden p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors cursor-pointer"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    {/* Menu mobile */}
                    {isMobileMenuOpen && (
                        <div className="lg:hidden mt-4 pb-4 border-t border-slate-600">
                            <nav className="flex flex-col gap-2 mt-4">
                                <button onClick={() => {setCurrentPage("home"); setIsMobileMenuOpen(false);}} style={{backgroundColor: currentPage === "home" ? 'white' : 'transparent', color: currentPage === "home" ? '#7D3837' : 'white'}} className="w-full px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-20 flex items-center gap-3 transition-all duration-200 font-medium text-left cursor-pointer">
                                    <Image src={currentPage === "home" ? Images.dashboard : Images.dashboardActif} alt="Dashboard" width={20} height={20} />
                                    Tableau de Bord
                                </button>
                                <button onClick={() => {setCurrentPage("reservations"); setIsMobileMenuOpen(false);}} style={{backgroundColor: currentPage === "reservations" ? 'white' : 'transparent', color: currentPage === "reservations" ? '#7D3837' : 'white'}} className="w-full px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-20 flex items-center gap-3 transition-all duration-200 font-medium text-left cursor-pointer">
                                    <Image src={currentPage === "reservations" ? Images.reservation : Images.reservationActif} alt="Reservations" width={20} height={20} />
                                    Réservations
                                </button>
                                <button onClick={() => {setCurrentPage("chambres"); setIsMobileMenuOpen(false);}} style={{backgroundColor: currentPage === "chambres" ? 'white' : 'transparent', color: currentPage === "chambres" ? '#7D3837' : 'white'}} className="w-full px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-20 flex items-center gap-3 transition-all duration-200 font-medium text-left cursor-pointer">
                                    <Image src={currentPage === "chambres" ? Images.room : Images.roomActif} alt="Chambres" width={20} height={20} />
                                    Chambres
                                </button>
                                <button onClick={() => {setCurrentPage("clients"); setIsMobileMenuOpen(false);}} style={{backgroundColor: currentPage === "clients" ? 'white' : 'transparent', color: currentPage === "clients" ? '#7D3837' : 'white'}} className="w-full px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-20 flex items-center gap-3 transition-all duration-200 font-medium text-left cursor-pointer">
                                    <Image src={currentPage === "clients" ? Images.client : Images.clientActif} alt="Clients" width={20} height={20} />
                                    Clients
                                </button>
                                <button onClick={() => {setCurrentPage("facturation"); setIsMobileMenuOpen(false);}} style={{backgroundColor: currentPage === "facturation" ? 'white' : 'transparent', color: currentPage === "facturation" ? '#7D3837' : 'white'}} className="w-full px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-20 flex items-center gap-3 transition-all duration-200 font-medium text-left cursor-pointer">
                                    <Image src={currentPage === "facturation" ? Images.billing : Images.billingActif} alt="Facturation" width={20} height={20} />
                                    Facturation
                                </button>
                                <div className="relative">
                                    <button onClick={() => {setCurrentPage("notifications"); setIsMobileMenuOpen(false);}} style={{backgroundColor: currentPage === "notifications" ? 'white' : 'transparent', color: currentPage === "notifications" ? '#7D3837' : 'white'}} className="w-full px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-20 flex items-center gap-3 transition-all duration-200 font-medium text-left cursor-pointer">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 515.5-7.21" />
                                        </svg>
                                        Notifications
                                    </button>
                                    <span className="absolute top-2 left-8 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">3</span>
                                </div>
                                {user?.role === 'admin' || user?.role === 'super_admin' ? (
                                    <button onClick={() => {setCurrentPage("administration"); setIsMobileMenuOpen(false);}} style={{backgroundColor: currentPage === "administration" ? 'white' : 'transparent', color: currentPage === "administration" ? '#7D3837' : 'white'}} className="w-full px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-20 flex items-center gap-3 transition-all duration-200 font-medium text-left cursor-pointer">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Administration
                                    </button>
                                ) : null}
                                
                                {/* Informations utilisateur mobile */}
                                <div className="md:hidden w-full mt-2 px-4 py-2 bg-white bg-opacity-10 rounded-lg text-white text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">{user?.name}</span>
                                        <span className={`px-2 py-1 rounded text-xs ${
                                            user?.role === 'super_admin' ? 'bg-red-100 text-red-800 sm:text-red-800 text-amber-800' :
                                            user?.role === 'admin' ? 'bg-orange-100 text-orange-800 sm:text-orange-800 text-amber-800' :
                                            'bg-green-100 text-green-800 sm:text-green-800 text-amber-800'
                                        }`}>
                                            {user?.role === 'super_admin' ? 'Super Admin' :
                                             user?.role === 'admin' ? 'Admin' : 'Utilisateur'}
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Bouton modifier mot de passe mobile */}
                                <button
                                    onClick={() => {setShowUserPasswordChange(true); setIsMobileMenuOpen(false);}}
                                    className="sm:hidden w-full mt-2 px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
                                    </svg>
                                    Modifier mot de passe
                                </button>
                                
                                {/* Bouton de déconnexion mobile */}
                                <button
                                    onClick={() => {logout(); setShowLogin(true); setIsMobileMenuOpen(false);}}
                                    className="sm:hidden w-full mt-2 px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    Déconnexion
                                </button>
                            </nav>
                        </div>
                    )}
                </div>
            </header>

            {/* Contenu principal */}
            <main className="flex-1 p-3 sm:p-6">
                <div className="glass-effect shadow-elegant rounded-xl p-3 sm:p-6 min-h-[500px]">
                    <NotificationProvider showNotification={showNotification}>
                        <ProtectedRoute requiredRole="user">
                            {renderPage()}
                        </ProtectedRoute>
                    </NotificationProvider>
                </div>
            </main>

            {/* Notifications */}
            {notifications.map((notification, index) => (
                <Notification
                    key={`main-notification-${notification.id}-${index}`}
                    message={notification.message}
                    type={notification.type}
                    onClose={() => removeNotification(notification.id)}
                />
            ))}

            {/* Modaux globaux */}
            <CheckoutAlertModal 
                isOpen={showCheckoutAlert} 
                onClose={() => setShowCheckoutAlert(false)} 
            />
            
            {/* Modal de changement de mot de passe utilisateur */}
            {showUserPasswordChange && (
                <ChangePassword onClose={() => setShowUserPasswordChange(false)} />
            )}
            
            {/* Écran de bienvenue */}
            {showWelcome && (
                <WelcomeScreen onComplete={() => {
                    setShowWelcome(false);
                    setShowCheckoutAlert(true);
                }} />
            )}
            
            {/* Installateur PWA */}
            <PWAInstaller />
            
            {/* Moniteur de performance (développement uniquement) */}
            {process.env.NODE_ENV === 'development' && <PerformanceMonitor />}
        </div>
    );
}