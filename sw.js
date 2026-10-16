const CACHE_NAME = 'word-shooter-v12';
const ASSETS = [
  './', './index.html', './manifest.json',
  './css/main.css', './css/game.css',
  './js/app.js', './js/db.js', './js/profile-manager.js', './js/vocab-manager.js',
  './js/game-engine.js', './js/ui-manager.js', './js/audio-manager.js',
  './js/answer-checker.js', './js/stats-manager.js', './js/importer.js',
  './js/doc-exporter.js', './js/spaced-repetition.js', './js/sentence-manager.js', './js/i18n.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS).catch(err => console.log('Optional cache item failed:', err)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const isAppAsset = event.request.mode === 'navigate'
    || /\.(?:html|css|js)(?:\?|$)/i.test(new URL(event.request.url).pathname);

  // HTML/CSS/JS luôn ưu tiên bản mới trên mạng; cache chỉ là phương án offline.
  if (isAppAsset) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response?.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request).then(response => {
        if (response?.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      }))
      .catch(() => undefined)
  );
});
