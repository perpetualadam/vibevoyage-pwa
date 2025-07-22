// VibeVoyage PWA - Main Application Logic
class VibeVoyageApp {
    constructor() {
        this.map = null;
        this.currentLocation = null;
        this.destination = null;
        this.isNavigating = false;
        this.watchId = null;
        this.route = null;
        this.routeData = null;
        this.routeSteps = [];
        this.currentStepIndex = 0;
        this.carMarker = null;
        this.currentLocationMarker = null;
        this.destinationMarker = null;
        this.routeLine = null;
        this.routeOutline = null;
        this.followingCar = true;
        this.poiMarkers = [];
        
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
            
            // Update map view and add car marker
            if (this.map) {
                this.map.setView([this.currentLocation.lat, this.currentLocation.lng], 15);

                // Add car marker for current location
                this.addCarMarker(this.currentLocation.lat, this.currentLocation.lng);
            }
            
            // Update UI
            document.getElementById('fromInput').value = 'Current Location';
            document.getElementById('fromInput').placeholder = 'From: Current Location';
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
            document.getElementById('fromInput').placeholder = 'From: Demo Location (NYC)';
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
        console.log('🛣️ Calculating route with real roads...');

        if (!this.currentLocation || !this.destination) {
            throw new Error('Missing start or end location');
        }

        try {
            // Use OSRM (Open Source Routing Machine) for real road routing with detailed annotations
            const start = `${this.currentLocation.lng},${this.currentLocation.lat}`;
            const end = `${this.destination.lng},${this.destination.lat}`;

            const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson&steps=true&annotations=true&voice_instructions=true&banner_instructions=true`
            );

            if (!response.ok) {
                throw new Error('Routing service unavailable');
            }

            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                this.routeData = route;

                // Extract route coordinates
                const routeCoords = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);

                // Remove existing route
                if (this.routeLine) {
                    this.map.removeLayer(this.routeLine);
                }

                // Add route line following actual roads
                this.routeLine = L.polyline(routeCoords, {
                    color: '#00FF88',
                    weight: 6,
                    opacity: 0.9,
                    className: 'route-line'
                }).addTo(this.map);

                // Add route outline for better visibility
                this.routeOutline = L.polyline(routeCoords, {
                    color: '#000000',
                    weight: 8,
                    opacity: 0.5
                }).addTo(this.map);
                this.routeOutline.bringToBack();

                // Store route steps for turn-by-turn navigation
                this.routeSteps = route.legs[0].steps;
                this.currentStepIndex = 0;

                // Fit map to route with padding
                this.map.fitBounds(this.routeLine.getBounds(), {
                    padding: [50, 50],
                    maxZoom: 16
                });

                // Calculate and display route info
                const distance = (route.distance / 1000).toFixed(1); // km
                const duration = Math.round(route.duration / 60); // minutes

                this.showNotification(`Route calculated: ${distance}km, ${duration} min`, 'success');

                console.log('✅ Route calculated:', {
                    distance: distance + 'km',
                    duration: duration + 'min',
                    steps: this.routeSteps.length
                });

            } else {
                throw new Error('No route found');
            }

        } catch (error) {
            console.error('❌ Route calculation failed:', error);

            // Fallback to straight line if routing fails
            this.showNotification('Using direct route (routing service unavailable)', 'warning');

            const routeCoords = [
                [this.currentLocation.lat, this.currentLocation.lng],
                [this.destination.lat, this.destination.lng]
            ];

            if (this.routeLine) {
                this.map.removeLayer(this.routeLine);
            }

            this.routeLine = L.polyline(routeCoords, {
                color: '#FFA500',
                weight: 5,
                opacity: 0.8,
                dashArray: '10, 10'
            }).addTo(this.map);

            this.map.fitBounds(this.routeLine.getBounds(), { padding: [20, 20] });
        }
    }
    
    showNavigationPanel() {
        const panel = document.getElementById('navPanel');
        panel.classList.add('active');
        
        // Update navigation instructions
        this.updateNavigationInstructions();
    }
    
    updateNavigationInstructions() {
        if (!this.routeSteps || this.routeSteps.length === 0) {
            // Fallback to generic instructions
            document.getElementById('navDirection').textContent = 'Follow the route';
            document.getElementById('navDistance').textContent = '0.1 mi';
            return;
        }

        // Get current step
        const currentStep = this.routeSteps[this.currentStepIndex];
        if (!currentStep) return;

        // Convert maneuver to readable instruction with accurate road names
        const instruction = this.getInstructionText(currentStep.maneuver, currentStep);
        const distance = this.formatDistance(currentStep.distance);

        document.getElementById('navDirection').textContent = instruction;
        document.getElementById('navDistance').textContent = distance;

        // Move to next step if we're close to current step
        if (currentStep.distance < 50 && this.currentStepIndex < this.routeSteps.length - 1) {
            this.currentStepIndex++;
            this.speakInstruction(instruction);
        }
    }

    getInstructionText(maneuver, step) {
        const type = maneuver.type;
        const modifier = maneuver.modifier;
        const roadName = step.name || maneuver.name || '';
        const destination = step.destinations || '';
        const ref = step.ref || '';

        // Get lane information if available
        const laneInfo = this.getLaneGuidance(step);

        // Build instruction with accurate road names
        let instruction = '';

        switch (type) {
            case 'depart':
                if (roadName) {
                    instruction = `Head ${this.getDirection(maneuver.bearing_after)} on ${roadName}`;
                } else {
                    instruction = `Head ${this.getDirection(maneuver.bearing_after)}`;
                }
                break;

            case 'turn':
                if (roadName) {
                    instruction = `Turn ${modifier} onto ${roadName}`;
                } else {
                    instruction = `Turn ${modifier}`;
                }
                break;

            case 'new name':
                if (roadName) {
                    instruction = `Continue on ${roadName}`;
                } else {
                    instruction = 'Continue straight';
                }
                break;

            case 'merge':
                if (roadName) {
                    instruction = `Merge ${modifier} onto ${roadName}`;
                } else {
                    instruction = `Merge ${modifier}`;
                }
                break;

            case 'on ramp':
                if (destination) {
                    instruction = `Take the ramp toward ${destination}`;
                } else if (roadName) {
                    instruction = `Take the ramp to ${roadName}`;
                } else {
                    instruction = 'Take the on-ramp';
                }
                break;

            case 'off ramp':
                if (roadName) {
                    instruction = `Take the ${roadName} exit`;
                } else {
                    instruction = 'Take the off-ramp';
                }
                break;

            case 'fork':
                if (roadName) {
                    instruction = `Keep ${modifier} toward ${roadName}`;
                } else {
                    instruction = `Keep ${modifier} at the fork`;
                }
                break;

            case 'roundabout':
                const exit = maneuver.exit || 1;
                if (roadName) {
                    instruction = `Take the ${this.getOrdinal(exit)} exit onto ${roadName}`;
                } else {
                    instruction = `Take the ${this.getOrdinal(exit)} exit`;
                }
                break;

            case 'arrive':
                instruction = 'You have arrived at your destination';
                break;

            default:
                if (roadName) {
                    instruction = `Continue ${modifier || 'straight'} on ${roadName}`;
                } else {
                    instruction = `Continue ${modifier || 'straight'}`;
                }
        }

        // Add lane guidance if available
        if (laneInfo) {
            instruction += ` ${laneInfo}`;
        }

        // Add reference number if available (like highway numbers)
        if (ref && !instruction.includes(ref)) {
            instruction = instruction.replace(roadName, `${roadName} (${ref})`);
        }

        return instruction;
    }

    getLaneGuidance(step) {
        // Check for lane information in the step
        if (step.intersections && step.intersections.length > 0) {
            const intersection = step.intersections[0];
            if (intersection.lanes && intersection.lanes.length > 0) {
                // Show visual lane guidance
                this.showLaneGuidance(intersection.lanes);

                const validLanes = intersection.lanes
                    .map((lane, index) => ({ ...lane, index }))
                    .filter(lane => lane.valid);

                if (validLanes.length > 0) {
                    const laneNumbers = validLanes.map(lane => lane.index + 1);
                    if (laneNumbers.length === 1) {
                        return `(Use lane ${laneNumbers[0]})`;
                    } else if (laneNumbers.length <= 3) {
                        return `(Use lanes ${laneNumbers.join(' or ')})`;
                    } else {
                        return `(Use ${validLanes.length} lanes)`;
                    }
                }
            } else {
                // Hide lane guidance if no lanes
                this.hideLaneGuidance();
            }
        } else {
            this.hideLaneGuidance();
        }
        return '';
    }

    showLaneGuidance(lanes) {
        const laneContainer = document.getElementById('navLanes');
        if (!laneContainer) return;

        laneContainer.style.display = 'flex';
        laneContainer.innerHTML = '';

        lanes.forEach((lane, index) => {
            const laneDiv = document.createElement('div');
            laneDiv.className = 'lane';

            if (lane.valid) {
                laneDiv.classList.add('valid');
            }

            // Add lane direction indicators
            if (lane.indications && lane.indications.length > 0) {
                const indication = lane.indications[0];
                switch (indication) {
                    case 'left':
                        laneDiv.textContent = '←';
                        break;
                    case 'right':
                        laneDiv.textContent = '→';
                        break;
                    case 'straight':
                        laneDiv.textContent = '↑';
                        break;
                    case 'slight_left':
                        laneDiv.textContent = '↖';
                        break;
                    case 'slight_right':
                        laneDiv.textContent = '↗';
                        break;
                    default:
                        laneDiv.textContent = '↑';
                }
            } else {
                laneDiv.textContent = '↑';
            }

            laneContainer.appendChild(laneDiv);
        });
    }

    hideLaneGuidance() {
        const laneContainer = document.getElementById('navLanes');
        if (laneContainer) {
            laneContainer.style.display = 'none';
        }
    }

    getOrdinal(num) {
        const ordinals = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
        return ordinals[num] || `${num}th`;
    }

    getDirection(bearing) {
        if (bearing >= 337.5 || bearing < 22.5) return 'north';
        if (bearing >= 22.5 && bearing < 67.5) return 'northeast';
        if (bearing >= 67.5 && bearing < 112.5) return 'east';
        if (bearing >= 112.5 && bearing < 157.5) return 'southeast';
        if (bearing >= 157.5 && bearing < 202.5) return 'south';
        if (bearing >= 202.5 && bearing < 247.5) return 'southwest';
        if (bearing >= 247.5 && bearing < 292.5) return 'west';
        if (bearing >= 292.5 && bearing < 337.5) return 'northwest';
        return 'straight';
    }

    formatDistance(meters) {
        if (meters < 1000) {
            return `${Math.round(meters)} m`;
        } else {
            return `${(meters / 1000).toFixed(1)} km`;
        }
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

        console.log('🎯 Starting location tracking...');

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const newLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                // Calculate heading if we have a previous location
                let heading = 0;
                if (this.currentLocation) {
                    heading = this.calculateBearing(
                        this.currentLocation.lat, this.currentLocation.lng,
                        newLocation.lat, newLocation.lng
                    );
                }

                this.currentLocation = newLocation;

                // Update car position with heading
                this.updateCarPosition(newLocation.lat, newLocation.lng, heading);

                // Update navigation instructions and progress
                if (this.isNavigating) {
                    this.updateNavigationInstructions();
                    this.updateNavigationProgress();

                    // Center map on car if in navigation mode
                    if (this.map) {
                        this.map.setView([newLocation.lat, newLocation.lng], this.map.getZoom());
                    }
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

    calculateBearing(lat1, lng1, lat2, lng2) {
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const lat1Rad = lat1 * Math.PI / 180;
        const lat2Rad = lat2 * Math.PI / 180;

        const y = Math.sin(dLng) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

        const bearing = Math.atan2(y, x) * 180 / Math.PI;
        return (bearing + 360) % 360;
    }

    updateNavigationProgress() {
        if (!this.routeData || !this.currentLocation) return;

        // Calculate progress based on current position
        const totalDistance = this.routeData.distance;
        const remainingDistance = this.calculateRemainingDistance();
        const progress = Math.max(0, Math.min(100, ((totalDistance - remainingDistance) / totalDistance) * 100));

        // Update progress bar
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }

        // Update ETA and remaining distance
        const eta = this.calculateETA(remainingDistance);
        const etaElement = document.getElementById('navETA');
        const remainingElement = document.getElementById('navRemaining');

        if (etaElement) {
            etaElement.textContent = `ETA: ${eta}`;
        }

        if (remainingElement) {
            remainingElement.textContent = `${this.formatDistance(remainingDistance)} remaining`;
        }
    }

    calculateRemainingDistance() {
        // Simplified calculation - in a real app, this would be more sophisticated
        if (!this.destination || !this.currentLocation) return 0;

        const R = 6371000; // Earth's radius in meters
        const lat1 = this.currentLocation.lat * Math.PI / 180;
        const lat2 = this.destination.lat * Math.PI / 180;
        const deltaLat = (this.destination.lat - this.currentLocation.lat) * Math.PI / 180;
        const deltaLng = (this.destination.lng - this.currentLocation.lng) * Math.PI / 180;

        const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }

    calculateETA(remainingDistance) {
        // Assume average speed of 50 km/h for ETA calculation
        const averageSpeed = 50 * 1000 / 3600; // m/s
        const remainingTime = remainingDistance / averageSpeed;
        const eta = new Date(Date.now() + remainingTime * 1000);

        return eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    async findNearby(type) {
        const types = {
            gas: { name: 'Gas Stations', icon: '⛽', query: 'fuel' },
            food: { name: 'Restaurants', icon: '🍽️', query: 'restaurant' },
            parking: { name: 'Parking', icon: '🅿️', query: 'parking' },
            hospital: { name: 'Hospitals', icon: '🏥', query: 'hospital' }
        };

        const selected = types[type];
        if (!selected || !this.currentLocation) {
            this.showNotification('Location not available for POI search', 'error');
            return;
        }

        this.showNotification(`🔍 Searching for nearby ${selected.name}...`, 'info');

        try {
            // Use Overpass API to find real POI locations
            const query = `
                [out:json][timeout:25];
                (
                  node["amenity"="${selected.query}"](around:2000,${this.currentLocation.lat},${this.currentLocation.lng});
                  way["amenity"="${selected.query}"](around:2000,${this.currentLocation.lat},${this.currentLocation.lng});
                  relation["amenity"="${selected.query}"](around:2000,${this.currentLocation.lat},${this.currentLocation.lng});
                );
                out center meta;
            `;

            const response = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: query
            });

            if (!response.ok) {
                throw new Error('POI search service unavailable');
            }

            const data = await response.json();
            const pois = data.elements.slice(0, 10); // Limit to 10 results

            if (pois.length === 0) {
                this.showNotification(`No ${selected.name.toLowerCase()} found nearby`, 'warning');
                return;
            }

            // Clear existing POI markers
            if (this.poiMarkers) {
                this.poiMarkers.forEach(marker => this.map.removeLayer(marker));
            }
            this.poiMarkers = [];

            // Add POI markers to map
            pois.forEach((poi, index) => {
                const lat = poi.lat || (poi.center && poi.center.lat);
                const lng = poi.lon || (poi.center && poi.center.lon);

                if (lat && lng) {
                    const name = poi.tags.name || `${selected.name.slice(0, -1)} ${index + 1}`;
                    const address = poi.tags['addr:street'] ?
                        `${poi.tags['addr:housenumber'] || ''} ${poi.tags['addr:street']}`.trim() :
                        'Address not available';

                    const marker = L.marker([lat, lng])
                        .addTo(this.map)
                        .bindPopup(`
                            <div style="text-align: center;">
                                <div style="font-size: 18px; margin-bottom: 5px;">${selected.icon}</div>
                                <div style="font-weight: bold; margin-bottom: 3px;">${name}</div>
                                <div style="font-size: 12px; color: #666;">${address}</div>
                                <button onclick="app.navigateToLocation(${lat}, ${lng}, '${name}')"
                                        style="margin-top: 8px; background: #00FF88; color: #000; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                                    Navigate Here
                                </button>
                            </div>
                        `);

                    this.poiMarkers.push(marker);
                }
            });

            this.showNotification(`✅ Found ${pois.length} ${selected.name.toLowerCase()} nearby!`, 'success');

        } catch (error) {
            console.error('POI search error:', error);
            this.showNotification(`❌ Failed to search for ${selected.name.toLowerCase()}`, 'error');

            // Fallback to simulated POI locations
            this.simulatePOILocations(selected);
        }
    }

    simulatePOILocations(selected) {
        // Fallback simulation with more realistic placement
        if (this.map && this.currentLocation) {
            for (let i = 0; i < 3; i++) {
                const lat = this.currentLocation.lat + (Math.random() - 0.5) * 0.01;
                const lng = this.currentLocation.lng + (Math.random() - 0.5) * 0.01;

                L.marker([lat, lng])
                    .addTo(this.map)
                    .bindPopup(`
                        <div style="text-align: center;">
                            <div style="font-size: 18px; margin-bottom: 5px;">${selected.icon}</div>
                            <div style="font-weight: bold;">${selected.name.slice(0, -1)} ${i + 1}</div>
                            <div style="font-size: 12px; color: #666;">Simulated location</div>
                        </div>
                    `);
            }
        }
    }

    navigateToLocation(lat, lng, name) {
        this.setDestination({ lat, lng });
        document.getElementById('toInput').value = name;
        this.showNotification(`🎯 Destination set: ${name}`, 'success');
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

    async geocodeLocation(query) {
        console.log('🔍 Geocoding:', query);

        try {
            // Use Nominatim (OpenStreetMap) geocoding service
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`
            );

            if (!response.ok) {
                throw new Error('Geocoding service unavailable');
            }

            const results = await response.json();

            if (results.length === 0) {
                throw new Error('Location not found');
            }

            const result = results[0];
            const location = {
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon),
                name: result.display_name,
                address: result.address
            };

            console.log('✅ Geocoded location:', location);
            return location;

        } catch (error) {
            console.error('❌ Geocoding error:', error);
            throw error;
        }
    }
    
    addCarMarker(lat, lng, heading = 0) {
        // Remove existing car marker
        if (this.carMarker) {
            this.map.removeLayer(this.carMarker);
        }

        // Create car icon
        const carIcon = L.divIcon({
            html: `
                <div style="
                    width: 30px;
                    height: 30px;
                    background: #00FF88;
                    border: 3px solid #000;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(${heading - 45}deg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                ">🚗</div>
            `,
            className: 'car-marker',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        // Add car marker
        this.carMarker = L.marker([lat, lng], { icon: carIcon })
            .addTo(this.map)
            .bindPopup('🚗 Your Vehicle');

        return this.carMarker;
    }

    updateCarPosition(lat, lng, heading = 0) {
        if (this.carMarker) {
            // Smooth animation to new position
            this.carMarker.setLatLng([lat, lng]);

            // Update car rotation based on heading
            const carElement = this.carMarker.getElement();
            if (carElement) {
                const carDiv = carElement.querySelector('div');
                if (carDiv) {
                    carDiv.style.transform = `rotate(${heading - 45}deg)`;
                }
            }
        } else {
            this.addCarMarker(lat, lng, heading);
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
            <h3 style="margin: 0 0 20px 0; color: #00FF88;">⚙️ Navigation Settings</h3>

            <h4 style="color: #00FF88; margin: 15px 0 10px 0; font-size: 14px;">🔊 Audio & Voice</h4>
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

            <h4 style="color: #00FF88; margin: 15px 0 10px 0; font-size: 14px;">🚗 Route Preferences</h4>
            <div style="margin-bottom: 15px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" style="transform: scale(1.2);">
                    <span>Avoid Tolls</span>
                </label>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" style="transform: scale(1.2);">
                    <span>Avoid Highways</span>
                </label>
            </div>

            <h4 style="color: #00FF88; margin: 15px 0 10px 0; font-size: 14px;">🚨 Safety Alerts</h4>
            <div style="margin-bottom: 15px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" checked style="transform: scale(1.2);" id="trafficLightCameras">
                    <span>🚦 Traffic Light Cameras</span>
                </label>
                <div style="margin-left: 30px; margin-top: 5px;">
                    <label style="font-size: 12px; color: #ccc;">
                        Alert Distance:
                        <select id="trafficLightDistance" style="margin-left: 5px; background: #333; color: #fff; border: 1px solid #555; padding: 2px;">
                            <option value="100">100m</option>
                            <option value="200" selected>200m</option>
                            <option value="300">300m</option>
                            <option value="500">500m</option>
                        </select>
                    </label>
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" checked style="transform: scale(1.2);" id="speedCameras">
                    <span>📷 Speed Cameras</span>
                </label>
                <div style="margin-left: 30px; margin-top: 5px;">
                    <label style="font-size: 12px; color: #ccc;">
                        Alert Distance:
                        <select id="speedCameraDistance" style="margin-left: 5px; background: #333; color: #fff; border: 1px solid #555; padding: 2px;">
                            <option value="200">200m</option>
                            <option value="300" selected>300m</option>
                            <option value="500">500m</option>
                            <option value="1000">1km</option>
                        </select>
                    </label>
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" checked style="transform: scale(1.2);" id="policeAlerts">
                    <span>🚔 Police Alerts</span>
                </label>
                <div style="margin-left: 30px; margin-top: 5px;">
                    <label style="font-size: 12px; color: #ccc;">
                        Alert Distance:
                        <select id="policeDistance" style="margin-left: 5px; background: #333; color: #fff; border: 1px solid #555; padding: 2px;">
                            <option value="500" selected>500m</option>
                            <option value="1000">1km</option>
                            <option value="2000">2km</option>
                        </select>
                    </label>
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" checked style="transform: scale(1.2);" id="roadHazards">
                    <span>🚧 Road Hazards</span>
                </label>
                <div style="margin-left: 30px; margin-top: 5px;">
                    <label style="font-size: 12px; color: #ccc;">
                        Alert Distance:
                        <select id="hazardDistance" style="margin-left: 5px; background: #333; color: #fff; border: 1px solid #555; padding: 2px;">
                            <option value="100">100m</option>
                            <option value="200" selected>200m</option>
                            <option value="500">500m</option>
                        </select>
                    </label>
                </div>
            </div>

            <h4 style="color: #00FF88; margin: 15px 0 10px 0; font-size: 14px;">📱 Display</h4>
            <div style="margin-bottom: 15px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" style="transform: scale(1.2);">
                    <span>🌙 Night Mode</span>
                </label>
            </div>
            <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" checked style="transform: scale(1.2);">
                    <span>📍 Show POI Icons</span>
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

function toggleNavigationView() {
    if (app && app.map && app.isNavigating) {
        // Toggle between following car and overview
        if (app.followingCar !== false) {
            // Switch to overview mode
            app.followingCar = false;
            if (app.routeLine) {
                app.map.fitBounds(app.routeLine.getBounds(), { padding: [50, 50] });
            }
            app.showNotification('Overview mode', 'info');
        } else {
            // Switch to follow car mode
            app.followingCar = true;
            if (app.currentLocation) {
                app.map.setView([app.currentLocation.lat, app.currentLocation.lng], 17);
            }
            app.showNotification('Following car', 'info');
        }
    }
}

function swapLocations() {
    const fromInput = document.getElementById('fromInput');
    const toInput = document.getElementById('toInput');

    if (!fromInput || !toInput) return;

    // Get current values
    const fromValue = fromInput.value;
    const toValue = toInput.value;

    // Swap the values
    fromInput.value = toValue;
    toInput.value = fromValue;

    // Swap the actual locations in the app
    if (app && app.currentLocation && app.destination) {
        const tempLocation = { ...app.currentLocation };
        app.currentLocation = { ...app.destination };
        app.destination = tempLocation;

        // Update markers on map
        if (app.map) {
            // Update car marker position
            app.updateCarPosition(app.currentLocation.lat, app.currentLocation.lng);

            // Update destination marker
            if (app.destinationMarker) {
                app.map.removeLayer(app.destinationMarker);
            }
            app.destinationMarker = L.marker([app.destination.lat, app.destination.lng])
                .addTo(app.map)
                .bindPopup('🎯 Destination');
        }

        app.showNotification('🔄 Locations swapped!', 'success');
    } else {
        app.showNotification('ℹ️ Input fields swapped', 'info');
    }
}

function handleFromSearchKeypress(event) {
    if (event.key === 'Enter') {
        const value = event.target.value.trim();
        if (value && app && app.geocodeLocation) {
            searchFromLocation(value);
        } else if (value) {
            console.error('❌ App not ready yet');
        }
    }
}

function handleToSearchKeypress(event) {
    if (event.key === 'Enter') {
        const value = event.target.value.trim();
        if (value && app && app.geocodeLocation) {
            searchToLocation(value);
        } else if (value) {
            console.error('❌ App not ready yet');
        }
    }
}

async function searchFromLocation(query) {
    if (!app || !app.geocodeLocation) return;

    try {
        app.showNotification(`🔍 Searching for "${query}"...`, 'info');

        const location = await app.geocodeLocation(query);

        // Update current location
        app.currentLocation = { lat: location.lat, lng: location.lng };

        // Update map view and marker
        if (app.map) {
            app.map.setView([location.lat, location.lng], 15);

            // Remove existing current location marker
            if (app.currentLocationMarker) {
                app.map.removeLayer(app.currentLocationMarker);
            }

            // Add new current location marker
            app.currentLocationMarker = L.marker([location.lat, location.lng])
                .addTo(app.map)
                .bindPopup(`📍 From: ${location.name.split(',')[0]}`)
                .openPopup();
        }

        // Update input
        document.getElementById('fromInput').value = location.name.split(',')[0];

        app.showNotification(`✅ From location set: ${location.name.split(',')[0]}`, 'success');

    } catch (error) {
        app.showNotification(`❌ Location not found: ${query}`, 'error');
        console.error('From location search error:', error);
    }
}

async function searchToLocation(query) {
    if (!app || !app.geocodeLocation) return;

    try {
        app.showNotification(`🔍 Searching for "${query}"...`, 'info');

        const location = await app.geocodeLocation(query);

        // Set as destination
        app.setDestination({ lat: location.lat, lng: location.lng });

        // Update input with cleaner name
        document.getElementById('toInput').value = location.name.split(',')[0];

        app.showNotification(`✅ Destination set: ${location.name.split(',')[0]}`, 'success');

    } catch (error) {
        app.showNotification(`❌ Location not found: ${query}`, 'error');
        console.error('To location search error:', error);
    }
}

// Legacy function for backward compatibility
function handleSearchKeypress(event) {
    handleToSearchKeypress(event);
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
