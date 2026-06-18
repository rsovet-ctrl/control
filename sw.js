const CACHE_NAME = 'car-control-v6.7';
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'manifest.json'
];

// 1. Установка: Принудительно вшиваем ядро интерфейса в память устройства
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Активация: Тотальное удаление старого кэша прошлых сборок
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

// 3. Перехват запросов: Скоростная стратегия Stale-While-Revalidate с защитой от сбоев
self.addEventListener('fetch', (e) => {
  // Тяжелые POST-пакеты синхронизации базы и Гугл-скрипты мы пускаем строго напрямую
  if (e.request.url.includes('script.google.com') || e.request.method !== 'GET') {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // Мгновенно отдаем локальную копию из памяти (если она есть)
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        if (networkResponse.status === 200 && e.request.url.startsWith(self.location.origin)) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Локальное гашение ошибок сети при фоновом обновлении ресурсов
      });

      // Возвращаем кэш сразу, либо ждем фоновый сетевой ответ, если кэш пуст
      return cachedResponse || fetchPromise;
    }).catch(() => {
      // Если Хром пытается выкинуть динозавра на навигации (navigate) — жестко разворачиваем ядро
      if (e.request.mode === 'navigate') {
        return caches.match('./') || caches.match('index.html');
      }
    })
  );
});
