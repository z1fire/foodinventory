const CACHE = 'pantry-v2';
const ASSETS = [
  './',
  './index.html',
  './dc-runtime.js',
  './css/app.css',
  './js/constants.js',
  './js/storage.js',
  './js/analytics.js',
  './js/utils.js',
  './js/component.js',
  './fonts/bricolage-400-viet.woff2',
  './fonts/bricolage-400-latin-ext.woff2',
  './fonts/bricolage-400-latin.woff2',
  './fonts/bricolage-500-viet.woff2',
  './fonts/bricolage-500-latin-ext.woff2',
  './fonts/bricolage-500-latin.woff2',
  './fonts/bricolage-700-latin.woff2',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function(cached){
      return cached || fetch(e.request).then(function(resp){
        var copy = resp.clone();
        caches.open(CACHE).then(function(c){ try { c.put(e.request, copy); } catch(_){} });
        return resp;
      }).catch(function(){ return cached; });
    })
  );
});
