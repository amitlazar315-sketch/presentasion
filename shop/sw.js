/* ====================================================================
   Family shopping list — offline shell.
   Network-first so a deploy is picked up immediately; the cache is only
   the fallback for a dead signal inside the supermarket.
   Scope is /shop/ — the investor deck at the site root is untouched.
   ==================================================================== */
const CACHE = 'famshop-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  /* only handle our own folder + the Google font files */
  if (sameOrigin && !url.pathname.startsWith(new URL('./', location).pathname)) return;

  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok && (sameOrigin || res.type === 'basic' || res.type === 'cors')){
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
