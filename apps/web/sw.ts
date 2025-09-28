// Very simple SW that enables offline shell caching.
self.addEventListener('install', (event: any) => {
  event.waitUntil((async () => {
    const cache = await caches.open('shell-v1');
    await cache.addAll(['/','/offline']); // add more as needed
  })());
  self.skipWaiting();
});
self.addEventListener('activate', (event: any) => {
  self.clients.claim();
});
self.addEventListener('fetch', (event: any) => {
  const req = event.request;
  event.respondWith((async () => {
    try {
      return await fetch(req);
    } catch (e) {
      const cache = await caches.open('shell-v1');
      const cached = await cache.match(req, { ignoreSearch: true });
      return cached || new Response('Offline', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
  })());
});
