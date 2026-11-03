/* Cycle Ledger offline cache. Bump VERSION when you upload a new index.html. */
const VERSION = 'cycle-ledger-v1';
const RUNTIME = 'cycle-ledger-runtime';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== RUNTIME).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (req.mode === 'navigate') {
      // fresh copy when online, cached copy when offline
      e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put('./', copy)); return r; })
        .catch(() => caches.match('./').then(r => r || caches.match('./index.html'))));
      return;
    }
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return r;
    })));
    return;
  }
  if (/(^|\.)fonts\.(googleapis|gstatic)\.com$|^cdnjs\.cloudflare\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(RUNTIME).then(c => c.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === 'opaque') c.put(req, r.clone());
      return r;
    }))));
  }
});
