/**
 * TACO Foodies — Production Service Worker
 * Version: taco-foodies-v1
 * 
 * Safety Guarantee:
 * - Direct Network-Only pass-through for Supabase DB REST APIs, POST requests, RPC calls,
 *   Realtime WebSockets (wss://), Google Sheets CSV sync, and payment verification.
 * - Network-First caching strategy for static site assets and UI code.
 * - Offline fallback support via offline.html.
 */

const CACHE_NAME = 'taco-foodies-v2.6.0';

// Core static shell resources for offline resilience
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/sitemap.xml',
  '/robots.txt',
  '/css/main.css',
  '/css/components.css',
  '/css/animations.css',
  '/js/menuData.js',
  '/js/tableQR.js',
  '/js/googleSheetsSync.js',
  '/js/supabaseClient.js',
  '/js/pushNotifications.js',
  '/js/cart.js',
  '/js/checkout.js',
  '/js/orderTracker.js',
  '/js/ownerDashboard.js',
  '/js/UIController.js',
  '/js/app.js',
  '/js/pwaInstall.js',
  '/images/android-chrome-192x192.png',
  '/images/android-chrome-512x512.png',
  '/images/apple-touch-icon.png',
  '/favicon.ico',
  '/offline.html'
];

// Install Event: Pre-cache static shell assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing TACO Foodies SW version:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching static app shell');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[ServiceWorker] Pre-cache warning (non-fatal):', err);
        return self.skipWaiting();
      })
  );
});

// Activate Event: Clean up outdated caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating new Service Worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing obsolete cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Network-First strategy with strict API bypass rules
self.addEventListener('fetch', (event) => {
  const requestUrl = event.request.url;

  // 1. STRICT BYPASS: Non-GET requests (POST, PUT, DELETE, RPC calls)
  if (event.request.method !== 'GET') {
    return; // Pass through directly to network
  }

  // 2. STRICT BYPASS: Supabase DB, WebSockets, Google Sheets, & Payment APIs
  if (
    requestUrl.includes('supabase.co') ||
    requestUrl.includes('docs.google.com') ||
    requestUrl.includes('google.com') ||
    requestUrl.startsWith('wss://') ||
    requestUrl.startsWith('ws://') ||
    requestUrl.includes('chrome-extension')
  ) {
    return; // Pass through directly to network
  }

  // 3. Static Asset Caching Strategy: Network-First with Cache Fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If network response is valid, update cache asynchronously
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Network failed (offline). Look up in cache.
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // If navigating to an HTML page and network/cache failed, return offline fallback page
        if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) {
            return offlinePage;
          }
        }

        return new Response('Network offline and asset uncached.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      })
  );
});

// ==============================================================================
// 4. Web Push Notification Handlers
// ==============================================================================

// Push Event: Received message from server
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push event received');

  let data = {
    title: '🔔 TACO Foodies',
    body: 'You have a new update from TACO Foodies!',
    icon: '/images/android-chrome-192x192.png',
    badge: '/images/android-chrome-192x192.png',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
      if (parsed.data) {
        data.data = { ...data.data, ...parsed.data };
      }
    } catch (e) {
      try {
        data.body = event.data.text();
      } catch (err) {}
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: data.icon || '/images/android-chrome-192x192.png',
    badge: data.badge || '/images/android-chrome-192x192.png',
    data: data.data || { url: '/' },
    vibrate: [200, 100, 200],
    requireInteraction: true,
    tag: data.data?.orderNumber ? `order-${data.data.orderNumber}` : 'taco-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );
});

// Notification Click Event: Focus or open target window
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked:', event.notification.tag);
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) 
    ? event.notification.data.url 
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If an open window exists, focus and navigate to target URL
        for (let client of windowClients) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client) {
              return client.navigate(targetUrl);
            }
            return;
          }
        }
        // If no window is open, open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
