
const CACHE_NAME = 'mozzaboy-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/logo.png',
  '/manifest.json',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Biarkan browser menghandle file modul .tsx secara langsung agar ditransformasi oleh server/bundler
  if (event.request.url.includes('.tsx')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
