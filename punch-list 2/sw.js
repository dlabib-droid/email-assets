/* Pinestone Punch List — service worker
   Keeps the app itself (not your data) saved on the phone so it opens with no internet.
   Your projects, tasks and photos live in the browser's IndexedDB and never pass through here.
   When you upload a new version of any file, change VERSION below. */
const VERSION = '1.2.0';
const CACHE = 'pinestone-punch-' + VERSION;
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
const OPTIONAL = ['./logo.png'];

// Responses that came through a redirect can't be replayed for page loads on iPhone, so store a clean copy.
async function clean(res) {
  if (!res || !res.redirected) return res;
  const body = await res.blob();
  return new Response(body, {status: res.status, statusText: res.statusText, headers: res.headers});
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const url of CORE) {
      const res = await fetch(new Request(url, {cache: 'reload'}));
      if (!res.ok) throw new Error('Could not cache ' + url);
      await cache.put(url, await clean(res));
    }
    for (const url of OPTIONAL) {
      try { const res = await fetch(new Request(url, {cache: 'reload'})); if (res.ok) await cache.put(url, await clean(res)); } catch (e) {}
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('pinestone-punch-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

// Serve from the phone first (instant, works offline), then refresh the saved copy in the background when online.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;

  const isPage = req.mode === 'navigate';
  const key = isPage ? './' : url.pathname.replace(scope.pathname, './');

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = (await cache.match(key, {ignoreSearch: true})) || (isPage ? await cache.match('./index.html') : null);
    const update = fetch(req, isPage ? {cache: 'no-cache'} : undefined).then(async res => {
      if (res && res.ok && res.type === 'basic') await cache.put(key, await clean(res.clone()));
      return res;
    }).catch(() => null);
    if (cached) { event.waitUntil(update); return cached; }
    const res = await update;
    return res || new Response('Offline and this file has not been saved yet.', {status: 503, headers: {'Content-Type': 'text/plain'}});
  })());
});
