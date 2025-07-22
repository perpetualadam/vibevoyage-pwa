// VibeVoyage PWA - Main Application Logic
class VibeVoyageApp {
    constructor() {
        this.map = null;
        this.currentLocation = null;
        this.destination = null;
        this.isNavigating = false;
        this.watchId = null;
        this.route = null;
        
        this.init();
    }
    
    async init() {
        console.log('🌟 VibeVoyage PWA Starting...');
        
        // Initialize map
        this.initMap();
        
        // Get user location
        await this.getCurrentLocation();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Check online status
        this.updateConnectionStatus();
        
        // Initialize service worker
        this.initServiceWorker();
        
        console.log('✅ VibeVoyage PWA Ready!');
        this.showNotification('Welcome to VibeVoyage! 🚗', 'success');
    }
    
    initMap() {
        console.log('🗺️ Initializing map...');

        // Check if Leaflet is available
        if (typeof L === 'undefined') {
            console.error('❌ Leaflet library not loaded');
            this.showMapPlaceholder();
            return;
        }

        // Check if map container exists
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error('❌ Map container not found');
            return;
        }

        try {
            // Clear any existing content
            mapContainer.innerHTML = '';

            // Initialize Leaflet map
            this.map = L.map('map').setView([40.7128, -74.0060], 13); // Default to NYC

            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19,
                crossOrigin: true
            }).addTo(this.map);

            // Add click handler for destination selection
            this.map.on('click', (e) => {
                console.log('🎯 Map clicked:', e.latlng);
                this.setDestination(e.latlng);
            });

            // Force map to resize after initialization
            setTimeout(() => {
                if (this.map) {
                    this.map.invalidateSize();
                }
            }, 100);

            console.log('✅ Map initialized successfully');
        } catch (error) {
            console.error('❌ Map initialization failed:', error);
            this.showMapPlaceholder();
        }
    }
    
    showMapPlaceholder() {
        const mapElement = document.getElementById('map');
        mapElement.innerHTML = `
            <div class="map-placeholder">
                <div class="icon">🗺️</div>
                <div>Map Loading...</div>
                <small>Click to retry if map doesn't load</small>
            </div>
        `;
        mapElement.onclick = () => this.initMap();
    }
    
    async getCurrentLocation() {
        console.log('📍 Getting current location...');
        const statusElement = document.getElementById('locationStatus');

        if (!navigator.geolocation) {
            console.error('❌ Geolocation not supported');
            statusElement.textContent = 'Location not supported';
            statusElement.className = 'status-offline';
            this.showNotification('Location services not available', 'error');
            return;
        }

        statusElement.textContent = 'Getting location...';
        statusElement.className = 'status-warning';

        try {
            console.log('📍 Requesting location permission...');
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 60000
                });
            });
            
            this.currentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            // Update map view
            if (this.map) {
                this.map.setView([this.currentLocation.lat, this.currentLocation.lng], 15);
                
                // Add current location marker
                L.marker([this.currentLocation.lat, this.currentLocation.lng])
                    .addTo(this.map)
                    .bindPopup('📍 Your Location')
                    .openPopup();
            }
            
            // Update UI
            document.getElementById('fromInput').value = 'Current Location';
            statusElement.textContent = 'Location found';
            statusElement.className = 'status-online';
            
            console.log('📍 Location found:', this.currentLocation);
            
        } catch (error) {
            console.error('❌ Location error:', error);

            let errorMessage = 'Location unavailable';
            let notificationMessage = 'Location access denied. Please enable location services.';

            // Handle specific error types
            if (error.code === 1) {
                errorMessage = 'Location denied';
                notificationMessage = 'Please allow location access and refresh the page.';
            } else if (error.code === 2) {
                errorMessage = 'Location unavailable';
                notificationMessage = 'Location services unavailable. Check your connection.';
            } else if (error.code === 3) {
                errorMessage = 'Location timeout';
                notificationMessage = 'Location request timed out. Please try again.';
            }

            statusElement.textContent = errorMessage;
            statusElement.className = 'status-offline';
            this.showNotification(notificationMessage, 'error');

            // Set a default location (NYC) for demo purposes
            this.currentLocation = { lat: 40.7128, lng: -74.0060 };
            if (this.map) {
                this.map.setView([this.currentLocation.lat, this.currentLocation.lng], 13);
                L.marker([this.currentLocation.lat, this.currentLocation.lng])
                    .addTo(this.map)
                    .bindPopup('📍 Demo Location (NYC)')
                    .openPopup();
            }
            document.getElementById('fromInput').value = 'Demo Location (NYC)';
        }
    }
    
    setDestination(latlng) {
        this.destination = latlng;
        
        // Clear existing destination marker
        if (this.destinationMarker) {
            this.map.removeLayer(this.destinationMarker);
        }
        
        // Add destination marker
        this.destinationMarker = L.marker([latlng.lat, latlng.lng])
            .addTo(this.map)
            .bindPopup('🎯 Destination')
            .openPopup();
        
        // Update destination input
        document.getElementById('toInput').value = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
        
        // Enable navigation button
        document.getElementById('navigateBtn').disabled = false;
        
        console.log('🎯 Destination set:', latlng);
    }
    
    async startNavigation() {
        if (!this.currentLocation || !this.destination) {
            this.showNotification('Please set a destination first', 'error');
            return;
        }
        
        const navBtn = document.getElementById('navigateBtn');
        navBtn.innerHTML = '<span class="spinner"></span> Calculating route...';
        navBtn.disabled = true;
        
        try {
            // Simulate route calculation
            await this.calculateRoute();
            
            // Start navigation
            this.isNavigating = true;
            this.showNavigationPanel();
            
            // Start location tracking
            this.startLocationTracking();
            
            navBtn.innerHTML = '🛑 Stop Navigation';
            navBtn.onclick = () => this.stopNavigation();
            navBtn.disabled = false;
            
            this.showNotification('Navigation started! 🚗', 'success');
            
            // Simulate voice guidance
            this.speakInstruction('Navigation started. Follow the route.');
            
        } catch (error) {
            console.error('Navigation error:', error);
            this.showNotification('Failed to calculate route', 'error');
            navBtn.innerHTML = '🚗 Start Navigation';
            navBtn.disabled = false;
        }
    }
    
    async calculateRoute() {
        // Simulate route calculation with OpenStreetMap data
        return new Promise((resolve) => {
            setTimeout(() => {
                // Create a simple route line
                if (this.map && this.currentLocation && this.destination) {
                    const routeCoords = [
                        [this.currentLocation.lat, this.currentLocation.lng],
                        [this.destination.lat, this.destination.lng]
                    ];
                    
                    // Remove existing route
                    if (this.routeLine) {
                        this.map.removeLayer(this.routeLine);
                    }
                    
                    // Add route line
                    this.routeLine = L.polyline(routeCoords, {
                        color: '#00FF88',
                        weight: 5,
                        opacity: 0.8
                    }).addTo(this.map);
                    
                    // Fit map to route
                    this.map.fitBounds(this.routeLine.getBounds(), { padding: [20, 20] });
                }
                
                resolve();
            }, 2000);
        });
    }
    
    showNavigationPanel() {
        const panel = document.getElementById('navPanel');
        panel.classList.add('active');
        
        // Update navigation instructions
        this.updateNavigationInstructions();
    }
    
    updateNavigationInstructions() {
        // Simulate navigation instructions
        const instructions = [
            'Head north on Main Street',
            'Turn right onto Oak Avenue',
            'Continue straight for 0.5 miles',
            'Turn left onto Highway 101',
            'Your destination is on the right'
        ];
        
        const randomInstruction = instructions[Math.floor(Math.random() * instructions.length)];
        const randomDistance = (Math.random() * 2).toFixed(1);
        
        document.getElementById('navDirection').textContent = randomInstruction;
        document.getElementById('navDistance').textContent = `${randomDistance} mi`;
    }
    
    stopNavigation() {
        this.isNavigating = false;
        
        // Hide navigation panel
        document.getElementById('navPanel').classList.remove('active');
        
        // Stop location tracking
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        
        // Reset navigation button
        const navBtn = document.getElementById('navigateBtn');
        navBtn.innerHTML = '🚗 Start Navigation';
        navBtn.onclick = () => this.startNavigation();
        
        this.showNotification('Navigation stopped', 'warning');
        this.speakInstruction('Navigation stopped.');
    }
    
    startLocationTracking() {
        if (!navigator.geolocation) return;
        
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // Update navigation instructions periodically
                if (this.isNavigating && Math.random() > 0.7) {
                    this.updateNavigationInstructions();
                }
            },
            (error) => {
                console.error('Location tracking error:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 1000
            }
        );
    }
    
    findNearby(type) {
        const types = {
            gas: { name: 'Gas Stations', icon: '⛽' },
            food: { name: 'Restaurants', icon: '🍽️' },
            parking: { name: 'Parking', icon: '🅿️' },
            hospital: { name: 'Hospitals', icon: '🏥' }
        };
        
        const selected = types[type];
        this.showNotification(`Searching for nearby ${selected.name}... ${selected.icon}`, 'info');
        
        // Simulate finding nearby places
        setTimeout(() => {
            this.showNotification(`Found 5 ${selected.name} nearby!`, 'success');
            
            // Add some random markers near current location
            if (this.map && this.currentLocation) {
                for (let i = 0; i < 3; i++) {
                    const lat = this.currentLocation.lat + (Math.random() - 0.5) * 0.01;
                    const lng = this.currentLocation.lng + (Math.random() - 0.5) * 0.01;
                    
                    L.marker([lat, lng])
                        .addTo(this.map)
                        .bindPopup(`${selected.icon} ${selected.name.slice(0, -1)} ${i + 1}`);
                }
            }
        }, 1500);
    }
    
    setupEventListeners() {
        // Search input handling
        const toInput = document.getElementById('toInput');
        toInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            document.getElementById('navigateBtn').disabled = !value;
        });
        
        // Online/offline status
        window.addEventListener('online', () => this.updateConnectionStatus());
        window.addEventListener('offline', () => this.updateConnectionStatus());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isNavigating) {
                this.stopNavigation();
            }
        });
    }
    
    updateConnectionStatus() {
        const statusElement = document.getElementById('connectionStatus');
        if (navigator.onLine) {
            statusElement.textContent = 'Online';
            statusElement.className = 'status-online';
        } else {
            statusElement.textContent = 'Offline';
            statusElement.className = 'status-offline';
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
    
    speakInstruction(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            speechSynthesis.speak(utterance);
        }
    }
    
    initServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('SW registered:', registration);
                })
                .catch(error => {
                    console.log('SW registration failed:', error);
                });
        }
    }
}

// Global functions for HTML onclick handlers
function toggleSettings() {
    console.log('⚙️ Opening settings...');

    // Create a simple settings modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    modal.innerHTML = `
        <div style="
            background: #1a1a1a;
            padding: 30px;
            border-radius: 12px;
            border: 1px solid #333;
            max-width: 400px;
            width: 90%;
            color: #fff;
        ">
            <h3 style="margin: 0 0 20px 0; color: #00FF88;">⚙️ Settings</h3>
            <div style="margin-bottom: 15px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" checked style="transform: scale(1.2);">
                    <span>Voice Guidance</span>
                </label>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" checked style="transform: scale(1.2);">
                    <span>Compass Directions</span>
                </label>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" style="transform: scale(1.2);">
                    <span>Avoid Tolls</span>
                </label>
            </div>
            <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" style="transform: scale(1.2);">
                    <span>Avoid Highways</span>
                </label>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: #00FF88;
                color: #000;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                width: 100%;
            ">Close Settings</button>
        </div>
    `;

    // Close modal when clicking outside
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };

    document.body.appendChild(modal);
    app.showNotification('Settings opened! ⚙️', 'info');
}

function getCurrentLocation() {
    if (app && app.getCurrentLocation) {
        app.getCurrentLocation();
    } else {
        console.error('❌ App not ready yet');
    }
}

function startNavigation() {
    if (app && app.startNavigation) {
        app.startNavigation();
    } else {
        console.error('❌ App not ready yet');
    }
}

function stopNavigation() {
    if (app && app.stopNavigation) {
        app.stopNavigation();
    } else {
        console.error('❌ App not ready yet');
    }
}

function findNearby(type) {
    if (app && app.findNearby) {
        app.findNearby(type);
    } else {
        console.error('❌ App not ready yet');
    }
}

function handleSearchKeypress(event) {
    if (event.key === 'Enter') {
        const value = event.target.value.trim();
        if (value && app && app.showNotification && app.setDestination) {
            // Simple geocoding simulation
            app.showNotification(`Searching for "${value}"...`, 'info');

            // Simulate setting destination
            setTimeout(() => {
                const randomLat = 40.7128 + (Math.random() - 0.5) * 0.1;
                const randomLng = -74.0060 + (Math.random() - 0.5) * 0.1;
                app.setDestination({ lat: randomLat, lng: randomLng });
                app.showNotification(`Destination set: ${value}`, 'success');
            }, 1000);
        } else if (value) {
            console.error('❌ App not ready yet');
        }
    }
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing VibeVoyage...');

    // Small delay to ensure all resources are loaded
    setTimeout(() => {
        try {
            app = new VibeVoyageApp();
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);

            // Show error message to user
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #FF6B6B;
                color: white;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                z-index: 10000;
            `;
            errorDiv.innerHTML = `
                <h3>⚠️ App Initialization Failed</h3>
                <p>Please refresh the page to try again.</p>
                <button onclick="window.location.reload()" style="
                    background: white;
                    color: #FF6B6B;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 10px;
                ">Refresh Page</button>
            `;
            document.body.appendChild(errorDiv);
        }
    }, 500);
});

// PWA Install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show custom install prompt
    setTimeout(() => {
        if (confirm('Install VibeVoyage as an app for the best experience?')) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                }
                deferredPrompt = null;
            });
        }
    }, 5000);
});

console.log('🚀 VibeVoyage PWA Loaded!');
