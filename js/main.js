let restaurants, neighborhoods, cuisines;
var map;
var markers = [];

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener("DOMContentLoaded", event => {
  fetchNeighborhoods();
  fetchCuisines();
});
/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) {
      // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
};

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById("neighborhoods-select");
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement("option");
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
};

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
};

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById("cuisines-select");

  cuisines.forEach(cuisine => {
    const option = document.createElement("option");
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById("map"), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
};

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById("cuisines-select");
  const nSelect = document.getElementById("neighborhoods-select");

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(
    cuisine,
    neighborhood,
    (error, restaurants) => {
      if (error) {
        // Got an error!
        console.error(error);
      } else {
        resetRestaurants(restaurants);
        fillRestaurantsHTML();
      }
    }
  );
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = restaurants => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById("restaurants-list");
  ul.innerHTML = "";

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
function fillRestaurantsHTML(restaurants = self.restaurants) {
  const ul = document.getElementById("restaurants-list");
  if (restaurants != null) {
    restaurants.forEach(restaurant => {
      ul.append(createRestaurantHTML(restaurant));
    });
    addMarkersToMap();
  }
}

/**
 * Create restaurant HTML.
 */
function createRestaurantHTML(restaurant) {
  const li = document.createElement("li");

  const image = document.createElement("img");
  image.className = "restaurant-img";
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = restaurant.name + " Restaurant";
  li.append(image);

  const name = document.createElement("h2");
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement("p");
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement("p");
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement("a");
  more.innerHTML = "View Details";
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more);

  const favourite = document.createElement("span");
  favourite.id = "hearth";
  if (restaurant.is_favorite == "false") {
    favourite.className = "heart fa fa-heart-o";
  } else {
    favourite.className = "heart fa fa-heart";
  }
  favourite.onclick = function(element) {
    if (element.toElement.classList.contains("fa-heart-o")) {
      //Add to favorite
      fetch(
        DBHelper.DATABASE_URL +
          "restaurants/" +
          restaurant.id +
          "?is_favorite=true",
        {
          method: "PUT"
        }
      )
        .then(response => response.json())
        .then(updateDatabase)
        .then(function(e) {
          element.toElement.classList.remove("fa-heart-o");
          element.toElement.classList.add("fa-heart");
        });
    } else {
      //remove from  favorite
      fetch(
        DBHelper.DATABASE_URL +
          "restaurants/" +
          restaurant.id +
          "?is_favorite=false",
        {
          method: "PUT"
        }
      )
        .then(response => response.json())
        .then(updateDatabase)
        .then(function(e) {
          element.toElement.classList.remove("fa-heart");
          element.toElement.classList.add("fa-heart-o");
        });
    }
  };
  li.append(favourite);

  return li;
}

function updateDatabase(data) {
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
        if (actual.value.id == data.id) {
          var request = actual.update(data);
          request.onsuccess = function() {
            console.log("updated");
          };
        }
        actual.continue();
      } else {
        console.log("finito");
      }
    };
  };
}

/**
 * Add markers for current restaurants to the map.
 */
function addMarkersToMap(restaurants = self.restaurants) {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, "click", () => {
      window.location.href = marker.url;
    });
    self.markers.push(marker);
  });
}

window.addEventListener("load", function() {
  this.registerServiceWorker();
});

registerServiceWorker = function() {
  if (!navigator.serviceWorker) return;
  navigator.serviceWorker
    .register("./sw.js")
    .then(function(registration) {
      console.log("Registration worked", registration.scope);
    })
    .catch(function() {
      console.log("Registration failed");
    });
};

function showFavourites() {
  let favoriteRestaurants = [];
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
        if (actual.value.is_favorite == "true") {
          favoriteRestaurants.push(actual.value);
        }
        actual.continue();
      } else {
        resetRestaurants(favoriteRestaurants);
        fillRestaurantsHTML(favoriteRestaurants);
      }
    };
  };
}

function showAll() {
  let allRestaurants = [];
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
        allRestaurants.push(actual.value);
        actual.continue();
      } else {
        resetRestaurants(allRestaurants);
        fillRestaurantsHTML(allRestaurants);
      }
    };
  };
}
