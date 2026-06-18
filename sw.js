const CACHE_NAME = 'car-control-v6.9';
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'manifest.json'
];

// 1. Установка: Намертво вшиваем интерфейс в память смартфона
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Активация: Полная зачистка старых конфликтующих версий кэша
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Перехват запросов: Чистая стратегия Cache-First для мгновенного оффлайн-перезапуска
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('script.google.com') || e.request.method !== 'GET') {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        if (networkResponse.status === 200 && e.request.url.startsWith(self.location.origin)) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {/* Гасим фоновые ошибки сети */});

      if (e.request.mode === 'navigate') {
        return cachedResponse || caches.match('index.html') || caches.match('./') || fetchPromise;
      }

      return cachedResponse || fetchPromise;
    })
  );
});
