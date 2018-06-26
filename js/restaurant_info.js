let restaurant;
var map;
var tabindex = 6;
var contentMarginTop = 0;
var mainContent;
var restaurantReview;
/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById("map"), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      google.maps.event.addListener(self.map, "tilesloaded", function() {
        console.log(document.getElementById("map-container").style);
      });

      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
  self.mainContent = document.getElementById("map-container");
  console.log(self.mainContent.clientHeight);
  // self.mainContent.setAttribute("margin-top",(self.map.offsetHeight+10)+" px")
};

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

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = callback => {
  if (self.restaurant) {
    // restaurant already fetched!
    callback(null, self.restaurant);
    return;
  }
  const id = getParameterByName("id");
  if (!id) {
    // no id found in URL
    error = "No restaurant id in URL";
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant);
    });
  }
};

/**
 * Create restaurant HTML and add it to the webpage
 */
function fillRestaurantHTML(restaurant = self.restaurant) {
  const name = document.getElementById("restaurant-name");
  name.setAttribute(
    "aria-label",
    "Name of the restaurant is " + restaurant.name
  );
  name.innerHTML = restaurant.name;

  const address = document.getElementById("restaurant-address");
  address.setAttribute(
    "aria-label",
    "Adress of the restaurant is " + restaurant.address
  );
  address.innerHTML = restaurant.address;

  const image = document.getElementById("restaurant-img");
  image.className = "restaurant-img";
  image.src = DBHelper.imageUrlForRestaurant(restaurant);

  const cuisine = document.getElementById("restaurant-cuisine");
  cuisine.setAttribute(
    "aria-label",
    "Type of the restaurant is " + restaurant.cuisine_type
  );
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  getReviews();
  // fill reviews
  fillReviewsHTML();
}

function getReviews() {
  fetch(DBHelper.DATABASE_URL + "reviews?restaurant_id=" + self.restaurant.id)
    .then(response => response.json())
    .then(uploadResult)
    .catch(function(error) {
      console.log(error);
    });
}

function uploadResult(data) {
  var db;
  restaurantReview = data;
  var idb = window.indexedDB;
  var dbPromise = idb.open("database", 1);
  dbPromise.onsuccess = function(e) {
    db = e.target.result;
    var reviewsDbPromise = idb.open("reviews", 2);
    reviewsDbPromise.onupgradeneeded = function(e) {
      var revDatabase = e.target.result;
      if (!revDatabase.objectStoreNames.contains("reviews")) {
        var storeOS = revDatabase.createObjectStore("reviews", {
          keyPath: "id"
        });
      }
    };
    reviewsDbPromise.onsuccess = function(e) {
      console.log("running onsuccess");
      db = e.target.result;
      var transaction = db.transaction(["reviews"], "readwrite");
      var store = transaction.objectStore("reviews");
      data.forEach(function(request) {
        store.put(request);
      });
    };
    reviewsDbPromise.onerror = function(e) {
      console.log("onerror!");
      console.dir(e);
    };
  };
}
/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (
  operatingHours = self.restaurant.operating_hours
) => {
  const hours = document.getElementById("restaurant-hours");
  for (let key in operatingHours) {
    const row = document.createElement("tr");
    row.setAttribute("tabindex", tabindex);
    tabindex++;
    const day = document.createElement("td");
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement("td");
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
    row.setAttribute(
      "aria-label",
      "Open on" + day.innerHTML + " " + time.innerHTML
    );
  }
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = (restaurantReview = [])) => {
  var idb = window.indexedDB;
  var dbPromise = idb.open("reviews");
  dbPromise.onsuccess = function(e) {
    console.log("running onsuccess");
    var db = e.target.result;
    var query = db.transaction(["reviews"], "readwrite").objectStore("reviews");
    var cursor = query.openCursor();
    cursor.onsuccess = function(event) {
      var actual = event.target.result;
      if (actual) {
        if (actual.value.restaurant_id == self.restaurant.id) {
          reviews.push(actual.value);
        }
        actual.continue();
      } else {
        //End readeing the database start visualizing
        const container = document.getElementById("reviews-container");
        const title = document.createElement("h3");
        title.innerHTML = "Reviews";
        title.setAttribute("aria-label", title.innerHTML);
        container.appendChild(title);

        if (!reviews) {
          const noReviews = document.createElement("p");
          noReviews.innerHTML = "No reviews yet!";
          container.appendChild(noReviews);
          container.setAttribute("aria-label", noReviews.innerHTML);
          return;
        }
        const ul = document.getElementById("reviews-list");
        reviews.forEach(review => {
          ul.appendChild(createReviewHTML(review));
        });
        container.appendChild(ul);
      }
    };
  };
};

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = review => {
  const li = document.createElement("li");
  const name = document.createElement("p");
  name.innerHTML = review.name;
  li.appendChild(name);

  const datep = document.createElement("p");
  var date = new Date(review.createdAt);
  var year = date.getUTCFullYear();
  var month = date.getMonth();
  var day = date.getDate();
  // Hours part from the timestamp
  var hours = date.getHours();
  // Minutes part from the timestamp
  var minutes = "0" + date.getMinutes();
  // Seconds part from the timestamp
  var seconds = "0" + date.getSeconds();

  // Will display time in 10:30:23 format
  var formattedTime =
    year +
    "/" +
    month +
    "/" +
    day +
    " " +
    hours +
    ":" +
    minutes.substr(-2) +
    ":" +
    seconds.substr(-2);
  datep.innerHTML = formattedTime;

  li.appendChild(datep);

  const rating = document.createElement("p");
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement("p");
  comments.innerHTML = review.comments;
  li.appendChild(comments);
  li.setAttribute("tabindex", this.tabindex);
  this.tabindex++;
  return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById("breadcrumb");
  const li = document.createElement("li");
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return "";
  return decodeURIComponent(results[2].replace(/\+/g, " "));
};

document.getElementById("submit").addEventListener("click", function(event) {
  var name = document.getElementsByClassName("name")[0].value;
  var rating = document.getElementsByClassName("rating")[0].value;
  var review = document.getElementsByClassName("review")[0].value;

  if (name && rating && review) {
    var send = {
      restaurant_id: self.restaurant.id,
      name: name,
      rating: rating,
      comments: review
    };
    if (window.navigator.onLine) {
      fetch(DBHelper.DATABASE_URL + "reviews/", {
        method: "POST",
        body: JSON.stringify(send)
      })
        .then(response => response.json())
        .then(addToDatabase);
    } else {
      var pendingReview = {
        url: DBHelper.DATABASE_URL + "reviews/",
        method: "POST",
        body: JSON.stringify(send)
      };
      var db;
      var idb = window.indexedDB;
      var dbPromise = idb.open("pending", 3);
      dbPromise.onsuccess = function(e) {
        console.log("running onsuccess");
        db = e.target.result;
        var transaction = db.transaction(["pending"], "readwrite");
        var store = transaction.objectStore("pending");
        store.put(pendingReview);
      };
      dbPromise.onerror = function(e) {
        console.log("onerror!");
        console.log(e);
      };
    }
  }
});

function addToDatabase(data) {
  var db;
  var idb = window.indexedDB;
  var dbPromise = idb.open("reviews", 3);
  dbPromise.onsuccess = function(e) {
    console.log("running onsuccess");
    db = e.target.result;
    var transaction = db.transaction(["reviews"], "readwrite");
    var store = transaction.objectStore("reviews");
    store.put(data);
  };
  dbPromise.onerror = function(e) {
    console.log("onerror!");
    console.log(e);
  };
}

window.addEventListener("online", function() {
  var db;
  var idb = window.indexedDB;
  var dbPromise = idb.open("pending", 3);
  dbPromise.onsuccess = function(e) {
    console.log("running onsuccess");
    db = e.target.result;
    var transaction = db.transaction(["pending"], "readwrite");
    var store = transaction.objectStore("pending");
    var cursor = store.openCursor();
    cursor.onsuccess = function(event) {
      var actual = event.target.result;
      if (actual) {
        fetch(actual.value.url, {
          method: actual.value.method,
          body: actual.value.body
        })
          .then(response => response.json())
          .then(addToDatabase)
          .catch(function(error) {
            console.log(error);
          });
        actual.delete();
        actual.continue();
      } else {
        console.log("finito");
      }
    };
  };
  dbPromise.onerror = function(e) {
    console.log("onerror!");
    console.log(e);
  };
});
