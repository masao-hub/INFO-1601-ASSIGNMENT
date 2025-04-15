document.addEventListener('DOMContentLoaded', function() {
    // Tab functionality
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
            
            // If favorites tab is clicked, refresh favorites
            if (tabId === 'favorites') {
                displayFavorites();
            }
        });
    });

    // Search functionality
    const searchForm = document.getElementById('searchForm');
    const resultsContainer = document.getElementById('resultsContainer');
    const favoritesContainer = document.getElementById('favoritesContainer');
    
    displayFavorites();
    
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const make = document.getElementById('make').value.trim();
        const model = document.getElementById('model').value.trim();
        const year = document.getElementById('year').value;
        
        if (!make && !model && !year) {
            resultsContainer.innerHTML = '<div class="no-results"><i class="fas fa-info-circle"></i> Please enter at least one search criteria</div>';
            return;
        }
        
        searchCars(make, model, year);
    });
    
    async function searchCars(make, model, year) {
        try {
            resultsContainer.innerHTML = '<div class="loading-spinner"></div>';
            
            let url = 'https://api.api-ninjas.com/v1/cars?';
            const params = [];
            if (make) params.push(`make=${encodeURIComponent(make)}`);
            if (model) params.push(`model=${encodeURIComponent(model)}`);
            if (year) params.push(`year=${year}`);
            url += params.join('&');
            
            const API_KEY = 'SfCBqFk0H9H7lJnzHrL8Q9wqHwGK34GCwH1CdyKd'; 
            
            const response = await fetch(url, {
                headers: {
                    'X-Api-Key': API_KEY,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `API request failed with status ${response.status}`);
            }
            
            const cars = await response.json();
            
            if (!cars || cars.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-car-crash"></i>
                        <p>No cars found matching your criteria</p>
                        <p>Try a broader search (e.g., just make or make + year)</p>
                    </div>
                `;
                return;
            }
            
            // Enhance cars data with images
            const carsWithImages = await Promise.all(cars.map(async car => {
                try {
                    const imageUrl = await fetchCarImage(car.make, car.model, car.year);
                    return { ...car, imageUrl };
                } catch {
                    return { ...car, imageUrl: null };
                }
            }));
            
            displayResults(carsWithImages);
        } catch (error) {
            console.error('Error:', error);
            resultsContainer.innerHTML = `
                <div class="no-results" style="color: #dc3545;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${error.message}</p>
                    ${error.message.includes('API Key') ? 
                        '<p>Please check your API key is valid</p>' : ''}
                </div>
            `;
        }
    }
    
    // Fetch car image from Unsplash
    async function fetchCarImage(make, model, year) {
        const query = `${make} ${model} ${year} car`;
        const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&client_id=YOUR_UNSPLASH_KEY`);
        
        if (!response.ok) throw new Error('Image not available');
        
        const data = await response.json();
        return data.results[0]?.urls?.regular || null;
    }
    
    function displayResults(cars) {
        resultsContainer.innerHTML = '';
        
        cars.forEach(car => {
            const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
            const isFavorited = favorites.some(fav => 
                fav.make === car.make && 
                fav.model === car.model && 
                fav.year === car.year
            );
            
            const carCard = document.createElement('div');
            carCard.className = 'car-card';
            carCard.innerHTML = `
                <div class="car-image">
                    ${car.imageUrl ? 
                        `<img src="${car.imageUrl}" alt="${car.make} ${car.model}" loading="lazy">` : 
                        `<div style="display: flex; align-items: center; justify-content: center; height: 100%;">
                            <i class="fas fa-car" style="font-size: 3rem; color: #adb5bd;"></i>
                        </div>`}
                </div>
                <div class="car-details">
                    <h3 class="car-title">${car.make} ${car.model}</h3>
                    <div class="car-specs">
                        <span class="spec-item"><i class="fas fa-calendar-alt"></i> ${car.year}</span>
                        <span class="spec-item"><i class="fas fa-tachometer-alt"></i> ${car.combination_mpg || 'N/A'} MPG</span>
                        <span class="spec-item"><i class="fas fa-gas-pump"></i> ${car.cylinders || 'N/A'} cyl</span>
                        <span class="spec-item"><i class="fas fa-cog"></i> ${car.transmission || 'Auto'}</span>
                    </div>
                    <div class="car-actions">
                        <span class="price">$${Math.round(Math.random() * 50000) + 20000}</span>
                        <button class="favorite-btn ${isFavorited ? 'favorited' : ''}" 
                                data-make="${car.make}" 
                                data-model="${car.model}" 
                                data-year="${car.year}">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
            `;
            
            resultsContainer.appendChild(carCard);
        });
        
        document.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', toggleFavorite);
        });
    }
    
    function toggleFavorite(e) {
        const btn = e.currentTarget;
        const make = btn.dataset.make;
        const model = btn.dataset.model;
        const year = btn.dataset.year;
        
        let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        const carIndex = favorites.findIndex(fav => 
            fav.make === make && 
            fav.model === model && 
            fav.year === year
        );
        
        if (carIndex === -1) {
            favorites.push({ make, model, year });
            btn.classList.add('favorited');
            btn.innerHTML = '<i class="fas fa-heart"></i>';
        } else {
            favorites.splice(carIndex, 1);
            btn.classList.remove('favorited');
            btn.innerHTML = '<i class="fas fa-heart"></i>';
        }
        
        localStorage.setItem('favorites', JSON.stringify(favorites));
        displayFavorites();
    }
    
    function displayFavorites() {
        const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        favoritesContainer.innerHTML = '';
        
        if (favorites.length === 0) {
            favoritesContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-heart-broken"></i>
                    <p>You haven't saved any favorites yet</p>
                </div>
            `;
            return;
        }
        
        // For favorites, we'll just show basic info since we don't have the full car data
        favorites.forEach(car => {
            const carCard = document.createElement('div');
            carCard.className = 'car-card';
            carCard.innerHTML = `
                <div class="car-image">
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%;">
                        <i class="fas fa-car" style="font-size: 3rem; color: #adb5bd;"></i>
                    </div>
                </div>
                <div class="car-details">
                    <h3 class="car-title">${car.make} ${car.model}</h3>
                    <div class="car-specs">
                        <span class="spec-item"><i class="fas fa-calendar-alt"></i> ${car.year}</span>
                    </div>
                    <div class="car-actions">
                        <button class="favorite-btn favorited" 
                                data-make="${car.make}" 
                                data-model="${car.model}" 
                                data-year="${car.year}">
                            <i class="fas fa-heart"></i> Remove
                        </button>
                    </div>
                </div>
            `;
            
            favoritesContainer.appendChild(carCard);
        });
        
        document.querySelectorAll('#favoritesContainer .favorite-btn').forEach(btn => {
            btn.addEventListener('click', toggleFavorite);
        });
    }
});