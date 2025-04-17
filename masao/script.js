let map, service, searchBox;
let markers = [];

function initMap() {
  const defaultLoc = { lat: 10.6549, lng: -61.5010 };
  map = new google.maps.Map(document.getElementById("map"), {
    center: defaultLoc,
    zoom: 14,
  });

  service = new google.maps.places.PlacesService(map);
  searchBox = new google.maps.places.SearchBox(document.getElementById("search-box"));
  map.addListener("bounds_changed", () => {
    searchBox.setBounds(map.getBounds());
  });

  searchBox.addListener("places_changed", () => {
    const places = searchBox.getPlaces();
    if (!places.length) return;
    clearMarkers();
    const bounds = new google.maps.LatLngBounds();
    places.forEach(place => {
      const marker = new google.maps.Marker({
        map,
        position: place.geometry.location,
        title: place.name,
      });
      markers.push(marker);
      bounds.extend(place.geometry.location);
    });
    map.fitBounds(bounds);
  });

  setupTabs();
  checkLoginStatus();
  loadFavorites();
}

function switchTab(tab) {
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
  document.getElementById(`${tab}-tab`).classList.add("active");

  if (tab === "restaurants") {
    findNearbyPlaces(); 
  }
}

function findMyLocation() {
  navigator.geolocation.getCurrentPosition(pos => {
    const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    map.setCenter(coords);
    new google.maps.Marker({ position: coords, map });
  });
}

function saveLocation() {
  if (!isLoggedIn()) return alert("Login required.");
  const center = map.getCenter();
  const name = prompt("Name this location:") || `Unnamed @ ${center.lat().toFixed(4)},${center.lng().toFixed(4)}`;
  const newFav = { name, lat: center.lat(), lng: center.lng() };

  const favs = JSON.parse(localStorage.getItem("favorites") || "[]");
  favs.push(newFav);
  localStorage.setItem("favorites", JSON.stringify(favs));
  loadFavorites();
}

function loadFavorites() {
  const container = document.getElementById("favorites-list");
  container.innerHTML = "";

  const favs = JSON.parse(localStorage.getItem("favorites") || "[]");

  favs.forEach((fav, index) => {
    const div = document.createElement("div");
    div.className = "clickable";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = fav.name;
    nameSpan.contentEditable = false;
    nameSpan.style.flex = "1";
    nameSpan.style.outline = "none";

    nameSpan.ondblclick = () => {
      nameSpan.contentEditable = true;
      nameSpan.focus();
    };

    nameSpan.onblur = () => {
      nameSpan.contentEditable = false;
      favs[index].name = nameSpan.textContent.trim();
      localStorage.setItem("favorites", JSON.stringify(favs));
    };

    nameSpan.onkeypress = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        nameSpan.blur();
      }
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "❌";
    deleteBtn.onclick = () => deleteFavorite(index);

    div.appendChild(nameSpan);
    div.appendChild(deleteBtn);

    div.onclick = (e) => {
      if (e.target === deleteBtn || nameSpan.isContentEditable) return;

      const location = { lat: parseFloat(fav.lat), lng: parseFloat(fav.lng) };
      map.setCenter(location);
      map.setZoom(17);

      const marker = new google.maps.Marker({
        position: location,
        map,
        animation: google.maps.Animation.DROP,
      });

      const circle = new google.maps.Circle({
        strokeColor: "#1DCF9F",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#1DCF9F",
        fillOpacity: 0.35,
        map,
        center: location,
        radius: 50,
      });

      setTimeout(() => circle.setMap(null), 2000);
    };

    container.appendChild(div);
  });
}


function deleteFavorite(index) {
  let favs = JSON.parse(localStorage.getItem("favorites") || "[]");
  favs.splice(index, 1);
  localStorage.setItem("favorites", JSON.stringify(favs));
  loadFavorites();
}


function findNearbyPlaces() {
  const type = document.getElementById("place-type").value || "restaurant";
  const location = map.getCenter();

  if (!location) {
    alert("Map not centered yet.");
    return;
  }

  const request = {
    location,
    radius: 1500,
    type: [type],
  };

  service.nearbySearch(request, (results, status) => {
    const container = document.getElementById("restaurants-list");
    container.innerHTML = "";

    if (status === google.maps.places.PlacesServiceStatus.OK && results.length) {
      results.forEach(place => {
        const div = document.createElement("div");
        div.className = "clickable";
        div.innerText = place.name;
        div.onclick = () => {
          map.setCenter(place.geometry.location);
          map.setZoom(17);
          new google.maps.Marker({
            position: place.geometry.location,
            map,
            animation: google.maps.Animation.DROP,
          });
        };
        container.appendChild(div);
      });
    } else {
      container.innerText = "No places found.";
    }
  });
}


function clearMarkers() {
  markers.forEach(marker => marker.setMap(null));
  markers = [];
}

function isLoggedIn() {
  return localStorage.getItem("loggedIn") === "true";
}

function checkLoginStatus() {
  const username = localStorage.getItem("username");
  const isLoggedIn = localStorage.getItem("loggedIn") === "true";

  if (isLoggedIn) {
    document.getElementById("loginBtn").classList.add("hidden");
    document.getElementById("userMenu").classList.remove("hidden");
    document.getElementById("usernameDisplay").innerText = username;
  } else {
    document.getElementById("loginBtn").classList.remove("hidden");
    document.getElementById("userMenu").classList.add("hidden");
  }
}

function logout() {
  localStorage.removeItem("loggedIn");
  localStorage.removeItem("username");
  localStorage.removeItem("favorites");
  location.reload();
}

function setupTabs() {
  document.getElementById("darkModeToggle").addEventListener("change", (e) => {
    document.body.classList.toggle("dark-mode", e.target.checked);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  checkLoginStatus();
});
