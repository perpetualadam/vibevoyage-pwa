// VibeVoyage Service Worker
// Provides offline functionality and caching for PWA

const CACHE_NAME = 'vibevoyage-v1.0.2';
const STATIC_CACHE = 'vibevoyage-static-v1.0.2';
const DYNAMIC_CACHE = 'vibevoyage-dynamic-v1.0.2';
const MAP_CACHE = 'vibevoyage-maps-v1.0.2';
const OFFLINE_CACHE = 'vibevoyage-offline-v1.0.2';

// Static assets to cache immediately
const STATIC_ASSETS = [
  './',
  './index.html',
  './App.js',
  './manifest.json',
  './icons/icon.svg',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Offline fallback responses
const OFFLINE_FALLBACKS = {
  route: {
    error: 'Offline - route calculation unavailable',
    message: 'Using cached route data or basic navigation',
    fallback: 'offline_route'
  },
  poi: {
    error: 'Offline - POI search unavailable',
    message: 'Using cached POI data',
    fallback: 'cached_pois'
  },
  geocoding: {
    error: 'Offline - address search unavailable',
    message: 'Using cached location data',
    fallback: 'cached_locations'
  }
};

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
      caches.open(STATIC_CACHE).then(async (cache) => {
        console.log('VibeVoyage SW: Caching static assets');
        try {
          return await cache.addAll(STATIC_ASSETS);
        } catch (error) {
          console.warn('VibeVoyage SW: Some assets failed to cache:', error);
          // Try to cache assets individually to avoid complete failure
          for (const asset of STATIC_ASSETS) {
            try {
              await cache.add(asset);
            } catch (assetError) {
              console.warn(`VibeVoyage SW: Failed to cache ${asset}:`, assetError);
            }
          }
        }
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
                cacheName !== MAP_CACHE &&
                cacheName !== OFFLINE_CACHE) {
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

    // For map tiles, let the browser handle them directly without service worker interference
    // This avoids CORS issues with OpenStreetMap tiles
    return fetch(request);
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
  const offlineCache = await caches.open(OFFLINE_CACHE);

  try {
    // Try network first for fresh data
    const networkResponse = await fetch(request);

    if (networkResponse.ok && request.method === 'GET') {
      // Only cache GET requests (POST requests can't be cached)
      cache.put(request, networkResponse.clone());

      // Also cache in offline cache for better offline experience
      offlineCache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('VibeVoyage SW: API request failed, trying cache:', error);

    // Try dynamic cache first
    let cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Try offline cache
    cachedResponse = await offlineCache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return enhanced offline response based on request type
    const offlineResponse = getOfflineResponse(request);
    return new Response(
      JSON.stringify(offlineResponse),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'X-Offline-Response': 'true'
        }
      }
    );
  }
}

// Generate appropriate offline response based on request
function getOfflineResponse(request) {
  const url = new URL(request.url);

  // Routing API requests
  if (url.pathname.includes('/route') || url.hostname.includes('router.project-osrm.org')) {
    return {
      ...OFFLINE_FALLBACKS.route,
      offline: true,
      timestamp: Date.now(),
      requestUrl: request.url
    };
  }

  // POI/Overpass API requests
  if (url.hostname.includes('overpass-api.de') || url.pathname.includes('/poi')) {
    return {
      ...OFFLINE_FALLBACKS.poi,
      offline: true,
      timestamp: Date.now(),
      requestUrl: request.url
    };
  }

  // Geocoding requests
  if (url.pathname.includes('/geocode') || url.pathname.includes('/search')) {
    return {
      ...OFFLINE_FALLBACKS.geocoding,
      offline: true,
      timestamp: Date.now(),
      requestUrl: request.url
    };
  }

  // Generic offline response
  return {
    error: 'Offline - Service unavailable',
    message: 'The requested service is not available offline',
    offline: true,
    timestamp: Date.now(),
    requestUrl: request.url
  };
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
  // Exclude problematic APIs that cause CORS issues
  if (url.hostname.includes('ipapi.co') ||
      url.hostname.includes('country.is') ||
      url.hostname.includes('ip-api.com')) {
    return false;
  }

  return url.pathname.startsWith('/api/') ||
         (url.hostname.includes('api.') && !url.hostname.includes('ipapi.co')) ||
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

// Handle skip waiting message for faster PWA Builder registration
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('VibeVoyage SW: Skip waiting requested');
    self.skipWaiting();
  }
});

// Immediate activation for PWA Builder compatibility
self.addEventListener('activate', (event) => {
  console.log('VibeVoyage SW: Activated');
  event.waitUntil(self.clients.claim());
});

console.log('VibeVoyage Service Worker loaded successfully');
