/**
 * Common database helper functions.
 */
var resultData;
async function retriveFromDb() {
  var idb = window.indexedDB;
  var dbPromise = idb.open("database", 1);
  dbPromise.onsuccess = function() {
    console.log("running onsuccess");
    var db = dbPromise.result;
    var query = db
      .transaction(["restaurants"], "readwrite")
      .objectStore("restaurants");
    var cursor = query.openCursor();
    cursor.onsuccess = function(event) {
      var actual = event.target.result;
      if (actual) {
        resultData.push(actual.value);
        actual.continue();
      } else {
        return resultData;
      }
    };
  };
}

function addImage(data) {
  var db;
  resultData = data;
  var idb = window.indexedDB;
  var dbPromise = idb.open("database", 1);
  dbPromise.onupgradeneeded = function(e) {
    db = e.target.result;
    console.log("running onupgradeneeded");
    if (!db.objectStoreNames.contains("restaurants")) {
      var storeOS = db.createObjectStore("restaurants", {
        keyPath: "id"
      });
    }
  };
  dbPromise.onsuccess = function(e) {
    console.log("running onsuccess");
    db = e.target.result;
    var transaction = db.transaction(["restaurants"], "readwrite");
    var store = transaction.objectStore("restaurants");
    data.forEach(function(request) {
      store.put(request);
    });
  };
  dbPromise.onerror = function(e) {
    console.log("onerror!");
    console.dir(e);
  };
  var reviewsDbPromise = idb.open("reviews", 2);
  reviewsDbPromise.onupgradeneeded = function(e) {
    var revDatabase = e.target.result;
    if (!revDatabase.objectStoreNames.contains("reviews")) {
      var storeOS = revDatabase.createObjectStore("reviews", {
        keyPath: "id"
      });
    }
  };
  var pendingDbPromise = idb.open("pending", 3);
  pendingDbPromise.onupgradeneeded = function(e) {
    var penDatabase = e.target.result;
    if (!penDatabase.objectStoreNames.contains("pending")) {
      var storeOS = penDatabase.createObjectStore("pending", {
        autoIncrement: true
      });
    }
  };
}
var result = [];

class DBHelper {
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/`;
  }

  /**
   * Fetch all restaurants.
   */

  static fetchRestaurants(callback) {
    fetch(DBHelper.DATABASE_URL + "restaurants/")
      .then(response => response.json())
      .then(addImage)
      .then(callback(null, resultData))
      .catch(function(error) {
        console.log(error);
        //retriveFromDb().then(callback(null, resultData));
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    var idb = window.indexedDB;
    var dbPromise = idb.open("database", 1);
    dbPromise.onsuccess = function() {
      console.log("running onsuccess");
      var db = dbPromise.result;
      var query = db
        .transaction(["restaurants"], "readwrite")
        .objectStore("restaurants");
      var cursor = query.openCursor();
      cursor.onsuccess = function(event) {
        var actual = event.target.result;
        if (actual) {
          if (actual.value.id == id) {
            callback(null, actual.value);
          }
          actual.continue();
        } else {
          console.log("finito");
        }
      };
    };
    // fetch all restaurants with proper error handling.
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(
    cuisine,
    neighborhood,
    callback
  ) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;
        if (cuisine != "all") {
          // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != "all") {
          // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants objects
        if (restaurants != null) {
          const neighborhoods = restaurants.map(
            (v, i) => restaurants[i].neighborhood
          );
          // Remove duplicates from neighborhoods
          const uniqueNeighborhoods = neighborhoods.filter(
            (v, i) => neighborhoods.indexOf(v) == i
          );
          callback(null, uniqueNeighborhoods);
        }
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        if (restaurants != null) {
          const cuisines = restaurants.map(
            (v, i) => restaurants[i].cuisine_type
          );
          // Remove duplicates from cuisines
          const uniqueCuisines = cuisines.filter(
            (v, i) => cuisines.indexOf(v) == i
          );
          callback(null, uniqueCuisines);
        }
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return `./restaurant.html?id=${restaurant.id}`;
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return `/img/${restaurant.photograph}.jpg`;
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP
    });
    return marker;
  }
}
