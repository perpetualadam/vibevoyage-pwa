/**
 * VibeVoyage PWA - Smart Navigation Application
 * TypeScript-inspired JavaScript implementation for better type safety and reduced issues
 */
class VibeVoyageApp {
    constructor() {
        console.log('🌟 VibeVoyage PWA Initializing...');

        // Core properties with JSDoc typing for better IDE support
        /** @type {any} */
        this.map = null;
        /** @type {{lat: number, lng: number} | null} */
        this.currentLocation = null;
        /** @type {{lat: number, lng: number} | null} */
        this.destination = null;
        /** @type {boolean} */
        this.isNavigating = false;
        /** @type {string} */
        this.journeyState = 'idle'; // idle, route-selected, navigating, paused
        /** @type {number | null} */
        this.watchId = null;
        /** @type {any} */
        this.route = null;
        /** @type {{lat: number, lng: number} | null} */
        this.lastKnownNavigationPosition = null;
        /** @type {number | null} */
        this.journeyStartTime = null;
        /** @type {number | null} */
        this.pausedTime = null;
        /** @type {any} */
        this.routeData = null;
        /** @type {any} */
        this.currentRoute = null;
        /** @type {Array} */
        this.routeSteps = [];
        /** @type {number} */
        this.currentStepIndex = 0;
        /** @type {any} */
        this.carMarker = null;
        /** @type {any} */
        this.currentLocationMarker = null;
        /** @type {any} */
        this.destinationMarker = null;
        /** @type {any} */
        this.routeLine = null;

        // Map layers for better organization
        /** @type {any} */
        this.tileLayer = null;
        /** @type {any} */
        this.backupMap = null;
        /** @type {boolean} */
        this.isUsingBackupMap = false;
        /** @type {any} */
        this.markersLayer = null;
        /** @type {any} */
        this.routeLayer = null;
        /** @type {any} */
        this.hazardsLayer = null;
        /** @type {any} */
        this.vehicleLayer = null;
        /** @type {any} */
        this.vehicleMarker = null;
        /** @type {any} */
        this.currentRouteLine = null;

        // Navigation properties
        /** @type {any} */
        this.routeProgress = null;
        /** @type {number | null} */
        this.offRouteTimeout = null;
        /** @type {boolean} */
        this.followMode = true;
        /** @type {string} */
        this.currentMapType = 'street';
        this.routeOutline = null;
        this.followingCar = true;
        this.poiMarkers = [];
        this.availableRoutes = [];
        this.selectedRouteIndex = 0;
        this.routeLines = [];
        this.hazardMarkers = [];

        // Follow mode properties
        this.followMode = true;
        this.autoZoomEnabled = true;
        this.lastKnownPosition = null;
        this.mapBounds = null;
        this.followModeZoomLevel = 17;
        this.overviewZoomLevel = 13;
        this.panThreshold = 0.3; // 30% of screen before re-centering
        this.adaptiveZoomEnabled = true;
        this.currentSpeed = 0;
        this.offScreenIndicatorVisible = false;
        this.batteryOptimizedMode = false;
        this.lastUpdateTime = 0;
        this.updateThrottleMs = 1000; // Default 1 second

        // Unit measurement system
        this.units = {
            system: 'metric',   // metric, imperial, nautical (overall system)
            distance: 'km',     // km, miles, nautical (specific distance unit)
            speed: 'kmh',       // kmh, mph, ms, knots
            temperature: 'celsius', // celsius, fahrenheit, kelvin
            fuel: 'liters',     // liters, gallons_us, gallons_uk
            pressure: 'bar'     // bar, psi, kpa
        };

        // Currency and location system
        this.userCountry = null;
        this.userCurrency = 'USD';
        this.fuelPrices = {
            'US': { currency: 'USD', symbol: '$', price: 3.45 }, // per gallon
            'GB': { currency: 'GBP', symbol: '£', price: 1.48 }, // per liter
            'CA': { currency: 'CAD', symbol: 'C$', price: 1.65 }, // per liter
            'AU': { currency: 'AUD', symbol: 'A$', price: 1.85 }, // per liter
            'DE': { currency: 'EUR', symbol: '€', price: 1.75 }, // per liter
            'FR': { currency: 'EUR', symbol: '€', price: 1.82 }, // per liter
            'JP': { currency: 'JPY', symbol: '¥', price: 165 }, // per liter
            'DEFAULT': { currency: 'USD', symbol: '$', price: 1.50 } // per liter
        };
        
        this.init();
    }

    /**
     * Load Leaflet library dynamically if not available
     */
    loadLeafletLibrary() {
        console.log('📦 Loading Leaflet library...');

        // Load Leaflet CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        cssLink.crossOrigin = '';
        document.head.appendChild(cssLink);

        // Load Leaflet JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';

        script.onload = () => {
            console.log('✅ Leaflet loaded successfully');
            setTimeout(async () => {
                await this.initMap();
            }, 100);
        };

        script.onerror = () => {
            console.error('❌ Failed to load Leaflet');
            this.showMapPlaceholder();
        };

        document.head.appendChild(script);
    }



    async init() {
        console.log('🌟 VibeVoyage PWA Starting...');

        // Initialize JavaScript services
        this.initJavaScriptServices();

        // Initialize map with proper sequencing
        await this.initMapWithSequencing();

        // Load saved units
        this.loadUnitsFromStorage();

        // Detect user country for currency
        await this.detectUserCountry();

        // Get user location
        await this.getCurrentLocation();

        // Setup event listeners
        this.setupEventListeners();

        // Check online status
        this.updateConnectionStatus();
        
        // Initialize service worker
        this.initServiceWorker();

        // Initialize map type
        this.currentMapType = 'street';
        this.followMode = true;
        this.satelliteProviders = [
            {
                name: 'Esri World Imagery',
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                attribution: '© Esri, Maxar, Earthstar Geographics',
                maxZoom: 20
            },
            {
                name: 'Google Satellite',
                url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
                attribution: '© Google',
                maxZoom: 22
            }
        ];
        this.currentSatelliteProvider = 0;

        // Initialize hazard avoidance settings
        this.hazardAvoidanceSettings = {
            speedCameras: true,
            redLightCameras: true,
            railwayCrossings: true,
            trafficLights: false,
            schoolZones: true,
            hospitalZones: true,
            tollBooths: false,
            bridges: false,
            accidents: true,
            weather: false,
            steepGrades: false,
            narrowRoads: false,
            policeReports: true,
            roadwork: true
        };

        // Initialize speed tracking
        this.currentSpeed = 0;
        this.speedLimit = 30; // Default speed limit
        this.lastSpeedAlert = 0;
        this.speedingChimeAudio = null;
        this.speedLimitMarkers = [];
        this.lastSpeedLimitCheck = 0;

        // Load saved units from storage
        this.loadUnitsFromStorage();
        this.initializeUnitSelectors();

        console.log('✅ VibeVoyage PWA Ready! v2025.16 - Pure JavaScript Implementation');
        console.log('📏 Current units structure:', this.units);
        this.showNotification('Welcome to VibeVoyage! 🚗', 'success');

        // Force map initialization after a delay
        setTimeout(async () => {
            if (!this.map && !this.isUsingBackupMap) {
                console.log('🔄 Map not initialized, retrying...');
                await this.initMap();
            }
        }, 1000);
    }

    handleWakeWordDetected(data) {
        try {
            // Pause wake word detection during hazard reporting
            if (this.wakeWordService) {
                this.wakeWordService.pause();
            }

            // Start hazard reporting flow
            if (this.voiceHazardReportService) {
                this.voiceHazardReportService.startHazardReporting();
            }

            // Show visual feedback
            this.showWakeWordDetectedFeedback();

        } catch (error) {
            console.error('❌ Error handling wake word detection:', error);
        }
    }

    handleVoiceHazardReported(data) {
        try {
            // Add hazard to detection service
            if (this.hazardDetectionService) {
                this.hazardDetectionService.addUserReportedHazard(data.feature);
            }

            // Add hazard marker to map
            this.addUserHazardMarker(data.feature);

            // Resume wake word detection
            if (this.wakeWordService) {
                setTimeout(() => {
                    this.wakeWordService.resume();
                }, 2000); // 2 second delay before resuming
            }

            // Show success notification
            this.showNotification(`${data.feature.properties.name} reported successfully!`, 'success');

        } catch (error) {
            console.error('❌ Error handling voice hazard report:', error);
        }
    }

    addUserHazardMarker(hazardFeature) {
        try {
            if (!this.map) return;

            const coords = hazardFeature.geometry.coordinates;
            const props = hazardFeature.properties;

            // Create custom icon for user-reported hazards
            const userHazardIcon = L.divIcon({
                html: `<div class="user-hazard-marker">
                    <div class="hazard-icon">${props.icon}</div>
                    <div class="user-badge">👤</div>
                </div>`,
                className: 'user-hazard-marker-container',
                iconSize: [40, 40],
                iconAnchor: [20, 40]
            });

            // Create marker
            const marker = L.marker([coords[1], coords[0]], { icon: userHazardIcon })
                .bindPopup(`
                    <div class="hazard-popup user-reported">
                        <h4>${props.icon} ${props.name}</h4>
                        <p><strong>Type:</strong> ${props.type}</p>
                        <p><strong>Severity:</strong> ${props.severity}</p>
                        <p><strong>Reported:</strong> ${new Date(props.timestamp).toLocaleString()}</p>
                        <p><small>👤 User reported via voice</small></p>
                    </div>
                `);

            // Add to map
            if (this.hazardsLayer) {
                this.hazardsLayer.addLayer(marker);
            } else {
                marker.addTo(this.map);
            }

            console.log('✅ Added user hazard marker to map:', props.id);

        } catch (error) {
            console.error('❌ Error adding user hazard marker:', error);
        }
    }

    showWakeWordDetectedFeedback() {
        try {
            // Create visual feedback element
            const feedback = document.createElement('div');
            feedback.className = 'wake-word-feedback';
            feedback.innerHTML = `
                <div class="wake-word-animation">
                    <div class="mic-icon">🎙️</div>
                    <div class="wake-word-text">Wake word detected!</div>
                </div>
            `;

            document.body.appendChild(feedback);

            // Remove after animation
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 3000);

        } catch (error) {
            console.error('❌ Error showing wake word feedback:', error);
        }
    }

    showVoiceReportingUI(show) {
        try {
            let reportingUI = document.getElementById('voice-reporting-ui');

            if (show) {
                if (!reportingUI) {
                    reportingUI = document.createElement('div');
                    reportingUI.id = 'voice-reporting-ui';
                    reportingUI.className = 'voice-reporting-overlay';
                    reportingUI.innerHTML = `
                        <div class="voice-reporting-content">
                            <div class="mic-animation">
                                <div class="mic-icon pulsing">🎙️</div>
                            </div>
                            <div class="reporting-text">Listening for hazard report...</div>
                            <button class="cancel-reporting-btn" onclick="window.app.cancelVoiceReporting()">
                                Cancel
                            </button>
                        </div>
                    `;
                    document.body.appendChild(reportingUI);
                }
                reportingUI.style.display = 'flex';
            } else {
                if (reportingUI) {
                    reportingUI.style.display = 'none';
                }
            }

        } catch (error) {
            console.error('❌ Error showing voice reporting UI:', error);
        }
    }

    cancelVoiceReporting() {
        try {
            if (this.voiceHazardReportService && this.voiceHazardReportService.isReportingActive()) {
                this.voiceHazardReportService.resetReportingState();
            }

            this.showVoiceReportingUI(false);

            if (this.wakeWordService) {
                this.wakeWordService.resume();
            }

        } catch (error) {
            console.error('❌ Error cancelling voice reporting:', error);
        }
    }

    initJavaScriptServices() {
        try {
            console.log('🔧 Initializing JavaScript services...');

            // Initialize Hazard Detection Service
            if (typeof HazardDetectionService !== 'undefined') {
                this.hazardDetectionService = new HazardDetectionService();
                console.log('✅ HazardDetectionService initialized');
            } else {
                console.warn('⚠️ HazardDetectionService not available');
            }

            // Initialize Geocoding Service
            if (typeof GeocodingService !== 'undefined') {
                this.geocodingService = new GeocodingService();
                console.log('✅ GeocodingService initialized');
            } else {
                console.warn('⚠️ GeocodingService not available');
            }

            // Initialize Voice Navigation Service
            if (typeof VoiceNavigationService !== 'undefined') {
                this.voiceNavigationService = new VoiceNavigationService();
                console.log('✅ VoiceNavigationService initialized');
            } else {
                console.warn('⚠️ VoiceNavigationService not available');
            }

            // Initialize Wake Word Service
            if (typeof WakeWordService !== 'undefined') {
                this.wakeWordService = new WakeWordService();
                console.log('✅ WakeWordService initialized');
            } else {
                console.warn('⚠️ WakeWordService not available');
            }

            // Initialize Voice Hazard Report Service
            if (typeof VoiceHazardReportService !== 'undefined') {
                this.voiceHazardReportService = new VoiceHazardReportService();
                this.voiceHazardReportService.setVoiceService(this.voiceNavigationService);
                console.log('✅ VoiceHazardReportService initialized');
            } else {
                console.warn('⚠️ VoiceHazardReportService not available');
            }

            // Setup voice hazard reporting integration
            this.setupVoiceHazardReporting();

            console.log('✅ JavaScript services initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing JavaScript services:', error);
        }
    }

    setupVoiceHazardReporting() {
        try {
            // Setup wake word service listeners
            if (this.wakeWordService) {
                this.wakeWordService.addListener((event, data) => {
                    switch (event) {
                        case 'wakeWordDetected':
                            console.log('🎙️ Wake word detected:', data.wakeWord);
                            this.handleWakeWordDetected(data);
                            break;
                        case 'notSupported':
                            console.warn('⚠️ Wake word detection not supported');
                            this.showNotification('Voice activation not supported in this browser', 'warning');
                            break;
                        case 'safariWarning':
                            console.warn('⚠️ Safari wake word warning');
                            this.showNotification('Voice activation may not work reliably in Safari', 'warning');
                            break;
                    }
                });
            }

            // Setup voice hazard report service listeners
            if (this.voiceHazardReportService) {
                this.voiceHazardReportService.addListener((event, data) => {
                    switch (event) {
                        case 'hazardReported':
                            console.log('🚨 Hazard reported via voice:', data.feature.properties.type);
                            this.handleVoiceHazardReported(data);
                            break;
                        case 'reportingStarted':
                            console.log('🎙️ Voice hazard reporting started');
                            this.showVoiceReportingUI(true);
                            break;
                        case 'reportingEnded':
                            console.log('🎙️ Voice hazard reporting ended');
                            this.showVoiceReportingUI(false);
                            break;
                        case 'reportingError':
                            console.error('❌ Voice hazard reporting error:', data.error);
                            this.showNotification(`Voice reporting error: ${data.error}`, 'error');
                            break;
                    }
                });

                // Set current location for hazard reporting
                if (this.currentLocation) {
                    this.voiceHazardReportService.setCurrentLocation(this.currentLocation);
                }
            }

            console.log('✅ Voice hazard reporting integration setup complete');
        } catch (error) {
            console.error('❌ Error setting up voice hazard reporting:', error);
        }
    }

    // Utility function for fetch with timeout
    fetchWithTimeout(url, timeout = 10000) {
        return Promise.race([
            fetch(url),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout)
            )
        ]);
    }

    async initMapWithSequencing() {
        console.log('🗺️ Starting map initialization with proper sequencing...');

        // Step 1: Wait for DOM to be ready
        await this.waitForDOM();

        // Step 2: Initialize map
        await this.initMap();

        // Step 3: Wait for map to be fully ready
        await this.waitForMapReady();

        // Step 4: Initialize map-dependent features
        await this.initMapDependentFeatures();

        console.log('✅ Map initialization sequence completed');
    }

    async waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve, { once: true });
            }
        });
    }

    async waitForMapReady() {
        return new Promise((resolve) => {
            if (this.map && this.map._loaded) {
                resolve();
            } else if (this.map) {
                this.map.whenReady(() => {
                    console.log('🗺️ Map is ready for operations');
                    resolve();
                });
            } else {
                // Fallback: wait a bit and check again
                setTimeout(() => {
                    if (this.map) {
                        this.map.whenReady(resolve);
                    } else {
                        console.warn('⚠️ Map still not initialized, proceeding anyway');
                        resolve();
                    }
                }, 1000);
            }
        });
    }

    async initMapDependentFeatures() {
        console.log('🔧 Initializing map-dependent features...');

        try {
            // Initialize layers only after map is ready
            if (this.map) {
                // Ensure layers are properly initialized
                if (!this.markersLayer) {
                    this.markersLayer = L.layerGroup().addTo(this.map);
                }
                if (!this.routeLayer) {
                    this.routeLayer = L.layerGroup().addTo(this.map);
                }
                if (!this.hazardsLayer) {
                    this.hazardsLayer = L.layerGroup().addTo(this.map);
                }
                if (!this.vehicleLayer) {
                    this.vehicleLayer = L.layerGroup().addTo(this.map);
                }

                console.log('✅ Map layers initialized');
            }

            // Initialize location services
            await this.initLocationServices();

        } catch (error) {
            console.error('❌ Error initializing map-dependent features:', error);
        }
    }

    async initLocationServices() {
        console.log('📍 Initializing location services...');

        try {
            // Get current location
            await this.getCurrentLocation();

            // Load hazards after location is available
            if (this.hazardDetectionService) {
                await this.hazardDetectionService.loadHazards();
                console.log('✅ Hazards loaded');
            }

        } catch (error) {
            console.warn('⚠️ Location services initialization failed:', error);
            // Continue with demo location
            this.setDemoLocation();
        }
    }

    // Safe method to add markers only when map is ready
    async safeAddToMap(layer) {
        if (!this.map) {
            console.warn('⚠️ Cannot add to map: map not initialized');
            return null;
        }

        try {
            return layer.addTo(this.map);
        } catch (error) {
            console.error('❌ Error adding layer to map:', error);
            return null;
        }
    }

    // Safe method to remove layers
    safeRemoveFromMap(layer) {
        if (this.map && layer) {
            try {
                this.map.removeLayer(layer);
            } catch (error) {
                console.warn('⚠️ Error removing layer from map:', error);
            }
        }
    }

    async initMap() {
        console.log('🗺️ Initializing map...');

        // Check if Leaflet is available
        if (typeof L === 'undefined') {
            console.error('❌ Leaflet library not loaded');
            console.log('🔍 Checking if Leaflet script is in DOM...');
            const leafletScript = document.querySelector('script[src*="leaflet"]');
            const leafletCSS = document.querySelector('link[href*="leaflet"]');
            console.log('📜 Leaflet script found:', !!leafletScript);
            console.log('🎨 Leaflet CSS found:', !!leafletCSS);

            // Try to load Leaflet if not available
            if (!leafletScript) {
                console.log('🔄 Attempting to load Leaflet...');
                try {
                    await this.loadLeafletLibrary();
                    // Try again after loading
                    if (typeof L !== 'undefined') {
                        return this.initLeafletMap();
                    }
                } catch (error) {
                    console.warn('Failed to load Leaflet, using backup map:', error);
                }
            }

            // Use backup map if Leaflet fails
            return this.initBackupMap();
        }

        // Try Leaflet first with timeout
        try {
            await Promise.race([
                this.initLeafletMap(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Leaflet timeout')), 5000)
                )
            ]);
            console.log('✅ Leaflet map initialized successfully');
        } catch (error) {
            console.warn('Leaflet failed, using backup map:', error);
            this.initBackupMap();
        }
    }

    async initLeafletMap() {
        // Check if map container exists
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error('❌ Map container not found');
            console.log('🔍 Available elements with "map" in ID:',
                Array.from(document.querySelectorAll('[id*="map"]')).map(el => el.id));
            throw new Error('Map container not found');
        }

        console.log('✅ Map container found:', mapContainer);
        console.log('📐 Map container dimensions:', {
            width: mapContainer.offsetWidth,
            height: mapContainer.offsetHeight,
            display: getComputedStyle(mapContainer).display
        });

        // Mobile-specific container fixes
        if (this.isMobileDevice()) {
            console.log('📱 Mobile device detected - applying mobile fixes');
            mapContainer.style.position = 'relative';
            mapContainer.style.width = '100%';
            mapContainer.style.height = '100%';
            mapContainer.style.minHeight = '300px';

            // Force container to be visible
            mapContainer.style.display = 'block';
            mapContainer.style.visibility = 'visible';
        }

        try {
            // Check if map is already initialized
            if (this.map && this.map._container) {
                console.log('🗺️ Map already initialized and has container, skipping...');
                return;
            }

            // Check if container has Leaflet classes (indicating previous initialization)
            if (mapContainer.classList.contains('leaflet-container')) {
                console.log('🔄 Cleaning up previous map instance...');

                // Try to remove existing map instance if it exists
                if (mapContainer._leaflet_id) {
                    try {
                        // Find and remove the existing map
                        const existingMap = mapContainer._leaflet_map || this.map;
                        if (existingMap && existingMap.remove) {
                            existingMap.remove();
                        }
                    } catch (e) {
                        console.warn('⚠️ Error removing existing map:', e);
                    }
                }

                // Clean up container
                mapContainer.className = 'interactive-map';
                mapContainer.innerHTML = '';
                mapContainer.removeAttribute('tabindex');
                mapContainer.style.cursor = '';
                delete mapContainer._leaflet_id;
                delete mapContainer._leaflet_map;
            }

            // Initialize Leaflet map with enhanced mobile options
        this.map = L.map('map', {
            center: [40.7128, -74.0060], // Default to NYC
            zoom: 13,
            zoomControl: false,
            attributionControl: false,
            // Mobile-specific options
            tap: true,
            tapTolerance: 15,
            touchZoom: true,
            doubleClickZoom: true,
            scrollWheelZoom: 'center',
            boxZoom: false,
            keyboard: true,
            dragging: true,
            maxZoom: 22,
            minZoom: 3,
            // Mobile performance options
            preferCanvas: false,
            renderer: L.svg(),
            // Touch interaction improvements
            bounceAtZoomLimits: false,
            worldCopyJump: false
        });

            // Add OpenStreetMap tiles
            this.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 20,
                crossOrigin: true
            }).addTo(this.map);

            // Initialize map layers for different elements
            this.markersLayer = L.layerGroup().addTo(this.map);
            this.routeLayer = L.layerGroup().addTo(this.map);
            this.hazardsLayer = L.layerGroup().addTo(this.map);
            this.vehicleLayer = L.layerGroup().addTo(this.map);

            // Add click handler for destination selection
            this.map.on('click', (e) => {
                console.log('🎯 Map clicked:', e.latlng);
                this.setDestination(e.latlng);
            });

            // Add map interaction handlers for follow mode
            this.setupMapInteractionHandlers();

            // Hide map placeholder
            const placeholder = document.getElementById('mapPlaceholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }

            // Force map to resize after initialization
            setTimeout(() => {
                if (this.map) {
                    this.map.invalidateSize();
                    console.log('🗺️ Map size invalidated and refreshed');
                }
            }, 100);

            // Additional resize after DOM is fully loaded
            setTimeout(() => {
                if (this.map) {
                    this.map.invalidateSize();
                    console.log('🗺️ Map final resize completed');

                    // Mobile-specific fixes
                    if (this.isMobileDevice()) {
                        this.fixMobileMapDisplay();
                    }
                }
            }, 500);

            console.log('✅ Map initialized successfully');
        } catch (error) {
            console.error('❌ Map initialization failed:', error);
            this.showMapPlaceholder();
        }
    }
    
    showMapPlaceholder() {
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.innerHTML = `
                <div class="map-placeholder">
                    <div class="icon">🗺️</div>
                    <div>Map Loading...</div>
                    <small>Initializing map components...</small>
                    <div style="margin-top: 15px;">
                        <button onclick="app.initMap()" class="btn btn-secondary" style="margin-right: 10px;">
                            🔄 Retry Map
                        </button>
                        <button onclick="app.loadLeafletLibrary()" class="btn btn-secondary">
                            📦 Load Leaflet
                        </button>
                    </div>
                    <div style="margin-top: 10px; font-size: 11px; color: #888;">
                        Leaflet: ${typeof L !== 'undefined' ? '✅ Loaded' : '❌ Missing'}
                    </div>
                </div>
            `;
        }
    }

    initBackupMap() {
        console.log('🗺️ Initializing backup map...');
        this.isUsingBackupMap = true;

        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error('❌ Map container not found for backup map');
            return;
        }

        // Clear container
        mapContainer.innerHTML = '';

        // Create canvas for backup map
        const canvas = document.createElement('canvas');
        canvas.id = 'backupMapCanvas';
        canvas.style.cssText = `
            width: 100%;
            height: 100%;
            cursor: grab;
            background: #f0f0f0;
        `;

        // Set canvas size
        const rect = mapContainer.getBoundingClientRect();
        canvas.width = rect.width || 800;
        canvas.height = rect.height || 400;

        mapContainer.appendChild(canvas);

        // Initialize backup map state
        this.backupMap = {
            canvas: canvas,
            ctx: canvas.getContext('2d'),
            center: { lat: 40.7128, lng: -74.0060 },
            zoom: 13,
            userLocation: null,
            destination: null,
            isDragging: false,
            lastMousePos: { x: 0, y: 0 }
        };

        // Setup event listeners
        this.setupBackupMapEvents();

        // Initial render
        this.renderBackupMap();

        // Hide placeholder
        const placeholder = document.getElementById('mapPlaceholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }

        // Show notification
        this.showNotification('Using fast backup map', 'info');
        console.log('✅ Backup map initialized');
    }

    setupBackupMapEvents() {
        const canvas = this.backupMap.canvas;

        // Mouse events
        canvas.addEventListener('mousedown', (e) => {
            this.backupMap.isDragging = true;
            this.backupMap.lastMousePos = { x: e.clientX, y: e.clientY };
            canvas.style.cursor = 'grabbing';
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!this.backupMap.isDragging) return;

            const deltaX = e.clientX - this.backupMap.lastMousePos.x;
            const deltaY = e.clientY - this.backupMap.lastMousePos.y;

            this.panBackupMap(deltaX, deltaY);
            this.backupMap.lastMousePos = { x: e.clientX, y: e.clientY };
        });

        canvas.addEventListener('mouseup', () => {
            this.backupMap.isDragging = false;
            canvas.style.cursor = 'grab';
        });

        canvas.addEventListener('mouseleave', () => {
            this.backupMap.isDragging = false;
            canvas.style.cursor = 'grab';
        });

        // Zoom with mouse wheel
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomDelta = e.deltaY > 0 ? -1 : 1;
            this.zoomBackupMap(zoomDelta);
        });

        // Touch events for mobile
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                this.backupMap.isDragging = true;
                this.backupMap.lastMousePos = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                };
            }
        });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.backupMap.isDragging || e.touches.length !== 1) return;

            const deltaX = e.touches[0].clientX - this.backupMap.lastMousePos.x;
            const deltaY = e.touches[0].clientY - this.backupMap.lastMousePos.y;

            this.panBackupMap(deltaX, deltaY);
            this.backupMap.lastMousePos = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        });

        canvas.addEventListener('touchend', () => {
            this.backupMap.isDragging = false;
        });

        // Click for destination
        canvas.addEventListener('click', (e) => {
            if (this.backupMap.isDragging) return;

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const coords = this.pixelToLatLng(x, y);
            this.setDestination(coords);
        });
    }

    panBackupMap(deltaX, deltaY) {
        const scale = Math.pow(2, this.backupMap.zoom);
        const lngDelta = (deltaX / (scale * 256)) * 360;
        const latDelta = -(deltaY / (scale * 256)) * 360;

        this.backupMap.center.lng += lngDelta;
        this.backupMap.center.lat += latDelta;

        // Clamp coordinates
        this.backupMap.center.lng = Math.max(-180, Math.min(180, this.backupMap.center.lng));
        this.backupMap.center.lat = Math.max(-85, Math.min(85, this.backupMap.center.lat));

        this.renderBackupMap();
    }

    zoomBackupMap(delta) {
        this.backupMap.zoom = Math.max(1, Math.min(18, this.backupMap.zoom + delta));
        this.renderBackupMap();
    }

    renderBackupMap() {
        const ctx = this.backupMap.ctx;
        const canvas = this.backupMap.canvas;

        // Clear canvas
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw grid pattern
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        const gridSize = 50;

        for (let x = 0; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }

        for (let y = 0; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Draw center crosshair
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 2;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        ctx.beginPath();
        ctx.moveTo(centerX - 10, centerY);
        ctx.lineTo(centerX + 10, centerY);
        ctx.moveTo(centerX, centerY - 10);
        ctx.lineTo(centerX, centerY + 10);
        ctx.stroke();

        // Draw user location
        if (this.backupMap.userLocation) {
            const pos = this.latLngToPixel(this.backupMap.userLocation.lat, this.backupMap.userLocation.lng);
            this.drawMarker(ctx, pos.x, pos.y, '#00FF88', '📍');
        }

        // Draw destination
        if (this.backupMap.destination) {
            const pos = this.latLngToPixel(this.backupMap.destination.lat, this.backupMap.destination.lng);
            this.drawMarker(ctx, pos.x, pos.y, '#FF6B6B', '🎯');
        }

        // Draw info
        ctx.fillStyle = '#333';
        ctx.font = '14px Arial';
        ctx.fillText(`Backup Map - Zoom: ${this.backupMap.zoom}`, 10, 25);
        ctx.fillText(`Center: ${this.backupMap.center.lat.toFixed(4)}, ${this.backupMap.center.lng.toFixed(4)}`, 10, 45);

        // Draw attribution
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(canvas.width - 200, canvas.height - 20, 200, 20);
        ctx.fillStyle = '#333';
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('© OpenStreetMap contributors', canvas.width - 5, canvas.height - 5);
        ctx.textAlign = 'left';
    }

    drawMarker(ctx, x, y, color, emoji) {
        // Draw marker background
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, 2 * Math.PI);
        ctx.fill();

        // Draw emoji
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, x, y);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    latLngToPixel(lat, lng) {
        const centerX = this.backupMap.canvas.width / 2;
        const centerY = this.backupMap.canvas.height / 2;

        const scale = Math.pow(2, this.backupMap.zoom);
        const worldSize = 256 * scale;

        const worldX = (lng + 180) / 360 * worldSize;
        const worldY = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * worldSize;

        const centerWorldX = (this.backupMap.center.lng + 180) / 360 * worldSize;
        const centerWorldY = (1 - Math.log(Math.tan(this.backupMap.center.lat * Math.PI / 180) + 1 / Math.cos(this.backupMap.center.lat * Math.PI / 180)) / Math.PI) / 2 * worldSize;

        return {
            x: worldX - centerWorldX + centerX,
            y: worldY - centerWorldY + centerY
        };
    }

    pixelToLatLng(x, y) {
        const centerX = this.backupMap.canvas.width / 2;
        const centerY = this.backupMap.canvas.height / 2;

        const scale = Math.pow(2, this.backupMap.zoom);
        const worldSize = 256 * scale;

        const centerWorldX = (this.backupMap.center.lng + 180) / 360 * worldSize;
        const centerWorldY = (1 - Math.log(Math.tan(this.backupMap.center.lat * Math.PI / 180) + 1 / Math.cos(this.backupMap.center.lat * Math.PI / 180)) / Math.PI) / 2 * worldSize;

        const worldX = x - centerX + centerWorldX;
        const worldY = y - centerY + centerWorldY;

        const lng = (worldX / worldSize) * 360 - 180;
        const n = Math.PI - 2 * Math.PI * worldY / worldSize;
        const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

        return { lat, lng };
    }

    async getCurrentLocation() {
        console.log('📍 Getting current location...');

        // Prevent multiple simultaneous location requests
        if (this.locationRequestInProgress) {
            console.log('📍 Location request already in progress, waiting...');
            return this.locationRequestPromise;
        }

        this.locationRequestInProgress = true;
        const statusElement = document.getElementById('locationStatus');

        if (!navigator.geolocation) {
            console.error('❌ Geolocation not supported');
            if (statusElement) {
                statusElement.textContent = 'Location not supported';
                statusElement.className = 'status-offline';
            }
            this.showNotification('Location services not available', 'error');
            this.locationRequestInProgress = false;
            throw new Error('Geolocation not supported');
        }

        if (statusElement) {
            statusElement.textContent = 'Getting location...';
            statusElement.className = 'status-warning';
        }

        // Store the promise to prevent race conditions
        this.locationRequestPromise = this.performLocationRequest(statusElement);

        try {
            const result = await this.locationRequestPromise;
            this.locationRequestInProgress = false;
            return result;
        } catch (error) {
            this.locationRequestInProgress = false;
            throw error;
        }
    }

    async performLocationRequest(statusElement) {

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

            console.log('📍 Location found:', this.currentLocation);

            // Update voice hazard reporting service with current location
            if (this.voiceHazardReportService) {
                this.voiceHazardReportService.setCurrentLocation(this.currentLocation);
            }

            // Wait for map to be ready before updating
            await this.waitForMapReady();

            // Update map view and add car marker
            if (this.isUsingBackupMap && this.backupMap) {
                this.backupMap.center = { lat: this.currentLocation.lat, lng: this.currentLocation.lng };
                this.backupMap.userLocation = this.currentLocation;
                this.backupMap.zoom = 15;
                this.renderBackupMap();
            } else if (this.map) {
                this.map.setView([this.currentLocation.lat, this.currentLocation.lng], 15);
                // Add car marker for current location
                this.addCarMarker(this.currentLocation.lat, this.currentLocation.lng);
            } else {
                console.warn('⚠️ Map not ready, location stored but not displayed');
            }
            
            // Update UI - only update placeholder, leave value empty so user can type over it
            const fromInput = document.getElementById('fromInput');
            if (fromInput && !fromInput.value.trim()) {
                // Only update placeholder if input is empty, don't set value
                fromInput.placeholder = 'From: Current Location (detected)';
            }
            if (statusElement) {
                statusElement.textContent = 'Location found';
                statusElement.className = 'status-online';
            }
            
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

            if (statusElement) {
                statusElement.textContent = errorMessage;
                statusElement.className = 'status-offline';
            }
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
            // Update placeholder only, don't set value so user can type over it
            const fromInput = document.getElementById('fromInput');
            if (fromInput && !fromInput.value.trim()) {
                fromInput.placeholder = 'From: Demo Location (NYC)';
            }
        }
    }
    
    setDestination(latlng) {
        this.destination = latlng;

        if (this.isUsingBackupMap && this.backupMap) {
            // Update backup map
            this.backupMap.destination = latlng;
            this.renderBackupMap();
        } else if (this.map) {
            // Clear existing destination marker
            if (this.destinationMarker) {
                this.map.removeLayer(this.destinationMarker);
            }

            // Add destination marker safely
            const marker = L.marker([latlng.lat, latlng.lng])
                .bindPopup('🎯 Destination');

            this.destinationMarker = await this.safeAddToMap(marker);
            if (this.destinationMarker) {
                this.destinationMarker.openPopup();
            }
        }

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
        navBtn.innerHTML = '<span class="spinner"></span> Calculating routes...';
        navBtn.disabled = true;

        try {
            // Calculate multiple routes
            await this.calculateRoute();

            // If we have a selected route, start navigation immediately
            if (this.routeData && this.routeSteps) {
                this.startSelectedNavigation();
            }

        } catch (error) {
            console.error('Navigation error:', error);
            this.showNotification('Failed to calculate routes', 'error');
            navBtn.innerHTML = '🚗 Start Navigation';
            navBtn.disabled = false;
        }
    }

    startSelectedNavigation() {
        // Start navigation with selected route
        this.isNavigating = true;
        this.showNavigationPanel();

        // Start location tracking
        this.startLocationTracking();

        const navBtn = document.getElementById('navigateBtn');
        navBtn.innerHTML = '🛑 Stop Navigation';
        navBtn.onclick = () => this.stopNavigation();
        navBtn.disabled = false;

        // Get route info for notification
        const routeType = this.routeData.type || 'selected';
        const distance = (this.routeData.distance / 1000).toFixed(1);
        const duration = Math.round(this.routeData.duration / 60);

        this.showNotification(`🚗 Navigation started on ${routeType} route!`, 'success');

        // Voice guidance
        this.speakInstruction(`Navigation started. Following the ${routeType} route.`);

        // Enable follow mode for navigation
        this.enableFollowMode();

        // Show initial route overview, then switch to follow mode after 3 seconds
        if (this.autoZoomEnabled && this.mapBounds) {
            this.autoZoomToRoute();
            setTimeout(() => {
                if (this.isNavigating) {
                    this.enableFollowMode();
                }
            }, 3000);
        }
    }
    
    async calculateRoute() {
        console.log('🛣️ Calculating multiple route options...');

        if (!this.currentLocation || !this.destination) {
            throw new Error('Missing start or end location');
        }

        try {
            // Calculate multiple routes with different preferences
            const routes = await this.calculateMultipleRoutes();

            if (routes.length > 0) {
                // Store all routes
                this.availableRoutes = routes;

                // Show route selection panel
                this.showRouteSelection(routes);

                // Display all routes on map
                this.displayMultipleRoutes(routes);

                console.log('✅ Multiple routes calculated:', routes.length);

            } else {
                throw new Error('No routes found');
            }

        } catch (error) {
            console.error('❌ Route calculation failed:', error);

            // Fallback to single route
            await this.calculateSingleRoute();
        }
    }

    async calculateMultipleRoutes() {
        const start = `${this.currentLocation.lng},${this.currentLocation.lat}`;
        const end = `${this.destination.lng},${this.destination.lat}`;

        // Build exclusion list based on hazard avoidance settings
        const exclusions = this.buildRouteExclusions();
        console.log('🚨 Route exclusions based on hazard settings:', exclusions);

        // Build exclusion parameters for OSRM API
        const excludeParams = this.buildOSRMExcludeParams(exclusions);
        console.log('🚨 OSRM exclude parameters:', excludeParams);

        // Show user notification about active hazard avoidance
        const activeHazards = this.getActiveHazardTypes();
        if (activeHazards.length > 0) {
            this.showNotification(`🚨 Avoiding: ${activeHazards.join(', ')}`, 'info');
        }

        // Multiple routing services for better reliability with hazard avoidance
        const routingServices = [
            {
                name: 'OSRM Primary (Hazard Avoiding)',
                url: `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson&steps=true&alternatives=true${excludeParams.primary}&voice_instructions=true`,
                timeout: 10000
            },
            {
                name: 'OSRM Alternative (No Highway)',
                url: `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson&steps=true&alternatives=true${excludeParams.noHighway}&continue_straight=true&voice_instructions=true`,
                timeout: 8000
            },
            {
                name: 'OSRM Railway Avoiding',
                url: `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson&steps=true&annotations=true&alternatives=true${excludeParams.noRailway}&voice_instructions=true`,
                timeout: 8000
            },
            {
                name: 'OSRM Shortest (Hazard Aware)',
                url: `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson&steps=true&alternatives=true${excludeParams.shortest}&continue_straight=false&voice_instructions=true`,
                timeout: 6000
            },
            {
                name: 'OSRM Backup (Safe Route)',
                url: `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson&steps=true&alternatives=true${excludeParams.fastest}&voice_instructions=true`,
                timeout: 6000
            }
        ];

        const routePromises = routingServices.map(service =>
            this.fetchWithTimeout(service.url, service.timeout)
                .then(response => ({ service: service.name, response }))
                .catch(error => ({ service: service.name, error }))
        );

        const responses = await Promise.allSettled(routePromises);
        const routes = [];
        let successfulRequests = 0;

        for (let i = 0; i < responses.length; i++) {
            const result = responses[i];

            if (result.status === 'fulfilled' && result.value.response) {
                try {
                    const response = result.value.response;
                    if (response.ok) {
                        const data = await response.json();
                        if (data.routes && data.routes.length > 0) {
                            console.log(`✅ ${result.value.service}: ${data.routes.length} routes found`);
                            successfulRequests++;

                            // Add all routes from this response
                            data.routes.forEach((route, index) => {
                                routes.push({
                                    ...route,
                                    routeIndex: routes.length,
                                    type: this.getRouteType(i, index),
                                    color: this.getRouteColor(routes.length),
                                    source: result.value.service
                                });
                            });
                        } else {
                            console.warn(`⚠️ ${result.value.service}: No routes in response`);
                        }
                    } else {
                        console.error(`❌ ${result.value.service}: HTTP ${response.status}`);
                    }
                } catch (error) {
                    console.error(`❌ ${result.value.service}: Parse error:`, error);
                }
            } else if (result.status === 'fulfilled' && result.value.error) {
                console.error(`❌ ${result.value.service}: Request failed:`, result.value.error.message);
            } else {
                console.error(`❌ Route request ${i}: Promise rejected`);
            }
        }

        console.log(`📊 Route calculation summary: ${successfulRequests}/${responses.length} services succeeded, ${routes.length} total routes`);

        if (routes.length === 0) {
            throw new Error(`No routes found from any service (${successfulRequests}/${responses.length} services responded)`);
        }

        // Remove duplicates and limit to 4 routes
        const uniqueRoutes = this.removeDuplicateRoutes(routes).slice(0, 4);

        // Sort routes by type preference
        return this.sortRoutesByPreference(uniqueRoutes);
    }

    getRouteType(requestIndex, routeIndex) {
        if (requestIndex === 0 && routeIndex === 0) return 'fastest';
        if (requestIndex === 1) return 'no-highway';
        if (requestIndex === 2) return 'shortest';
        if (requestIndex === 3) return 'no-lights';
        if (requestIndex === 4) return 'no-railway';
        return 'alternative';
    }

    getRouteColor(index) {
        const colors = ['#00FF88', '#FFD700', '#87CEEB', '#90EE90'];
        return colors[index % colors.length];
    }

    removeDuplicateRoutes(routes) {
        const unique = [];
        const tolerance = 1000; // 1000m tolerance for considering routes different

        routes.forEach(route => {
            const isDuplicate = unique.some(existing =>
                Math.abs(existing.distance - route.distance) < tolerance &&
                Math.abs(existing.duration - route.duration) < 300 // 5 minutes
            );

            if (!isDuplicate) {
                unique.push(route);
            }
        });

        return unique;
    }

    sortRoutesByPreference(routes) {
        const typeOrder = { fastest: 0, shortest: 1, scenic: 2, alternative: 3 };
        return routes.sort((a, b) => {
            const orderA = typeOrder[a.type] || 999;
            const orderB = typeOrder[b.type] || 999;
            if (orderA !== orderB) return orderA - orderB;
            return a.duration - b.duration; // Secondary sort by duration
        });
    }

    async calculateSingleRoute() {
        // Fallback to single route calculation with hazard avoidance
        const start = `${this.currentLocation.lng},${this.currentLocation.lat}`;
        const end = `${this.destination.lng},${this.destination.lat}`;

        // Apply hazard avoidance to single route as well
        const exclusions = this.buildRouteExclusions();
        const excludeParams = this.buildOSRMExcludeParams(exclusions);
        console.log('🚨 Single route hazard avoidance applied:', excludeParams.primary);

        try {
            const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson&steps=true${excludeParams.primary}&voice_instructions=true`
            );

            if (response.ok) {
                const data = await response.json();
                if (data.routes && data.routes.length > 0) {
                    const route = data.routes[0];
                    this.selectRoute(route, 0);
                    return;
                }
            }
        } catch (error) {
            console.error('Single route calculation failed:', error);
        }

        // Final fallback to straight line
        this.showNotification('Using direct route (routing service unavailable)', 'warning');

        const routeCoords = [
            [this.currentLocation.lat, this.currentLocation.lng],
            [this.destination.lat, this.destination.lng]
        ];

        if (this.routeLine) {
            this.map.removeLayer(this.routeLine);
        }

        if (this.map) {
            this.routeLine = L.polyline(routeCoords, {
                color: '#FFA500',
                weight: 5,
                opacity: 0.8,
                dashArray: '10, 10'
            }).addTo(this.map);
        } else {
            console.error('❌ Cannot add route line: map is null');
        }

        this.map.fitBounds(this.routeLine.getBounds(), { padding: [20, 20] });
    }

    showRouteSelection(routes) {
        const panel = document.getElementById('routeSelectionPanel');
        const optionsContainer = document.getElementById('routeOptions');

        if (!panel || !optionsContainer) return;

        // Clear existing options
        optionsContainer.innerHTML = '';

        // Create route options
        routes.forEach((route, index) => {
            const option = this.createRouteOption(route, index);
            optionsContainer.appendChild(option);
        });

        // Show panel
        panel.style.display = 'block';
        setTimeout(() => panel.classList.add('show'), 100);

        // Select first route by default
        this.selectRouteOption(0);
    }

    createRouteOption(route, index) {
        const option = document.createElement('div');
        option.className = `route-option ${route.type}`;
        option.onclick = () => this.selectRouteOption(index);

        const distance = (route.distance / 1000).toFixed(1);
        const duration = Math.round(route.duration / 60);
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        // Calculate additional stats
        const avgSpeed = Math.round((route.distance / 1000) / (route.duration / 3600));
        const fuelCost = this.estimateFuelCost(route.distance);

        option.innerHTML = `
            <div class="route-info">
                <div class="route-main">
                    <span class="route-name">${this.getRouteName(route.type)}</span>
                    <span class="route-badge ${route.type}">${route.type}</span>
                </div>
                <div class="route-stats">
                    <div class="route-stat">
                        <span class="route-stat-icon">🕒</span>
                        <span class="route-stat-value">${timeText}</span>
                    </div>
                    <div class="route-stat">
                        <span class="route-stat-icon">📏</span>
                        <span class="route-stat-value">${this.formatDistance(route.distance)}</span>
                    </div>
                    <div class="route-stat">
                        <span class="route-stat-icon">⚡</span>
                        <span class="route-stat-value">${this.formatSpeed(avgSpeed)}</span>
                    </div>
                    <div class="route-stat">
                        <span class="route-stat-icon">⛽</span>
                        <span class="route-stat-value">${fuelCost}</span>
                    </div>
                </div>
                <div class="route-details">
                    ${this.getRouteDescription(route)}
                </div>
            </div>
        `;

        return option;
    }

    getRouteName(type) {
        const names = {
            fastest: 'Fastest Route',
            shortest: 'Shortest Route',
            'no-highway': 'No Highways',
            'no-lights': 'Fewer Traffic Lights',
            'no-railway': 'Avoid Railway Crossings',
            alternative: 'Alternative Route'
        };
        return names[type] || 'Route';
    }

    getRouteDescription(route) {
        const descriptions = {
            fastest: 'Optimized for speed with highways and main roads',
            shortest: 'Minimum distance with local roads',
            'no-highway': 'Avoids highways and motorways',
            'no-lights': 'Minimizes traffic lights and intersections',
            'no-railway': 'Avoids railway crossings and level crossings',
            alternative: 'Alternative path with different road types'
        };

        const baseDesc = descriptions[route.type] || 'Alternative routing option';
        const tollInfo = route.legs && route.legs[0] && route.legs[0].annotation ?
            ' • May include tolls' : ' • Toll-free route';

        // Add hazard avoidance info
        const hazardInfo = this.getHazardAvoidanceDescription();

        return baseDesc + tollInfo + hazardInfo;
    }

    estimateFuelCost(distanceMeters) {
        const distanceKm = distanceMeters / 1000;
        const fuelUsed = (distanceKm / 100) * 8; // 8L per 100km average consumption (internal calculation)

        // Get country-specific fuel pricing
        const countryData = this.fuelPrices[this.userCountry] || this.fuelPrices['DEFAULT'];
        const { currency, symbol, price } = countryData;

        let cost;

        // Calculate cost based on fuel unit preference
        switch (this.units.fuel) {
            case 'gallons_us':
                // Convert liters to US gallons and calculate cost
                const gallonsUs = fuelUsed * 0.264172;
                cost = gallonsUs * (this.userCountry === 'US' ? price : price * 3.78541); // Convert per-liter to per-gallon if needed
                break;
            case 'gallons_uk':
                // Convert liters to UK gallons and calculate cost
                const gallonsUk = fuelUsed * 0.219969;
                cost = gallonsUk * (this.userCountry === 'GB' ? price * 4.54609 : price * 4.54609); // Convert per-liter to per-gallon
                break;
            case 'liters':
            default:
                // Cost per liter
                cost = fuelUsed * price;
                break;
        }

        return `${symbol}${cost.toFixed(2)}`;
    }

    getFuelPriceDisplay() {
        const countryData = this.fuelPrices[this.userCountry] || this.fuelPrices['DEFAULT'];
        const { currency, symbol, price } = countryData;

        let unit;
        let displayPrice = price;

        switch (this.units.fuel) {
            case 'gallons_us':
                unit = 'gallon (US)';
                if (this.userCountry !== 'US') {
                    displayPrice = price * 3.78541; // Convert per-liter to per-gallon
                }
                break;
            case 'gallons_uk':
                unit = 'gallon (UK)';
                displayPrice = price * 4.54609; // Convert per-liter to per-gallon
                break;
            case 'liters':
            default:
                unit = 'liter';
                if (this.userCountry === 'US') {
                    displayPrice = price / 3.78541; // Convert per-gallon to per-liter
                }
                break;
        }

        return `${symbol}${displayPrice.toFixed(2)}/${unit}`;
    }

    selectRouteOption(index) {
        // Update UI selection
        const options = document.querySelectorAll('.route-option');
        options.forEach((option, i) => {
            option.classList.toggle('selected', i === index);
        });

        // Update selected route index
        this.selectedRouteIndex = index;

        // Highlight selected route on map
        this.highlightSelectedRoute(index);

        // Enable select button
        const selectBtn = document.getElementById('selectRouteBtn');
        if (selectBtn) {
            selectBtn.disabled = false;
        }
    }

    displayMultipleRoutes(routes) {
        // Clear existing route lines
        this.clearRouteLines();

        // Add all routes to map
        routes.forEach((route, index) => {
            const routeCoords = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);

            const routeLine = L.polyline(routeCoords, {
                color: route.color,
                weight: index === 0 ? 6 : 5,
                opacity: index === 0 ? 0.9 : 0.7,
                className: `route-line-${index + 1}`
            }).addTo(this.map);

            // Add route outline
            const routeOutline = L.polyline(routeCoords, {
                color: '#004d2a',
                weight: index === 0 ? 8 : 7,
                opacity: 0.5
            }).addTo(this.map);
            routeOutline.bringToBack();

            this.routeLines.push({ line: routeLine, outline: routeOutline });
        });

        // Fit map to show all routes
        if (routes.length > 0) {
            const group = new L.featureGroup(this.routeLines.map(r => r.line));
            this.map.fitBounds(group.getBounds(), { padding: [50, 50] });
        }
    }

    highlightSelectedRoute(index) {
        // Reset all route styles
        this.routeLines.forEach((routeLine, i) => {
            routeLine.line.setStyle({
                weight: i === index ? 8 : 5,
                opacity: i === index ? 1 : 0.6,
                className: i === index ? 'route-line-selected' : `route-line-${i + 1}`
            });
        });
    }

    clearRouteLines() {
        // Remove existing route lines
        this.routeLines.forEach(routeLine => {
            if (this.map.hasLayer(routeLine.line)) {
                this.map.removeLayer(routeLine.line);
            }
            if (this.map.hasLayer(routeLine.outline)) {
                this.map.removeLayer(routeLine.outline);
            }
        });
        this.routeLines = [];

        // Remove old single route line
        if (this.routeLine && this.map.hasLayer(this.routeLine)) {
            this.map.removeLayer(this.routeLine);
        }
        if (this.routeOutline && this.map.hasLayer(this.routeOutline)) {
            this.map.removeLayer(this.routeOutline);
        }
    }

    selectRoute(route, index) {
        console.log('🎯 Route selected:', route.type, index);

        // Store selected route data
        this.routeData = route;
        this.routeSteps = route.legs[0].steps;
        this.currentStepIndex = 0;

        // Clear all route lines
        this.clearRouteLines();

        // Add only the selected route
        const routeCoords = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);

        // Create route lines safely
        const routeLine = L.polyline(routeCoords, {
            color: '#00FF88',
            weight: 8,
            opacity: 1,
            className: 'route-line-selected'
        });

        const routeOutline = L.polyline(routeCoords, {
            color: '#004d2a',
            weight: 10,
            opacity: 0.8
        });

        this.routeLine = await this.safeAddToMap(routeLine);
        this.routeOutline = await this.safeAddToMap(routeOutline);

        if (this.routeOutline) {
            this.routeOutline.bringToBack();
        }

        if (!this.routeLine) {
            console.error('❌ Failed to add route to map');
            return;
        }

        // Auto-zoom to fit entire route
        this.autoZoomToRoute();

        // Store route bounds for later use
        this.mapBounds = this.routeLine.getBounds();

        // Calculate and display route info with proper units
        const distance = this.formatDistance(route.distance);
        const duration = Math.round(route.duration / 60);
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        this.showNotification(`✅ ${this.getRouteName(route.type)}: ${distance}, ${timeText}`, 'success');

        // Add hazard markers to the selected route
        this.addHazardMarkersToRoute(route);

        // Show journey control panel instead of starting navigation immediately
        this.showJourneyControlPanel(route);
    }

    autoZoomToRoute() {
        if (!this.routeLine || !this.map) return;

        // Check if auto-zoom is enabled in settings
        const autoZoomToggle = document.getElementById('autoZoomToggle');
        if (autoZoomToggle && !autoZoomToggle.checked) {
            console.log('🔍 Auto-zoom disabled in settings');
            return;
        }

        console.log('🔍 Auto-zooming to fit entire route');

        // Calculate optimal bounds with padding
        const bounds = this.routeLine.getBounds();
        const padding = this.calculateOptimalPadding();

        // Fit bounds with smooth animation
        this.map.fitBounds(bounds, {
            padding: padding,
            maxZoom: this.overviewZoomLevel,
            animate: true,
            duration: 1.5
        });

        // Update follow mode button state
        this.updateFollowModeUI(false);
    }

    calculateOptimalPadding() {
        // Calculate padding based on screen size and UI elements
        const mapContainer = this.map.getContainer();
        const containerWidth = mapContainer.offsetWidth;
        const containerHeight = mapContainer.offsetHeight;

        // Account for navigation panel and other UI elements
        const topPadding = this.isNavigating ? 120 : 50;
        const bottomPadding = 100;
        const sidePadding = Math.min(50, containerWidth * 0.1);

        return [topPadding, sidePadding, bottomPadding, sidePadding];
    }

    enableFollowMode() {
        if (!this.map || !this.currentLocation) return;

        // Check if follow mode is enabled in settings
        const followModeToggle = document.getElementById('followModeToggle');
        if (followModeToggle && !followModeToggle.checked) {
            console.log('📍 Follow mode disabled in settings');
            return;
        }

        console.log('📍 Enabling follow mode');

        this.followMode = true;
        this.centerOnUserLocation(true);
        this.updateFollowModeUI(true);

        // Set appropriate zoom level for following
        if (this.map.getZoom() < this.followModeZoomLevel) {
            this.map.setZoom(this.followModeZoomLevel);
        }
    }

    disableFollowMode() {
        console.log('🗺️ Disabling follow mode');

        this.followMode = false;
        this.updateFollowModeUI(false);
    }

    centerOnUserLocation(animate = true) {
        if (!this.map || !this.currentLocation) return;

        const options = {
            animate: animate,
            duration: animate ? 1.0 : 0,
            easeLinearity: 0.25
        };

        this.map.setView(
            [this.currentLocation.lat, this.currentLocation.lng],
            this.followModeZoomLevel,
            options
        );
    }

    checkIfUserOffScreen() {
        if (!this.map || !this.currentLocation) return false;

        const mapBounds = this.map.getBounds();
        const userLatLng = L.latLng(this.currentLocation.lat, this.currentLocation.lng);

        // Check if user is completely outside map bounds
        if (!mapBounds.contains(userLatLng)) {
            this.showOffScreenIndicator(userLatLng, mapBounds);
            return true;
        }

        // Check if user is near edge (within threshold) when in follow mode
        if (this.followMode) {
            const mapSize = this.map.getSize();
            const userPoint = this.map.latLngToContainerPoint(userLatLng);

            const threshold = {
                x: mapSize.x * this.panThreshold,
                y: mapSize.y * this.panThreshold
            };

            const nearEdge = (
                userPoint.x < threshold.x ||
                userPoint.x > mapSize.x - threshold.x ||
                userPoint.y < threshold.y ||
                userPoint.y > mapSize.y - threshold.y
            );

            if (nearEdge) {
                this.hideOffScreenIndicator(); // Hide indicator when near edge but still visible
                return true;
            }
        }

        this.hideOffScreenIndicator();
        return false;
    }

    showOffScreenIndicator(userLatLng, mapBounds) {
        // Check if off-screen indicators are enabled
        const indicatorToggle = document.getElementById('offScreenIndicatorToggle');
        if (indicatorToggle && !indicatorToggle.checked) {
            return;
        }

        const indicator = document.getElementById('offScreenIndicator');
        const arrow = document.getElementById('offScreenArrow');

        if (!indicator || !arrow) return;

        // Calculate direction to user
        const mapCenter = this.map.getCenter();
        const direction = this.getOffScreenDirection(mapCenter, userLatLng, mapBounds);

        // Update arrow and position
        arrow.textContent = direction.arrow;
        indicator.className = `off-screen-indicator ${direction.position}`;
        indicator.style.display = 'block';

        this.offScreenIndicatorVisible = true;
    }

    hideOffScreenIndicator() {
        const indicator = document.getElementById('offScreenIndicator');
        if (indicator && this.offScreenIndicatorVisible) {
            indicator.style.display = 'none';
            this.offScreenIndicatorVisible = false;
        }
    }

    getOffScreenDirection(mapCenter, userLatLng, mapBounds) {
        const centerLat = mapCenter.lat;
        const centerLng = mapCenter.lng;
        const userLat = userLatLng.lat;
        const userLng = userLatLng.lng;

        // Calculate relative position
        const latDiff = userLat - centerLat;
        const lngDiff = userLng - centerLng;

        // Determine primary direction
        if (Math.abs(latDiff) > Math.abs(lngDiff)) {
            // Primarily north/south
            if (latDiff > 0) {
                return { arrow: '↑', position: 'top' };
            } else {
                return { arrow: '↓', position: 'bottom' };
            }
        } else {
            // Primarily east/west
            if (lngDiff > 0) {
                return { arrow: '→', position: 'right' };
            } else {
                return { arrow: '←', position: 'left' };
            }
        }
    }

    updateFollowModeUI(isFollowing) {
        const followBtn = document.getElementById('followModeBtn');

        if (followBtn) {
            if (isFollowing) {
                followBtn.classList.add('follow-active');
                followBtn.title = 'Following Location (Click to disable)';
            } else {
                followBtn.classList.remove('follow-active');
                followBtn.title = 'Enable Follow Mode';
            }
        }
    }

    handleLocationUpdate(newLocation) {
        // Battery optimization - throttle updates
        const now = Date.now();
        if (this.batteryOptimizedMode && (now - this.lastUpdateTime) < this.updateThrottleMs) {
            return;
        }
        this.lastUpdateTime = now;

        // Store previous location for comparison
        const previousLocation = this.lastKnownPosition;
        this.lastKnownPosition = newLocation;

        // If follow mode is enabled
        if (this.followMode && this.isNavigating) {
            // Check if user moved significantly or is off-screen
            if (this.shouldRecenterMap(previousLocation, newLocation)) {
                this.smoothPanToLocation(newLocation);
            }
        }
    }

    enableBatteryOptimization() {
        console.log('🔋 Enabling battery optimization mode');
        this.batteryOptimizedMode = true;
        this.updateThrottleMs = 2000; // Reduce update frequency to 2 seconds
        this.adaptiveZoomEnabled = false; // Disable adaptive zoom to save processing
        this.showNotification('🔋 Battery optimization enabled', 'info');
    }

    disableBatteryOptimization() {
        console.log('⚡ Disabling battery optimization mode');
        this.batteryOptimizedMode = false;
        this.updateThrottleMs = 1000; // Back to 1 second updates
        this.adaptiveZoomEnabled = true; // Re-enable adaptive zoom
        this.showNotification('⚡ Battery optimization disabled', 'info');
    }

    shouldRecenterMap(previousLocation, newLocation) {
        if (!previousLocation) return true;

        // Check if user moved significantly
        const distanceMoved = this.calculateDistance(
            previousLocation.lat, previousLocation.lng,
            newLocation.lat, newLocation.lng
        );

        // Check if user is off-screen
        const isOffScreen = this.checkIfUserOffScreen();

        // Predictive re-centering based on movement direction and speed
        const needsPredictiveRecentering = this.checkPredictiveRecentering(previousLocation, newLocation);

        // Re-center if moved significantly, off-screen, or predictive logic suggests it
        return distanceMoved > 50 || isOffScreen || needsPredictiveRecentering;
    }

    checkPredictiveRecentering(previousLocation, newLocation) {
        // Check if predictive re-centering is enabled
        const predictiveToggle = document.getElementById('predictiveRecenterToggle');
        if (predictiveToggle && !predictiveToggle.checked) {
            return false;
        }

        if (!this.followMode || this.currentSpeed < 5) return false; // Only for moving users

        // Calculate movement vector
        const bearing = this.calculateBearing(
            previousLocation.lat, previousLocation.lng,
            newLocation.lat, newLocation.lng
        );

        // Predict where user will be in next few seconds
        const predictionTimeSeconds = Math.min(5, Math.max(2, this.currentSpeed / 10));
        const predictedLocation = this.predictFutureLocation(newLocation, bearing, predictionTimeSeconds);

        // Check if predicted location would be off-screen
        if (predictedLocation) {
            const mapBounds = this.map.getBounds();
            const predictedLatLng = L.latLng(predictedLocation.lat, predictedLocation.lng);

            // If predicted location is outside bounds, re-center now
            return !mapBounds.contains(predictedLatLng);
        }

        return false;
    }

    predictFutureLocation(currentLocation, bearing, timeSeconds) {
        if (this.currentSpeed <= 0) return null;

        // Distance = speed * time (convert internal km/h to m/s)
        const speedMs = this.currentSpeed / 3.6;
        const distanceMeters = speedMs * timeSeconds;

        // Calculate future position using bearing and distance
        const R = 6371000; // Earth's radius in meters
        const lat1 = currentLocation.lat * Math.PI / 180;
        const lng1 = currentLocation.lng * Math.PI / 180;
        const bearingRad = bearing * Math.PI / 180;

        const lat2 = Math.asin(
            Math.sin(lat1) * Math.cos(distanceMeters / R) +
            Math.cos(lat1) * Math.sin(distanceMeters / R) * Math.cos(bearingRad)
        );

        const lng2 = lng1 + Math.atan2(
            Math.sin(bearingRad) * Math.sin(distanceMeters / R) * Math.cos(lat1),
            Math.cos(distanceMeters / R) - Math.sin(lat1) * Math.sin(lat2)
        );

        return {
            lat: lat2 * 180 / Math.PI,
            lng: lng2 * 180 / Math.PI
        };
    }

    smoothPanToLocation(location) {
        if (!this.map || !location) return;

        // Smooth pan to new location
        this.map.panTo([location.lat, location.lng], {
            animate: true,
            duration: 0.8,
            easeLinearity: 0.25
        });

        // Apply adaptive zoom based on speed
        if (this.adaptiveZoomEnabled) {
            const adaptiveZoom = this.calculateAdaptiveZoom();
            const currentZoom = this.map.getZoom();

            // Only adjust zoom if difference is significant
            if (Math.abs(currentZoom - adaptiveZoom) > 0.5) {
                this.map.setZoom(adaptiveZoom, { animate: true });
            }
        } else {
            // Maintain standard follow mode zoom level
            const currentZoom = this.map.getZoom();
            if (currentZoom < this.followModeZoomLevel - 1) {
                this.map.setZoom(this.followModeZoomLevel, { animate: true });
            }
        }
    }

    calculateAdaptiveZoom() {
        // Check if adaptive zoom is enabled
        const adaptiveZoomToggle = document.getElementById('adaptiveZoomToggle');
        if (adaptiveZoomToggle && !adaptiveZoomToggle.checked) {
            return this.followModeZoomLevel;
        }

        // Base zoom level
        let zoom = this.followModeZoomLevel;

        // Adjust zoom based on speed (higher speed = lower zoom for better overview)
        if (this.currentSpeed > 0) {
            if (this.currentSpeed < 10) {
                // Walking/slow speed - closer zoom
                zoom = Math.min(18, this.followModeZoomLevel + 1);
            } else if (this.currentSpeed < 30) {
                // City driving - standard zoom
                zoom = this.followModeZoomLevel;
            } else if (this.currentSpeed < 60) {
                // Highway driving - wider view
                zoom = Math.max(15, this.followModeZoomLevel - 1);
            } else {
                // High speed - much wider view
                zoom = Math.max(14, this.followModeZoomLevel - 2);
            }
        }

        return zoom;
    }



    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    calculateSpeedFromPosition(prevLocation, newLocation, timestamp) {
        if (!prevLocation || !prevLocation.timestamp) return 0;

        const distance = this.calculateDistance(
            prevLocation.lat, prevLocation.lng,
            newLocation.lat, newLocation.lng
        );

        const timeDiff = (timestamp - prevLocation.timestamp) / 1000; // seconds

        if (timeDiff <= 0) return 0;

        // Speed in km/h (internal calculation, will be converted for display)
        return (distance / 1000) / (timeDiff / 3600);
    }

    // Unit Conversion Functions
    convertDistance(meters, targetUnit = null) {
        const system = targetUnit || this.units.system;

        switch (system) {
            case 'imperial':
                if (meters < 1609) {
                    return { value: Math.round(meters * 3.28084), unit: 'ft' };
                } else {
                    return { value: (meters / 1609.34).toFixed(1), unit: 'mi' };
                }
            case 'nautical':
                return { value: (meters / 1852).toFixed(2), unit: 'nm' };
            case 'metric':
            default:
                if (meters < 1000) {
                    return { value: Math.round(meters), unit: 'm' };
                } else {
                    return { value: (meters / 1000).toFixed(1), unit: 'km' };
                }
        }
    }

    convertSpeed(kmh, targetUnit = null) {
        const unit = targetUnit || this.units.speed;

        switch (unit) {
            case 'mph':
                return { value: (kmh * 0.621371).toFixed(1), unit: 'mph' };
            case 'ms':
                return { value: (kmh / 3.6).toFixed(1), unit: 'm/s' };
            case 'knots':
                return { value: (kmh * 0.539957).toFixed(1), unit: 'kn' };
            case 'kmh':
            default:
                return { value: kmh.toFixed(1), unit: 'km/h' };
        }
    }

    convertFuelConsumption(litersPerKm, targetUnit = null) {
        const unit = targetUnit || this.units.fuel;

        switch (unit) {
            case 'gallons_us':
                // Convert to MPG (US)
                const mpgUs = 235.214 / (litersPerKm * 100);
                return { value: mpgUs.toFixed(1), unit: 'MPG (US)' };
            case 'gallons_uk':
                // Convert to LPM (Litres Per Mile)
                const lpmUk = litersPerKm * 1.60934; // Convert internal km to miles
                return { value: lpmUk.toFixed(2), unit: 'LPM (Litres Per Mile)' };
            case 'liters':
            default:
                return { value: (litersPerKm * 100).toFixed(1), unit: 'L/100km' };
        }
    }

    formatDistance(meters) {
        const converted = this.convertDistance(meters);
        console.log('📏 formatDistance:', meters, 'meters →', converted, 'system:', this.units.system);
        return `${converted.value} ${converted.unit}`;
    }

    formatSpeed(kmh) {
        const converted = this.convertSpeed(kmh);
        return `${converted.value} ${converted.unit}`;
    }

    // Address Input and Geocoding Functions
    async handleAddressInput(inputType, query) {
        if (!query || query.length < 3) {
            this.hideSuggestions(inputType);
            return;
        }

        // Detect input type and format
        const inputFormat = this.detectAddressFormat(query);
        console.log(`🔍 Detected format: ${inputFormat} for query: ${query}`);

        // Get suggestions based on input
        const suggestions = await this.getAddressSuggestions(query, inputFormat);
        this.showSuggestions(inputType, suggestions);
    }

    detectAddressFormat(query) {
        // UK Postcode pattern (e.g., SW1 2AA, M1 1AA, SW1A 1AA)
        if (/^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i.test(query.trim())) {
            return 'uk_postcode';
        }

        // US ZIP Code pattern (e.g., 90210, 90210-1234)
        if (/^\d{5}(-\d{4})?$/.test(query.trim())) {
            return 'us_zipcode';
        }

        // Canadian Postal Code (e.g., K1A 0A6)
        if (/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(query.trim())) {
            return 'ca_postcode';
        }

        // Coordinates pattern (e.g., 51.5074, -0.1278 or 51.5074,-0.1278)
        if (/^-?\d+\.?\d*,?\s?-?\d+\.?\d*$/.test(query.trim())) {
            return 'coordinates';
        }

        // Plus Code (e.g., 9C3XGV7M+F3)
        if (/^[23456789CFGHJMPQRVWX]{4,}\+[23456789CFGHJMPQRVWX]{2,}/.test(query.trim().toUpperCase())) {
            return 'plus_code';
        }

        // Street address with number
        if (/^\d+\s+/.test(query.trim())) {
            return 'street_address';
        }

        // Check for common company names
        if (this.isCompanyName(query)) {
            return 'company_name';
        }

        // Business or place name
        return 'place_name';
    }

    isCompanyName(query) {
        const companyKeywords = [
            // Fast food
            'mcdonalds', 'burger king', 'kfc', 'subway', 'pizza hut', 'dominos', 'taco bell',
            'wendys', 'starbucks', 'dunkin', 'chipotle', 'five guys',

            // Retail
            'walmart', 'target', 'costco', 'home depot', 'lowes', 'best buy', 'apple store',
            'microsoft store', 'amazon', 'ikea', 'macys', 'nordstrom', 'sears',

            // Gas stations
            'shell', 'bp', 'exxon', 'chevron', 'mobil', 'texaco', 'citgo', 'sunoco',

            // UK specific
            'tesco', 'sainsburys', 'asda', 'morrisons', 'marks spencer', 'john lewis',
            'currys', 'argos', 'boots', 'costa coffee', 'greggs', 'nandos',

            // Banks
            'bank of america', 'chase', 'wells fargo', 'citibank', 'hsbc', 'barclays',
            'lloyds', 'natwest', 'santander',

            // Hotels
            'hilton', 'marriott', 'holiday inn', 'hyatt', 'sheraton', 'radisson',
            'premier inn', 'travelodge',

            // Pharmacies
            'cvs', 'walgreens', 'rite aid', 'boots pharmacy',

            // Grocery
            'kroger', 'safeway', 'publix', 'whole foods', 'trader joes'
        ];

        const queryLower = query.toLowerCase().replace(/[^\w\s]/g, '');
        return companyKeywords.some(keyword =>
            queryLower.includes(keyword.replace(/\s/g, '')) ||
            queryLower.includes(keyword)
        );
    }

    async getAddressSuggestions(query, format) {
        const suggestions = [];

        try {
            switch (format) {
                case 'uk_postcode':
                    suggestions.push(...await this.searchUKPostcode(query));
                    break;
                case 'us_zipcode':
                    suggestions.push(...await this.searchUSZipcode(query));
                    break;
                case 'coordinates':
                    suggestions.push(...await this.parseCoordinates(query));
                    break;
                case 'street_address':
                    suggestions.push(...await this.searchStreetAddress(query));
                    break;
                case 'company_name':
                    suggestions.push(...await this.searchCompanyName(query));
                    break;
                case 'place_name':
                default:
                    // Use GeocodingService if available, otherwise fallback to direct search
                    if (this.geocodingService) {
                        const results = await this.geocodingService.searchPlaces(query);
                        suggestions.push(...results.map(item => ({
                            type: 'Place',
                            main: item.displayName.split(',')[0],
                            details: item.displayName.split(',').slice(1).join(',').trim(),
                            lat: item.lat,
                            lng: item.lng
                        })));
                    } else {
                        suggestions.push(...await this.searchPlaceName(query));
                    }
                    break;
            }
        } catch (error) {
            console.error('Address search error:', error);
        }

        // Add parking search if query contains parking-related terms
        if (query.toLowerCase().includes('parking') || query.toLowerCase().includes('park')) {
            try {
                if (this.currentLocation) {
                    const parkingSuggestions = await this.searchParkingSpaces(query, this.currentLocation.lat, this.currentLocation.lng);
                    suggestions.unshift(...parkingSuggestions); // Add parking suggestions at the beginning
                }
            } catch (error) {
                console.warn('Parking search error:', error);
            }
        }

        return suggestions.slice(0, 8); // Increased limit to accommodate parking results
    }

    async searchCompanyName(companyName) {
        try {
            // Search for company/business with enhanced query
            const enhancedQuery = `${companyName} business store restaurant`;
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enhancedQuery)}&limit=5&addressdetails=1&extratags=1`
            );
            const data = await response.json();

            // Filter and prioritize business results
            const businessResults = data.filter(item =>
                item.type === 'restaurant' ||
                item.type === 'fast_food' ||
                item.type === 'cafe' ||
                item.type === 'shop' ||
                item.type === 'retail' ||
                item.class === 'shop' ||
                item.class === 'amenity'
            );

            const results = businessResults.length > 0 ? businessResults : data;

            return results.map(item => ({
                type: this.getBusinessType(item),
                main: this.extractBusinessName(item.display_name, companyName),
                details: item.display_name,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon)
            }));
        } catch (error) {
            console.error('Company name search error:', error);
            return [];
        }
    }

    getBusinessType(item) {
        if (item.type === 'restaurant' || item.type === 'fast_food') return 'Restaurant';
        if (item.type === 'cafe') return 'Cafe';
        if (item.type === 'shop' || item.class === 'shop') return 'Store';
        if (item.type === 'fuel') return 'Gas Station';
        if (item.type === 'bank') return 'Bank';
        if (item.type === 'pharmacy') return 'Pharmacy';
        if (item.type === 'hotel') return 'Hotel';
        return 'Business';
    }

    extractBusinessName(displayName, searchTerm) {
        // Try to extract the business name from the full address
        const parts = displayName.split(',');
        const firstPart = parts[0].trim();

        // If the first part contains the search term, use it
        if (firstPart.toLowerCase().includes(searchTerm.toLowerCase())) {
            return firstPart;
        }

        // Otherwise, return the search term with location
        return `${searchTerm} - ${parts[1] ? parts[1].trim() : firstPart}`;
    }

    async searchPlaceName(placeName) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}&limit=5&addressdetails=1`
            );
            const data = await response.json();

            return data.map(item => ({
                type: 'Place',
                main: item.display_name.split(',')[0],
                details: item.display_name.split(',').slice(1).join(',').trim(),
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon)
            }));
        } catch (error) {
            console.error('Place name search error:', error);
            return [];
        }
    }

    async searchUKPostcode(postcode) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(postcode)}&countrycodes=gb&limit=5&addressdetails=1`
            );
            const data = await response.json();

            return data.map(item => ({
                type: 'Postcode',
                main: postcode.toUpperCase(),
                details: item.display_name.split(',').slice(1).join(',').trim(),
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon)
            }));
        } catch (error) {
            console.error('UK postcode search error:', error);
            return [];
        }
    }

    async searchParkingSpaces(query, lat, lng) {
        try {
            // Search for parking spaces near the query location
            const overpassQuery = `
                [out:json][timeout:10];
                (
                  nwr(around:2000,${lat},${lng})[amenity=parking];
                  nwr(around:2000,${lat},${lng})[parking];
                  nwr(around:2000,${lat},${lng})[amenity=parking_space];
                );
                out center meta;
            `;

            const response = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: overpassQuery,
                headers: {
                    'Content-Type': 'text/plain'
                }
            });

            if (response.ok) {
                const data = await response.json();

                return data.elements
                    .filter(element => element.center || (element.lat && element.lon))
                    .map(element => {
                        const center = element.center || { lat: element.lat, lon: element.lon };
                        const tags = element.tags || {};

                        // Determine if parking is free
                        const isFree = this.isParkingFree(tags);
                        const parkingType = this.getParkingType(tags);

                        return {
                            type: 'Parking',
                            main: this.getParkingName(tags, parkingType),
                            details: this.getParkingDetails(tags, isFree),
                            lat: center.lat,
                            lng: center.lon,
                            isFree: isFree,
                            parkingType: parkingType,
                            priority: isFree ? 1 : 2 // Free parking gets higher priority
                        };
                    })
                    .sort((a, b) => {
                        // Sort by priority (free first), then by distance
                        if (a.priority !== b.priority) {
                            return a.priority - b.priority;
                        }

                        const distanceA = this.calculateDistance({ lat, lng }, { lat: a.lat, lng: a.lng });
                        const distanceB = this.calculateDistance({ lat, lng }, { lat: b.lat, lng: b.lng });
                        return distanceA - distanceB;
                    })
                    .slice(0, 5); // Limit to 5 results
            }
        } catch (error) {
            console.error('Parking search error:', error);
        }

        return [];
    }

    isParkingFree(tags) {
        // Check various tags that indicate free parking
        if (tags.fee === 'no' || tags.fee === 'free') return true;
        if (tags['fee:conditional'] && tags['fee:conditional'].includes('no')) return true;
        if (tags.access === 'customers' && !tags.fee) return true;
        if (tags.parking === 'street_side' && !tags.fee) return true;

        return false;
    }

    getParkingType(tags) {
        if (tags.parking === 'surface') return 'Surface Parking';
        if (tags.parking === 'multi-storey') return 'Multi-storey Car Park';
        if (tags.parking === 'underground') return 'Underground Parking';
        if (tags.parking === 'street_side') return 'Street Parking';
        if (tags.amenity === 'parking_space') return 'Parking Space';

        return 'Parking Area';
    }

    getParkingName(tags, parkingType) {
        if (tags.name) return tags.name;
        if (tags.operator) return `${tags.operator} Parking`;

        return parkingType;
    }

    getParkingDetails(tags, isFree) {
        const details = [];

        if (isFree) {
            details.push('🆓 Free');
        } else if (tags.fee) {
            details.push('💰 Paid');
        }

        if (tags.capacity) {
            details.push(`${tags.capacity} spaces`);
        }

        if (tags.access === 'customers') {
            details.push('Customers only');
        }

        if (tags.maxstay) {
            details.push(`Max stay: ${tags.maxstay}`);
        }

        return details.join(' • ');
    }

    showSuggestions(inputType, suggestions) {
        const suggestionsContainer = document.getElementById(`${inputType}Suggestions`);
        if (!suggestionsContainer) return;

        if (suggestions.length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        suggestionsContainer.innerHTML = '';
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
                <div class="suggestion-type">${suggestion.type}</div>
                <div class="suggestion-main">${suggestion.main}</div>
                <div class="suggestion-details">${suggestion.details}</div>
            `;

            item.onclick = () => {
                this.selectSuggestion(inputType, suggestion);
            };

            suggestionsContainer.appendChild(item);
        });

        suggestionsContainer.style.display = 'block';
    }

    hideSuggestions(inputType) {
        const suggestionsContainer = document.getElementById(`${inputType}Suggestions`);
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    }

    selectSuggestion(inputType, suggestion) {
        const input = document.getElementById(`${inputType}Input`);
        if (input) {
            input.value = suggestion.main;
        }

        // Set the location
        if (inputType === 'from') {
            this.currentLocation = { lat: suggestion.lat, lng: suggestion.lng };
            this.updateCarPosition(suggestion.lat, suggestion.lng);
        } else {
            this.destination = { lat: suggestion.lat, lng: suggestion.lng };
            this.setDestination({ lat: suggestion.lat, lng: suggestion.lng });
        }

        this.hideSuggestions(inputType);
        this.showNotification(`📍 ${suggestion.type} selected: ${suggestion.main}`, 'success');
    }

    updateUnitDisplays() {
        console.log('🔄 Updating all unit displays...');

        // Update any existing distance/speed displays with new units
        if (this.routeData) {
            // Update route information displays
            const routeInfo = document.getElementById('journeyRouteInfo');
            if (routeInfo) {
                const distance = this.formatDistance(this.routeData.distance);
                const duration = Math.round(this.routeData.duration / 60);
                const hours = Math.floor(duration / 60);
                const minutes = duration % 60;
                const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

                routeInfo.innerHTML = `
                    <span class="route-name">${this.getRouteName(this.routeData.type)}</span>
                    <span class="route-stats">${distance} • ${timeText}</span>
                `;
            }
        }

        // Update route options if they exist
        const routeOptions = document.querySelectorAll('.route-option');
        routeOptions.forEach((option, index) => {
            if (this.availableRoutes && this.availableRoutes[index]) {
                const route = this.availableRoutes[index];
                const distanceSpan = option.querySelector('.route-stat-value');
                if (distanceSpan && distanceSpan.parentElement.querySelector('.route-stat-icon')?.textContent === '📏') {
                    distanceSpan.textContent = this.formatDistance(route.distance);
                }
            }
        });

        // Update navigation panel if active
        if (this.isNavigating) {
            this.updateNavigationProgress();
        }

        console.log('✅ Unit displays updated');
    }

    refreshAllDistanceDisplays() {
        console.log('🔄 Refreshing ALL distance displays with current units system...');

        // Update any visible distance text on the page
        const allElements = document.querySelectorAll('*');
        allElements.forEach(element => {
            if (element.textContent && element.textContent.includes('km') && !element.textContent.includes('km/h')) {
                // This is a distance display that might need updating
                console.log('Found potential distance display:', element.textContent);
            }
        });

        // Force update of specific known distance displays
        const routeStats = document.querySelectorAll('.route-stat-value');
        routeStats.forEach(stat => {
            const icon = stat.parentElement.querySelector('.route-stat-icon');
            if (icon && icon.textContent === '📏') {
                // This is a distance stat, force refresh if we have route data
                if (this.availableRoutes) {
                    const routeIndex = Array.from(stat.parentElement.parentElement.parentElement.children).indexOf(stat.parentElement.parentElement);
                    if (this.availableRoutes[routeIndex]) {
                        stat.textContent = this.formatDistance(this.availableRoutes[routeIndex].distance);
                    }
                }
            }
        });

        console.log('✅ All distance displays refreshed');
    }

    loadUnitsFromStorage() {
        const savedUnits = localStorage.getItem('vibeVoyageUnits');
        if (savedUnits) {
            try {
                this.units = { ...this.units, ...JSON.parse(savedUnits) };
                console.log('📏 Loaded units from storage:', this.units);
            } catch (error) {
                console.error('Error loading units from storage:', error);
            }
        }
    }

    initializeUnitSelectors() {
        // Set unit selectors to saved values
        const unitsSystemSelect = document.getElementById('unitsSystem');
        const distanceDisplay = document.getElementById('distanceDisplay');
        const speedSelect = document.getElementById('speedUnit');
        const fuelSelect = document.getElementById('fuelUnit');

        if (unitsSystemSelect) unitsSystemSelect.value = this.units.system;
        if (speedSelect) speedSelect.value = this.units.speed;
        if (fuelSelect) fuelSelect.value = this.units.fuel;

        // Update distance display based on system
        if (distanceDisplay) {
            let distanceText = 'Auto-set by Units System';
            if (this.units.system === 'metric') {
                distanceText = 'Kilometers (km) and Meters (m)';
            } else if (this.units.system === 'imperial') {
                distanceText = 'Miles (mi) and Feet (ft)';
            } else if (this.units.system === 'nautical') {
                distanceText = 'Nautical Miles (nm)';
            }
            distanceDisplay.textContent = distanceText;
        }

        // Update fuel price display
        this.updateFuelPriceDisplay();
    }

    updateFuelPriceDisplay() {
        const fuelPriceDisplay = document.getElementById('fuelPriceDisplay');
        if (fuelPriceDisplay && this.userCountry) {
            const priceDisplay = this.getFuelPriceDisplay();
            fuelPriceDisplay.innerHTML = `Current fuel price: ${priceDisplay}`;
        }
    }

    updateHeaderUnits() {
        // Update any header elements that display units
        const speedElements = document.querySelectorAll('.speed-display');
        const distanceElements = document.querySelectorAll('.distance-display');

        speedElements.forEach(element => {
            if (element.dataset.kmh) {
                const speed = parseFloat(element.dataset.kmh);
                const formatted = this.formatSpeed(speed);
                element.textContent = formatted;
            }
        });

        distanceElements.forEach(element => {
            if (element.dataset.meters) {
                const distance = parseFloat(element.dataset.meters);
                const formatted = this.formatDistance(distance);
                element.textContent = formatted;
            }
        });

        // Update navigation panel if active
        if (this.isNavigating) {
            this.updateNavigationProgress();
        }
    }

    async detectUserCountry() {
        try {
            // Try multiple methods to detect user country
            let country = await this.detectCountryByIP();

            if (!country && this.currentLocation) {
                country = await this.detectCountryByCoordinates(this.currentLocation.lat, this.currentLocation.lng);
            }

            if (!country) {
                country = this.detectCountryByTimezone();
            }

            if (!country) {
                country = this.detectCountryByLanguage();
            }

            this.userCountry = country || 'US';
            this.userCurrency = this.fuelPrices[this.userCountry]?.currency || 'USD';

            console.log(`🌍 Detected user country: ${this.userCountry}, currency: ${this.userCurrency}`);

        } catch (error) {
            console.error('Country detection failed:', error);
            this.userCountry = 'US';
            this.userCurrency = 'USD';
        }
    }

    async detectCountryByIP() {
        // Skip IP-based detection to avoid CORS issues in browser
        // Use other detection methods (timezone, language, coordinates) instead
        console.log('Skipping IP-based country detection (CORS limitations)');
        return null;
    }

    async detectCountryByCoordinates(lat, lng) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=3&addressdetails=1`
            );

            if (response.ok) {
                const data = await response.json();
                return data.address?.country_code?.toUpperCase();
            }
        } catch (error) {
            console.log('Coordinate-based country detection failed:', error);
        }

        return null;
    }

    detectCountryByTimezone() {
        try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

            // Map common timezones to countries
            const timezoneMap = {
                'America/New_York': 'US',
                'America/Chicago': 'US',
                'America/Denver': 'US',
                'America/Los_Angeles': 'US',
                'America/Toronto': 'CA',
                'America/Vancouver': 'CA',
                'Europe/London': 'GB',
                'Europe/Berlin': 'DE',
                'Europe/Paris': 'FR',
                'Australia/Sydney': 'AU',
                'Australia/Melbourne': 'AU',
                'Asia/Tokyo': 'JP'
            };

            return timezoneMap[timezone] || null;
        } catch (error) {
            console.log('Timezone-based country detection failed:', error);
            return null;
        }
    }

    detectCountryByLanguage() {
        try {
            const language = navigator.language || navigator.userLanguage;

            // Map language codes to likely countries
            const languageMap = {
                'en-US': 'US',
                'en-GB': 'GB',
                'en-CA': 'CA',
                'en-AU': 'AU',
                'fr-FR': 'FR',
                'fr-CA': 'CA',
                'de-DE': 'DE',
                'ja-JP': 'JP'
            };

            return languageMap[language] || null;
        } catch (error) {
            console.log('Language-based country detection failed:', error);
            return null;
        }
    }

    // Journey Control Functions
    showJourneyControlPanel(route) {
        const panel = document.getElementById('journeyControlPanel');
        const routeInfo = document.getElementById('journeyRouteInfo');

        if (!panel || !routeInfo) return;

        // Update route information
        const distance = (route.distance / 1000).toFixed(1);
        const duration = Math.round(route.duration / 60);
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        routeInfo.innerHTML = `
            <span class="route-name">${this.getRouteName(route.type)}</span>
            <span class="route-stats">${this.formatDistance(route.distance)} • ${timeText}</span>
        `;

        // Detect and display hazards
        this.detectRouteHazards(route);

        // Show panel
        panel.style.display = 'block';
        setTimeout(() => panel.classList.add('show'), 100);

        // Update journey state
        this.journeyState = 'route-selected';
    }

    async detectRouteHazards(route) {
        const hazardCount = document.getElementById('hazardCount');
        const hazardIcons = document.getElementById('hazardIcons');

        if (!hazardCount || !hazardIcons) return;

        // Real hazard detection (disabled fake hazards)
        const realHazards = await this.detectRealHazards();

        hazardCount.textContent = `${realHazards.length} hazards detected`;

        hazardIcons.innerHTML = '';
        realHazards.forEach(hazard => {
            const hazardElement = document.createElement('div');
            hazardElement.className = `hazard-icon ${hazard.type}`;
            hazardElement.innerHTML = `
                <span>${hazard.icon}</span>
                <span>${hazard.name}</span>
            `;
            hazardElement.onclick = () => this.showHazardDetails(hazard);
            hazardIcons.appendChild(hazardElement);
        });
    }

    showHazardDetails(hazard) {
        this.showNotification(`${hazard.icon} ${hazard.name} in ${hazard.distance}`, 'warning');
    }

    startJourney() {
        console.log('🚗 Starting journey...');

        if (this.journeyState !== 'route-selected') {
            this.showNotification('Please select a route first', 'error');
            return;
        }

        // Hide journey control panel
        this.hideJourneyControlPanel();

        // Start actual navigation
        this.journeyState = 'navigating';
        this.journeyStartTime = Date.now();
        this.isNavigating = true;

        // Show navigation panel
        this.showNavigationPanel();

        // Start location tracking
        this.startLocationTracking();

        // Enable follow mode
        this.enableFollowMode();

        // Initialize voice log
        this.initializeVoiceLog();

        // Start hazard monitoring
        this.startHazardMonitoring();

        this.showNotification('🚗 Journey started! Drive safely.', 'success');
        this.speakInstruction('Journey started. Follow the route and drive safely.');
        this.addVoiceLogEntry('Journey started');

        // Start turn-by-turn navigation
        this.startTurnByTurnNavigation();
    }

    pauseJourney() {
        console.log('⏸️ Pausing journey...');

        if (this.journeyState !== 'navigating') return;

        this.journeyState = 'paused';
        this.pausedTime = Date.now();
        this.isNavigating = false;

        // Stop location tracking
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        // Store last known position
        this.lastKnownNavigationPosition = { ...this.currentLocation };

        // Show resume button
        this.showResumeButton();

        this.showNotification('⏸️ Journey paused', 'warning');
        this.speakInstruction('Journey paused. Tap resume when ready to continue.');
        this.addVoiceLogEntry('Journey paused');
    }

    resumeJourney() {
        console.log('▶️ Resuming journey...');

        if (this.journeyState !== 'paused') return;

        this.journeyState = 'navigating';
        this.isNavigating = true;

        // Hide resume button
        this.hideResumeButton();

        // Resume location tracking
        this.startLocationTracking();

        // Re-enable follow mode
        this.enableFollowMode();

        const pauseDuration = Math.round((Date.now() - this.pausedTime) / 1000);
        this.showNotification('▶️ Journey resumed', 'success');
        this.speakInstruction('Journey resumed. Continue following the route.');
        this.addVoiceLogEntry(`Journey resumed after ${pauseDuration}s pause`);
    }

    cancelJourney() {
        console.log('❌ Cancelling journey...');

        this.journeyState = 'idle';
        this.isNavigating = false;
        this.journeyStartTime = null;
        this.pausedTime = null;
        this.lastKnownNavigationPosition = null;

        // Hide all panels
        this.hideJourneyControlPanel();
        this.hideNavigationPanel();

        // Stop location tracking
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        // Clear route and hazards
        this.clearRouteLines();
        this.clearHazardMarkers();

        // Stop hazard monitoring
        this.stopHazardMonitoring();

        this.showNotification('❌ Journey cancelled', 'info');
        this.addVoiceLogEntry('Journey cancelled');
    }

    hideJourneyControlPanel() {
        const panel = document.getElementById('journeyControlPanel');
        if (panel) {
            panel.classList.remove('show');
            setTimeout(() => {
                panel.style.display = 'none';
            }, 300);
        }
    }

    showResumeButton() {
        const startBtn = document.getElementById('startJourneyBtn');
        const resumeBtn = document.getElementById('resumeJourneyBtn');
        const pauseBtn = document.getElementById('pauseJourneyBtn');

        if (startBtn) startBtn.style.display = 'none';
        if (resumeBtn) resumeBtn.style.display = 'flex';
        if (pauseBtn) pauseBtn.style.display = 'none';
    }

    hideResumeButton() {
        const startBtn = document.getElementById('startJourneyBtn');
        const resumeBtn = document.getElementById('resumeJourneyBtn');
        const pauseBtn = document.getElementById('pauseJourneyBtn');

        if (startBtn) startBtn.style.display = 'none';
        if (resumeBtn) resumeBtn.style.display = 'none';
        if (pauseBtn) pauseBtn.style.display = 'flex';
    }

    // Mobile device detection
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768) ||
               ('ontouchstart' in window);
    }

    // Fix mobile map display issues
    fixMobileMapDisplay() {
        console.log('📱 Applying mobile map fixes...');

        if (!this.map) return;

        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        // Force container dimensions
        const containerRect = mapContainer.getBoundingClientRect();
        console.log('📱 Mobile map container:', {
            width: containerRect.width,
            height: containerRect.height,
            visible: containerRect.width > 0 && containerRect.height > 0
        });

        // If container is not visible, force dimensions
        if (containerRect.width === 0 || containerRect.height === 0) {
            console.log('📱 Forcing mobile map container dimensions');
            mapContainer.style.width = '100vw';
            mapContainer.style.height = '60vh';
            mapContainer.style.minHeight = '300px';
            mapContainer.style.display = 'block';
            mapContainer.style.position = 'relative';
        }

        // Force map to recalculate size
        setTimeout(() => {
            if (this.map) {
                this.map.invalidateSize(true);
                console.log('📱 Mobile map size invalidated');
            }
        }, 100);

        // Additional mobile-specific map settings
        if (this.map._container) {
            this.map._container.style.background = '#1a1a1a';
            this.map._container.style.cursor = 'grab';
        }
    }

    // Distance formatting for voice with user units
    formatDistanceForVoice(distanceInMeters) {
        const system = this.units.system || 'metric';

        if (system === 'imperial') {
            // Convert to feet/yards/miles
            const feet = distanceInMeters * 3.28084;
            if (feet < 100) {
                return `${Math.round(feet)} feet`;
            } else if (feet < 1760) {
                const yards = Math.round(feet / 3);
                return `${yards} yards`;
            } else {
                const miles = (feet / 5280).toFixed(1);
                return `${miles} miles`;
            }
        } else if (units === 'nautical') {
            // Convert to nautical miles
            const nauticalMiles = (distanceInMeters / 1852).toFixed(2);
            if (distanceInMeters < 1852) {
                return `${Math.round(distanceInMeters)} meters`;
            } else {
                return `${nauticalMiles} nautical miles`;
            }
        } else {
            // Metric (default)
            const converted = this.convertDistance(distanceInMeters);
            if (converted.unit === 'm') {
                return `${converted.value} meters`;
            } else {
                return `${converted.value} kilometers`;
            }
        }
    }

    // Voice Log Functions
    initializeVoiceLog() {
        const voiceLogContent = document.getElementById('voiceLogContent');
        if (voiceLogContent) {
            voiceLogContent.innerHTML = '';
        }
        this.addVoiceLogEntry('Voice log initialized');
    }

    addVoiceLogEntry(text) {
        const voiceLogContent = document.getElementById('voiceLogContent');
        if (!voiceLogContent) return;

        const time = new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        });

        const entry = document.createElement('div');
        entry.className = 'voice-entry';
        entry.innerHTML = `
            <span class="voice-time">${time}</span>
            <span class="voice-text">${text}</span>
        `;

        voiceLogContent.appendChild(entry);
        voiceLogContent.scrollTop = voiceLogContent.scrollHeight;

        // Keep only last 20 entries
        while (voiceLogContent.children.length > 20) {
            voiceLogContent.removeChild(voiceLogContent.firstChild);
        }
    }

    clearVoiceLog() {
        const voiceLogContent = document.getElementById('voiceLogContent');
        if (voiceLogContent) {
            voiceLogContent.innerHTML = '';
        }
        this.addVoiceLogEntry('Voice log cleared');
    }

    // Hazard Monitoring Functions
    startHazardMonitoring() {
        console.log('🚨 Starting hazard monitoring...');

        // Initialize hazard summary
        this.updateHazardSummary();

        // Test hazard loading
        // this.testHazardLoading(); // Commented out to prevent error

        // Start periodic hazard checks
        this.hazardCheckInterval = setInterval(() => {
            this.checkNearbyHazards();
        }, 5000); // Check every 5 seconds
    }

    stopHazardMonitoring() {
        if (this.hazardCheckInterval) {
            clearInterval(this.hazardCheckInterval);
            this.hazardCheckInterval = null;
        }
    }

    async updateHazardSummary() {
        const hazardSummaryContent = document.getElementById('hazardSummaryContent');
        const hazardTotal = document.getElementById('hazardTotal');

        if (!hazardSummaryContent || !hazardTotal) return;

        // Real hazards ahead on route (no fake data)
        const hazardsAhead = await this.getRealHazardsAhead();

        hazardTotal.textContent = `${hazardsAhead.length} ahead`;

        hazardSummaryContent.innerHTML = '';
        hazardsAhead.forEach(hazard => {
            const item = document.createElement('div');
            item.className = `hazard-summary-item ${hazard.type}`;
            item.innerHTML = `
                <span class="hazard-icon">${hazard.icon}</span>
                <div class="hazard-info">
                    <span class="hazard-name">${hazard.name}</span>
                    <span class="hazard-distance">${this.formatDistance(hazard.distance)} ahead</span>
                </div>
            `;
            item.onclick = () => this.showHazardDetails({
                ...hazard,
                distance: this.formatDistance(hazard.distance)
            });
            hazardSummaryContent.appendChild(item);
        });
    }

    async checkNearbyHazards() {
        if (!this.isNavigating || !this.currentLocation) return;

        // Use real hazard detection
        const nearbyHazards = await this.detectRealHazards();

        nearbyHazards.forEach(hazard => {
            if (hazard.distance < 500 && !hazard.alerted) {
                this.showHazardAlert(hazard);
                hazard.alerted = true;
            }
        });
    }

    async simulateNearbyHazards() {
        // Return real hazards only (no fake demonstrations)
        return await this.detectRealHazards();
    }

    // Real hazard detection functions
    async detectRealHazards() {
        if (!this.currentLocation) return [];

        try {
            // Use JavaScript HazardDetectionService if available
            if (this.hazardDetectionService) {
                const alerts = await this.hazardDetectionService.checkProximity(this.currentLocation);
                return alerts.map(alert => ({
                    id: alert.hazard.properties.id,
                    type: alert.hazard.properties.type,
                    name: this.getHazardDisplayName(alert.hazard.properties.type),
                    icon: this.getHazardIcon(alert.hazard.properties.type),
                    distance: alert.distance,
                    position: [alert.hazard.geometry.coordinates[1], alert.hazard.geometry.coordinates[0]],
                    severity: alert.hazard.properties.severity,
                    color: this.getHazardColor(alert.hazard.properties.type, alert.hazard.properties.severity)
                }));
            } else {
                // Fallback: Load hazards directly from GeoJSON
                return await this.loadHazardsDirectly();
            }
        } catch (error) {
            console.error('Error detecting real hazards:', error);
            return await this.loadHazardsDirectly();
        }
        return [];
    }

    async getRealHazardsAhead() {
        if (!this.currentLocation || !this.routeData) return [];

        try {
            // Use JavaScript HazardDetectionService if available
            if (this.hazardDetectionService && this.routeData && this.routeData.geometry) {
                const routeCoords = this.routeData.geometry.coordinates.map(coord => ({ lat: coord[1], lng: coord[0] }));
                const hazardFeatures = this.hazardDetectionService.getHazardsNearRoute(routeCoords, 500);

                return hazardFeatures.map(hazard => ({
                    id: hazard.properties.id,
                    type: hazard.properties.type,
                    name: this.getHazardDisplayName(hazard.properties.type),
                    icon: this.getHazardIcon(hazard.properties.type),
                    distance: this.calculateDistance(this.currentLocation, {
                        lat: hazard.geometry.coordinates[1],
                        lng: hazard.geometry.coordinates[0]
                    }),
                    position: [hazard.geometry.coordinates[1], hazard.geometry.coordinates[0]],
                    severity: hazard.properties.severity,
                    color: this.getHazardColor(hazard.properties.type, hazard.properties.severity)
                }));
            } else {
                // Fallback: Load hazards directly and filter by route
                const allHazards = await this.loadHazardsDirectly();

                if (!this.routeData || !this.routeData.geometry) {
                    return allHazards;
                }

                // Filter hazards that are near the route
                const routeCoords = this.routeData.geometry.coordinates.map(coord => ({ lat: coord[1], lng: coord[0] }));
                const nearRouteHazards = allHazards.filter(hazard => {
                    return routeCoords.some(routePoint => {
                        const distance = this.calculateDistance(routePoint, {
                            lat: hazard.position[0],
                            lng: hazard.position[1]
                        });
                        return distance <= 500; // Within 500 meters of route
                    });
                });

                return nearRouteHazards;
            }
        } catch (error) {
            console.error('Error getting hazards ahead:', error);
            return [];
        }
        return [];
    }

    getHazardDisplayName(type) {
        const names = {
            'speed_camera': 'Speed Camera',
            'red_light_camera': 'Red Light Camera',
            'roadwork': 'Road Work',
            'average_speed_camera': 'Average Speed Camera'
        };
        return names[type] || 'Unknown Hazard';
    }

    getHazardIcon(type) {
        const icons = {
            'speed_camera': '📷',
            'red_light_camera': '🚦',
            'roadwork': '🚧',
            'average_speed_camera': '📹'
        };
        return icons[type] || '⚠️';
    }

    getHazardColor(type, severity) {
        const baseColors = {
            'speed_camera': '#FFA500',
            'red_light_camera': '#FF6B6B',
            'roadwork': '#FFD700',
            'average_speed_camera': '#87CEEB'
        };

        let color = baseColors[type] || '#666';

        // Adjust for severity
        if (severity === 'high') {
            return color;
        } else if (severity === 'medium') {
            return color + 'CC'; // 80% opacity
        } else {
            return color + '99'; // 60% opacity
        }
    }

    async loadHazardsDirectly() {
        try {
            // Try multiple paths for the hazards file
            const paths = [
                './public/hazards.geojson',
                './hazards.geojson',
                '/public/hazards.geojson',
                '/hazards.geojson'
            ];

            for (const path of paths) {
                try {
                    console.log(`Trying to load hazards from: ${path}`);
                    const response = await fetch(path);
                    if (response.ok) {
                        const geojson = await response.json();
                        console.log(`✅ Loaded ${geojson.features?.length || 0} hazards from ${path}`);
                        return this.processHazardFeatures(geojson.features || []);
                    }
                } catch (pathError) {
                    console.warn(`Failed to load from ${path}:`, pathError);
                }
            }

            throw new Error('Hazards file not found in any location');
        } catch (error) {
            console.error('Error loading hazards directly:', error);
            return [];
        }
    }

    processHazardFeatures(features) {
        if (!this.currentLocation || !features) return [];

        return features
            .map(feature => {
                const distance = this.calculateDistance(
                    this.currentLocation,
                    { lat: feature.geometry.coordinates[1], lng: feature.geometry.coordinates[0] }
                );

                return {
                    id: feature.properties.id,
                    type: feature.properties.type,
                    name: this.getHazardDisplayName(feature.properties.type),
                    icon: this.getHazardIcon(feature.properties.type),
                    distance: distance,
                    position: [feature.geometry.coordinates[1], feature.geometry.coordinates[0]],
                    severity: feature.properties.severity,
                    color: this.getHazardColor(feature.properties.type, feature.properties.severity)
                };
            })
            .filter(hazard => hazard.distance <= 1000) // Only show hazards within 1km
            .sort((a, b) => a.distance - b.distance);
    }

    async testHazardLoading() {
        console.log('🧪 Testing hazard loading...');
        try {
            const hazards = await this.loadHazardsDirectly();
            console.log(`🧪 Test result: ${hazards.length} hazards loaded`);
            if (hazards.length > 0) {
                console.log('🧪 Sample hazard:', hazards[0]);
                this.showNotification(`✅ Hazard detection working: ${hazards.length} hazards loaded`, 'success');
            } else {
                this.showNotification('⚠️ No hazards loaded - check hazards.geojson file', 'warning');
            }
        } catch (error) {
            console.error('🧪 Hazard loading test failed:', error);
            this.showNotification('❌ Hazard detection failed', 'error');
        }
    }

    // Turn-by-turn navigation
    startTurnByTurnNavigation() {
        console.log('🗣️ Starting turn-by-turn navigation...');

        if (!this.currentRoute || !this.currentRoute.instructions) {
            console.log('❌ No route instructions available for navigation');
            return;
        }

        this.navigationInstructions = this.currentRoute.instructions;
        this.currentInstructionIndex = 0;
        this.navigationActive = true;

        // Start monitoring location for navigation
        this.startNavigationLocationTracking();

        // Give first instruction
        if (this.navigationInstructions.length > 0) {
            const firstInstruction = this.navigationInstructions[0];
            this.announceInstruction(firstInstruction);
        }
    }

    startNavigationLocationTracking() {
        if (this.navigationLocationWatcher) {
            navigator.geolocation.clearWatch(this.navigationLocationWatcher);
        }

        this.navigationLocationWatcher = navigator.geolocation.watchPosition(
            (position) => {
                if (this.navigationActive) {
                    this.updateNavigationProgress(position);
                }
            },
            (error) => {
                console.error('❌ Navigation location error:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 1000
            }
        );
    }

    updateNavigationProgress(position) {
        if (!this.navigationInstructions || this.currentInstructionIndex >= this.navigationInstructions.length) {
            return;
        }

        const currentInstruction = this.navigationInstructions[this.currentInstructionIndex];
        const userLocation = [position.coords.latitude, position.coords.longitude];

        // Calculate distance to next instruction point
        if (currentInstruction.location) {
            const distanceToInstruction = this.calculateDistance(
                userLocation,
                currentInstruction.location
            );

            // If close to instruction point, announce next instruction
            if (distanceToInstruction < 50) { // 50 meters
                this.currentInstructionIndex++;
                if (this.currentInstructionIndex < this.navigationInstructions.length) {
                    const nextInstruction = this.navigationInstructions[this.currentInstructionIndex];
                    this.announceInstruction(nextInstruction);
                } else {
                    this.announceArrival();
                }
            }
        }
    }

    announceInstruction(instruction) {
        if (!instruction) return;

        const distance = instruction.distance ? this.formatDistanceForVoice(instruction.distance) : '';
        const direction = instruction.text || instruction.instruction || 'Continue straight';

        let announcement = direction;
        if (distance) {
            announcement = `In ${distance}, ${direction}`;
        }

        console.log('🗣️ Navigation instruction:', announcement);
        this.speakInstruction(announcement);
        this.addVoiceLogEntry(`Navigation: ${announcement}`);
    }

    announceArrival() {
        const announcement = 'You have arrived at your destination';
        console.log('🏁 Arrival announcement:', announcement);
        this.speakInstruction(announcement);
        this.addVoiceLogEntry('Navigation: Arrived at destination');
        this.navigationActive = false;

        if (this.navigationLocationWatcher) {
            navigator.geolocation.clearWatch(this.navigationLocationWatcher);
        }
    }

    // Map control functions
    recenterMap() {
        console.log('🎯 Recentering map...');

        if (!this.map) {
            console.log('❌ Map not initialized');
            this.showNotification('Map not ready', 'warning');
            return;
        }

        // If we have a current location, center on it
        if (this.currentLocation) {
            console.log('📍 Centering on current location:', this.currentLocation);
            this.map.setView([this.currentLocation.lat, this.currentLocation.lng], 15, {
                animate: true,
                duration: 0.5
            });
            this.showNotification('🎯 Map recentered on your location', 'success');
            this.addVoiceLogEntry('Map recentered on current location');
        }
        // If we have a destination but no current location, center on destination
        else if (this.destination) {
            console.log('🎯 Centering on destination:', this.destination);
            this.map.setView([this.destination.lat, this.destination.lng], 15, {
                animate: true,
                duration: 0.5
            });
            this.showNotification('🎯 Map centered on destination', 'info');
        }
        // If we have a route, fit the route bounds
        else if (this.currentRoute && this.currentRoute.coordinates) {
            console.log('🗺️ Fitting route bounds');
            const bounds = L.latLngBounds(this.currentRoute.coordinates);
            this.map.fitBounds(bounds, { padding: [20, 20] });
            this.showNotification('🎯 Map centered on route', 'info');
        }
        // Default to a general location (London)
        else {
            console.log('🌍 Centering on default location');
            this.map.setView([51.5074, -0.1278], 10, {
                animate: true,
                duration: 0.5
            });
            this.showNotification('🎯 Map recentered', 'info');
        }
    }

    zoomIn() {
        console.log('➕ Zooming in...');

        if (!this.map) {
            console.log('❌ Map not initialized');
            this.showNotification('Map not ready', 'warning');
            return;
        }

        const currentZoom = this.map.getZoom();
        const newZoom = Math.min(currentZoom + 1, 22); // Max zoom 22

        this.map.setZoom(newZoom, {
            animate: true,
            duration: 0.3
        });

        console.log(`🔍 Zoomed in to level ${newZoom}`);
        this.showNotification(`🔍 Zoom level: ${newZoom}`, 'info');
    }

    zoomOut() {
        console.log('➖ Zooming out...');

        if (!this.map) {
            console.log('❌ Map not initialized');
            this.showNotification('Map not ready', 'warning');
            return;
        }

        const currentZoom = this.map.getZoom();
        const newZoom = Math.max(currentZoom - 1, 3); // Min zoom 3

        this.map.setZoom(newZoom, {
            animate: true,
            duration: 0.3
        });

        console.log(`🔍 Zoomed out to level ${newZoom}`);
        this.showNotification(`🔍 Zoom level: ${newZoom}`, 'info');
    }

    // Hazard avoidance routing functions
    buildRouteExclusions() {
        const settings = this.hazardAvoidanceSettings;
        let baseExclusions = [];

        // Build base exclusions from hazard settings
        if (settings.railwayCrossings) {
            // Avoid road types that commonly have railway crossings
            baseExclusions.push('trunk'); // Trunk roads often have level crossings
        }

        if (settings.tollBooths) {
            baseExclusions.push('toll'); // Avoid toll roads
        }

        if (settings.bridges) {
            baseExclusions.push('ferry'); // Avoid ferries and some bridge types
        }

        // Additional hazard-based exclusions
        if (settings.speedCameras || settings.redLightCameras) {
            // Speed cameras are often on major roads - avoid motorways for camera avoidance
            // This is a compromise since OSRM doesn't have camera-specific exclusions
        }

        if (settings.narrowRoads) {
            // Avoid residential and unclassified roads which tend to be narrow
            baseExclusions.push('residential', 'unclassified');
        }

        if (settings.steepGrades) {
            // Avoid trunk roads which may have steep grades in hilly areas
            if (!baseExclusions.includes('trunk')) {
                baseExclusions.push('trunk');
            }
        }

        const baseExclusionString = baseExclusions.length > 0 ? `,${baseExclusions.join(',')}` : '';

        return {
            fastest: baseExclusionString,
            noHighway: baseExclusionString + ',motorway', // Avoid highways for safer route
            shortest: baseExclusionString,
            noLights: baseExclusionString + ',trunk,secondary', // Avoid roads with many traffic lights
            noRailway: baseExclusionString + (settings.railwayCrossings ? ',trunk,secondary' : '')
        };
    }

    buildOSRMExcludeParams(exclusions) {
        // Convert exclusion strings to OSRM API parameters
        const buildExcludeParam = (exclusionString) => {
            if (!exclusionString || exclusionString.length === 0) {
                return '';
            }
            // Remove leading comma and build exclude parameter
            const cleanExclusions = exclusionString.startsWith(',') ? exclusionString.substring(1) : exclusionString;
            return cleanExclusions ? `&exclude=${cleanExclusions}` : '';
        };

        return {
            primary: buildExcludeParam(exclusions.fastest),
            noHighway: buildExcludeParam(exclusions.noHighway + ',motorway,trunk'),
            shortest: buildExcludeParam(exclusions.shortest),
            noRailway: buildExcludeParam(exclusions.noRailway),
            fastest: buildExcludeParam(exclusions.fastest)
        };
    }

    getActiveHazardTypes() {
        const settings = this.hazardAvoidanceSettings;
        const activeHazards = [];

        if (settings.speedCameras) activeHazards.push('Speed Cameras');
        if (settings.redLightCameras) activeHazards.push('Red Light Cameras');
        if (settings.railwayCrossings) activeHazards.push('Railway Crossings');
        if (settings.tollBooths) activeHazards.push('Toll Booths');
        if (settings.bridges) activeHazards.push('Bridges/Ferries');
        if (settings.narrowRoads) activeHazards.push('Narrow Roads');
        if (settings.steepGrades) activeHazards.push('Steep Grades');
        if (settings.schoolZones) activeHazards.push('School Zones');
        if (settings.hospitalZones) activeHazards.push('Hospital Zones');
        if (settings.accidents) activeHazards.push('Accident Reports');
        if (settings.roadwork) activeHazards.push('Road Works');
        if (settings.policeReports) activeHazards.push('Police Reports');

        return activeHazards;
    }

    updateHazardAvoidanceSettings() {
        console.log('🚨 Updating hazard avoidance settings...');

        // Read settings from the hazard panel checkboxes
        const settings = {
            speedCameras: this.getCheckboxValue('speedCameras'),
            redLightCameras: this.getCheckboxValue('redLightCameras'),
            railwayCrossings: this.getCheckboxValue('railwayCrossings'),
            trafficLights: this.getCheckboxValue('trafficLights'),
            schoolZones: this.getCheckboxValue('schoolZones'),
            hospitalZones: this.getCheckboxValue('hospitalZones'),
            tollBooths: this.getCheckboxValue('tollBooths'),
            bridges: this.getCheckboxValue('bridges'),
            accidents: this.getCheckboxValue('accidents'),
            weather: this.getCheckboxValue('weather'),
            steepGrades: this.getCheckboxValue('steepGrades'),
            narrowRoads: this.getCheckboxValue('narrowRoads'),
            policeReports: this.getCheckboxValue('policeReports'),
            roadwork: this.getCheckboxValue('roadwork')
        };

        this.hazardAvoidanceSettings = settings;
        console.log('🚨 Updated hazard settings:', settings);

        // If we have a current route, recalculate with new settings
        if (this.currentLocation && this.destination) {
            console.log('🔄 Recalculating routes with new hazard settings...');
            this.showNotification('🔄 Recalculating routes with hazard avoidance...', 'info');
            this.calculateMultipleRoutes();
        }
    }

    getCheckboxValue(id) {
        const checkbox = document.getElementById(id);
        return checkbox ? checkbox.checked : false;
    }

    // Hazard Settings Toggle Method
    toggleHazardSettings() {
        console.log('🚨 Toggling hazard settings...');
        const container = document.getElementById('hazardAvoidanceContainer');
        if (container) {
            console.log('Container current display:', container.style.display);
            if (container.style.display === 'none' || !container.style.display) {
                console.log('Opening hazard settings...');
                container.style.display = 'block';
                // Always refresh hazard panel content to ensure latest version
                container.innerHTML = '';
                container.innerHTML = `
                    <div class="hazard-panel-content" style="background: #1a1a1a; border-radius: 12px; padding: 20px; color: #fff; border: 1px solid #333; max-width: 500px; margin: 0 auto; position: relative;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h3 style="color: #00FF88; margin: 0;">🚨 Hazard Avoidance</h3>
                            <button onclick="if(window.app) window.app.toggleHazardSettings()" style="background: #FF6B6B; border: none; color: white; font-size: 18px; cursor: pointer; padding: 5px 10px; border-radius: 4px; font-weight: bold; z-index: 10001; position: relative;">✕ Close</button>
                        </div>
                        <div style="margin-bottom: 15px; max-height: 300px; overflow-y: auto;">
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="speedCameras" checked onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 📷 Speed Cameras
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="redLightCameras" checked onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 🚦 Red Light Cameras
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="policeReports" checked onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 🚨 Police Reports
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="roadwork" onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 🚧 Road Works
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="railwayCrossings" checked onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 🚂 Railway Crossings
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="trafficLights" onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 🚦 Complex Junctions
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="schoolZones" checked onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 🏫 School Zones
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="hospitalZones" checked onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 🏥 Hospital Zones
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="tollBooths" onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 💰 Toll Booths
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="bridges" onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 🌉 Bridges/Tunnels
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="accidents" checked onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 💥 Accident Reports
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="weather" onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 🌧️ Weather Alerts
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="steepGrades" onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> ⛰️ Steep Grades
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="narrowRoads" onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 🛤️ Narrow Roads
                            </label>
                        </div>
                        <div style="margin-top: 15px;">
                            <label style="display: block; margin-bottom: 5px;">Alert Distance: <span id="alertDistanceValue">500m</span></label>
                            <input type="range" min="100" max="1000" step="50" value="500" style="width: 100%;"
                                   onchange="document.getElementById('alertDistanceValue').textContent = this.value + 'm'">
                        </div>
                        <div style="margin-top: 20px; text-align: center;">
                            <button onclick="if(window.app) window.app.toggleHazardSettings()" style="background: #00FF88; color: #000; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px;">Close Hazard Settings</button>
                        </div>
                    </div>
                `;
                this.showNotification('Hazard settings opened', 'info');

                // Add click-outside-to-close functionality
                container.onclick = (e) => {
                    if (e.target === container) {
                        this.toggleHazardSettings();
                    }
                };
            } else {
                console.log('Closing hazard settings...');
                container.style.display = 'none';
                console.log('Container display set to none');
                this.showNotification('Hazard settings closed', 'info');
            }
        }
    }

    getHazardAvoidanceDescription() {
        const settings = this.hazardAvoidanceSettings;
        const avoided = [];

        if (settings.railwayCrossings) avoided.push('railway crossings');
        if (settings.tollBooths) avoided.push('toll roads');
        if (settings.bridges) avoided.push('bridges/ferries');
        if (settings.speedCameras) avoided.push('speed cameras');
        if (settings.trafficLights) avoided.push('traffic lights');

        if (avoided.length === 0) {
            return '';
        } else if (avoided.length === 1) {
            return ` • Avoids ${avoided[0]}`;
        } else if (avoided.length === 2) {
            return ` • Avoids ${avoided[0]} and ${avoided[1]}`;
        } else {
            const lastItem = avoided.pop();
            return ` • Avoids ${avoided.join(', ')}, and ${lastItem}`;
        }
    }

    // Map control functions
    recenterMap() {
        console.log('🎯 Recentering map...');

        if (!this.map) {
            console.log('❌ Map not initialized');
            this.showNotification('Map not ready', 'warning');
            return;
        }

        // If we have a current location, center on it
        if (this.currentLocation) {
            console.log('📍 Centering on current location:', this.currentLocation);
            this.map.setView([this.currentLocation.lat, this.currentLocation.lng], 15, {
                animate: true,
                duration: 0.5
            });
            this.showNotification('🎯 Map recentered on your location', 'success');
            this.addVoiceLogEntry('Map recentered on current location');
        }
        // If we have a destination but no current location, center on destination
        else if (this.destination) {
            console.log('🎯 Centering on destination:', this.destination);
            this.map.setView([this.destination.lat, this.destination.lng], 15, {
                animate: true,
                duration: 0.5
            });
            this.showNotification('🎯 Map centered on destination', 'info');
        }
        // If we have a route, fit the route bounds
        else if (this.currentRoute && this.currentRoute.coordinates) {
            console.log('🗺️ Fitting route bounds');
            const bounds = L.latLngBounds(this.currentRoute.coordinates);
            this.map.fitBounds(bounds, { padding: [20, 20] });
            this.showNotification('🎯 Map centered on route', 'info');
        }
        // Default to a general location (London)
        else {
            console.log('🌍 Centering on default location');
            this.map.setView([51.5074, -0.1278], 10, {
                animate: true,
                duration: 0.5
            });
            this.showNotification('🎯 Map recentered', 'info');
        }
    }

    showHazardAlert(hazard) {
        const alertElement = document.getElementById('navHazardAlert');
        if (alertElement) {
            alertElement.style.display = 'flex';
            alertElement.innerHTML = `
                <span class="hazard-icon">${hazard.icon}</span>
                <span class="hazard-text">${hazard.name} in ${Math.round(hazard.distance)}m</span>
            `;

            // Auto-hide after 10 seconds
            setTimeout(() => {
                alertElement.style.display = 'none';
            }, 10000);
        }

        // Voice alert with proper units
        const distanceText = this.formatDistanceForVoice(hazard.distance);
        this.speakInstruction(`${hazard.name} ahead in ${distanceText}`, 'high');
        this.addVoiceLogEntry(`Alert: ${hazard.name} in ${distanceText}`);
    }

    // Hazard Marker Functions
    async addHazardMarkersToRoute(route) {
        if (!this.map || !route) return;

        // Clear existing hazard markers
        this.clearHazardMarkers();

        // Get real hazards along the route
        const routeCoords = route.geometry.coordinates.map(coord => ({ lat: coord[1], lng: coord[0] }));

        try {
            // Load hazards directly and add markers (pure JavaScript implementation)
            const hazards = await this.getRealHazardsAhead();
            hazards.forEach(hazard => {
                const marker = this.createHazardMarker({
                    ...hazard,
                    description: 'Hazard detected along route'
                });
                this.hazardMarkers.push(marker);
            });
        } catch (error) {
            console.error('Error adding hazard markers to route:', error);
        }
    }

    generateRouteHazards(routeCoords) {
        const hazards = [];
        const hazardTypes = [
            { type: 'camera', icon: '📸', name: 'Speed Camera', color: '#FFA500' },
            { type: 'police', icon: '🚨', name: 'Police Report', color: '#FF6B6B' },
            { type: 'roadwork', icon: '🚧', name: 'Road Work', color: '#FFD700' },
            { type: 'traffic-light', icon: '🚦', name: 'Red Light Camera', color: '#87CEEB' },
            { type: 'railway', icon: '🚂', name: 'Railway Crossing', color: '#8B4513' },
            { type: 'crossroad', icon: '🛣️', name: 'Complex Junction', color: '#9370DB' },
            { type: 'school-zone', icon: '🏫', name: 'School Zone', color: '#32CD32' },
            { type: 'hospital', icon: '🏥', name: 'Hospital Zone', color: '#FF69B4' },
            { type: 'toll', icon: '💰', name: 'Toll Booth', color: '#DAA520' },
            { type: 'bridge', icon: '🌉', name: 'Bridge/Tunnel', color: '#708090' },
            { type: 'accident', icon: '💥', name: 'Accident Report', color: '#DC143C' },
            { type: 'weather', icon: '🌧️', name: 'Weather Alert', color: '#4682B4' },
            { type: 'steep-hill', icon: '⛰️', name: 'Steep Grade', color: '#8B4513' },
            { type: 'narrow-road', icon: '🛤️', name: 'Narrow Road', color: '#696969' }
        ];

        // Add hazards at random points along route
        for (let i = 0; i < Math.min(5, Math.floor(routeCoords.length / 20)); i++) {
            const randomIndex = Math.floor(Math.random() * routeCoords.length);
            const coord = routeCoords[randomIndex];
            const hazardType = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];

            hazards.push({
                id: `hazard_${i}`,
                ...hazardType,
                position: [coord[1], coord[0]], // [lat, lng]
                description: `${hazardType.name} reported by community`,
                timestamp: Date.now() - Math.random() * 3600000, // Random time in last hour
                confidence: Math.random() * 0.4 + 0.6 // 60-100% confidence
            });
        }

        return hazards;
    }

    createHazardMarker(hazard) {
        // Create custom icon
        const hazardIcon = L.divIcon({
            className: 'hazard-marker',
            html: `
                <div class="hazard-marker-content" style="
                    background: ${hazard.color};
                    color: #000;
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    border: 2px solid #fff;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    cursor: pointer;
                    animation: hazardPulse 2s ease-in-out infinite;
                ">
                    ${hazard.icon}
                </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        // Create marker
        const marker = L.marker(hazard.position, { icon: hazardIcon })
            .addTo(this.map);

        // Add click handler
        marker.on('click', () => {
            this.showHazardPopup(hazard, marker);
        });

        // Add hover effects
        marker.on('mouseover', () => {
            marker.getElement().style.transform = 'scale(1.2)';
        });

        marker.on('mouseout', () => {
            marker.getElement().style.transform = 'scale(1)';
        });

        return marker;
    }

    showHazardPopup(hazard, marker) {
        const timeAgo = this.getTimeAgo(hazard.timestamp);
        const confidence = Math.round(hazard.confidence * 100);

        const popupContent = `
            <div class="hazard-popup">
                <div class="hazard-popup-header">
                    <span class="hazard-popup-icon">${hazard.icon}</span>
                    <span class="hazard-popup-title">${hazard.name}</span>
                </div>
                <div class="hazard-popup-content">
                    <p><strong>Description:</strong> ${hazard.description}</p>
                    <p><strong>Reported:</strong> ${timeAgo}</p>
                    <p><strong>Confidence:</strong> ${confidence}%</p>
                </div>
                <div class="hazard-popup-actions">
                    <button onclick="app.confirmHazard('${hazard.id}')" class="hazard-btn confirm">
                        👍 Confirm
                    </button>
                    <button onclick="app.reportHazardGone('${hazard.id}')" class="hazard-btn gone">
                        ❌ Not There
                    </button>
                </div>
            </div>
        `;

        marker.bindPopup(popupContent, {
            maxWidth: 250,
            className: 'hazard-popup-container'
        }).openPopup();

        // Add voice announcement
        this.addVoiceLogEntry(`Hazard details: ${hazard.name}`);
    }

    confirmHazard(hazardId) {
        this.showNotification('👍 Hazard confirmed - thank you!', 'success');
        this.addVoiceLogEntry('Hazard confirmed by user');
    }

    reportHazardGone(hazardId) {
        // Find and remove the hazard marker
        const markerIndex = this.hazardMarkers.findIndex(marker =>
            marker.options.hazardId === hazardId
        );

        if (markerIndex !== -1) {
            this.map.removeLayer(this.hazardMarkers[markerIndex]);
            this.hazardMarkers.splice(markerIndex, 1);
        }

        this.showNotification('❌ Hazard removed - thank you!', 'success');
        this.addVoiceLogEntry('Hazard reported as gone');
    }

    clearHazardMarkers() {
        this.hazardMarkers.forEach(marker => {
            if (this.map.hasLayer(marker)) {
                this.map.removeLayer(marker);
            }
        });
        this.hazardMarkers = [];
    }

    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ago`;
        } else if (minutes > 0) {
            return `${minutes}m ago`;
        } else {
            return 'Just now';
        }
    }

    setupMapInteractionHandlers() {
        if (!this.map) return;

        // Disable follow mode when user manually interacts with map
        this.map.on('dragstart', () => {
            if (this.followMode && this.isNavigating) {
                console.log('🖱️ User dragging map - disabling follow mode');
                this.disableFollowMode();
            }
        });

        // Disable follow mode on zoom by user
        this.map.on('zoomstart', (e) => {
            // Only disable if zoom was initiated by user, not programmatically
            if (this.followMode && this.isNavigating && !e.hard) {
                console.log('🔍 User zooming map - disabling follow mode');
                this.disableFollowMode();
            }
        });

        // Re-enable follow mode if user double-clicks on their location
        this.map.on('dblclick', (e) => {
            if (this.isNavigating && this.currentLocation) {
                const clickedLocation = e.latlng;
                const userLocation = L.latLng(this.currentLocation.lat, this.currentLocation.lng);
                const distance = clickedLocation.distanceTo(userLocation);

                // If double-clicked within 100m of user location, enable follow mode
                if (distance < 100) {
                    console.log('👆 Double-clicked near user location - enabling follow mode');
                    this.enableFollowMode();
                }
            }
        });
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

        // Show lane guidance for upcoming intersections
        if (currentStep.distance < 500 && currentStep.intersections && currentStep.intersections.length > 0) {
            const intersection = currentStep.intersections[0];
            if (intersection.lanes && intersection.lanes.length > 1) {
                this.showLaneGuidance(intersection.lanes);
            }
        } else if (currentStep.distance > 500) {
            // Hide lane guidance when far from intersection
            this.hideLaneGuidance();
        }

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
        // Check if lane guidance is enabled in settings
        const laneGuidanceToggle = document.getElementById('laneGuidanceToggle');
        if (laneGuidanceToggle && !laneGuidanceToggle.checked) {
            return; // Lane guidance disabled
        }

        console.log('🛣️ Showing lane guidance:', lanes);

        // Show the lane visualization panel
        const laneVisualization = document.getElementById('laneVisualization');
        if (laneVisualization) {
            laneVisualization.style.display = 'block';
        }

        // Create top-down lane display
        this.createLaneDisplay(lanes);

        // Create 3D road view
        this.create3DRoadView(lanes);

        // Update lane instruction text
        this.updateLaneInstruction(lanes);
    }

    createLaneDisplay(lanes) {
        const laneDisplay = document.getElementById('laneDisplay');
        if (!laneDisplay) return;

        laneDisplay.innerHTML = '';

        lanes.forEach((lane, index) => {
            const laneItem = document.createElement('div');
            laneItem.className = 'lane-item';

            // Determine lane status
            if (lane.valid) {
                if (lane.active || (lane.indications && lane.indications.includes('straight'))) {
                    laneItem.classList.add('recommended');
                } else {
                    laneItem.classList.add('valid');
                }
            }

            // Create arrow element
            const arrow = document.createElement('div');
            arrow.className = 'lane-arrow';
            arrow.textContent = this.getLaneArrow(lane);

            // Create lane number
            const number = document.createElement('div');
            number.className = 'lane-number';
            number.textContent = index + 1;

            laneItem.appendChild(arrow);
            laneItem.appendChild(number);
            laneDisplay.appendChild(laneItem);
        });
    }

    create3DRoadView(lanes) {
        const roadView = document.getElementById('laneRoadView');
        if (!roadView) return;

        roadView.innerHTML = '';

        // Create road surface
        const roadSurface = document.createElement('div');
        roadSurface.className = 'road-surface';
        roadView.appendChild(roadSurface);

        // Calculate lane width
        const laneWidth = 100 / lanes.length;

        // Create road lanes
        lanes.forEach((lane, index) => {
            const roadLane = document.createElement('div');
            roadLane.className = 'road-lane';
            roadLane.style.left = `${index * laneWidth}%`;
            roadLane.style.width = `${laneWidth}%`;

            if (lane.valid) {
                if (lane.active || (lane.indications && lane.indications.includes('straight'))) {
                    roadLane.classList.add('recommended');
                } else {
                    roadLane.classList.add('valid');
                }
            }

            roadView.appendChild(roadLane);
        });

        // Add car indicator
        const car = document.createElement('div');
        car.className = 'road-car';
        car.textContent = '🚗';

        // Position car in current lane (assume middle lane for now)
        const currentLaneIndex = Math.floor(lanes.length / 2);
        car.style.left = `${(currentLaneIndex * laneWidth) + (laneWidth / 2) - 10}px`;

        roadView.appendChild(car);
    }

    getLaneArrow(lane) {
        if (!lane.indications || lane.indications.length === 0) {
            return '↑';
        }

        const indication = lane.indications[0];
        const arrows = {
            'left': '←',
            'right': '→',
            'straight': '↑',
            'slight_left': '↖',
            'slight_right': '↗',
            'sharp_left': '↙',
            'sharp_right': '↘',
            'uturn': '↩',
            'merge_left': '↰',
            'merge_right': '↱'
        };

        return arrows[indication] || '↑';
    }

    updateLaneInstruction(lanes) {
        const instructionElement = document.getElementById('laneInstruction');
        if (!instructionElement) return;

        const validLanes = lanes.filter(lane => lane.valid);
        const recommendedLanes = lanes.filter(lane =>
            lane.valid && (lane.active || (lane.indications && lane.indications.includes('straight')))
        );

        let instruction = '';

        if (recommendedLanes.length > 0) {
            const laneNumbers = recommendedLanes.map((_, index) =>
                lanes.findIndex(lane => lane === recommendedLanes[index]) + 1
            );

            if (laneNumbers.length === 1) {
                instruction = `Use lane ${laneNumbers[0]}`;
            } else {
                instruction = `Use lanes ${laneNumbers.join(' or ')}`;
            }
        } else if (validLanes.length > 0) {
            const laneNumbers = validLanes.map((_, index) =>
                lanes.findIndex(lane => lane === validLanes[index]) + 1
            );

            if (laneNumbers.length === 1) {
                instruction = `Use lane ${laneNumbers[0]}`;
            } else if (laneNumbers.length <= 3) {
                instruction = `Use lanes ${laneNumbers.join(' or ')}`;
            } else {
                instruction = `Use any of ${laneNumbers.length} lanes`;
            }
        } else {
            instruction = 'Follow the road';
        }

        instructionElement.textContent = instruction;
    }

    hideLaneGuidance() {
        const laneVisualization = document.getElementById('laneVisualization');
        if (laneVisualization) {
            laneVisualization.style.display = 'none';
        }
    }

    // Simulate lane data for demonstration
    simulateLaneData() {
        const scenarios = [
            {
                name: "Highway Merge",
                lanes: [
                    { valid: false, indications: ['left'] },
                    { valid: true, indications: ['left', 'straight'], active: false },
                    { valid: true, indications: ['straight'], active: true },
                    { valid: true, indications: ['straight', 'right'], active: false },
                    { valid: false, indications: ['right'] }
                ]
            },
            {
                name: "City Intersection",
                lanes: [
                    { valid: true, indications: ['left'], active: false },
                    { valid: true, indications: ['straight'], active: true },
                    { valid: true, indications: ['straight'], active: true },
                    { valid: true, indications: ['right'], active: false }
                ]
            },
            {
                name: "Highway Exit",
                lanes: [
                    { valid: true, indications: ['straight'], active: false },
                    { valid: true, indications: ['straight'], active: false },
                    { valid: true, indications: ['straight', 'right'], active: true },
                    { valid: true, indications: ['right'], active: true },
                    { valid: false, indications: ['right'] }
                ]
            },
            {
                name: "Roundabout Approach",
                lanes: [
                    { valid: false, indications: ['left'] },
                    { valid: true, indications: ['straight'], active: true },
                    { valid: true, indications: ['straight', 'right'], active: false },
                    { valid: false, indications: ['right'] }
                ]
            }
        ];

        // Cycle through scenarios
        if (!this.currentScenarioIndex) {
            this.currentScenarioIndex = 0;
        }

        const scenario = scenarios[this.currentScenarioIndex];
        this.showLaneGuidance(scenario.lanes);

        // Show scenario name
        this.showNotification(`🛣️ Lane Scenario: ${scenario.name}`, 'info');

        // Move to next scenario
        this.currentScenarioIndex = (this.currentScenarioIndex + 1) % scenarios.length;

        // Auto-hide after 8 seconds for demo
        setTimeout(() => {
            this.hideLaneGuidance();
        }, 8000);
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
        const converted = this.convertDistance(meters);
        return `${converted.value} ${converted.unit}`;
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

                // Calculate heading and speed if we have a previous location
                let heading = 0;
                let speed = 0;

                if (this.currentLocation) {
                    heading = this.calculateBearing(
                        this.currentLocation.lat, this.currentLocation.lng,
                        newLocation.lat, newLocation.lng
                    );

                    // Calculate speed from position changes
                    speed = this.calculateSpeedFromPosition(this.currentLocation, newLocation, position.timestamp);
                }

                // Use GPS speed if available, otherwise use calculated speed
                this.currentSpeed = position.coords.speed ?
                    position.coords.speed * 3.6 : // Convert m/s to km/h (internal)
                    speed;

                this.currentLocation = newLocation;

                // Update car position with heading
                this.updateCarPosition(newLocation.lat, newLocation.lng, heading);

                // Handle follow mode and auto-centering
                this.handleLocationUpdate(newLocation);

                // Update navigation instructions and progress
                if (this.isNavigating) {
                    this.updateNavigationInstructions();
                    this.updateNavigationProgress();
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

        // Update ETA, remaining distance, and total distance
        const eta = this.calculateETA(remainingDistance);
        const etaElement = document.getElementById('navETA');
        const remainingElement = document.getElementById('navRemaining');
        const totalElement = document.getElementById('navTotal');

        if (etaElement) {
            etaElement.textContent = `ETA: ${eta}`;
        }

        if (remainingElement) {
            const formattedRemaining = this.formatDistance(remainingDistance);
            console.log('🔄 Updating remaining distance:', remainingDistance, 'meters →', formattedRemaining);
            remainingElement.textContent = `${formattedRemaining} remaining`;
        }

        if (totalElement && this.routeData) {
            const totalDistance = this.routeData.distance;
            const formattedTotal = this.formatDistance(totalDistance);
            console.log('🔄 Updating total distance:', totalDistance, 'meters →', formattedTotal);
            totalElement.textContent = `Total: ${formattedTotal}`;
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
        // Use appropriate average speed based on user's speed unit
        let averageSpeedKmh = 50; // Default 50 km/h
        if (this.units.speed === 'mph') {
            averageSpeedKmh = 31; // ~50 km/h in mph equivalent
        }

        const averageSpeed = averageSpeedKmh * 1000 / 3600; // Convert to m/s
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

        // Create single blue triangle car icon
        const carIcon = L.divIcon({
            html: `
                <div style="
                    width: 24px;
                    height: 24px;
                    transform: rotate(${heading}deg);
                    position: relative;
                    animation: chevronBreathe 3s ease-in-out infinite;
                " class="triangle-vehicle">
                    <div style="
                        position: absolute;
                        top: 2px;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 0;
                        height: 0;
                        border-left: 10px solid transparent;
                        border-right: 10px solid transparent;
                        border-bottom: 18px solid #00BFFF;
                        filter: drop-shadow(0 0 8px #00BFFF);
                    "></div>
                </div>
            `,
            className: 'car-marker triangle-vehicle',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        // Add car marker
        this.carMarker = L.marker([lat, lng], { icon: carIcon })
            .addTo(this.map)
            .bindPopup('🛸 Your Vehicle');

        return this.carMarker;
    }

    updateCarPosition(lat, lng, heading = 0) {
        if (!this.map) return;

        // Clear existing vehicle markers
        this.vehicleLayer.clearLayers();

        // Create single blue triangle vehicle marker with direction
        const vehicleIcon = L.divIcon({
            className: 'vehicle-marker triangle-vehicle',
            html: `
                <div style="
                    width: 24px;
                    height: 24px;
                    transform: rotate(${heading}deg);
                    position: relative;
                    animation: chevronBreathe 3s ease-in-out infinite;
                " class="triangle-vehicle">
                    <div style="
                        position: absolute;
                        top: 2px;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 0;
                        height: 0;
                        border-left: 10px solid transparent;
                        border-right: 10px solid transparent;
                        border-bottom: 18px solid #00BFFF;
                        filter: drop-shadow(0 0 8px #00BFFF);
                    "></div>
                </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        this.vehicleMarker = L.marker([lat, lng], { icon: vehicleIcon }).addTo(this.vehicleLayer);

        // Update current location
        this.currentLocation = { lat, lng };

        // Follow vehicle if navigation is active
        if (this.isNavigating && this.followMode) {
            this.map.setView([lat, lng], this.map.getZoom(), { animate: true });
        }

        // Check for route progress if navigating
        if (this.isNavigating && this.currentRoute) {
            this.updateRouteProgress(lat, lng);
        }

        // Calculate and update speed
        this.updateSpeed(lat, lng);

        // Detect speed limit for current location
        this.detectSpeedLimit(lat, lng);

        console.log(`🛸 Vehicle position updated: ${lat.toFixed(6)}, ${lng.toFixed(6)}, heading: ${heading}°`);
    }

    updateSpeed(lat, lng) {
        const now = Date.now();

        if (this.lastPosition && this.lastPositionTime) {
            const distance = this.calculateDistance(
                { lat: this.lastPosition.lat, lng: this.lastPosition.lng },
                { lat, lng }
            );
            const timeElapsed = (now - this.lastPositionTime) / 1000; // seconds

            if (timeElapsed > 0) {
                // Calculate speed in m/s, then convert to mph
                const speedMps = distance / timeElapsed;
                const speedMph = speedMps * 2.237; // Convert m/s to mph

                // Smooth the speed reading
                this.currentSpeed = this.currentSpeed * 0.7 + speedMph * 0.3;

                // Update speedometer display
                this.updateSpeedometer();

                // Check for speeding
                this.checkSpeeding();
            }
        }

        this.lastPosition = { lat, lng };
        this.lastPositionTime = now;
    }

    updateSpeedometer() {
        const speedElement = document.getElementById('currentSpeed');
        const speedStatusElement = document.getElementById('speedStatus');
        const speedometerElement = document.getElementById('speedometer');

        if (speedElement) {
            speedElement.textContent = Math.round(this.currentSpeed);
        }

        if (speedStatusElement) {
            const speedRatio = this.currentSpeed / this.speedLimit;

            if (speedRatio <= 1) {
                speedStatusElement.textContent = 'SAFE';
                speedStatusElement.className = 'speed-status safe';
            } else if (speedRatio <= 1.1) {
                speedStatusElement.textContent = 'CAUTION';
                speedStatusElement.className = 'speed-status warning';
            } else {
                speedStatusElement.textContent = 'SPEEDING';
                speedStatusElement.className = 'speed-status danger';
            }
        }

        // Show speedometer during navigation
        if (speedometerElement && this.isNavigating) {
            speedometerElement.style.display = 'block';
        }
    }

    checkSpeeding() {
        const now = Date.now();
        const speedRatio = this.currentSpeed / this.speedLimit;

        // If speeding and haven't alerted recently (5 seconds cooldown)
        if (speedRatio > 1.1 && (now - this.lastSpeedAlert) > 5000) {
            this.lastSpeedAlert = now;

            // Play 4-second chime
            this.playSpeedingChime();

            // Voice announcement after chime
            setTimeout(async () => {
                if (this.voiceNavigationService) {
                    await this.voiceNavigationService.announceSpeedWarning();
                } else {
                    this.speakInstruction('Reduce speed', 'high');
                }
            }, 4000);
        }
    }

    playSpeedingChime() {
        // Create audio context for chime
        if (!this.speedingChimeAudio) {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                // Create a pleasant warning chime
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 1);
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 2);
                oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 3);

                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 4);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 4);

                console.log('🔔 Playing speeding chime');
            } catch (error) {
                console.warn('Could not play speeding chime:', error);
            }
        }
    }

    async detectSpeedLimit(lat, lng) {
        const now = Date.now();

        // Only check speed limit every 10 seconds to avoid API spam
        if (now - this.lastSpeedLimitCheck < 10000) return;
        this.lastSpeedLimitCheck = now;

        try {
            // Query Overpass API for speed limit data
            const query = `
                [out:json][timeout:5];
                (
                  way(around:100,${lat},${lng})[highway][maxspeed];
                  way(around:100,${lat},${lng})[highway]["maxspeed:advisory"];
                );
                out geom;
            `;

            const response = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: query,
                headers: {
                    'Content-Type': 'text/plain'
                }
            });

            if (response.ok) {
                const data = await response.json();

                if (data.elements && data.elements.length > 0) {
                    // Find the closest road with speed limit
                    let closestSpeedLimit = null;
                    let minDistance = Infinity;

                    data.elements.forEach(element => {
                        if (element.tags && (element.tags.maxspeed || element.tags['maxspeed:advisory'])) {
                            // Calculate distance to road segment
                            if (element.geometry) {
                                element.geometry.forEach(point => {
                                    const distance = this.calculateDistance(
                                        { lat, lng },
                                        { lat: point.lat, lng: point.lon }
                                    );

                                    if (distance < minDistance) {
                                        minDistance = distance;
                                        const speedLimitStr = element.tags.maxspeed || element.tags['maxspeed:advisory'];
                                        closestSpeedLimit = this.parseSpeedLimit(speedLimitStr);
                                    }
                                });
                            }
                        }
                    });

                    if (closestSpeedLimit && minDistance < 50) { // Within 50 meters
                        this.updateSpeedLimit(closestSpeedLimit);
                    }
                }
            }
        } catch (error) {
            console.warn('Speed limit detection error:', error);
        }
    }

    parseSpeedLimit(speedLimitStr) {
        if (!speedLimitStr) return null;

        // Handle different speed limit formats
        if (speedLimitStr.includes('mph')) {
            return parseInt(speedLimitStr.replace('mph', '').trim());
        } else if (speedLimitStr.includes('km/h')) {
            const kmh = parseInt(speedLimitStr.replace('km/h', '').trim());
            return Math.round(kmh * 0.621371); // Convert to mph
        } else if (!isNaN(speedLimitStr)) {
            // Assume km/h if no unit specified
            const kmh = parseInt(speedLimitStr);
            return Math.round(kmh * 0.621371);
        }

        return null;
    }

    updateSpeedLimit(newSpeedLimit) {
        if (newSpeedLimit && newSpeedLimit !== this.speedLimit) {
            this.speedLimit = newSpeedLimit;

            // Update speedometer display
            const speedLimitElement = document.getElementById('speedLimit');
            if (speedLimitElement) {
                speedLimitElement.textContent = newSpeedLimit;
            }

            console.log(`🚦 Speed limit updated: ${newSpeedLimit} mph`);

            // Add speed limit marker to map
            this.addSpeedLimitMarker(this.currentLocation.lat, this.currentLocation.lng, newSpeedLimit);
        }
    }

    addSpeedLimitMarker(lat, lng, speedLimit) {
        if (!this.map) return;

        // Create speed limit sign icon
        const speedLimitIcon = L.divIcon({
            html: `
                <div style="
                    width: 30px;
                    height: 30px;
                    background: #fff;
                    border: 3px solid #ff0000;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: bold;
                    color: #000;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                ">${speedLimit}</div>
            `,
            className: 'speed-limit-marker',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        const marker = L.marker([lat, lng], { icon: speedLimitIcon })
            .addTo(this.map)
            .bindPopup(`Speed Limit: ${speedLimit} mph`);

        // Store marker for cleanup
        this.speedLimitMarkers.push(marker);

        // Keep only last 5 speed limit markers
        if (this.speedLimitMarkers.length > 5) {
            const oldMarker = this.speedLimitMarkers.shift();
            this.map.removeLayer(oldMarker);
        }
    }

    updateRouteProgress(lat, lng) {
        if (!this.currentRoute || !this.currentRoute.coordinates) return;

        // Find closest point on route
        let minDistance = Infinity;
        let closestIndex = 0;

        this.currentRoute.coordinates.forEach((coord, index) => {
            const distance = this.calculateDistance(lat, lng, coord[1], coord[0]);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
            }
        });

        // Update progress
        this.routeProgress = {
            currentIndex: closestIndex,
            distanceFromRoute: minDistance,
            remainingDistance: this.calculateRemainingDistance(closestIndex),
            estimatedTimeRemaining: this.calculateRemainingTime(closestIndex)
        };

        // Check if off route (more than 50 meters away)
        if (minDistance > 50) { // 50 meters
            this.handleOffRoute();
        }

        // Update navigation UI
        this.updateNavigationUI();
    }

    updateNavigationUI() {
        // Update navigation progress displays
        this.updateNavigationProgress();

        // Update any other navigation-specific UI elements
        console.log('🗺️ Navigation UI updated');
    }

    calculateRemainingDistance(currentIndex) {
        if (!this.currentRoute || !this.currentRoute.coordinates) return 0;

        let distance = 0;
        for (let i = currentIndex; i < this.currentRoute.coordinates.length - 1; i++) {
            const coord1 = this.currentRoute.coordinates[i];
            const coord2 = this.currentRoute.coordinates[i + 1];
            distance += this.calculateDistance(coord1[1], coord1[0], coord2[1], coord2[0]);
        }

        return distance;
    }

    calculateRemainingTime(currentIndex) {
        const remainingDistanceMeters = this.calculateRemainingDistance(currentIndex);
        const remainingDistanceKm = remainingDistanceMeters / 1000;

        // Use appropriate average speed based on user's speed unit
        let averageSpeedKmh = 50; // Default 50 km/h
        if (this.units.speed === 'mph') {
            averageSpeedKmh = 31; // ~50 km/h equivalent
        }

        return (remainingDistanceKm / averageSpeedKmh) * 60; // minutes
    }

    handleOffRoute() {
        if (this.offRouteTimeout) return; // Already handling off-route

        this.offRouteTimeout = setTimeout(() => {
            this.showNotification('🔄 You are off route. Recalculating...', 'warning');
            this.recalculateRoute();
            this.offRouteTimeout = null;
        }, 5000); // Wait 5 seconds before recalculating
    }

    drawRouteWithHazards(route) {
        if (!this.map || !route) return;

        // Clear existing route layers
        this.routeLayer.clearLayers();
        this.hazardsLayer.clearLayers();

        // Draw main route line
        if (route.coordinates && route.coordinates.length > 0) {
            const routeLine = L.polyline(
                route.coordinates.map(coord => [coord[1], coord[0]]), // Swap lat/lng
                {
                    color: '#00FF88',
                    weight: 6,
                    opacity: 0.8,
                    smoothFactor: 1
                }
            ).addTo(this.routeLayer);

            // Store route line reference
            this.currentRouteLine = routeLine;

            // Fit map to route
            this.map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
        }

        // Add start and end markers
        if (this.currentLocation) {
            const startIcon = L.divIcon({
                className: 'route-marker start-marker',
                html: '<div class="marker-icon">🏁</div>',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            L.marker([this.currentLocation.lat, this.currentLocation.lng], { icon: startIcon })
                .addTo(this.routeLayer);
        }

        if (this.destination) {
            const endIcon = L.divIcon({
                className: 'route-marker end-marker',
                html: '<div class="marker-icon">🎯</div>',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            L.marker([this.destination.lat, this.destination.lng], { icon: endIcon })
                .addTo(this.routeLayer);
        }

        // Detect and display route hazards
        this.detectRouteHazards(route);
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

    try {
        // Remove any existing settings modal
        const existingModal = document.querySelector('.settings-modal');
        if (existingModal) {
            console.log('Removing existing modal');
            existingModal.remove();
        }

        // Create a simple settings modal
        console.log('Creating new modal');
        const modal = document.createElement('div');
        modal.className = 'settings-modal';
        modal.id = 'settingsModal';
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

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div class="settings-column">
                    <h4 style="color: #00FF88; margin: 0 0 15px 0; font-size: 14px;">📏 Units & Measurements (v2025.15)</h4>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: #ccc; font-size: 12px;">Units System:</label>
                        <select id="unitsSystem" onchange="updateUnitsSystem(this.value)" style="width: 100%; padding: 8px; border-radius: 4px; background: #333; color: #fff; border: 1px solid #555; font-size: 12px;">
                            <option value="metric">Metric System</option>
                            <option value="imperial">Imperial System</option>
                            <option value="nautical">Nautical System</option>
                        </select>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: #ccc; font-size: 12px;">Distance Display:</label>
                        <div id="distanceDisplay" style="width: 100%; padding: 8px; border-radius: 4px; background: #222; color: #00FF88; border: 1px solid #555; font-size: 12px;">
                            Auto-set by Units System
                        </div>
                        <small style="color: #888; font-size: 10px;">Controlled by Units System setting above</small>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: #ccc; font-size: 12px;">Speed:</label>
                        <select id="speedUnit" onchange="updateUnits('speed', this.value)" style="width: 100%; padding: 8px; border-radius: 4px; background: #333; color: #fff; border: 1px solid #555; font-size: 12px;">
                            <option value="kmh">km/h</option>
                            <option value="mph">mph</option>
                            <option value="ms">m/s</option>
                            <option value="knots">Knots</option>
                        </select>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: #ccc; font-size: 12px;">Fuel Consumption:</label>
                        <select id="fuelUnit" onchange="updateUnits('fuel', this.value)" style="width: 100%; padding: 8px; border-radius: 4px; background: #333; color: #fff; border: 1px solid #555; font-size: 12px;">
                            <option value="liters">L/100km</option>
                            <option value="gallons_us">MPG (US)</option>
                            <option value="gallons_uk">LPM (Litres Per Mile)</option>
                        </select>
                        <div id="fuelPriceDisplay" style="font-size: 11px; color: #888; margin-top: 5px;">
                            Loading fuel prices...
                        </div>
                    </div>

                    <h4 style="color: #00FF88; margin: 15px 0 10px 0; font-size: 14px;">🔊 Audio & Voice</h4>
                    <div style="margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" checked style="transform: scale(1.2);">
                            <span style="font-size: 13px;">Voice Guidance</span>
                        </label>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" checked style="transform: scale(1.2);">
                            <span style="font-size: 13px;">Compass Directions</span>
                        </label>
                    </div>
                </div>

                <div class="settings-column">
                    <h4 style="color: #00FF88; margin: 0 0 15px 0; font-size: 14px;">🗺️ Map & Navigation</h4>
                    <div style="margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" checked style="transform: scale(1.2);" id="laneGuidanceToggle">
                            <span style="font-size: 13px;">🛣️ Visual Lane Guidance</span>
                        </label>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" checked style="transform: scale(1.2);" id="autoZoomToggle">
                            <span style="font-size: 13px;">🔍 Auto-Zoom to Route</span>
                        </label>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" checked style="transform: scale(1.2);" id="followModeToggle">
                            <span style="font-size: 13px;">📍 Auto-Follow Location</span>
                        </label>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" checked style="transform: scale(1.2);" id="adaptiveZoomToggle">
                            <span style="font-size: 13px;">🔍 Adaptive Zoom (Speed-based)</span>
                        </label>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" checked style="transform: scale(1.2);" id="predictiveRecenterToggle">
                            <span style="font-size: 13px;">🎯 Predictive Re-centering</span>
                        </label>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" checked style="transform: scale(1.2);" id="offScreenIndicatorToggle">
                            <span style="font-size: 13px;">📍 Off-Screen Indicators</span>
                        </label>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" style="transform: scale(1.2);" id="batteryOptimizationToggle" onchange="toggleBatteryOptimization()">
                            <span style="font-size: 13px;">🔋 Battery Optimization Mode</span>
                        </label>
                    </div>
                </div>
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

        console.log('Appending modal to body');
        document.body.appendChild(modal);
        console.log('Modal appended successfully');

        // Initialize unit selectors after modal is added to DOM
        setTimeout(() => {
            if (app && app.initializeUnitSelectors) {
                app.initializeUnitSelectors();
            }
        }, 100);

        if (app && app.showNotification) {
            app.showNotification('Settings opened! ⚙️', 'info');
        }
        console.log('Settings modal should now be visible');

    } catch (error) {
        console.error('❌ Error opening settings:', error);
        alert('Error opening settings: ' + error.message);
    }
}

// Map control functions
function centerOnLocation() {
    if (app && app.currentLocation && app.map) {
        app.map.setView([app.currentLocation.lat, app.currentLocation.lng], 15, { animate: true });
        app.showNotification('📍 Centered on current location', 'info');
    }
}

function toggleMapType() {
    if (app && app.map && app.tileLayer) {
        // Toggle between different map types
        app.map.removeLayer(app.tileLayer);

        if (app.currentMapType === 'street') {
            // Switch to high-resolution satellite (Google for max zoom)
            const provider = app.satelliteProviders[1]; // Google satellite for higher zoom
            app.tileLayer = L.tileLayer(provider.url, {
                attribution: provider.attribution,
                maxZoom: provider.maxZoom,
                tileSize: 256,
                zoomOffset: 0
            }).addTo(app.map);
            app.currentMapType = 'satellite';
            app.showNotification(`🛰️ Switched to ${provider.name} (max zoom ${provider.maxZoom})`, 'info');
        } else {
            // Switch back to street
            app.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 20
            }).addTo(app.map);
            app.currentMapType = 'street';
            app.showNotification('🗺️ Switched to street view', 'info');
        }
    }
}



function zoomIn() {
    if (app && app.map) {
        app.map.zoomIn();
    }
}

function zoomOut() {
    if (app && app.map) {
        app.map.zoomOut();
    }
}

function showAlternativeRoutes() {
    if (app && app.calculateAlternativeRoutes) {
        app.calculateAlternativeRoutes();
    }
}

function proceedWithRoute() {
    const hazardsSection = document.getElementById('routeHazardsSection');
    if (hazardsSection) {
        hazardsSection.style.display = 'none';
    }

    if (app) {
        app.showNotification('⚠️ Proceeding with hazardous route', 'warning');
    }
}

function getCurrentLocation() {
    if (window.app && window.app.getCurrentLocation) {
        window.app.getCurrentLocation();
    } else {
        console.error('❌ App not ready yet');
    }
}

function toggleHazardSettings() {
    console.log('🚨 Toggling hazard settings...');
    const container = document.getElementById('hazardAvoidanceContainer');
    if (container) {
        console.log('Container current display:', container.style.display);
        if (container.style.display === 'none' || !container.style.display) {
            console.log('Opening hazard settings...');
            container.style.display = 'block';
            // Always refresh hazard panel content to ensure latest version
            container.innerHTML = '';
                container.innerHTML = `
                    <div class="hazard-panel-content" style="background: #1a1a1a; border-radius: 12px; padding: 20px; color: #fff; border: 1px solid #333; max-width: 500px; margin: 0 auto; position: relative;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h3 style="color: #00FF88; margin: 0;">🚨 Hazard Avoidance</h3>
                            <button onclick="closeHazardSettings()" style="background: #FF6B6B; border: none; color: white; font-size: 18px; cursor: pointer; padding: 5px 10px; border-radius: 4px; font-weight: bold; z-index: 10001; position: relative;">✕ Close</button>
                        </div>
                        <div style="margin-bottom: 15px; max-height: 300px; overflow-y: auto;">
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="speedCameras" checked onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 📷 Speed Cameras
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="redLightCameras" checked onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 🚦 Red Light Cameras
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="policeReports" checked onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 🚨 Police Reports
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="roadwork" onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 🚧 Road Works
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="railwayCrossings" checked onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 🚂 Railway Crossings
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="trafficLights" onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 🛣️ Complex Junctions
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="schoolZones" checked onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 🏫 School Zones
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="hospitalZones" checked onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 🏥 Hospital Zones
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="tollBooths" onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 💰 Toll Booths
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="bridges" onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 🌉 Bridges/Tunnels
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="accidents" checked onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 💥 Accident Reports
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="weather" onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 🌧️ Weather Alerts
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="steepGrades" onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> ⛰️ Steep Grades
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="narrowRoads" onchange="if(window.app) window.app.updateHazardAvoidanceSettings()"> 🛤️ Narrow Roads
                            </label>
                        </div>
                        <div style="margin-top: 15px;">
                            <label style="display: block; margin-bottom: 5px;">Alert Distance: <span id="alertDistanceValue">500m</span></label>
                            <input type="range" min="100" max="1000" step="50" value="500" style="width: 100%;"
                                   onchange="document.getElementById('alertDistanceValue').textContent = this.value + 'm'">
                        </div>
                        <div style="margin-top: 20px; text-align: center;">
                            <button onclick="closeHazardSettings()" style="background: #00FF88; color: #000; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px;">Close Hazard Settings</button>
                        </div>
                    </div>
                `;
            }
            if (window.app) {
                window.app.showNotification('Hazard settings opened', 'info');
            }

            // Add click-outside-to-close functionality
            container.onclick = function(e) {
                if (e.target === container) {
                    closeHazardSettings();
                }
            };
        } else {
            console.log('Closing hazard settings...');
            container.style.display = 'none';
            console.log('Container display set to none');
            if (window.app) {
                window.app.showNotification('Hazard settings closed', 'info');
            }
        }
    }

function closeHazardSettings() {
    console.log('🚨 Closing hazard settings...');
    const container = document.getElementById('hazardAvoidanceContainer');
    if (container) {
        container.style.display = 'none';
        console.log('Hazard settings closed');
        if (window.app) {
            window.app.showNotification('Hazard settings closed', 'info');
        }
    } else {
        console.log('Hazard container not found');
    }
}

// Fallback simple settings function
function showSimpleSettings() {
    console.log('🔧 Showing simple settings...');

    const settingsHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    background: #1a1a1a; padding: 20px; border-radius: 8px; border: 1px solid #333;
                    color: white; z-index: 10000; max-width: 300px;">
            <h3 style="color: #00FF88; margin: 0 0 15px 0;">⚙️ Settings</h3>

            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; color: #ccc;">Units:</label>
                <select style="width: 100%; padding: 8px; background: #333; color: #fff; border: 1px solid #555;">
                    <option>Metric (km/h, km)</option>
                    <option>Imperial (mph, miles)</option>
                </select>
            </div>

            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; color: #ccc;">Fuel:</label>
                <select style="width: 100%; padding: 8px; background: #333; color: #fff; border: 1px solid #555;">
                    <option>L/100km</option>
                    <option>MPG (US)</option>
                    <option>LPM (Litres Per Mile)</option>
                </select>
            </div>

            <button onclick="this.parentElement.remove()"
                    style="background: #00FF88; color: #000; border: none; padding: 10px 20px;
                           border-radius: 4px; cursor: pointer; width: 100%;">
                Close
            </button>
        </div>
    `;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); z-index: 9999;
    `;
    overlay.innerHTML = settingsHTML;
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };

    document.body.appendChild(overlay);
}

function startNavigation() {
    if (window.app && window.app.startNavigation) {
        window.app.startNavigation();
    } else {
        console.error('❌ App not ready yet');
    }
}

function stopNavigation() {
    if (window.app && window.app.stopNavigation) {
        window.app.stopNavigation();
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

function testLaneGuidance() {
    if (app && app.simulateLaneData) {
        app.simulateLaneData();
        app.showNotification('🛣️ Testing lane guidance visualization', 'info');
    }
}

function hideRouteSelection() {
    const panel = document.getElementById('routeSelectionPanel');
    if (panel) {
        panel.classList.remove('show');
        setTimeout(() => {
            panel.style.display = 'none';
        }, 300);
    }
}

function selectRouteForJourney() {
    if (app && app.availableRoutes && app.availableRoutes.length > 0) {
        const selectedRoute = app.availableRoutes[app.selectedRouteIndex];
        app.selectRoute(selectedRoute, app.selectedRouteIndex);
        hideRouteSelection();
    }
}

function startJourney() {
    if (window.app && window.app.startJourney) {
        window.app.startJourney();
    }
}

function pauseJourney() {
    if (app && app.pauseJourney) {
        app.pauseJourney();
    }
}

function resumeJourney() {
    if (app && app.resumeJourney) {
        app.resumeJourney();
    }
}

function cancelJourney() {
    if (app && app.cancelJourney) {
        app.cancelJourney();
    }
}

function clearVoiceLog() {
    if (app && app.clearVoiceLog) {
        app.clearVoiceLog();
    }
}

function toggleBatteryOptimization() {
    const toggle = document.getElementById('batteryOptimizationToggle');
    if (!app || !toggle) return;

    if (toggle.checked) {
        app.enableBatteryOptimization();
    } else {
        app.disableBatteryOptimization();
    }
}

function handleAddressInput(inputType, query) {
    if (app && app.handleAddressInput) {
        app.handleAddressInput(inputType, query);
    }
}

function updateUnitsSystem(systemValue) {
    if (app && app.units) {
        app.units.system = systemValue;

        // Auto-update related units based on system
        if (systemValue === 'metric') {
            app.units.distance = 'km';
            app.units.speed = 'kmh';
            app.units.fuel = 'liters';
        } else if (systemValue === 'imperial') {
            app.units.distance = 'miles';
            app.units.speed = 'mph';
            app.units.fuel = 'gallons_us';
        } else if (systemValue === 'nautical') {
            app.units.distance = 'nautical';
            app.units.speed = 'knots';
            app.units.fuel = 'liters';
        }

        // Update the individual selectors to match
        const distanceDisplay = document.getElementById('distanceDisplay');
        const speedSelect = document.getElementById('speedUnit');
        const fuelSelect = document.getElementById('fuelUnit');

        if (speedSelect) speedSelect.value = app.units.speed;
        if (fuelSelect) fuelSelect.value = app.units.fuel;

        // Update distance display based on system
        if (distanceDisplay) {
            let distanceText = 'Auto-set by Units System';
            if (systemValue === 'metric') {
                distanceText = 'Kilometers (km) and Meters (m)';
            } else if (systemValue === 'imperial') {
                distanceText = 'Miles (mi) and Feet (ft)';
            } else if (systemValue === 'nautical') {
                distanceText = 'Nautical Miles (nm)';
            }
            distanceDisplay.textContent = distanceText;
        }

        // Save to localStorage
        localStorage.setItem('vibeVoyageUnits', JSON.stringify(app.units));

        // Update all displays immediately
        app.updateUnitDisplays();

        // Force refresh route displays if routes exist
        if (app.availableRoutes && app.availableRoutes.length > 0) {
            console.log('🔄 Refreshing route displays with new unit system...');
            app.displayRouteOptions(app.availableRoutes);
        }

        // Update fuel price display
        app.updateFuelPriceDisplay();

        // Update header displays with new units
        app.updateHeaderUnits();

        // Force update navigation progress if active
        if (app.isNavigating) {
            app.updateNavigationProgress();
        }

        // Update any existing distance displays on the page
        app.refreshAllDistanceDisplays();

        app.showNotification(`📏 Units system updated to ${systemValue} - all displays refreshed`, 'success');
    }
}

function updateUnits(unitType, value) {
    if (app && app.units) {
        app.units[unitType] = value;

        // Save to localStorage
        localStorage.setItem('vibeVoyageUnits', JSON.stringify(app.units));

        // Update UI elements that display units
        app.updateUnitDisplays();

        // Force refresh route displays if routes exist
        if (app.availableRoutes && app.availableRoutes.length > 0) {
            console.log('🔄 Refreshing route displays with new units...');
            app.displayRouteOptions(app.availableRoutes);
        }

        // Update fuel price display if fuel unit changed
        if (unitType === 'fuel') {
            app.updateFuelPriceDisplay();
        }

        // Update header displays with new units
        app.updateHeaderUnits();

        app.showNotification(`📏 ${unitType} units updated to ${value} - displays refreshed`, 'success');
    }
}

function toggleFollowMode() {
    if (!app) return;

    if (app.followMode) {
        app.disableFollowMode();
        app.showNotification('📍 Follow mode disabled', 'info');
    } else {
        app.enableFollowMode();
        app.showNotification('📍 Follow mode enabled', 'success');
    }
}



function toggleNavigationView() {
    if (!app || !app.map) return;

    if (app.followMode) {
        // Switch to overview mode
        if (app.mapBounds) {
            app.autoZoomToRoute();
            app.showNotification('🗺️ Overview mode', 'info');
        }
    } else {
        // Switch to follow mode
        app.enableFollowMode();
        app.showNotification('📍 Follow mode', 'info');
    }
}

function handleFromSearchKeypress(event) {
    if (event.key === 'Enter') {
        const value = event.target.value.trim();
        if (app && app.geocodeLocation) {
            // If empty, searchFromLocation will handle using current location
            searchFromLocation(value);
        } else {
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

    // If query is empty or just whitespace, use current location
    if (!query || !query.trim()) {
        if (app.currentLocation) {
            app.showNotification('✅ Using current location', 'success');
            return;
        } else {
            app.showNotification('❌ No current location available. Please enable location services.', 'error');
            return;
        }
    }

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

        // Update input - set as placeholder so user can easily type over it
        const fromInput = document.getElementById('fromInput');
        if (fromInput) {
            fromInput.value = ''; // Clear the input
            fromInput.placeholder = `From: ${location.name.split(',')[0]}`;
        }

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
function initializeVibeVoyage() {
    console.log('🚀 Initializing VibeVoyage...');

    try {
        // Check if class is available
        if (typeof VibeVoyageApp === 'undefined') {
            throw new Error('VibeVoyageApp class not found');
        }

        // Initialize the app
        window.app = new VibeVoyageApp();
        console.log('✅ VibeVoyage app initialized successfully');

        // Verify app is accessible
        if (window.app) {
            console.log('✅ App is accessible via window.app');
        }

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
            font-family: Arial, sans-serif;
        `;
        errorDiv.innerHTML = `
            <h3>⚠️ App Initialization Failed</h3>
            <p>Error: ${error.message}</p>
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
}

// Try multiple initialization methods
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌟 DOM loaded');

    // Try immediate initialization
    initializeVibeVoyage();

    // If that fails, try after a delay
    if (!window.app) {
        setTimeout(() => {
            if (!window.app) {
                console.log('🔄 Retrying app initialization...');
                initializeVibeVoyage();
            }
        }, 1000);
    }
});

// Also try when window loads (fallback)
window.addEventListener('load', () => {
    if (!window.app) {
        console.log('🔄 Window loaded, trying app initialization...');
        setTimeout(initializeVibeVoyage, 500);
    }
});

// PWA Install prompt - disabled to prevent errors
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('PWA install prompt available (stored for manual use)');

    // Never automatically show prompt - only on explicit user action
    // This prevents NotAllowedError from automatic prompts
});

// Function to manually trigger install (must be called from user interaction)
function showInstallPrompt() {
    if (deferredPrompt) {
        try {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                console.log('User choice:', choiceResult.outcome);
                deferredPrompt = null;
            });
        } catch (error) {
            console.log('Install prompt error (expected if not user-initiated):', error.message);
        }
    } else {
        console.log('Install prompt not available');
    }
}

// Manual initialization function for debugging
window.initializeVibeVoyage = initializeVibeVoyage;

console.log('🚀 VibeVoyage PWA Loaded!');
