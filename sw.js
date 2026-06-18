const CACHE_NAME = 'car-control-v5.7';
const ASSETS_TO_CACHE = [
  'index.html',
  'manifest.json'
];

// Установка: Приложение скачивает интерфейс в вечный кэш телефона
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Активация: Очистка старых версий приложения
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

// Перехват запросов: Если запрашивается интерфейс — отдаем его из оффлайн-кэша мгновенно
self.addEventListener('fetch', (e) => {
  // Запросы к серверам Google Таблиц мы НЕ кэшируем здесь, их надежно контролирует наш localStorage
  if (e.request.url.includes('script.google.com') || e.request.method === 'POST') {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request).catch(() => {
        // Если даже картинки иконок не загрузились, ворачиваем базовый кэшированный index.html
        return caches.match('index.html');
      });
    })
  );
});
