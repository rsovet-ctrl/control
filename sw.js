const CACHE_NAME = 'car-control-v6.5';
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'manifest.json'
];

// 1. Установка: Закачиваем ядро интерфейса в изолированную память телефона
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Активация: Тотальная зачистка кэша старых версий (v6.3, v6.4 и т.д.)
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

// 3. Перехват запросов: Стратегия Network-First с гарантированным оффлайн-откатом
self.addEventListener('fetch', (e) => {
  // Тяжелые POST-пакеты синхронизации базы и Гугл-скрипты мы пускаем строго напрямую
  if (e.request.url.includes('script.google.com') || e.request.method !== 'GET') {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Если интернет стабилен и файл успешно скачан — обновляем резервную копию в кэше
        if (response.status === 200 && e.request.url.startsWith(self.location.origin)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // ЗОНА ПОЛНОГО ОФФЛАЙНА
        // Если это запрос на перезагрузку или обновление экрана (navigate) — жестко разворачиваем index.html
        if (e.request.mode === 'navigate') {
          return caches.match('./') || caches.match('index.html');
        }
        // Для остальных ресурсов (стили, иконки, манифест) отдаем их точные копии из памяти
        return caches.match(e.request);
      })
  );
});
