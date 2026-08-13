const CACHE = 'biblioteca-estudio-v4';

const APP = [
  './',
  './index.html',
  './login.html',
  './supabase-config.js',
  './assets/css/biblioteca.css',
  './assets/js/auth.js',
  './assets/js/biblioteca.js',
  './manifest.webmanifest',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP))
      .catch(error => console.warn('No se pudo precargar todo el caché:', error))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // NUNCA interceptar las peticiones a Supabase.
  if (url.origin.includes('supabase.co')) return;

  // Para la aplicación local, usar caché y actualizar recursos cuando corresponda.
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
