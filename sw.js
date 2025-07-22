// VibeVoyage Service Worker
// Provides offline functionality and caching for PWA

const CACHE_NAME = 'vibevoyage-v1.0.0';
const STATIC_CACHE = 'vibevoyage-static-v1.0.0';
const DYNAMIC_CACHE = 'vibevoyage-dynamic-v1.0.0';
const MAP_CACHE = 'vibevoyage-maps-v1.0.0';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.html',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/sounds/police_siren.mp3',
  '/sounds/camera_beep.mp3',
  '/sounds/speed_alert.mp3',
  '/sounds/railway_bell.mp3',
  '/sounds/toll_chime.mp3',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Map tile servers to cache
const MAP_SERVERS = [
  'https://tile.openstreetmap.org',
  'https://a.tile.openstreetmap.org',
  'https://b.tile.openstreetmap.org',
  'https://c.tile.openstreetmap.org',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('VibeVoyage SW: Installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('VibeVoyage SW: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('VibeVoyage SW: Activating...');
  
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== MAP_CACHE) {
              console.log('VibeVoyage SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests
  if (isMapTileRequest(url)) {
    event.respondWith(handleMapTileRequest(request));
  } else if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isStaticAsset(url)) {
    event.respondWith(handleStaticAssetRequest(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

// Handle map tile requests with caching
async function handleMapTileRequest(request) {
  const cache = await caches.open(MAP_CACHE);
  
  try {
    // Try cache first
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fetch from network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('VibeVoyage SW: Map tile fetch failed:', error);
    
    // Return cached version if available
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline map placeholder
    return new Response(
      JSON.stringify({ error: 'Offline - map tiles unavailable' }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle API requests with network-first strategy
async function handleAPIRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  try {
    // Try network first for fresh data
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful API responses
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('VibeVoyage SW: API request failed, trying cache:', error);
    
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response
    return new Response(
      JSON.stringify({ 
        error: 'Offline - API unavailable',
        offline: true,
        timestamp: Date.now()
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAssetRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // Fetch from network and cache
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('VibeVoyage SW: Static asset fetch failed:', error);
    
    // Return generic offline page for HTML requests
    if (request.destination === 'document') {
      return caches.match('/offline.html');
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Handle dynamic requests
async function handleDynamicRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback
    if (request.destination === 'document') {
      return caches.match('/');
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Helper functions
function isMapTileRequest(url) {
  return MAP_SERVERS.some(server => url.href.startsWith(server)) ||
         url.pathname.includes('/tiles/') ||
         url.pathname.match(/\/\d+\/\d+\/\d+\.(png|jpg|jpeg)$/);
}

function isAPIRequest(url) {
  return url.pathname.startsWith('/api/') ||
         url.hostname.includes('api.') ||
         url.pathname.includes('/routing/') ||
         url.pathname.includes('/traffic/') ||
         url.pathname.includes('/poi/');
}

function isStaticAsset(url) {
  return STATIC_ASSETS.some(asset => url.pathname === asset) ||
         url.pathname.startsWith('/static/') ||
         url.pathname.startsWith('/icons/') ||
         url.pathname.startsWith('/sounds/') ||
         url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf)$/);
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('VibeVoyage SW: Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-reports') {
    event.waitUntil(syncOfflineReports());
  } else if (event.tag === 'sync-routes') {
    event.waitUntil(syncOfflineRoutes());
  }
});

// Sync offline reports when connection is restored
async function syncOfflineReports() {
  try {
    const offlineReports = await getOfflineData('reports');
    
    for (const report of offlineReports) {
      try {
        await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report)
        });
        
        // Remove from offline storage after successful sync
        await removeOfflineData('reports', report.id);
      } catch (error) {
        console.log('VibeVoyage SW: Failed to sync report:', error);
      }
    }
  } catch (error) {
    console.log('VibeVoyage SW: Background sync failed:', error);
  }
}

// Sync offline routes
async function syncOfflineRoutes() {
  try {
    const offlineRoutes = await getOfflineData('routes');
    
    for (const route of offlineRoutes) {
      try {
        await fetch('/api/routes/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(route)
        });
        
        await removeOfflineData('routes', route.id);
      } catch (error) {
        console.log('VibeVoyage SW: Failed to sync route:', error);
      }
    }
  } catch (error) {
    console.log('VibeVoyage SW: Route sync failed:', error);
  }
}

// IndexedDB helpers for offline data
async function getOfflineData(store) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VibeVoyageOffline', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const getAllRequest = objectStore.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

async function removeOfflineData(store, id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VibeVoyageOffline', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const deleteRequest = objectStore.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('VibeVoyage SW: Push notification received');
  
  const options = {
    body: 'New traffic alert in your area',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'traffic-alert',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View Alert',
        icon: '/icons/view-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-icon.png'
      }
    ]
  };
  
  if (event.data) {
    const data = event.data.json();
    options.body = data.message || options.body;
    options.tag = data.tag || options.tag;
  }
  
  event.waitUntil(
    self.registration.showNotification('VibeVoyage Alert', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('VibeVoyage SW: Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/?notification=traffic-alert')
    );
  }
});

console.log('VibeVoyage Service Worker loaded successfully');
