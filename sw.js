/* Phone Factory service worker — caches the game shell (page + local
   assets) so the installed PWA loads offline. The page itself is
   network-first (so updates reach players); local assets are
   cache-first. External resources (three.js CDN, Google Fonts) are
   never cached — they are fetched from the network as usual. */
var CACHE = "phone-factory-v1";
var SHELL = [
  "./",
  "./index.html",
  "./assets/manifest.json",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-maskable-512.png",
  "./assets/apple-touch-icon.png",
  "./assets/hero-factory.webp",
  "./assets/lin-sheet.webp",
  "./assets/lin-era1.webp",
  "./assets/lin-era3.webp",
  "./assets/lin-era5.webp",
  "./assets/ref-hall.jpg",
  "./assets/ref-pink.jpg",
  "./assets/ref-row.jpg"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // external: network only
  if (event.request.mode === "navigate") {
    // Page: network first, fall back to the cached shell when offline.
    event.respondWith(
      fetch(event.request).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (cache) { cache.put("./index.html", copy); });
        return resp;
      }).catch(function () { return caches.match("./index.html"); })
    );
    return;
  }
  // Local assets: cache first, populate the cache on a miss.
  event.respondWith(
    caches.match(event.request).then(function (hit) {
      if (hit) return hit;
      return fetch(event.request).then(function (resp) {
        if (resp && resp.ok) {
          var copy = resp.clone();
          caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
        }
        return resp;
      });
    })
  );
});
