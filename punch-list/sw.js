/* Pinestone Punch List — service worker
   Keeps a copy of the APP FILES on the phone so the app opens with no internet.
   Your projects, items and photos are NOT stored here. They live in the phone's
   IndexedDB database, which this file never reads, changes or deletes.

   EVERY TIME YOU UPLOAD A NEW VERSION: change VERSION below (e.g. 1.3.0 -> 1.3.1).
   That is how phones notice the update. */
const VERSION = '1.3.2';
const CACHE = 'pinestone-punch-' + VERSION;
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
const OPTIONAL = ['./logo.png'];
const NETWORK_WAIT_MS = 2500; // weak signal: after this, use the saved copy instead of waiting

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
      const res = await fetch(new Request(url, {cache: 'no-store'}));
      if (!res.ok) throw new Error('Could not cache ' + url); // keeps the previous working version if the upload is incomplete
      await cache.put(url, await clean(res));
    }
    for (const url of OPTIONAL) {
      try { const res = await fetch(new Request(url, {cache: 'no-store'})); if (res.ok) await cache.put(url, await clean(res)); } catch (e) {}
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Only old copies of the app files are removed. Project data is never touched.
    for (const key of await caches.keys()) if (key.startsWith('pinestone-punch-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

// Lets the app ask which version is installed, so it only reloads when something actually changed.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'version' && event.ports[0]) event.ports[0].postMessage({version: VERSION});
});

// Online: always get the newest file from GitHub (bypassing GitHub's 10-minute browser cache) and save a copy.
// Offline or very weak signal: use the saved copy.
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
    const network = fetch(isPage ? new Request(scope.href, {cache: 'no-cache'}) : new Request(req, {cache: 'no-cache'}))
      .then(async res => {
        if (res && res.ok && res.type === 'basic') await cache.put(key, await clean(res.clone()));
        return res && res.ok ? res : null;
      }).catch(() => null);
    const timeout = new Promise(r => setTimeout(() => r('timeout'), NETWORK_WAIT_MS));
    const first = await Promise.race([network, timeout]);
    if (first && first !== 'timeout') return isPage ? clean(first) : first;
    const cached = (await cache.match(key, {ignoreSearch: true})) || (isPage ? await cache.match('./index.html') : null);
    if (cached) { event.waitUntil(network); return cached; }
    const late = await network;
    return late || new Response('Offline and this file has not been saved yet.', {status: 503, headers: {'Content-Type': 'text/plain'}});
  })());
});
