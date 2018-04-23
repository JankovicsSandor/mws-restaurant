var staticCacheName="restaurant-v2"

self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(staticCacheName).then(function(cache) {
      return cache.addAll([
        "http://localhost:8000/",
        "http://localhost:8000/css/styles.css",
        "http://localhost:8000/data/restaurants.json",
        "http://localhost:8000/js/dbhelper.js",
        "http://localhost:8000/js/main.js",
        "http://localhost:8000/js/restaurant_info.js",
        "http://localhost:8000/img/"
      ]);
    })
  );
});
self.addEventListener("activate",function(event){
  event.waitUntil(
    caches.keys().then(function(cacheNames){ return Promise.all(
        cacheNames.filter(function(cacheName){
            return cacheName.startsWith('restaurant-') && 
                  cacheName!=staticCacheName;
          }).map(function(cacheName){
            return cache.delete(cacheName);
          })
        )
      })
    );
});
self.addEventListener("fetch", function(event) {
  var requestUrl=new URL(event.request.url);

  if(requestUrl.origin === location.origin){
    if(requestUrl.pathname === "/"){
      event.respondWith(caches.match("/"));
      return;
    }
  }
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) return response;
      return fetch(event.request);
    })
  );
});
