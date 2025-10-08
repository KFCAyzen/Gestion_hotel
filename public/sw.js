const CACHE_NAME = 'gestion-hotel-v2.1.0';
const STATIC_CACHE = 'static-v2.1.0';
const DYNAMIC_CACHE = 'dynamic-v2.1.0';

// Ressources à mettre en cache
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/dataWorker.js',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// Ressources dynamiques importantes
const DYNAMIC_ASSETS = [
    '/api/rooms',
    '/api/reservations',
    '/api/clients',
    '/api/billing'
];

// Installation du service worker
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        Promise.all([
            // Cache statique
            caches.open(STATIC_CACHE).then(cache => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            }),
            // Préparation du cache dynamique
            caches.open(DYNAMIC_CACHE).then(cache => {
                console.log('Service Worker: Dynamic cache ready');
                return cache;
            })
        ]).then(() => {
            console.log('Service Worker: Installation complete');
            return self.skipWaiting();
        })
    );
});

// Activation du service worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        Promise.all([
            // Nettoyer les anciens caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Prendre le contrôle immédiatement
            self.clients.claim()
        ]).then(() => {
            console.log('Service Worker: Activation complete');
        })
    );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorer les requêtes non-HTTP
    if (!request.url.startsWith('http')) {
        return;
    }

    // Stratégie Cache First pour les assets statiques
    if (STATIC_ASSETS.some(asset => url.pathname.includes(asset))) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Stratégie Network First pour les données dynamiques
    if (DYNAMIC_ASSETS.some(asset => url.pathname.includes(asset)) || 
        url.pathname.includes('/api/') ||
        request.method === 'POST' || 
        request.method === 'PUT' || 
        request.method === 'DELETE') {
        event.respondWith(networkFirst(request));
        return;
    }

    // Stratégie Stale While Revalidate pour le reste
    event.respondWith(staleWhileRevalidate(request));
});

// Stratégie Cache First
async function cacheFirst(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.error('Cache First failed:', error);
        return new Response('Offline', { status: 503 });
    }
}

// Stratégie Network First
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('Network failed, trying cache:', error);
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        return new Response('Offline', { status: 503 });
    }
}

// Stratégie Stale While Revalidate
async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);

    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(() => cachedResponse);

    return cachedResponse || fetchPromise;
}

// Gestion des messages
self.addEventListener('message', (event) => {
    const { type, data } = event.data;

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
        case 'GET_VERSION':
            event.ports[0].postMessage({ version: CACHE_NAME });
            break;
        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
        case 'CACHE_URLS':
            cacheUrls(data.urls).then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
        default:
            console.log('Unknown message type:', type);
    }
});

// Nettoyer tous les caches
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('All caches cleared');
}

// Mettre en cache des URLs spécifiques
async function cacheUrls(urls) {
    const cache = await caches.open(DYNAMIC_CACHE);
    await Promise.all(
        urls.map(async (url) => {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    await cache.put(url, response);
                }
            } catch (error) {
                console.error('Failed to cache URL:', url, error);
            }
        })
    );
}

// Synchronisation en arrière-plan
self.addEventListener('sync', (event) => {
    console.log('Background sync:', event.tag);
    
    switch (event.tag) {
        case 'background-sync':
            event.waitUntil(doBackgroundSync());
            break;
        case 'data-sync':
            event.waitUntil(syncData());
            break;
    }
});

// Synchronisation des données
async function syncData() {
    try {
        // Synchroniser les données critiques
        const criticalUrls = [
            '/api/rooms',
            '/api/reservations/today',
            '/api/billing/today'
        ];
        
        await cacheUrls(criticalUrls);
        console.log('Data sync completed');
    } catch (error) {
        console.error('Data sync failed:', error);
    }
}

// Synchronisation générale
async function doBackgroundSync() {
    try {
        // Nettoyer les anciens caches
        await cleanupOldCaches();
        
        // Précharger les données importantes
        await preloadImportantData();
        
        console.log('Background sync completed');
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Nettoyer les anciens caches
async function cleanupOldCaches() {
    const cacheNames = await caches.keys();
    const oldCaches = cacheNames.filter(name => 
        !name.includes('v2.1.0') && 
        (name.includes('gestion-hotel') || name.includes('static') || name.includes('dynamic'))
    );
    
    await Promise.all(oldCaches.map(name => caches.delete(name)));
}

// Précharger les données importantes
async function preloadImportantData() {
    const importantUrls = [
        '/',
        '/dashboard',
        '/rooms',
        '/reservations'
    ];
    
    await cacheUrls(importantUrls);
}

// Gestion des notifications push
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        vibrate: [100, 50, 100],
        data: data.data,
        actions: data.actions || []
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Gestion des clics sur notifications
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            // Chercher une fenêtre existante
            for (const client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            
            // Ouvrir une nouvelle fenêtre
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

console.log('Service Worker: Script loaded');