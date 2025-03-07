// Utility functions
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Trigger reflow
    toast.offsetHeight;
    
    // Show toast
    toast.classList.add('show');
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function setLoading(element, isLoading) {
    if (isLoading) {
        element.classList.add('loading');
    } else {
        element.classList.remove('loading');
    }
}

// Initialize main functionality
document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    initializeCharts();
    loadWeatherData();
    loadBioengineering();
    initializeRealTimeUpdates();
});

// Map initialization with enhanced features
function initializeMap() {
    try {
        const mapElement = document.getElementById('farm-map');
        setLoading(mapElement, true);

        // Initialize map with Bangalore as default view
        const map = L.map('farm-map', {
            zoomControl: false
        }).setView([12.9716, 77.5946], 13); // Bangalore coordinates
        
        // Add base layers
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        });
        
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri'
        });

        // Set default layer
        osmLayer.addTo(map);

        // Initialize drawing controls
        const drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);

        const drawControl = new L.Control.Draw({
            draw: {
                polygon: {
                    allowIntersection: false,
                    showArea: true
                },
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false,
                rectangle: false
            },
            edit: {
                featureGroup: drawnItems
            }
        });

        // Add sample field boundaries with enhanced popups
        const field1 = L.polygon([
            [51.509, -0.08],
            [51.503, -0.06],
            [51.51, -0.047]
        ], {
            color: '#2ecc71',
            fillOpacity: 0.5
        }).addTo(map);

        const field2 = L.polygon([
            [51.503, -0.11],
            [51.499, -0.09],
            [51.497, -0.12]
        ], {
            color: '#3498db',
            fillOpacity: 0.5
        }).addTo(map);

        // Enhanced field popups
        function createFieldPopup(fieldName, cropType, area) {
            return `
                <div class="field-popup">
                    <h3>${fieldName}</h3>
                    <p><strong>Crop:</strong> ${cropType}</p>
                    <p><strong>Area:</strong> ${area} acres</p>
                    <div class="field-actions">
                        <button onclick="editField('${fieldName}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button onclick="viewFieldDetails('${fieldName}')">
                            <i class="fas fa-info-circle"></i> Details
                        </button>
                    </div>
                </div>
            `;
        }

        field1.bindPopup(createFieldPopup('Field A', 'Corn', 25));
        field2.bindPopup(createFieldPopup('Field B', 'Soybeans', 30));

        // Current location handling
        let currentLocationMarker = null;
        let currentLocationAccuracyCircle = null;

        document.getElementById('current-location')?.addEventListener('click', () => {
            const button = document.getElementById('current-location');
            button.classList.add('active');
            
            if (!navigator.geolocation) {
                showToast('Geolocation is not supported by your browser.', 'error');
                button.classList.remove('active');
                return;
            }

            showToast('Fetching your location...', 'success');

            const options = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            };

            const onSuccess = (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                
                // Remove existing marker and accuracy circle if any
                if (currentLocationMarker) {
                    map.removeLayer(currentLocationMarker);
                }
                if (currentLocationAccuracyCircle) {
                    map.removeLayer(currentLocationAccuracyCircle);
                }

                // Add new marker
                currentLocationMarker = L.marker([latitude, longitude], {
                    icon: L.divIcon({
                        className: 'current-location-marker',
                        html: '<i class="fas fa-crosshairs"></i>',
                        iconSize: [20, 20]
                    })
                }).addTo(map);

                // Add accuracy circle
                currentLocationAccuracyCircle = L.circle([latitude, longitude], {
                    radius: accuracy,
                    color: '#2ecc71',
                    fillColor: 'rgba(46, 204, 113, 0.1)',
                    fillOpacity: 0.3
                }).addTo(map);

                // Pan to location with animation
                map.flyTo([latitude, longitude], 16, {
                    duration: 1.5
                });

                currentLocationMarker.bindPopup('Your current location').openPopup();
                showToast('Location found!', 'success');
                button.classList.remove('active');
            };

            const onError = (error) => {
                let errorMessage = 'Unable to get your location.';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied. Please enable location services.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out.';
                        break;
                }
                showToast(errorMessage, 'error');
                button.classList.remove('active');
            };

            navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
        });

        document.getElementById('toggle-satellite')?.addEventListener('click', function() {
            if (map.hasLayer(osmLayer)) {
                map.removeLayer(osmLayer);
                map.addLayer(satelliteLayer);
                this.classList.add('active');
            } else {
                map.removeLayer(satelliteLayer);
                map.addLayer(osmLayer);
                this.classList.remove('active');
            }
        });

        // Location search functionality
        const searchInput = document.getElementById('location-search');
        const searchResults = document.querySelector('.search-results');

        let searchTimeout;
        searchInput?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value;

            if (query.length < 3) {
                searchResults.classList.remove('active');
                return;
            }

            searchTimeout = setTimeout(async () => {
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
                    const data = await response.json();

                    searchResults.innerHTML = data.map(result => `
                        <div class="search-result-item" data-lat="${result.lat}" data-lon="${result.lon}">
                            ${result.display_name}
                        </div>
                    `).join('');

                    searchResults.classList.add('active');

                    // Add click handlers to search results
                    document.querySelectorAll('.search-result-item').forEach(item => {
                        item.addEventListener('click', () => {
                            const lat = parseFloat(item.dataset.lat);
                            const lon = parseFloat(item.dataset.lon);
                            map.setView([lat, lon], 15);
                            searchResults.classList.remove('active');
                            searchInput.value = item.textContent.trim();
                        });
                    });
                } catch (error) {
                    console.error('Error searching location:', error);
                    showToast('Error searching location. Please try again.', 'error');
                }
            }, 500);
        });

        // Area measurement tool
        let measureMode = false;
        let measurePolygon = null;
        let measurePoints = [];

        document.getElementById('measure-area')?.addEventListener('click', () => {
            if (!measureMode) {
                measureMode = true;
                measurePoints = [];
                showToast('Click on the map to start measuring area', 'success');
                map.on('click', onMapClick);
            } else {
                measureMode = false;
                if (measurePolygon) {
                    map.removeLayer(measurePolygon);
                }
                map.off('click', onMapClick);
                showToast('Area measurement cancelled', 'success');
            }
        });

        function onMapClick(e) {
            measurePoints.push([e.latlng.lat, e.latlng.lng]);
            
            if (measurePolygon) {
                map.removeLayer(measurePolygon);
            }
            
            if (measurePoints.length > 2) {
                measurePolygon = L.polygon(measurePoints, {
                    color: '#e74c3c',
                    fillOpacity: 0.3
                }).addTo(map);
                
                const area = L.GeometryUtil.geodesicArea(measurePolygon.getLatLngs()[0]);
                const areaAcres = (area / 4046.86).toFixed(2); // Convert square meters to acres
                
                measurePolygon.bindPopup(`Area: ${areaAcres} acres`).openPopup();
            }
        }

        // Add field functionality
        document.getElementById('add-field')?.addEventListener('click', () => {
            map.addControl(drawControl);
            showToast('Draw a polygon to add a new field', 'success');
        });

        map.on('draw:created', function(e) {
            const layer = e.layer;
            drawnItems.addLayer(layer);
            
            // Calculate area
            const area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
            const areaAcres = (area / 4046.86).toFixed(2);
            
            // Prompt for field details
            const fieldName = prompt('Enter field name:');
            const cropType = prompt('Enter crop type:');
            
            if (fieldName && cropType) {
                layer.bindPopup(createFieldPopup(fieldName, cropType, areaAcres));
            }
            
            map.removeControl(drawControl);
        });

        setLoading(mapElement, false);

        // Add fullscreen toggle functionality
        const toggleFullscreen = document.getElementById('toggle-fullscreen');
        const mapCard = document.querySelector('.map-card');

        toggleFullscreen.addEventListener('click', () => {
            mapCard.classList.toggle('fullscreen');
            map.invalidateSize(); // Ensure map renders correctly after resize
            
            // Update icon based on fullscreen state
            const icon = toggleFullscreen.querySelector('i');
            if (mapCard.classList.contains('fullscreen')) {
                icon.classList.remove('fa-expand');
                icon.classList.add('fa-compress');
            } else {
                icon.classList.remove('fa-compress');
                icon.classList.add('fa-expand');
            }
        });

        // Add solution benefits section
        const benefitsSection = document.createElement('div');
        benefitsSection.className = 'benefits-section glass-morphism';
        benefitsSection.innerHTML = `
            <div class="benefits-container">
                <h3><i class="fas fa-star"></i> Our Solution Benefits</h3>
                <div class="benefits-grid">
                    <div class="benefit-card">
                        <i class="fas fa-leaf"></i>
                        <h4>Smart Crop Rotation</h4>
                        <p>AI-driven recommendations for optimal crop sequences that improve soil health and reduce environmental impact.</p>
                    </div>
                    <div class="benefit-card">
                        <i class="fas fa-cloud"></i>
                        <h4>AQI Improvement</h4>
                        <p>Our system helps reduce air pollution through better farming practices, potentially improving local AQI by 20-30%.</p>
                    </div>
                    <div class="benefit-card">
                        <i class="fas fa-tint"></i>
                        <h4>Water Conservation</h4>
                        <p>Smart irrigation recommendations and soil moisture monitoring reduce water usage by up to 40%.</p>
                    </div>
                    <div class="benefit-card">
                        <i class="fas fa-seedling"></i>
                        <h4>Soil Health</h4>
                        <p>Continuous monitoring and recommendations for maintaining optimal soil conditions and biodiversity.</p>
                    </div>
                </div>
                <div class="aqi-impact-section">
                    <h3><i class="fas fa-chart-line"></i> AQI Impact Analysis</h3>
                    <div class="aqi-benefits">
                        <div class="aqi-benefit-item">
                            <i class="fas fa-check-circle"></i>
                            <p><strong>Reduced Emissions:</strong> Smart farming practices minimize the need for harmful pesticides and reduce agricultural emissions.</p>
                        </div>
                        <div class="aqi-benefit-item">
                            <i class="fas fa-check-circle"></i>
                            <p><strong>Carbon Sequestration:</strong> Optimal crop rotation increases soil carbon storage, helping combat air pollution.</p>
                        </div>
                        <div class="aqi-benefit-item">
                            <i class="fas fa-check-circle"></i>
                            <p><strong>Dust Mitigation:</strong> Better soil management reduces dust particles in the air, improving local air quality.</p>
                        </div>
                        <div class="aqi-benefit-item">
                            <i class="fas fa-check-circle"></i>
                            <p><strong>Sustainable Agriculture:</strong> Long-term improvements in air quality through sustainable farming practices.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add styles for the benefits section
        const benefitsStyle = document.createElement('style');
        benefitsStyle.textContent = `
            .benefits-section {
                margin: 2rem 0;
                padding: 2rem;
                border-radius: 15px;
            }

            .benefits-container h3 {
                color: var(--text-color);
                margin-bottom: 1.5rem;
                font-size: 1.5rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .benefits-container h3 i {
                color: #2ecc71;
            }

            .benefits-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1.5rem;
                margin-bottom: 2rem;
            }

            .benefit-card {
                background: rgba(255, 255, 255, 0.1);
                padding: 1.5rem;
                border-radius: 12px;
                text-align: center;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }

            .benefit-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 20px rgba(46, 204, 113, 0.1);
            }

            .benefit-card i {
                font-size: 2rem;
                color: #2ecc71;
                margin-bottom: 1rem;
            }

            .benefit-card h4 {
                color: var(--text-color);
                margin-bottom: 0.5rem;
                font-size: 1.2rem;
            }

            .benefit-card p {
                color: var(--text-color);
                opacity: 0.8;
                line-height: 1.5;
            }

            .aqi-impact-section {
                margin-top: 3rem;
            }

            .aqi-benefits {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 1.5rem;
                margin-top: 1.5rem;
            }

            .aqi-benefit-item {
                display: flex;
                align-items: flex-start;
                gap: 1rem;
                padding: 1rem;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                transition: transform 0.3s ease;
            }

            .aqi-benefit-item:hover {
                transform: translateX(5px);
            }

            .aqi-benefit-item i {
                color: #2ecc71;
                font-size: 1.2rem;
                margin-top: 0.2rem;
            }

            .aqi-benefit-item p {
                margin: 0;
                line-height: 1.5;
            }

            .aqi-benefit-item strong {
                color: var(--text-color);
            }

            @media (max-width: 768px) {
                .benefits-grid {
                    grid-template-columns: 1fr;
                }

                .aqi-benefits {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(benefitsStyle);

        // Insert the benefits section after the map
        mapElement.parentNode.insertBefore(benefitsSection, mapElement.nextSibling);

        // Handle escape key to exit fullscreen
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mapCard.classList.contains('fullscreen')) {
                mapCard.classList.remove('fullscreen');
                const icon = toggleFullscreen.querySelector('i');
                icon.classList.remove('fa-compress');
                icon.classList.add('fa-expand');
                map.invalidateSize();
            }
        });
    } catch (error) {
        console.error('Error initializing map:', error);
        showToast('Error loading map. Please refresh the page.', 'error');
    }
}

// Charts initialization
async function initializeCharts() {
    // Initialize chart instances
    let aqiChart;
    let baseAQI = 50; // Starting with a moderate AQI value
    let aqiValues = []; // Array to store AQI values for average calculation
    
    try {
        // Create average AQI display element
        const aqiCard = document.querySelector('.aqi-card');
        const averageDisplay = document.createElement('div');
        averageDisplay.className = 'aqi-average';
        averageDisplay.innerHTML = `
            <div class="average-value">
                <span>Average AQI: </span>
                <span id="avgAQI">--</span>
            </div>
        `;
        aqiCard.insertBefore(averageDisplay, document.getElementById('aqiChart'));

        // Add styles for average display
        const style = document.createElement('style');
        style.textContent = `
            .aqi-average {
                text-align: center;
                padding: 10px;
                margin-bottom: 15px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 5px;
            }
            .average-value {
                font-size: 1.2rem;
                font-weight: bold;
            }
            #avgAQI {
                color: var(--primary-color);
            }
        `;
        document.head.appendChild(style);

        // AQI Chart with real-time data
        const aqiCtx = document.getElementById('aqiChart').getContext('2d');
        aqiChart = new Chart(aqiCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Air Quality Index',
                    data: [],
                    borderColor: '#2ecc71',
                    tension: 0.4,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                animation: {
                    duration: 0 // Disable animation for smoother updates
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        suggestedMax: 150,
                        title: {
                            display: true,
                            text: 'AQI Value'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    }
                }
            }
        });

        // Function to calculate average AQI
        function calculateAverageAQI() {
            if (aqiValues.length === 0) return '--';
            const sum = aqiValues.reduce((a, b) => a + b, 0);
            return (sum / aqiValues.length).toFixed(1);
        }

        // Function to simulate realistic AQI variations
        function simulateAQIValue() {
            // Add small random variations (-2 to +2)
            const variation = (Math.random() * 4) - 2;
            
            // Gradually drift the base AQI
            baseAQI += (Math.random() * 0.4) - 0.2;
            
            // Keep baseAQI within realistic bounds (0-300)
            baseAQI = Math.max(0, Math.min(300, baseAQI));
            
            // Return the current AQI with variation
            return Math.max(0, baseAQI + variation);
        }

        // Function to update AQI data every 10 seconds
        function updateAQIData() {
            const aqi = simulateAQIValue();
            const timestamp = new Date().toLocaleTimeString('en-US', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            // Update chart data
            if (aqiChart) {
                aqiChart.data.labels.push(timestamp);
                aqiChart.data.datasets[0].data.push(aqi);
                
                // Keep only last 30 readings (5 minutes of data)
                if (aqiChart.data.labels.length > 30) {
                    aqiChart.data.labels.shift();
                    aqiChart.data.datasets[0].data.shift();
                }

                // Update AQI values array for average calculation
                aqiValues.push(aqi);
                if (aqiValues.length > 30) {
                    aqiValues.shift();
                }
                
                // Update average display
                document.getElementById('avgAQI').textContent = calculateAverageAQI();
                
                aqiChart.update('none'); // Update without animation
                checkAQILevel(aqi);
            }
        }

        // Start updating AQI data every 10 seconds
        const aqiUpdateInterval = setInterval(updateAQIData, 10000);

        // Cleanup interval when changing pages or components
        window.addEventListener('beforeunload', () => {
            clearInterval(aqiUpdateInterval);
        });

    } catch (error) {
        console.error('Error initializing charts:', error);
        showToast('Error initializing charts. Please refresh the page.', 'error');
    }
}

function checkAQILevel(value) {
    const levels = [
        { max: 50, label: 'Good', color: '#2ecc71' },
        { max: 100, label: 'Moderate', color: '#f1c40f' },
        { max: 150, label: 'Unhealthy for Sensitive Groups', color: '#e67e22' },
        { max: 200, label: 'Unhealthy', color: '#e74c3c' },
        { max: 300, label: 'Very Unhealthy', color: '#9b59b6' },
        { max: Infinity, label: 'Hazardous', color: '#8e44ad' }
    ];

    for (const level of levels) {
        if (value <= level.max) {
            if (level.max < 100) {
                return; // Don't show toast for good levels
            }
            showToast(`Air Quality Alert: ${level.label} (AQI: ${value})`, 'error');
            break;
        }
    }
}

function getWeatherIcon(condition) {
    // Map weather conditions to Font Awesome icons
    const iconMap = {
        'Sunny': 'fas fa-sun',
        'Partly Cloudy': 'fas fa-cloud-sun',
        'Cloudy': 'fas fa-cloud',
        'Light Rain': 'fas fa-cloud-rain',
        'Rain': 'fas fa-cloud-showers-heavy',
        'Clear': 'fas fa-moon',
        'Overcast': 'fas fa-cloud',
        'Mist': 'fas fa-smog',
        'Thunderstorm': 'fas fa-bolt',
        'Snow': 'fas fa-snowflake',
        'Fog': 'fas fa-smog'
    };

    return iconMap[condition] || 'fas fa-sun'; // Default to sun icon instead of question mark
}

async function loadWeatherData(retryCount = 3, backoffDelay = 2000) {
    const weatherContainer = document.getElementById('weather-data');
    
    function updateWeatherDisplay(data, isFallback = false) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = new Date();
        
        let forecastHTML = '<div class="forecast">';
        
        // Generate 7 days of weather forecast
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dayName = days[date.getDay()];
            
            // Simulate different weather conditions with more controlled randomization
            const temp = Math.floor(Math.random() * 15) + 15; // Temperature between 15-30°C
            const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Rain'];
            const condition = conditions[Math.floor(Math.random() * conditions.length)];
            const icon = getWeatherIcon(condition);
            
            forecastHTML += `
                <div class="forecast-day">
                    <div class="day-name">${dayName}</div>
                    <div class="weather-icon">
                        <i class="${icon}"></i>
                    </div>
                    <div class="temperature">${temp}°C</div>
                    <div class="condition">${condition}</div>
                </div>
            `;
        }
        
        forecastHTML += '</div>';
        weatherContainer.innerHTML = forecastHTML;
    }
    
    // Initial weather update
    updateWeatherDisplay();
    
    // Update weather every hour
    setInterval(() => {
        updateWeatherDisplay();
    }, 3600000);
}

// AI-driven bioengineering system
function loadBioengineering() {
    const bioContainer = document.getElementById('recommendations-list');
    setLoading(bioContainer, true);

    try {
        // Initialize default sustainability metrics
        const sustainabilityMetrics = {
            totalScore: 0,
            scoreClass: 'fair',
            soilHealth: 0,
            carbonReduction: 0,
            waterEfficiency: 0,
            biodiversity: 0,
            insights: []
        };

        bioContainer.innerHTML = `
            <div class="bio-engineering-container">
                <div class="input-section glass-morphism">
                    <h3><i class="fas fa-flask glow-icon"></i> AI Microbial Mix Calculator</h3>
                    <form id="bioForm" class="bio-form">
                        <div class="form-group">
                            <label for="cropType">Crop Type:</label>
                            <select id="cropType" class="modern-select" required>
                                <option value="">Select crop...</option>
                                <option value="corn">🌽 Corn</option>
                                <option value="wheat">🌾 Wheat</option>
                                <option value="soybean">🫘 Soybean</option>
                                <option value="cotton">🌿 Cotton</option>
                                <option value="rice">🍚 Rice</option>
                                <option value="potato">🥔 Potato</option>
                                <option value="tomato">🍅 Tomato</option>
                                <option value="sugarcane">🎋 Sugarcane</option>
                                <option value="barley">🌾 Barley</option>
                                <option value="sunflower">🌻 Sunflower</option>
                                <option value="cassava">🥔 Cassava</option>
                                <option value="oats">🌾 Oats</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="soilType">Soil Type:</label>
                            <select id="soilType" class="modern-select" required>
                                <option value="">Select soil type...</option>
                                <option value="clay">🟫 Clay</option>
                                <option value="loam">🟤 Loam</option>
                                <option value="sandy">🟡 Sandy</option>
                                <option value="silt">🟨 Silt</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="phLevel">Current Soil pH:</label>
                            <div class="range-slider">
                                <input type="range" id="phLevel" min="0" max="14" step="0.1" value="7" required>
                                <span class="range-value">7.0</span>
                            </div>
                        </div>
                        <button type="submit" class="calculate-btn pulse">
                            <i class="fas fa-calculator"></i> Calculate Optimal Mix
                        </button>
                    </form>
                </div>
                <div class="results-section glass-morphism">
                    <div class="sustainability-score">
                        <h4>Sustainability Analysis</h4>
                        <div class="score-container">
                            <div class="score-circle ${sustainabilityMetrics.scoreClass}">
                                <svg class="score-svg">
                                    <circle class="score-background" cx="60" cy="60" r="54"></circle>
                                    <circle class="score-progress" cx="60" cy="60" r="54" style="stroke-dashoffset: ${340 - (340 * sustainabilityMetrics.totalScore / 100)}"></circle>
                                </svg>
                                <div class="score-content">
                                    <span class="score-value">${sustainabilityMetrics.totalScore}</span>
                                    <span class="score-label">${sustainabilityMetrics.scoreClass}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="aqi-impact">
                        <h4>Projected AQI Impact</h4>
                        <div class="impact-chart">
                            <canvas id="aqiImpactChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add enhanced styles
        const style = document.createElement('style');
        style.textContent = `
            .bio-engineering-container {
                display: grid;
                gap: 1.5rem;
                animation: fadeIn 0.5s ease-out;
            }
            
            .glass-morphism {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15);
                border-radius: 12px;
                padding: 1.5rem;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            
            .glass-morphism:hover {
                transform: translateY(-5px);
                box-shadow: 0 12px 40px rgba(76, 86, 97, 0.3);
            }

            .glow-icon {
                color: var(--primary-color);
                text-shadow: 0 0 10px rgba(46, 204, 113, 0.5);
                animation: glow 2s ease-in-out infinite;
            }

            .modern-select {
                appearance: none;
                padding: 0.8rem;
                border: 2px solid rgba(46, 204, 113, 0.2);
                border-radius: 8px;
                background: white;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .modern-select:hover {
                border-color: var(--primary-color);
                box-shadow: 0 0 0 4px rgba(46, 204, 113, 0.1);
            }

            .range-slider {
                position: relative;
                width: 100%;
                height: 40px;
            }

            .range-slider input {
                width: 100%;
                height: 8px;
                border-radius: 4px;
                background: linear-gradient(to right, #2ecc71, #f1c40f, #e74c3c);
                outline: none;
                transition: height 0.3s ease;
            }

            .range-slider input::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: white;
                border: 2px solid var(--primary-color);
                cursor: pointer;
                box-shadow: 0 0 10px rgba(46, 204, 113, 0.3);
                transition: all 0.3s ease;
            }

            .range-slider input::-webkit-slider-thumb:hover {
                transform: scale(1.1);
                box-shadow: 0 0 15px rgba(46, 204, 113, 0.5);
            }

            .range-value {
                position: absolute;
                top: -25px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--primary-color);
                color: white;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.9rem;
                transition: all 0.3s ease;
            }

            .calculate-btn {
                background: linear-gradient(135deg, #2ecc71, #27ae60);
                color: white;
                border: none;
                padding: 1rem;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }

            .calculate-btn::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
                transform: rotate(45deg);
                transition: all 0.3s ease;
                opacity: 0;
            }

            .calculate-btn:hover::before {
                opacity: 1;
                transform: rotate(45deg) translate(10%, 10%);
            }

            .calculate-btn.pulse {
                animation: pulse 2s infinite;
            }

            .score-container {
                display: flex;
                justify-content: center;
                margin-bottom: 2rem;
            }

            .score-circle {
                position: relative;
                width: 120px;
                height: 120px;
                margin: 0 auto;
            }

            .score-svg {
                width: 120px;
                height: 120px;
                transform: rotate(-90deg);
            }

            .score-background,
            .score-progress {
                fill: none;
                stroke-width: 8;
                stroke-linecap: round;
            }

            .score-background {
                stroke: rgba(46, 204, 113, 0.1);
            }

            .score-progress {
                stroke: var(--primary-color);
                stroke-dasharray: 340;
                transition: stroke-dashoffset 1s ease-out;
            }

            .score-circle.excellent .score-progress { stroke: #2ecc71; }
            .score-circle.good .score-progress { stroke: #3498db; }
            .score-circle.fair .score-progress { stroke: #f1c40f; }
            .score-circle.poor .score-progress { stroke: #e74c3c; }

            .score-content {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
            }

            .score-value {
                display: block;
                font-size: 2rem;
                font-weight: bold;
                color: var(--text-color);
                line-height: 1;
                margin-bottom: 0.25rem;
            }

            .score-label {
                display: block;
                font-size: 0.8rem;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: #666;
            }

            .metrics-breakdown {
                margin: 1.5rem 0;
                display: grid;
                gap: 1rem;
            }

            .metric {
                background: rgba(255, 255, 255, 0.5);
                padding: 1rem;
                border-radius: 12px;
                transition: transform 0.3s ease;
            }

            .metric:hover {
                transform: translateX(5px);
            }

            .metric-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }

            .metric-label {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-weight: 500;
                color: var(--text-color);
            }

            .metric-label i {
                color: var(--primary-color);
            }

            .metric-value {
                font-weight: bold;
                color: var(--primary-color);
            }

            .metric-bar {
                height: 8px;
                background: rgba(46, 204, 113, 0.1);
                border-radius: 4px;
                overflow: hidden;
            }

            .metric-fill {
                height: 100%;
                background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
                border-radius: 4px;
                transition: width 1s ease-out;
            }

            .sustainability-insights {
                background: rgba(255, 255, 255, 0.5);
                padding: 1.5rem;
                border-radius: 12px;
                margin-top: 1.5rem;
            }

            .sustainability-insights h5 {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                color: var(--text-color);
                margin-bottom: 1rem;
                font-size: 1.1rem;
            }

            .sustainability-insights h5 i {
                color: var(--primary-color);
            }

            .insight-item {
                display: flex;
                align-items: flex-start;
                gap: 0.75rem;
                padding: 0.75rem;
                background: rgba(255, 255, 255, 0.5);
                border-radius: 8px;
                margin-bottom: 0.5rem;
                transition: transform 0.3s ease;
            }

            .insight-item:hover {
                transform: translateX(5px);
            }

            .insight-item i {
                color: var(--primary-color);
                margin-top: 0.25rem;
            }

            .insight-item span {
                flex: 1;
                line-height: 1.4;
            }

            @keyframes fillProgress {
                from { stroke-dashoffset: 340; }
                to { stroke-dashoffset: var(--target-offset); }
            }
        `;
        document.head.appendChild(style);

        // Initialize range slider
        const phSlider = document.getElementById('phLevel');
        const phValue = document.querySelector('.range-value');
        phSlider.addEventListener('input', (e) => {
            phValue.textContent = parseFloat(e.target.value).toFixed(1);
            phValue.style.left = (e.target.value / 14 * 100) + '%';
        });

        // Initialize AQI Impact Chart with animation
        const ctx = document.getElementById('aqiImpactChart').getContext('2d');
        const aqiImpactChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Current', '3 Months', '6 Months', '9 Months', '12 Months'],
                datasets: [{
                    label: 'Projected AQI Reduction',
                    data: [280, 220, 160, 100, 45],
                    borderColor: '#2ecc71',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(46, 204, 113, 0.2)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 2000,
                    easing: 'easeInOutQuart'
                },
                layout: {
                    padding: {
                        top: 30,
                        right: 30,
                        bottom: 30,
                        left: 30
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 300,
                        grid: {
                            color: 'rgba(46, 204, 113, 0.1)',
                            drawBorder: true,
                            lineWidth: 1
                        },
                        title: {
                            display: true,
                            text: 'AQI Value',
                            font: {
                                size: 16,
                                weight: 'bold'
                            },
                            padding: 15
                        },
                        ticks: {
                            font: {
                                size: 14
                            },
                            stepSize: 50
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(46, 204, 113, 0.1)',
                            drawBorder: true,
                            lineWidth: 1
                        },
                        title: {
                            display: true,
                            text: 'Time Period',
                            font: {
                                size: 16,
                                weight: 'bold'
                            },
                            padding: 15
                        },
                        ticks: {
                            font: {
                                size: 14
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            font: {
                                size: 16,
                                weight: 'bold'
                            },
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(46, 204, 113, 0.9)',
                        titleFont: {
                            size: 16
                        },
                        bodyFont: {
                            size: 14
                        },
                        padding: 15,
                        displayColors: false
                    }
                }
            }
        });

        // Function to generate AI insights
        async function generateAIInsights(cropType, soilType, phLevel) {
            // Instead of making an API call, we'll generate insights locally
            try {
                // Simulate API response with local logic
                const insights = {
                    insights: [
                        {
                            icon: 'fa-seedling',
                            text: `${cropType.charAt(0).toUpperCase() + cropType.slice(1)} shows ${getGrowthCompatibility(cropType, soilType, phLevel)}% compatibility with current conditions`
                        },
                        {
                            icon: 'fa-tint',
                            text: getWaterManagementTip(soilType)
                        },
                        {
                            icon: 'fa-leaf',
                            text: getMicrobialRecommendation(cropType, soilType)
                        },
                        {
                            icon: 'fa-chart-line',
                            text: getYieldProjection(cropType, soilType, phLevel)
                        }
                    ]
                };
                return insights;
            } catch (error) {
                console.error('Error generating AI insights:', error);
                showToast('Error generating insights', 'error');
                return {
                    insights: [
                        {
                            icon: 'fa-info-circle',
                            text: 'Unable to generate detailed insights. Please try again.'
                        }
                    ]
                };
            }
        }

        // Function to display AI insights
        function displayAIInsights(insights, metrics) {
            const bioContainer = document.getElementById('recommendations-list');
            if (!insights || !bioContainer) return;

            // Find or create the bio-engineering-container
            let bioEngineeringContainer = bioContainer.querySelector('.bio-engineering-container');
            if (!bioEngineeringContainer) {
                bioEngineeringContainer = document.createElement('div');
                bioEngineeringContainer.className = 'bio-engineering-container';
                bioContainer.appendChild(bioEngineeringContainer);
            }

            // Create or update the results section
            let resultsSection = bioEngineeringContainer.querySelector('.results-section');
            if (!resultsSection) {
                resultsSection = document.createElement('div');
                resultsSection.className = 'results-section glass-morphism';
                bioEngineeringContainer.appendChild(resultsSection);
            }

            // Update the results section content
            resultsSection.innerHTML = `
                <div class="sustainability-score">
                    <h4>Sustainability Analysis</h4>
                    <div class="score-container">
                        <div class="score-circle ${metrics.scoreClass}">
                            <svg class="score-svg">
                                <circle class="score-background" cx="60" cy="60" r="54"></circle>
                                <circle class="score-progress" cx="60" cy="60" r="54" style="stroke-dashoffset: ${340 - (340 * metrics.totalScore / 100)}"></circle>
                            </svg>
                            <div class="score-content">
                                <span class="score-value">${metrics.totalScore}</span>
                                <span class="score-label">${metrics.scoreClass}</span>
                            </div>
                        </div>
                    </div>
                    <div class="metrics-breakdown">
                        <div class="metric">
                            <div class="metric-header">
                                <span class="metric-label"><i class="fas fa-heart"></i> Soil Health</span>
                                <span class="metric-value">${metrics.soilHealth}%</span>
                            </div>
                            <div class="metric-bar">
                                <div class="metric-fill" style="width: ${metrics.soilHealth}%"></div>
                            </div>
                        </div>
                        <div class="metric">
                            <div class="metric-header">
                                <span class="metric-label"><i class="fas fa-cloud"></i> Carbon Impact</span>
                                <span class="metric-value">${metrics.carbonReduction}%</span>
                            </div>
                            <div class="metric-bar">
                                <div class="metric-fill" style="width: ${metrics.carbonReduction}%"></div>
                            </div>
                        </div>
                        <div class="metric">
                            <div class="metric-header">
                                <span class="metric-label"><i class="fas fa-tint"></i> Water Efficiency</span>
                                <span class="metric-value">${metrics.waterEfficiency}%</span>
                            </div>
                            <div class="metric-bar">
                                <div class="metric-fill" style="width: ${metrics.waterEfficiency}%"></div>
                            </div>
                        </div>
                        <div class="metric">
                            <div class="metric-header">
                                <span class="metric-label"><i class="fas fa-leaf"></i> Biodiversity</span>
                                <span class="metric-value">${metrics.biodiversity}%</span>
                            </div>
                            <div class="metric-bar">
                                <div class="metric-fill" style="width: ${metrics.biodiversity}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="key-insights-section">
                    <h4><i class="fas fa-lightbulb"></i> Key Insights</h4>
                    <div class="insights-list">
                        ${insights.insights.map(insight => `
                            <div class="insight-item">
                                <i class="fas ${insight.icon}"></i>
                                <span>${insight.text}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="aqi-impact">
                    <h4>Projected AQI Impact</h4>
                    <div class="impact-chart">
                        <canvas id="aqiImpactChart"></canvas>
                    </div>
                </div>
            `;

            // Add styles for the insights section
            const style = document.createElement('style');
            style.textContent = `
                .key-insights-section {
                    margin-top: 2rem;
                    padding: 1.5rem;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                }

                .key-insights-section h4 {
                    margin-bottom: 1.5rem;
                    color: var(--text-color);
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-size: 1.2rem;
                }

                .key-insights-section h4 i {
                    color: #2ecc71;
                }

                .insights-list {
                    display: grid;
                    gap: 1rem;
                }

                .insight-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.75rem;
                    padding: 1rem;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    transition: all 0.3s ease;
                }

                .insight-item:hover {
                    transform: translateX(5px);
                    background: rgba(255, 255, 255, 0.15);
                }

                .insight-item i {
                    color: #2ecc71;
                    margin-top: 0.25rem;
                    font-size: 1.1rem;
                }

                .insight-item span {
                    flex: 1;
                    line-height: 1.5;
                }

                .aqi-impact {
                    margin-top: 2rem;
                }

                .impact-chart {
                    height: 300px;
                    background: rgba(255, 255, 255, 0.05);
                    padding: 1rem;
                    border-radius: 12px;
                }
            `;
            document.head.appendChild(style);

            // Initialize AQI Impact Chart
            const ctx = document.getElementById('aqiImpactChart').getContext('2d');
            const aqiImpactChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Current', '3 Months', '6 Months', '9 Months', '12 Months'],
                    datasets: [{
                        label: 'Projected AQI Reduction',
                        data: [280, 220, 160, 100, 45],
                        borderColor: '#2ecc71',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        backgroundColor: 'rgba(46, 204, 113, 0.2)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 2000,
                        easing: 'easeInOutQuart'
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 300,
                            grid: {
                                color: 'rgba(46, 204, 113, 0.1)'
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(46, 204, 113, 0.1)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                font: {
                                    size: 14
                                }
                            }
                        }
                    }
                }
            });

            // Update the AQI projection
            updateAQIProjection(aqiImpactChart);
        }

        // Update the form submission handler
        document.getElementById('bioForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('.calculate-btn');
            btn.classList.remove('pulse');
            void btn.offsetWidth;
            btn.classList.add('pulse');
            
            const cropType = document.getElementById('cropType').value;
            const soilType = document.getElementById('soilType').value;
            const phLevel = document.getElementById('phLevel').value;

            // Calculate metrics first
            const metrics = calculateSustainabilityMetrics(cropType, soilType, phLevel);
            
            // Generate insights
            const insights = await generateAIInsights(cropType, soilType, phLevel);
            
            // Update sustainability display
            updateSustainabilityDisplay(metrics);
            
            // Update AQI projection
            updateAQIProjection(insights);
            
            // Display insights and metrics
            displayAIInsights(insights, metrics);
        });

    } catch (error) {
        console.error('Error initializing bioengineering:', error);
        showToast('Error initializing bioengineering. Please refresh the page.', 'error');
    } finally {
        setLoading(bioContainer, false);
    }
}

async function updateSensorData() {
    try {
        // Simulate real sensor data with some randomization around realistic values
        const sensorData = {
            soilMoisture: 45 + Math.random() * 10 - 5, // 40-50% is optimal
            temperature: 22 + Math.random() * 4 - 2,    // 20-24°C is optimal
            humidity: 60 + Math.random() * 10 - 5,      // 55-65% is optimal
            lightLevel: 5000 + Math.random() * 1000,    // 4000-6000 lux
            soilPH: 6.5 + Math.random() * 0.4 - 0.2,   // 6.3-6.7 pH is optimal
            windSpeed: 8 + Math.random() * 4 - 2        // 6-10 km/h is optimal
        };

        // Add some realistic variations based on time of day
        const hour = new Date().getHours();
        if (hour >= 10 && hour <= 16) { // During peak daylight
            sensorData.temperature += 2;
            sensorData.lightLevel += 2000;
            sensorData.humidity -= 5;
        } else if (hour <= 6 || hour >= 20) { // Night time
            sensorData.temperature -= 2;
            sensorData.lightLevel -= 1000;
            sensorData.humidity += 5;
        }

        // Update UI elements with new sensor data
        document.querySelectorAll('[data-sensor]').forEach(element => {
            const sensorType = element.dataset.sensor;
            if (sensorData[sensorType] !== undefined) {
                const value = sensorData[sensorType].toFixed(1);
                const unit = getSensorUnit(sensorType);
                
                // Add transition for smooth updates
                element.style.transition = 'color 0.3s ease';
                element.textContent = `${value}${unit}`;
                
                // Visual feedback for updates
                element.classList.add('updated');
                setTimeout(() => {
                    element.classList.remove('updated');
                }, 1000);

                // Add threshold alerts
                checkThresholds(sensorType, sensorData[sensorType]);
            }
        });

        return sensorData;

    } catch (error) {
        throw new Error(`Sensor update failed: ${error.message}`);
    }
}

function getSensorUnit(sensorType) {
    const units = {
        soilMoisture: '%',
        temperature: '°C',
        humidity: '%',
        lightLevel: 'lux',
        soilPH: 'pH',
        windSpeed: 'km/h'
    };
    return units[sensorType] || '';
}

function checkThresholds(sensorType, value) {
    const thresholds = {
        soilMoisture: { min: 20, max: 80 },
        temperature: { min: 10, max: 35 },
        humidity: { min: 30, max: 80 },
        lightLevel: { min: 1000, max: 100000 },
        soilPH: { min: 5.5, max: 7.5 },
        windSpeed: { min: 0, max: 30 }
    };

    const threshold = thresholds[sensorType];
    if (threshold && (value < threshold.min || value > threshold.max)) {
        showToast(`Warning: ${sensorType} is outside optimal range`, 'error');
    }
}

const style = document.createElement('style');
style.textContent = `
    /* Global color variables */
    :root {
        --glass-bg: rgba(255, 255, 255, 0.95);
        --glass-border: rgba(255, 255, 255, 0.2);
        --glass-shadow: rgba(31, 38, 135, 0.15);
        --glass-hover: rgba(255, 255, 255, 0.45);
    }

    /* Apply consistent glass morphism effect */
    .glass-morphism,
    .metric,
    .sustainability-insights,
    .insight-item,
    .sustainability-score,
    .weather-info,
    .forecast-day,
    .aqi-card,
    .sensor-item {
        background: var(--glass-bg);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid var(--glass-border);
        box-shadow: 0 8px 32px var(--glass-shadow);
    }

    /* Hover effects */
    .glass-morphism:hover,
    .metric:hover,
    .insight-item:hover,
    .forecast-day:hover,
    .sensor-item:hover {
        background: var(--glass-hover);
        transform: translateY(-5px);
    }

    /* Navbar specific styles */
    .navbar {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: 95%;
        max-width: 1400px;
        background: rgba(255, 255, 255, 0.35);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 15px;
        padding: 1rem;
        z-index: 1000;
        box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15),
                    0 0 15px rgba(255, 255, 255, 0.3);
        transition: all 0.3s ease;
        animation: navbarAppear 0.5s ease-out, navbarGlow 3s infinite;
    }

    .navbar:hover {
        background: rgba(255, 255, 255, 0.45);
        box-shadow: 0 8px 32px rgba(31, 38, 135, 0.25),
                    0 0 20px rgba(255, 255, 255, 0.4);
        transform: translateX(-50%) translateY(-2px);
    }

    .navbar a:hover, .navbar button:hover {
        text-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
    }

    .navbar a::after, .navbar button::after {
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
    }

    /* Animations */
    @keyframes navbarGlow {
        0%, 100% {
            box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15),
                        0 0 15px rgba(255, 255, 255, 0.3);
        }
        50% {
            box-shadow: 0 8px 32px rgba(31, 38, 135, 0.2),
                        0 0 25px rgba(255, 255, 255, 0.5);
        }
    }

    .navbar a.active::before, .navbar button.active::before {
        background: rgba(255, 255, 255, 0.8);
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.6);
    }

    /* AQI average section */
    .aqi-average {
        background: rgba(255, 255, 255, 0.1);
    }

    /* Main content spacing */
    .main-content {
        padding-top: calc(80px + 1rem);
    }
`;
document.head.appendChild(style);

// Helper functions for generating insights
function getGrowthCompatibility(crop, soil, ph) {
    const optimalPh = {
        corn: 6.0,
        wheat: 6.5,
        soybean: 6.3,
        cotton: 6.0,
        rice: 6.5,
        potato: 6.0,
        tomato: 6.3,
        sugarcane: 6.5,
        barley: 6.5,
        sunflower: 6.0,
        cassava: 6.0,
        oats: 6.0
    };

    const phDiff = Math.abs(optimalPh[crop] - ph);
    const soilScore = {
        clay: 0.8,
        loam: 1.0,
        sandy: 0.7,
        silt: 0.9
    };

    const compatibility = Math.round((1 - phDiff/7) * soilScore[soil] * 100);
    return Math.min(100, Math.max(0, compatibility));
}

function getWaterManagementTip(soil) {
    const tips = {
        clay: 'Moderate watering with good drainage needed. Monitor moisture levels closely.',
        loam: 'Balanced water retention. Standard irrigation schedule recommended.',
        sandy: 'Frequent light watering required. Consider drip irrigation system.',
        silt: 'Good water retention. Avoid overwatering to prevent compaction.'
    };
    return tips[soil];
}

function getMicrobialRecommendation(crop, soil) {
    const recommendations = {
        corn: 'Nitrogen-fixing bacteria and mycorrhizal fungi mix recommended',
        wheat: 'Phosphate solubilizing bacteria and actinomycetes blend suggested',
        soybean: 'Rhizobium japonicum and growth-promoting bacteria optimal',
        cotton: 'Balanced mix of growth-promoting and disease-suppressing microbes',
        rice: 'Methanogenic bacteria and nitrogen-fixing organisms recommended',
        potato: 'Disease-suppressing and nutrient-mobilizing bacterial blend',
        tomato: 'Beneficial fungi and growth-promoting bacteria combination',
        sugarcane: 'Mixed culture of nitrogen-fixing and phosphate-solubilizing bacteria',
        barley: 'Cold-tolerant growth-promoting bacterial consortium',
        sunflower: 'Drought-resistant microbial mix with mycorrhizal fungi',
        cassava: 'Root-enhancing bacterial and fungal combination',
        oats: 'Cool-season adapted microbial blend'
    };
    return recommendations[crop] || 'Standard microbial mix recommended';
}

function getYieldProjection(crop, soil, ph) {
    const baseYield = getGrowthCompatibility(crop, soil, ph);
    const projection = baseYield > 80 ? 'High yield potential' :
                      baseYield > 60 ? 'Moderate yield potential' :
                      'Lower yield expected. Consider soil amendments';
    return `${projection} (${baseYield}% optimal conditions)`;
}

// Function to calculate microbial mix
function calculateMicrobialMix(cropType, soilType, phLevel) {
    const sustainabilityMetrics = calculateSustainabilityMetrics(cropType, soilType, phLevel);
    updateSustainabilityDisplay(sustainabilityMetrics);
    updateAQIProjection(sustainabilityMetrics);
}

function calculateSustainabilityMetrics(cropType, soilType, phLevel) {
    const compatibility = getGrowthCompatibility(cropType, soilType, phLevel);
    const metrics = {
        soilHealth: Math.round(compatibility * 0.8),
        carbonReduction: Math.round(compatibility * 0.7),
        waterEfficiency: Math.round(compatibility * 0.9),
        biodiversity: Math.round(compatibility * 0.75)
    };
    
    const totalScore = Math.round(Object.values(metrics).reduce((a, b) => a + b) / 4);
    
    return {
        ...metrics,
        totalScore,
        scoreClass: totalScore >= 85 ? 'excellent' :
                   totalScore >= 70 ? 'good' :
                   totalScore >= 50 ? 'fair' : 'poor'
    };
}

function updateSustainabilityDisplay(metrics) {
    // Update the score circle
    const scoreContainer = document.querySelector('.sustainability-score');
    if (!scoreContainer) return;

    scoreContainer.innerHTML = `
        <h4>Sustainability Analysis</h4>
        <div class="score-container">
            <div class="score-circle ${metrics.scoreClass}">
                <svg class="score-svg">
                    <circle class="score-background" cx="60" cy="60" r="54"></circle>
                    <circle class="score-progress" cx="60" cy="60" r="54" style="stroke-dashoffset: ${340 - (340 * metrics.totalScore / 100)}"></circle>
                </svg>
                <div class="score-content">
                    <span class="score-value">${metrics.totalScore}</span>
                    <span class="score-label">${metrics.scoreClass}</span>
                </div>
            </div>
        </div>
        <div class="metrics-breakdown">
            <div class="metric">
                <div class="metric-header">
                    <span class="metric-label"><i class="fas fa-heart"></i> Soil Health</span>
                    <span class="metric-value">${metrics.soilHealth}%</span>
                </div>
                <div class="metric-bar">
                    <div class="metric-fill" style="width: ${metrics.soilHealth}%"></div>
                </div>
            </div>
            <div class="metric">
                <div class="metric-header">
                    <span class="metric-label"><i class="fas fa-cloud"></i> Carbon Impact</span>
                    <span class="metric-value">${metrics.carbonReduction}%</span>
                </div>
                <div class="metric-bar">
                    <div class="metric-fill" style="width: ${metrics.carbonReduction}%"></div>
                </div>
            </div>
            <div class="metric">
                <div class="metric-header">
                    <span class="metric-label"><i class="fas fa-tint"></i> Water Efficiency</span>
                    <span class="metric-value">${metrics.waterEfficiency}%</span>
                </div>
                <div class="metric-bar">
                    <div class="metric-fill" style="width: ${metrics.waterEfficiency}%"></div>
                </div>
            </div>
            <div class="metric">
                <div class="metric-header">
                    <span class="metric-label"><i class="fas fa-leaf"></i> Biodiversity</span>
                    <span class="metric-value">${metrics.biodiversity}%</span>
                </div>
                <div class="metric-bar">
                    <div class="metric-fill" style="width: ${metrics.biodiversity}%"></div>
                </div>
            </div>
        </div>
    `;

    // Add styles for the score circle and metrics
    const style = document.createElement('style');
    style.textContent = `
        .score-container {
            display: flex;
            justify-content: center;
            margin-bottom: 2rem;
        }

        .score-circle {
            position: relative;
            width: 120px;
            height: 120px;
            margin: 0 auto;
        }

        .score-svg {
            width: 120px;
            height: 120px;
            transform: rotate(-90deg);
        }

        .score-background,
        .score-progress {
            fill: none;
            stroke-width: 8;
            stroke-linecap: round;
        }

        .score-background {
            stroke: rgba(46, 204, 113, 0.1);
        }

        .score-progress {
            stroke: var(--primary-color);
            stroke-dasharray: 340;
            transition: stroke-dashoffset 1s ease-out;
        }

        .score-circle.excellent .score-progress { stroke: #2ecc71; }
        .score-circle.good .score-progress { stroke: #3498db; }
        .score-circle.fair .score-progress { stroke: #f1c40f; }
        .score-circle.poor .score-progress { stroke: #e74c3c; }

        .score-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
        }

        .score-value {
            display: block;
            font-size: 2rem;
            font-weight: bold;
            color: var(--text-color);
            line-height: 1;
            margin-bottom: 0.25rem;
        }

        .score-label {
            display: block;
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #666;
        }

        .metrics-breakdown {
            margin-top: 2rem;
            display: grid;
            gap: 1.5rem;
        }

        .metric {
            background: rgba(255, 255, 255, 0.1);
            padding: 1.2rem;
            border-radius: 10px;
            transition: transform 0.3s ease;
        }

        .metric:hover {
            transform: translateX(5px);
        }

        .metric-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.8rem;
        }

        .metric-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 500;
            color: var(--text-color);
        }

        .metric-label i {
            color: #2ecc71;
        }

        .metric-value {
            font-weight: bold;
            color: #2ecc71;
        }

        .metric-bar {
            height: 12px;
            background: rgba(46, 204, 113, 0.1);
            border-radius: 6px;
            overflow: hidden;
        }

        .metric-fill {
            height: 100%;
            width: 0;
            background: linear-gradient(90deg, var(--primary-color), #27ae60);
            border-radius: 6px;
            transition: width 1s ease-out;
        }
    `;
    document.head.appendChild(style);
}

function updateAQIProjection(chart) {
    if (!chart) return;

    const projectedData = [280, 220, 160, 100, 45];
    chart.data.datasets[0].data = projectedData;
    chart.update();
}

// Real-time updates initialization
function initializeRealTimeUpdates() {
    let updateInterval;
    const UPDATE_INTERVAL = 10000; // 10 seconds

    function startUpdates() {
        // Initial update
        updateSensorData();
        
        // Set interval for subsequent updates
        updateInterval = setInterval(updateSensorData, UPDATE_INTERVAL);
    }

    function stopUpdates() {
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
    }

    // Start updates
    startUpdates();

    // Cleanup function
    return () => {
        stopUpdates();
    };
} 