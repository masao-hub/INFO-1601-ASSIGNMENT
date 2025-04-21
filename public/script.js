let map, service, searchBox;
let markers = [];
let arActive = false; 

document.getElementById('ar-btn').addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    
    document.getElementById('ar-video').srcObject = stream;
    document.getElementById('ar-container').classList.remove('hidden');
    document.getElementById('ar-btn').classList.add('hidden');
    arActive = true;
    
    // Initialize AR.js or other AR library here
    startARScene();
    
  } catch (err) {
    Swal.fire('AR Unavailable', 'Could not access camera', 'error');
  }
});



function startARScene() {
  const video = document.getElementById('ar-video');
  const canvas = document.getElementById('ar-canvas');
  const ctx = canvas.getContext('2d');
  
  function render() {
    if (!arActive) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    // Add AR overlays here
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        // Draw POIs relative to device position
      });
    }
    
    requestAnimationFrame(render);
  }
  render();
}

document.getElementById('exit-ar').addEventListener('click', () => {
  arActive = false;
  document.getElementById('ar-container').classList.add('hidden');
  document.getElementById('ar-btn').classList.remove('hidden');
  const stream = document.getElementById('ar-video').srcObject;
  stream.getTracks().forEach(track => track.stop());
});

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
  if (!isLoggedIn()) {
    Swal.fire({
      title: 'Login Required',
      text: 'You need to login to save locations',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Go to Login',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.href = 'login.html';
      }
    });
    return;
  }

  const center = map.getCenter();
  
  Swal.fire({
    title: 'Save Location',
    html: `
      <input id="swal-name" class="swal2-input" placeholder="Name this location">
      <textarea id="swal-notes" class="swal2-textarea" placeholder="Add notes (optional)"></textarea>
      <select id="swal-category" class="swal2-select">
        <option value="general">General</option>
        <option value="restaurant">Restaurant</option>
        <option value="landmark">Landmark</option>
        <option value="hotel">Hotel</option>
      </select>
    `,
    focusConfirm: false,
    preConfirm: () => {
      return {
        name: document.getElementById('swal-name').value,
        notes: document.getElementById('swal-notes').value,
        category: document.getElementById('swal-category').value
      }
    }
  }).then((result) => {
    if (result.isConfirmed) {
      const name = result.value.name || `Location @ ${center.lat().toFixed(4)},${center.lng().toFixed(4)}`;
      const newFav = { 
        name,
        lat: center.lat(), 
        lng: center.lng(),
        notes: result.value.notes,
        category: result.value.category,
        date: new Date().toISOString()
      };

      const favs = JSON.parse(localStorage.getItem("favorites") || "[]");
      favs.push(newFav);
      localStorage.setItem("favorites", JSON.stringify(favs));
      loadFavorites();
      
      Swal.fire('Saved!', 'Location added to favorites', 'success');
    }
  });
}

function loadFavorites() {
  const container = document.getElementById("favorites-list");
  container.innerHTML = "";

  const favs = JSON.parse(localStorage.getItem("favorites") || "[]");
  
  // Add category filter
  const categoryFilter = document.createElement('select');
  categoryFilter.id = 'category-filter';
  categoryFilter.innerHTML = `
    <option value="all">All Categories</option>
    <option value="general">General</option>
    <option value="restaurant">Restaurants</option>
    <option value="landmark">Landmarks</option>
    <option value="hotel">Hotels</option>
  `;
  categoryFilter.onchange = () => filterFavorites();
  container.appendChild(categoryFilter);

  // Add sort options
  const sortOptions = document.createElement('div');
  sortOptions.className = 'sort-options';
  sortOptions.innerHTML = `
    <span>Sort by:</span>
    <button onclick="sortFavorites('date-desc')">Newest</button>
    <button onclick="sortFavorites('date-asc')">Oldest</button>
    <button onclick="sortFavorites('name')">Name</button>
  `;
  container.appendChild(sortOptions);

  // Display favorites
  const favoritesContainer = document.createElement('div');
  favoritesContainer.id = 'favorites-container';
  container.appendChild(favoritesContainer);

  filterFavorites();
}

function filterFavorites() {
  const category = document.getElementById('category-filter').value;
  const favs = JSON.parse(localStorage.getItem("favorites") || "[]");
  const container = document.getElementById('favorites-container');
  container.innerHTML = '';

  const filtered = category === 'all' 
    ? favs 
    : favs.filter(f => f.category === category);

  if (filtered.length === 0) {
    container.innerHTML = '<p class="no-favorites">No favorites found</p>';
    return;
  }

  filtered.forEach((fav, index) => {
    const card = document.createElement('div');
    card.className = `favorite-card ${fav.category}`;
    card.innerHTML = `
      <div class="card-header">
        <h4>${fav.name}</h4>
        <span class="category-badge">${fav.category}</span>
      </div>
      <div class="card-body">
        <p class="notes">${fav.notes || 'No notes'}</p>
        <p class="date">Saved on ${new Date(fav.date).toLocaleDateString()}</p>
      </div>
      <div class="card-actions">
        <button onclick="shareLocation(${index})"><i class="fas fa-share-alt"></i></button>
        <button onclick="navigateToFavorite(${index})"><i class="fas fa-directions"></i></button>
        <button onclick="deleteFavorite(${index})"><i class="fas fa-trash"></i></button>
      </div>
    `;
    container.appendChild(card);
  });
}

function sortFavorites(method) {
  const favs = JSON.parse(localStorage.getItem("favorites") || "[]");
  
  switch(method) {
    case 'date-desc':
      favs.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case 'date-asc':
      favs.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case 'name':
      favs.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }
  
  localStorage.setItem("favorites", JSON.stringify(favs));
  filterFavorites();
}

function shareLocation(index) {
  const favs = JSON.parse(localStorage.getItem("favorites") || "[]");
  const fav = favs[index];
  
  const url = `https://www.google.com/maps?q=${fav.lat},${fav.lng}`;
  const text = `Check out this location: ${fav.name} - ${url}`;
  
  if (navigator.share) {
    navigator.share({
      title: fav.name,
      text: `Check out this location: ${fav.name}`,
      url: url
    }).catch(err => {
      console.log('Error sharing:', err);
      fallbackShare(text);
    });
  } else {
    fallbackShare(text);
  }
}

function fallbackShare(text) {
  Swal.fire({
    title: 'Share Location',
    input: 'text',
    inputValue: text,
    showCancelButton: true,
    confirmButtonText: 'Copy',
    cancelButtonText: 'Close'
  }).then(result => {
    if (result.isConfirmed) {
      navigator.clipboard.writeText(text);
      Swal.fire('Copied!', 'Link copied to clipboard', 'success');
    }
  });
}

function navigateToFavorite(index) {
  const favs = JSON.parse(localStorage.getItem("favorites") || "[]");
  const fav = favs[index];
  
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const origin = `${pos.coords.latitude},${pos.coords.longitude}`;
      const destination = `${fav.lat},${fav.lng}`;
      
      window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`);
    });
  } else {
    window.open(`https://www.google.com/maps?q=${fav.lat},${fav.lng}`);
  }
}

function deleteFavorite(index) {
  let favs = JSON.parse(localStorage.getItem("favorites") || "[]");
  favs.splice(index, 1);
  localStorage.setItem("favorites", JSON.stringify(favs));
  loadFavorites();
}


function findNearbyPlaces() {
  const type = document.getElementById("place-type").value || "restaurant";
  const container = document.getElementById("restaurants-list");
  container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Finding nearby places...</div>';

  // Use current map center if geolocation fails
  const defaultLocation = map.getCenter();
  
  const handleLocationSuccess = (position) => {
    const location = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };
    searchNearbyPlaces(location);
  };

  const handleLocationError = (error) => {
    console.warn("Geolocation error:", error);
    // Use current map center as fallback
    searchNearbyPlaces(defaultLocation);
  };

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      handleLocationSuccess,
      handleLocationError,
      { timeout: 5000 }
    );
  } else {
    searchNearbyPlaces(defaultLocation);
  }
}

function searchNearbyPlaces(location) {
  const type = document.getElementById("place-type").value || "restaurant";
  const container = document.getElementById("restaurants-list");
  const request = {
    location: location,
    radius: 1000, // 1km radius
    type: [type]
  };

  service.nearbySearch(request, (results, status) => {
    container.innerHTML = "";
    
    if (status === google.maps.places.PlacesServiceStatus.OK && results.length) {
      results.slice(0, 15).forEach(place => {
        if (!place.name || !place.geometry?.location) return;
        
        const placeElement = createPlaceElement(place);
        container.appendChild(placeElement);
      });
    } else {
      container.innerHTML = `
        <div class="no-results">
          <i class="fas fa-map-marker-alt"></i>
          <p>No ${type}s found near this location</p>
          <button onclick="findNearbyPlaces()">Try Again</button>
        </div>
      `;
    }
  });
}

function createPlaceElement(place) {
  const div = document.createElement("div");
  div.className = "place-item";
  
  // Create elements for place details
  const placeInfo = document.createElement("div");
  placeInfo.className = "place-info";
  
  const name = document.createElement("h4");
  name.textContent = place.name;
  
  const address = document.createElement("p");
  address.className = "place-address";
  address.textContent = place.vicinity || "Address not available";
  
  placeInfo.appendChild(name);
  placeInfo.appendChild(address);
  
  // Add rating if available
  if (place.rating) {
    const rating = createRatingElement(place.rating);
    placeInfo.appendChild(rating);
  }
  
  // Add action button
  const action = document.createElement("button");
  action.className = "place-action";
  action.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
  action.onclick = () => centerOnPlace(place.geometry.location);
  
  div.appendChild(placeInfo);
  div.appendChild(action);
  
  return div;
}

function createRatingElement(rating) {
  const ratingDiv = document.createElement("div");
  ratingDiv.className = "place-rating";
  
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  for (let i = 0; i < 5; i++) {
    const star = document.createElement("i");
    if (i < fullStars) {
      star.className = "fas fa-star";
    } else if (i === fullStars && hasHalfStar) {
      star.className = "fas fa-star-half-alt";
    } else {
      star.className = "far fa-star";
    }
    ratingDiv.appendChild(star);
  }
  
  const ratingText = document.createElement("span");
  ratingText.textContent = rating.toFixed(1);
  ratingDiv.appendChild(ratingText);
  
  return ratingDiv;
}

function centerOnPlace(location) {
  if (typeof location === 'string') {
    location = JSON.parse(location);
  }
  const latLng = new google.maps.LatLng(location.lat, location.lng);
  map.setCenter(latLng);
  map.setZoom(17);
  
  // Clear existing markers
  clearMarkers();
  
  // Add new marker
  new google.maps.Marker({
    position: latLng,
    map,
    animation: google.maps.Animation.DROP
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

function saveLocationWithPhoto() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = event => {
      const photoUrl = event.target.result;
      // Save with other location data
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

const mapStyles = {
  light: [],
  dark: [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    {
      featureType: "administrative.locality",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }]
    }
  ],
  minimal: [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "road", stylers: [{ visibility: "simplified" }] }
  ]
};

function changeMapStyle(styleName) {
  map.setOptions({ styles: mapStyles[styleName] });
}

// Add to dark mode toggle
document.getElementById('darkModeToggle').addEventListener('change', (e) => {
  document.body.classList.toggle('dark-mode', e.target.checked);
  changeMapStyle(e.target.checked ? 'dark' : 'light');
});



// Update the existing script.js with these navigation functions
function setupNavigation() {
  // Highlight current page in navigation
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a').forEach(link => {
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Mobile menu toggle (if needed)
  const mobileMenuToggle = document.createElement('button');
  mobileMenuToggle.className = 'mobile-menu-toggle';
  mobileMenuToggle.innerHTML = '<i class="fas fa-bars"></i>';
  mobileMenuToggle.addEventListener('click', toggleMobileMenu);
  document.querySelector('header .container').appendChild(mobileMenuToggle);
}

function toggleMobileMenu() {
  document.querySelector('.main-nav').classList.toggle('active');
}

// Update the DOMContentLoaded event listener
window.addEventListener("DOMContentLoaded", () => {
  checkLoginStatus();
  setupNavigation();
  
  // Only run map-related code on the map page
  if (window.location.pathname.includes('map.html')) {
    initMap();
  }
});

// Check login status on home page
function checkHomeLoginStatus() {
  const username = localStorage.getItem("username");
  const isLoggedIn = localStorage.getItem("loggedIn") === "true";

  if (isLoggedIn) {
    document.getElementById("loginBtn").classList.add("hidden");
    document.getElementById("userMenu").classList.remove("hidden");
    document.getElementById("usernameDisplay").textContent = username;
  } else {
    document.getElementById("loginBtn").classList.remove("hidden");
    document.getElementById("userMenu").classList.add("hidden");
  }
}

// Initialize home page
if (document.querySelector('.main-nav')) {
  checkHomeLoginStatus();
}

// Mobile menu toggle functionality
function setupMobileMenu() {
  const menuToggle = document.querySelector('.mobile-menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('active');
    });
  }
}

// Update mobile login status display
function updateMobileLoginStatus() {
  const username = localStorage.getItem("username");
  const isLoggedIn = localStorage.getItem("loggedIn") === "true";
  const mobileUserMenu = document.getElementById("mobileUserMenu");
  const mobileLoginBtn = document.getElementById("mobileLoginBtn");
  const mobileUsernameDisplay = document.getElementById("mobileUsernameDisplay");

  if (isLoggedIn) {
    mobileUserMenu.classList.remove("hidden");
    mobileLoginBtn.classList.add("hidden");
    mobileUsernameDisplay.textContent = username;
  } else {
    mobileUserMenu.classList.add("hidden");
    mobileLoginBtn.classList.remove("hidden");
  }
}

// Initialize mobile menu and login status
window.addEventListener("DOMContentLoaded", () => {
  checkLoginStatus();
  setupMobileMenu();
  updateMobileLoginStatus();
  
  // Close mobile menu when clicking outside
  document.addEventListener('click', (e) => {
    const mobileMenu = document.querySelector('.mobile-menu');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    
    if (mobileMenu.classList.contains('active') && 
        !mobileMenu.contains(e.target) && 
        !menuToggle.contains(e.target)) {
      mobileMenu.classList.remove('active');
    }
  });
});

// Update both desktop and mobile login status
function checkLoginStatus() {
  const username = localStorage.getItem("username");
  const isLoggedIn = localStorage.getItem("loggedIn") === "true";

  if (isLoggedIn) {
    document.getElementById("loginBtn").classList.add("hidden");
    document.getElementById("userMenu").classList.remove("hidden");
    document.getElementById("usernameDisplay").textContent = username;
  } else {
    document.getElementById("loginBtn").classList.remove("hidden");
    document.getElementById("userMenu").classList.add("hidden");
  }
  
  // Also update mobile login status
  updateMobileLoginStatus();
}
