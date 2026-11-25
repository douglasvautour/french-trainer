/* Offline support: cache the app shell, and Google Fonts once they've loaded. */
const VERSION = 'apprenez-v14';
const SHELL = [
  './', 'index.html', 'app.js', 'verbs.js', 'verbs-data.js', 'sentences.js', 'guide.js', 'definitions.js', 'manifest.webmanifest',
  'fonts/montserrat-400.woff', 'fonts/montserrat-600.woff', 'fonts/crimson-400.woff', 'fonts/crimson-700.woff',
  'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !isFont) return;

  if (req.mode === 'navigate' || /\.(html|js|webmanifest)$/.test(url.pathname)) {
    // Network first for app code so updates arrive; fall back to cache offline.
    e.respondWith(
      // 'no-cache' asks the server each time instead of trusting the phone's HTTP cache.
      fetch(req.mode === 'navigate' ? req.url : req, { cache: 'no-cache' }).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
    return;
  }
  // Cache first for fonts and images.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;
    }))
  );
});
