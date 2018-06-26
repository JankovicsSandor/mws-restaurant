var staticCacheName = "restaurant-v10";
var contentImgsCache = "restaurant-content-imgs";

var allCaches = [staticCacheName, contentImgsCache];
self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(staticCacheName).then(function(cache) {
      return cache.addAll([
        "/index.html",
        "restaurant.html",
        "css/styles.css",
        "js/dbhelper.js",
        "js/main.js",
        "js/restaurant_info.js",
        "/manifest.json",
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
      ]);
    })
  );
  console.log("install");
});
self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(cacheName) {
            return (
              cacheName.startsWith("restaurant-") &&
              !allCaches.includes(cacheName)
            );
          })
          .map(function(cacheName) {
            return caches.delete(cacheName);
          })
      );
    })
  );
});

self.addEventListener("fetch", function(event) {
  var requestUrl = new URL(event.request.url);
  if (requestUrl.pathname === "/") {
    var test = caches.match("/index.html").then(function(response) {
      if (response) return response;

      return fetch(requestUrl).then(function(networkResponse) {
        cache.put(requestUrl, networkResponse.clone());
        return networkResponse;
      });
    });
    event.respondWith(test);
    return;
  }
  if (requestUrl.origin === location.origin) {
    if (requestUrl.pathname.startsWith("/img/")) {
      event.respondWith(servePhoto(event.request));
      return;
    }
    // TODO: respond to avatar urls by responding with
    // the return value of serveAvatar(event.request)
  }
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});

function servePhoto(request) {
  var storageUrl = request.url;
  return caches.open(contentImgsCache).then(function(cache) {
    return cache.match(storageUrl).then(function(response) {
      if (response) return response;

      return fetch(request).then(function(networkResponse) {
        cache.put(storageUrl, networkResponse.clone());
        return networkResponse;
      });
    });
  });
}
