const CACHE_NAME = "notification-cache-v1";
const urlsToCache = [
  "./",
  "./images/bell.png",
  "./images/notification-image.jpeg",
  "./images/reset.png",
  "./images/badge.png",
  "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.16/dist/tailwind.min.css",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});

self.addEventListener("push", function (event) {
  console.log("Received a push event", event);
  const payload = event.data ? event.data.json() : "no payload";
  const title = payload.notification.title;
  const options = {
    body: payload.notification.body,
    icon: "./images/bell.png",
    badge: "./images/badge.png",
    image: "./images/notification-image.jpeg",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
