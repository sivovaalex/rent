// Service Worker — Арендол PWA
const CACHE_NAME = 'arenada-v1';
const OFFLINE_URL = '/offline.html';

// Статика для предварительного кэширования
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/icon-192.svg',
  '/icon-512.svg',
];

// ==================== INSTALL ====================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ==================== ACTIVATE ====================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ==================== FETCH ====================
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Только GET-запросы
  if (request.method !== 'GET') return;

  // Не кэшируем API и chrome-extension
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/') || url.protocol === 'chrome-extension:') return;

  // Статика (иконки, шрифты, изображения) — Cache-First
  if (
    url.pathname.match(/\.(svg|png|jpg|jpeg|webp|woff2?|ttf|css|js)$/) ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
      )
    );
    return;
  }

  // HTML-страницы — Network-First с оффлайн-фоллбэком
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }
});

// ==================== PUSH ====================
self.addEventListener('push', (event) => {
  let data = { title: 'Арендол', body: 'Новое уведомление', url: '/' };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    // fallback к дефолтным значениям
  }

  const options = {
    body: data.body,
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    tag: data.tag || 'default',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ==================== NOTIFICATION CLICK ====================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Пытаемся найти уже открытое окно
      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Иначе открываем новое
      return self.clients.openWindow(url);
    })
  );
});
