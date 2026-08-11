const CACHE = 'biblioteca-estudio-v3';
const APP = [
  './',
  './index.html',
  './assets/css/biblioteca.css',
  './assets/js/biblioteca.js',
  './manifest.webmanifest',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => { event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request))); });
