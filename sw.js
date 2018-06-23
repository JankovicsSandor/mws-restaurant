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
        "js/restaurant_info.js"
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
  if (requestUrl.pathname.startsWith("/restaurants/")) {
      console.log("medve");
      var databaseResult = serveFromDatabase(event.request);
      event.respondWith(fetch(event.request));
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
var result = [];
function serveFromDatabase(request) {
  var database = indexedDB.open("database", 1);

  database.onsuccess = function() {
    var db = database.result;
    var query = db
      .transaction("restaurants", "readonly")
      .objectStore("restaurants");

    var cursor = query.openCursor();
    cursor.onsuccess = function(event) {
      var cursore = event.target.result;

      if (cursore) {
        var value = cursore.value;
        var inArray = checkIfInArray(value.name);
        if (inArray == false) {
          result.push(value);
        }

        cursore.continue();
      } else {
        console.log("Finished iterating");
      }
    };
  };
  return result;
}

function checkIfInArray(value) {
  for (let object of result) {
    if (object.name == value) {
      return true;
    }
  }
  return false;
}
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
