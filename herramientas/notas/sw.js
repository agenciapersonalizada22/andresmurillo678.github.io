/* Service worker: la app funciona sin conexion. Red primero (para ver siempre la ultima version) con respaldo en cache. */
var CACHE = 'notas-v1';
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (x) { return x !== CACHE; }).map(function (x) { return caches.delete(x); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var r = e.request; if (r.method !== 'GET' || !/^https?:/.test(r.url) || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(function (res) { if (res.ok) { var c = res.clone(); caches.open(CACHE).then(function (ca) { ca.put(r, c); }); } return res; }).catch(function () { return caches.match(r).then(function (m) { return m || caches.match('index.html'); }); }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(function (l) { if (l.length) return l[0].focus(); return self.clients.openWindow('./'); }));
});
