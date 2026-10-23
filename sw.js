const CACHE_NAME = 'hidrofix-v47';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './datamanager.js',
    './dashboardcontroller.js',
    './laborescontroller.js',
    './configcontroller.js',
    './mapcontroller.js',
    './recyclebincontroller.js',
    './calendarcontroller.js',
    './materialprices.js',
    './icon-192.png',
    './icon-512.png',
    'https://unpkg.com/lucide@latest', // External dependency (might fail offline if not cached by browser separately, but we try)
    'https://unpkg.com/lucide@latest/dist/umd/lucide.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js',
    'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching assets');
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Clearing old cache', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Cache hit - return response
            if (response) {
                return response;
            }
            // Clone request for fetch
            const fetchRequest = event.request.clone();

            return fetch(fetchRequest).then((response) => {
                // Check if valid
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // Cache new requests (dynamic caching for visited pages/assets)
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    // Only cache http/https
                    if (event.request.url.startsWith('http')) {
                        cache.put(event.request, responseToCache);
                    }
                });

                return response;
            }).catch(() => {
                // Fallback if offline and not in cache? 
                // For now, simple cache-first is enough for the core app.
                if (event.request.url.indexOf('.html') > -1) {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
