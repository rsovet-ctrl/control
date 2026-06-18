const CACHE_NAME = 'car-control-v6.4';
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'manifest.json'
];

// Установка: Скачиваем ядро приложения в резервную память телефона
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Активация: Автоматически вычищаем старый хлам прошлых версий
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

// Умный перехват запросов (Стратегия Network-First с железным оффлайн-откатом)
self.addEventListener('fetch', (e) => {
  // Игнорируем тяжелые POST-пакеты и контур синхронизации Гугл Таблиц
  if (e.request.url.includes('script.google.com') || e.request.method !== 'GET') {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Если интернет есть и запрос успешный — на лету обновляем локальный кэш
        if (response.status === 200 && e.request.url.startsWith(self.location.origin)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // ЗОНА ОФФЛАЙНА: Если сеть упала (или сделан свайп вниз без связи)
        // Достаем точное совпадение, либо принудительно запускаем главную страницу
        return caches.match(e.request) || caches.match('index.html') || caches.match('./');
      })
  );
});
