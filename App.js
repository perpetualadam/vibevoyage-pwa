/**
 * VibeVoyage PWA - Smart Navigation Application
 * TypeScript-inspired JavaScript implementation for better type safety and reduced issues
 */

// Debug: File loading check - CACHE BUSTER
console.log('🔄 App.js file is loading... Version: 2025.01.29-v3-FIXED', new Date().toISOString());
console.log('🔧 CACHE BUSTER: This is the FIXED version of the file!');
console.log('🔧 If you see this message, the new file is loading correctly!');

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

        // Map initialization control flags
        /** @type {boolean} */
        this.mapInitializing = false;
        /** @type {boolean} */
        this.mapInitialized = false;
        /** @type {boolean} */
        this.asyncInitializing = false;
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
            // Map initialization is handled by initializeAsync() - no need for duplicate calls
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

        // Load saved units
        this.loadUnitsFromStorage();

        // Setup event listeners
        this.setupEventListeners();

        // Online status is now handled by initOfflineDetection()

        // Initialize async components after constructor
        this.initializeAsync();
        
        // Initialize service worker
        this.initServiceWorker();

        // Add window resize handler for map
        this.addMapResizeHandler();

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

        // Initialize favorite locations and recent searches
        this.favoriteLocations = [];
        this.recentSearches = [];
        this.maxRecentSearches = 10;
        this.maxFavoriteLocations = 50;
        this.loadFavoriteLocations();
        this.loadRecentSearches();

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

        // Check for shared route in URL
        this.parseSharedRoute();

        // Get current weather
        setTimeout(() => this.getCurrentWeather(), 2000);

        // Initialize gamification system
        this.initGamificationSystem();

        // Initialize language system
        this.initLanguageSystem();

        // Initialize hazard avoidance settings
        this.initHazardAvoidanceSettings();

        // Reset hazards counter on app start
        this.resetHazardsCounter();

        // Transport mode settings
        this.transportMode = 'driving'; // Default mode
        this.transportModes = {
            driving: {
                profile: 'driving',
                icon: '🚗',
                name: 'Drive',
                description: 'Fastest routes via roads',
                speedKmh: 50,
                color: '#4ECDC4'
            },
            cycling: {
                profile: 'cycling',
                icon: '🚴',
                name: 'Cycle',
                description: 'Safe routes via cycle paths and quiet roads',
                speedKmh: 15,
                color: '#45B7D1'
            },
            walking: {
                profile: 'foot',
                icon: '🚶',
                name: 'Walk',
                description: 'Direct routes via footpaths and pedestrian areas',
                speedKmh: 5,
                color: '#96CEB4'
            }
        };

        // Offline functionality
        this.isOffline = false;
        this.offlineData = new Map();
        this.offlineQueue = [];
        this.lastOnlineTime = Date.now();
        this.offlineRoutes = new Map();
        this.offlineSettings = {
            enableOfflineMode: true,
            autoSyncWhenOnline: true,
            maxCacheSize: 100 * 1024 * 1024, // 100MB
            cacheExpiryTime: 7 * 24 * 60 * 60 * 1000, // 7 days
        };

        // Initialize offline detection
        this.initOfflineDetection();

        // Handle widget actions from URL parameters
        this.handleWidgetActions();

        // Initialize IndexedDB for offline storage
        this.initOfflineStorage();

        console.log('✅ VibeVoyage PWA Ready! v2025.16 - Pure JavaScript Implementation');
        console.log('📏 Current units structure:', this.units);
        console.log('🚶🚴🚗 Transport modes initialized:', Object.keys(this.transportModes));
        console.log('📱 Offline functionality initialized');



        // Note: Map initialization is handled by initializeAsync() - no need for duplicate calls
    }

    // Async initialization method (called after constructor)
    async initializeAsync() {
        // Prevent multiple simultaneous initializations
        if (this.asyncInitializing) {
            console.log('🔄 Async initialization already in progress, skipping...');
            return;
        }

        this.asyncInitializing = true;

        try {
            console.log('🔄 Starting async initialization...');

            // Initialize map with proper sequencing
            await this.initMapWithSequencing();

            // Detect user country for currency
            await this.detectUserCountry();

            // Get user location and set as default
            await this.getCurrentLocation();

            // Set current location as default in from input
            this.setDefaultFromLocation();

            console.log('✅ Async initialization completed');

        } catch (error) {
            console.error('❌ Async initialization failed:', error);
            this.showNotification('⚠️ Some features may not work properly', 'warning');
        } finally {
            // Always reset the initialization flag
            this.asyncInitializing = false;
        }
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

            // Initialize Traffic Camera Service
            if (typeof TrafficCameraService !== 'undefined') {
                this.trafficCameraService = new TrafficCameraService();
                console.log('✅ TrafficCameraService initialized');
            } else {
                console.warn('⚠️ TrafficCameraService not available');
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
            // Check if map is already initialized and ready
            if (this.mapInitialized && this.map && this.map._loaded) {
                console.log('✅ Map is already ready');
                resolve();
                return;
            }

            // If map exists but not loaded, wait for it
            if (this.map) {
                this.map.whenReady(() => {
                    console.log('🗺️ Map is ready for operations');
                    resolve();
                });
                return;
            }

            // Fallback: wait a bit and check again
            let attempts = 0;
            const maxAttempts = 10; // 1 second max wait

            const checkMap = () => {
                attempts++;

                if (this.mapInitialized && this.map && this.map._loaded) {
                    console.log('✅ Map became ready');
                    resolve();
                } else if (this.map) {
                    this.map.whenReady(() => {
                        console.log('🗺️ Map is ready for operations');
                        resolve();
                    });
                } else if (attempts >= maxAttempts) {
                    console.warn('⚠️ Map still not initialized, proceeding anyway');
                    resolve();
                } else {
                    setTimeout(checkMap, 100);
                }
            };

            checkMap();
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
        // Use the proven minimal app approach
        if (this.mapInitialized && this.map) {
            console.log('🗺️ Map already initialized, skipping...');
            return;
        }

        console.log('🗺️ Initializing map using minimal app approach...');
        this.mapInitializing = true;

        // Check if map container exists
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error('❌ Map container not found');
            console.log('🔍 Available elements with "map" in ID:',
                Array.from(document.querySelectorAll('[id*="map"]')).map(el => el.id));
            this.mapInitializing = false;
            throw new Error('Map container not found');
        }

        console.log('✅ Map container found:', mapContainer);

        // Check if container has dimensions before accessing offsetWidth
        if (mapContainer && mapContainer.offsetWidth !== undefined) {
            console.log('📐 Map container dimensions:', {
                width: mapContainer.offsetWidth,
                height: mapContainer.offsetHeight,
                display: getComputedStyle(mapContainer).display
            });
        } else {
            console.warn('⚠️ Map container dimensions not available yet');
        }

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
            // Check if map is already initialized and working
            if (this.map && this.map._container && this.map._container === mapContainer && this.map._loaded) {
                console.log('🗺️ Map already initialized and working, skipping...');
                this.mapInitializing = false;
                return;
            }

            // Simple, proven cleanup approach from minimal app
            console.log('🔄 Cleaning map container...');

            // Remove existing map if it exists
            if (this.map && this.map.remove) {
                try {
                    this.map.remove();
                    this.map = null;
                } catch (e) {
                    console.warn('⚠️ Error removing existing map:', e);
                }
            }

            // Clean container like minimal app
            mapContainer.innerHTML = '';
            delete mapContainer._leaflet_id;
            delete mapContainer._leaflet_map;
            mapContainer.className = mapContainer.className.replace(/leaflet-[^\s]*/g, '');

            // Remove existing map instance if it exists
            if (this.map && this.map.remove) {
                try {
                    this.map.remove();
                    this.map = null;
                } catch (e) {
                    console.warn('⚠️ Error removing existing app map:', e);
                }
            }

            // Clean up any map instance attached to container
            if (mapContainer._leaflet_id) {
                try {
                    // Clear all Leaflet-related properties from container
                    Object.keys(mapContainer).forEach(key => {
                        if (key.startsWith('_leaflet')) {
                            delete mapContainer[key];
                        }
                    });

                    // Clear container content
                    mapContainer.innerHTML = '';

                    // Remove any existing Leaflet classes
                    mapContainer.className = mapContainer.className.replace(/leaflet-[^\s]*/g, '').trim();

                } catch (e) {
                    console.warn('⚠️ Error cleaning container:', e);
                }
            }

            // Complete container cleanup
            mapContainer.className = 'interactive-map';
            mapContainer.innerHTML = '';
            mapContainer.removeAttribute('tabindex');
            mapContainer.removeAttribute('style');
            mapContainer.style.cssText = '';

            // Remove all Leaflet-specific properties
            Object.keys(mapContainer).forEach(key => {
                if (key.startsWith('_leaflet')) {
                    delete mapContainer[key];
                }
            });

            // Force garbage collection hint
            if (window.gc) {
                window.gc();
            }

            // Initialize Leaflet map with enhanced mobile options
            console.log('🗺️ Creating new Leaflet map instance...');

            // Use simple approach like minimal app
            console.log('🗺️ Creating map with simple configuration...');

            // Use current location if available, otherwise use intelligent default
            let mapCenter = [53.3811, -1.4701]; // Sheffield, UK default
            let mapZoom = 13;

            if (this.currentLocation && this.currentLocation.lat && this.currentLocation.lng) {
                mapCenter = [this.currentLocation.lat, this.currentLocation.lng];
                mapZoom = 15; // Closer zoom for current location
                console.log('🗺️ Using current location as map center:', mapCenter);
            } else {
                console.log('🗺️ Using default map center (Sheffield, UK):', mapCenter);
            }

            this.map = L.map('map').setView(mapCenter, mapZoom);

            // Verify map was created successfully
            if (!this.map) {
                throw new Error('Failed to create Leaflet map instance');
            }
            console.log('✅ Leaflet map instance created successfully');

            // Add tiles like minimal app
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);

            // Create layers like minimal app
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
            this.mapInitialized = true;

            // Fix map display issues
            setTimeout(() => {
                this.fixMapDisplay();
            }, 1000);

        } catch (error) {
            console.error('❌ Map initialization failed:', error);
            this.showMapPlaceholder();
            this.mapInitialized = false;
        } finally {
            // Always reset the initialization flag
            this.mapInitializing = false;
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

        // If location was already denied, don't keep trying
        if (this.locationDenied) {
            console.log('📍 Location access was denied, using demo location');
            return;
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
                // Center map on current location with smooth animation
                this.map.setView([this.currentLocation.lat, this.currentLocation.lng], 15, {
                    animate: true,
                    duration: 1.0
                });
                // Add car marker for current location
                this.addCarMarker(this.currentLocation.lat, this.currentLocation.lng);
                console.log('🗺️ Map centered on current location:', this.currentLocation);
            } else {
                console.warn('⚠️ Map not ready, location stored but not displayed');
            }
            
            // Update UI - set current location as default value that's easy to overwrite
            const fromInput = document.getElementById('fromInput');
            if (fromInput) {
                // Set current location as placeholder-style default (Google Maps style)
                fromInput.value = 'Current Location';
                fromInput.placeholder = 'From: Address, company, postcode...';

                // Add special styling to indicate it's the default
                fromInput.classList.add('default-location');

                // Google Maps style - no selection needed, just start typing
                const handleFocus = function() {
                    // Don't select text, just let user start typing
                    if (this.value === 'Current Location') {
                        // Keep the styling but don't select
                    }
                };

                // Clear default when user starts typing something else
                const handleInput = function() {
                    if (this.value !== 'Current Location') {
                        this.classList.remove('default-location');
                    } else {
                        this.classList.add('default-location');
                    }
                };

                // Google Maps style - immediately replace on typing
                const handleKeydown = function(e) {
                    if (this.value === 'Current Location' && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                        // User is typing a character, replace the default text immediately
                        this.value = e.key;
                        this.classList.remove('default-location');
                        e.preventDefault(); // Prevent double character
                    }
                };

                // Remove existing listeners to prevent duplicates
                fromInput.removeEventListener('focus', handleFocus);
                fromInput.removeEventListener('input', handleInput);
                fromInput.removeEventListener('keydown', handleKeydown);

                // Add new listeners
                fromInput.addEventListener('focus', handleFocus);
                fromInput.addEventListener('input', handleInput);
                fromInput.addEventListener('keydown', handleKeydown);
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
                errorMessage = 'Using demo location';
                notificationMessage = 'Using demo location (NYC). Enable location for better experience.';
                this.locationDenied = true; // Prevent further attempts
            } else if (error.code === 2) {
                errorMessage = 'Location unavailable';
                notificationMessage = 'Location services unavailable. Using demo location (NYC).';
                this.locationDenied = true; // Prevent further attempts
            } else if (error.code === 3) {
                errorMessage = 'Location timeout';
                notificationMessage = 'Location request timed out. Using demo location (NYC).';
            }

            if (statusElement) {
                statusElement.textContent = errorMessage;
                statusElement.className = 'status-offline';
            }
            this.showNotification(notificationMessage, 'info');

            // Set an intelligent default location
            const defaultLoc = await this.getDefaultLocation();
            this.currentLocation = { lat: defaultLoc.lat, lng: defaultLoc.lng };
            if (this.map) {
                this.map.setView([this.currentLocation.lat, this.currentLocation.lng], 13);
                L.marker([this.currentLocation.lat, this.currentLocation.lng])
                    .addTo(this.map)
                    .bindPopup(`📍 Demo Location (${defaultLoc.name || 'Default'})`)
                    .openPopup();
            }
            // Update input with demo location as default value
            const fromInput = document.getElementById('fromInput');
            if (fromInput) {
                const defaultLoc = await this.getDefaultLocation();
                const locationName = defaultLoc.name ? `Demo Location (${defaultLoc.name})` : 'Demo Location';
                fromInput.value = locationName;
                fromInput.placeholder = 'From: Address, company, postcode...';
                fromInput.classList.add('default-location');

                // Make it easy to overwrite
                fromInput.addEventListener('focus', function() {
                    if (this.value.startsWith('Demo Location')) {
                        this.select();
                    }
                }, { once: false });
            }
        }
    }

    async getDefaultLocation() {
        console.log('🔍 Getting default location (trying current location first)...');

        try {
            // If we already have a current location, use it
            if (this.currentLocation && this.currentLocation.lat && this.currentLocation.lng) {
                console.log('✅ Using existing current location as default:', this.currentLocation);
                return this.currentLocation;
            }

            // Try to get current location first
            await this.getCurrentLocation();
            if (this.currentLocation && this.currentLocation.lat && this.currentLocation.lng) {
                console.log('✅ Using fresh current location as default:', this.currentLocation);
                return this.currentLocation;
            }
        } catch (error) {
            console.warn('⚠️ Could not get current location for default, using intelligent fallback');
        }

        // Try to detect user's country/region for better default
        try {
            const response = await fetch('https://ipapi.co/json/', {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(3000)
            });

            if (response.ok) {
                const data = await response.json();
                const countryDefaults = {
                    'GB': { lat: 53.4084, lng: -2.9916, name: 'Manchester, UK' }, // UK center
                    'US': { lat: 39.8283, lng: -98.5795, name: 'Kansas, USA' }, // US center
                    'CA': { lat: 56.1304, lng: -106.3468, name: 'Saskatchewan, Canada' }, // Canada center
                    'AU': { lat: -25.2744, lng: 133.7751, name: 'Alice Springs, Australia' }, // Australia center
                    'DE': { lat: 51.1657, lng: 10.4515, name: 'Germany' }, // Germany center
                    'FR': { lat: 46.2276, lng: 2.2137, name: 'France' }, // France center
                };

                const defaultLoc = countryDefaults[data.country_code] ||
                                 { lat: 51.5074, lng: -0.1278, name: 'London, UK' }; // Global fallback

                console.log(`🌍 Using country-based default for ${data.country}: ${defaultLoc.name}`);
                return defaultLoc;
            }
        } catch (ipError) {
            console.warn('⚠️ Could not detect country, using global default');
        }

        // Final fallback to London
        const globalDefault = { lat: 51.5074, lng: -0.1278, name: 'London, UK' };
        console.log('🌍 Using global default location:', globalDefault.name);
        return globalDefault;
    }

    setDefaultFromLocation() {
        // Set current location as default in from input
        const fromInput = document.getElementById('fromInput');
        if (fromInput) {
            // Always set current location as default, even if input has content
            if (this.currentLocation) {
                // Only set if it's not already set or if it's empty
                if (!fromInput.value.trim() || fromInput.value === 'Current Location' || fromInput.value.startsWith('Demo Location')) {
                    fromInput.value = 'Current Location';
                    fromInput.classList.add('default-location');

                    // Remove any existing event listeners to prevent duplicates
                    fromInput.removeEventListener('focus', this.handleFromInputFocus);
                    fromInput.removeEventListener('input', this.handleFromInputChange);

                    // Add event listeners for easy overwriting
                    this.handleFromInputFocus = function() {
                        if (this.value === 'Current Location' || this.value.startsWith('Demo Location')) {
                            this.select();
                        }
                    };

                    this.handleFromInputChange = function() {
                        if (this.value !== 'Current Location' && !this.value.startsWith('Demo Location')) {
                            this.classList.remove('default-location');
                        } else {
                            this.classList.add('default-location');
                        }
                    };

                    this.handleFromInputKeydown = function(e) {
                        if ((this.value === 'Current Location' || this.value.startsWith('Demo Location')) &&
                            e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                            // User is typing a character, clear the default text
                            this.value = '';
                            this.classList.remove('default-location');
                        }
                    };

                    // Remove existing listeners
                    fromInput.removeEventListener('keydown', this.handleFromInputKeydown);

                    fromInput.addEventListener('focus', this.handleFromInputFocus);
                    fromInput.addEventListener('input', this.handleFromInputChange);
                    fromInput.addEventListener('keydown', this.handleFromInputKeydown);

                    console.log('📍 Set "Current Location" as default starting point');
                }
            } else {
                console.log('📍 No current location available yet for default');
            }
        }
    }

    parseRoutingResponse(data, service) {
        try {
            switch (service.type) {
                case 'valhalla':
                    return this.parseValhallaResponse(data);
                case 'graphhopper':
                    return this.parseGraphHopperResponse(data);
                case 'openrouteservice':
                    return this.parseOpenRouteServiceResponse(data);
                case 'osrm':
                default:
                    return this.parseOSRMResponse(data);
            }
        } catch (error) {
            console.error(`Error parsing ${service.type} response:`, error);
            return [];
        }
    }

    parseValhallaResponse(data) {
        try {
            if (!data || !data.trip || !data.trip.legs || data.trip.legs.length === 0) {
                console.warn('⚠️ Invalid Valhalla response structure:', data);
                return [];
            }

            const leg = data.trip.legs[0];

            // Validate leg structure
            if (!leg || !leg.shape || !Array.isArray(leg.shape)) {
                console.warn('⚠️ Invalid Valhalla leg structure:', leg);
                return [];
            }

            // Validate trip summary
            if (!data.trip.summary || typeof data.trip.summary.length !== 'number' || typeof data.trip.summary.time !== 'number') {
                console.warn('⚠️ Invalid Valhalla trip summary:', data.trip.summary);
                return [];
            }

            return [{
                distance: data.trip.summary.length * 1000, // Convert km to meters
                duration: data.trip.summary.time,
                geometry: {
                    type: 'LineString',
                    coordinates: leg.shape.map(point => [point.lon, point.lat])
                },
                steps: leg.maneuvers || []
            }];
        } catch (error) {
            console.error('❌ Error parsing Valhalla response:', error);
            return [];
        }
    }

    parseGraphHopperResponse(data) {
        if (!data.paths || data.paths.length === 0) return [];

        return data.paths.map(path => ({
            distance: path.distance,
            duration: path.time / 1000, // Convert ms to seconds
            geometry: {
                type: 'LineString',
                coordinates: path.points.coordinates
            },
            steps: path.instructions || []
        }));
    }

    parseOpenRouteServiceResponse(data) {
        if (!data.features || data.features.length === 0) return [];

        return data.features.map(feature => ({
            distance: feature.properties.summary.distance,
            duration: feature.properties.summary.duration,
            geometry: feature.geometry,
            steps: feature.properties.segments?.[0]?.steps || []
        }));
    }

    parseOSRMResponse(data) {
        if (!data.routes || data.routes.length === 0) return [];

        return data.routes.map(route => ({
            distance: route.distance,
            duration: route.duration,
            geometry: route.geometry,
            steps: route.legs?.[0]?.steps || []
        }));
    }

    async setDestination(latlng) {
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
        // Check if from input has "Current Location" and handle it
        const fromInput = document.getElementById('fromInput');
        if (fromInput && (fromInput.value === 'Current Location' || fromInput.value === 'Demo Location (NYC)')) {
            // Use current location as starting point
            console.log('📍 Using current location as starting point');
        } else if (fromInput && fromInput.value.trim() && fromInput.value !== 'Current Location') {
            // User has entered a custom starting location
            console.log('📍 Custom starting location detected:', fromInput.value);
            this.showNotification('🔄 Custom starting locations not yet supported, using current location', 'info');
        }

        if (!this.currentLocation || !this.destination) {
            this.showNotification('Please set a destination first', 'error');
            return;
        }

        const navBtn = document.getElementById('navigateBtn');
        navBtn.innerHTML = '<span class="spinner"></span> Calculating routes...';
        navBtn.disabled = true;

        try {
            // Add destination to recent searches
            this.addToRecentSearches({
                name: this.destination.name || 'Destination',
                lat: this.destination.lat,
                lng: this.destination.lng,
                query: document.getElementById('toInput').value
            });

            // Calculate multiple routes
            await this.calculateRoute();

            // If we have a selected route, start navigation immediately
            if (this.routeData && this.routeSteps) {
                this.startSelectedNavigation();

                // Start ETA updates
                this.startETAUpdates();
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

        // Track navigation start time for gamification
        this.navigationStartTime = Date.now();
        this.hazardsAvoidedCount = 0;

        // Start location tracking
        this.startLocationTracking();

        // Show turn-by-turn navigation
        this.showTurnByTurnNavigation();

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

        // Check if map is ready for route display
        if (!this.map) {
            console.warn('⚠️ Map not ready for route display, but continuing with calculation');
        }

        // Clear existing hazards when calculating new route
        this.clearAllHazards();

        try {
            // Check if we're offline and handle accordingly
            if (this.isOffline) {
                console.log('⚠ Offline mode - using cached/generated routes');
                const offlineRoute = await this.getOfflineRoute(
                    this.currentLocation,
                    this.destination,
                    this.transportMode
                );

                if (offlineRoute) {
                    const routes = [offlineRoute];
                    this.availableRoutes = routes;
                    this.showRouteSelection(routes);
                    this.displayMultipleRoutes(routes);
                    this.showNotification('⚠ Using offline route - Limited functionality', 'warning');
                    return;
                } else {
                    throw new Error('No offline route available');
                }
            }

            // Calculate multiple routes with different preferences
            const routes = await this.calculateMultipleRoutes();

            if (routes.length > 0) {
                // Store all routes
                this.availableRoutes = routes;

                // Show route selection panel
                this.showRouteSelection(routes);

                // Display all routes on map
                this.displayMultipleRoutes(routes);

                // Simulate hazard detection for the selected route
                this.simulateRouteHazards(routes[0]);

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
        // Validate coordinates before making API calls
        if (!this.currentLocation || !this.destination) {
            throw new Error('Missing location data for route calculation');
        }

        // Validate location coordinates before using them
        if (isNaN(this.currentLocation.lat) || isNaN(this.currentLocation.lng) ||
            isNaN(this.destination.lat) || isNaN(this.destination.lng)) {
            console.error('❌ Invalid location coordinates detected:', {
                currentLocation: this.currentLocation,
                destination: this.destination
            });

            // Use intelligent default coordinates if current ones are invalid
            const defaultLoc = await this.getDefaultLocation();
            const defaultCurrent = { lat: defaultLoc.lat, lng: defaultLoc.lng };
            // Create a nearby destination (roughly 10km away)
            const defaultDestination = {
                lat: defaultLoc.lat + 0.09, // ~10km north
                lng: defaultLoc.lng + 0.09  // ~10km east
            };

            if (isNaN(this.currentLocation.lat) || isNaN(this.currentLocation.lng)) {
                console.log('🔄 Using intelligent default current location:', defaultCurrent);
                this.currentLocation = defaultCurrent;
            }

            if (isNaN(this.destination.lat) || isNaN(this.destination.lng)) {
                console.log('🔄 Using intelligent default destination:', defaultDestination);
                this.destination = defaultDestination;
            }
        }

        const start = `${this.currentLocation.lng},${this.currentLocation.lat}`;
        const end = `${this.destination.lng},${this.destination.lat}`;

        // Extract individual coordinates for service URLs
        const startLat = this.currentLocation.lat;
        const startLng = this.currentLocation.lng;
        const endLat = this.destination.lat;
        const endLng = this.destination.lng;

        console.log('🗺️ Route calculation coordinates:', { start, end });
        console.log('🗺️ Current location:', this.currentLocation);
        console.log('🗺️ Destination:', this.destination);

        // Validate coordinate format with more comprehensive checks
        if (!this.validateCoordinateString(start) || !this.validateCoordinateString(end)) {
            throw new Error(`Invalid coordinate format: start=${start}, end=${end}`);
        }

        // Log coordinates for debugging
        console.log('🔍 Route calculation coordinates:', { start, end });
        console.log('🔍 Current location:', this.currentLocation);
        console.log('🔍 Destination:', this.destination);









        // Get avoidance parameters based on user settings
        const avoidanceParams = this.buildAvoidanceParameters();

        // Get current transport mode profile
        const currentMode = this.transportModes[this.transportMode];
        const profile = currentMode.profile;

        console.log(`🚶🚴🚗 Using transport mode: ${this.transportMode} (${profile})`);

        // Enhanced routing services for multiple diverse routes
        const routingServices = [
            {
                name: `OSRM ${currentMode.name} Fastest Route`,
                url: `https://router.project-osrm.org/route/v1/${profile}/${start};${end}?overview=full&geometries=geojson&steps=true&alternatives=true${avoidanceParams}`,
                timeout: 10000,
                type: 'osrm',
                routeType: 'fastest'
            },
            {
                name: `OSRM ${currentMode.name} Alternative Routes`,
                url: `https://router.project-osrm.org/route/v1/${profile}/${start};${end}?overview=full&geometries=geojson&steps=true&alternatives=true&continue_straight=false${avoidanceParams}`,
                timeout: 8000,
                type: 'osrm',
                routeType: 'alternative'
            }
        ];

        // Add driving-specific route variations for cars
        if (profile === 'driving') {
            routingServices.push({
                name: `OSRM ${currentMode.name} Scenic Route`,
                url: `https://router.project-osrm.org/route/v1/${profile}/${start};${end}?overview=full&geometries=geojson&steps=true&alternatives=true&exclude=motorway${avoidanceParams}`,
                timeout: 8000,
                type: 'osrm',
                routeType: 'scenic'
            });
        }

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

                        // Parse response based on service type
                        const parsedRoutes = this.parseRoutingResponse(data, routingServices[i]);

                        if (parsedRoutes && parsedRoutes.length > 0) {
                            console.log(`✅ ${result.value.service}: ${parsedRoutes.length} routes found`);
                            successfulRequests++;

                            // Add all routes from this response
                            parsedRoutes.forEach((route, index) => {
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
                        console.warn(`⚠️ ${result.value.service}: HTTP ${response.status} - ${response.statusText}`);
                        if (response.status === 400) {
                            console.warn(`⚠️ ${result.value.service}: Bad request - possibly invalid coordinates or parameters`);
                            console.warn(`⚠️ Request URL: ${routingServices[i].url}`);
                            console.warn(`⚠️ Coordinates used: start=${start}, end=${end}`);
                        }
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
            console.warn('⚠️ All routing services failed, creating demo route...');
            // Create a simple demo route for testing
            const demoRoute = await this.createDemoRoute(start, end);
            if (demoRoute) {
                routes.push(demoRoute);
                console.log('✅ Demo route created as fallback');
            } else {
                throw new Error(`No routes found from any service (${successfulRequests}/${responses.length} services responded)`);
            }
        }

        // Ensure we have multiple route options (3-4 routes)
        if (routes.length < 4) {
            console.log(`🔄 Creating route variations for comparison... (currently have ${routes.length} routes)`);
            const baseRoute = routes[0];
            if (baseRoute) {
                const neededRoutes = 4 - routes.length;
                const variations = this.createRouteVariations(baseRoute, neededRoutes);
                routes.push(...variations);
                console.log(`✅ Added ${variations.length} route variations, total: ${routes.length} routes`);
            }
        }

        // Remove duplicates and limit to 4 routes
        const uniqueRoutes = this.removeDuplicateRoutes(routes).slice(0, 4);

        // Apply hazard avoidance to routes
        const routesWithAvoidance = await this.applyHazardAvoidanceToRoutes(uniqueRoutes);

        // Sort routes by type preference (now includes avoidance scoring)
        const sortedRoutes = this.sortRoutesByPreference(routesWithAvoidance);

        // Store the routes for comparison
        this.availableRoutes = sortedRoutes;

        return sortedRoutes;
    }

    createRouteVariations(baseRoute, maxVariations = 3) {
        const variations = [];

        if (!baseRoute) return variations;

        console.log(`🔄 Creating ${maxVariations} route variations from base route`);

        const routeTypes = [
            {
                name: 'scenic',
                distance: baseRoute.distance * 1.15, // 15% longer
                duration: baseRoute.duration * 1.1,  // 10% slower
                color: '#45B7D1',
                description: 'Scenic route with better views'
            },
            {
                name: 'eco',
                distance: baseRoute.distance * 0.95, // 5% shorter
                duration: baseRoute.duration * 1.05,  // 5% slower (lower speeds)
                color: '#96CEB4',
                description: 'Eco-friendly route for better fuel efficiency'
            },
            {
                name: 'balanced',
                distance: baseRoute.distance * 1.05, // 5% longer
                duration: baseRoute.duration * 0.98,  // 2% faster
                color: '#F7DC6F',
                description: 'Balanced route considering time and distance'
            },
            {
                name: 'shortest',
                distance: baseRoute.distance * 0.88, // 12% shorter
                duration: baseRoute.duration * 1.15,  // 15% slower (city streets)
                color: '#FF9F43',
                description: 'Shortest distance route'
            }
        ];

        // Create only the requested number of variations
        for (let i = 0; i < Math.min(maxVariations, routeTypes.length); i++) {
            const routeType = routeTypes[i];
            const variation = {
                ...baseRoute,
                distance: routeType.distance,
                duration: routeType.duration,
                type: routeType.name,
                routeIndex: i + 1,
                color: routeType.color,
                source: 'Generated Variation',
                description: routeType.description
            };
            variations.push(variation);
        }

        console.log(`✅ Created ${variations.length} route variations: ${variations.map(r => r.type).join(', ')}`);
        return variations;
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
            // Primary sort: Avoidance score (lower is better - fewer hazards to avoid)
            const avoidanceA = a.avoidanceScore || 0;
            const avoidanceB = b.avoidanceScore || 0;

            // If one route has significantly fewer hazards, prefer it
            if (Math.abs(avoidanceA - avoidanceB) > 300) { // 5+ minute difference
                return avoidanceA - avoidanceB;
            }

            // Secondary sort: Route type preference
            const orderA = typeOrder[a.type] || 999;
            const orderB = typeOrder[b.type] || 999;
            if (orderA !== orderB) return orderA - orderB;

            // Tertiary sort: Duration (including avoidance penalties)
            return a.duration - b.duration;
        });
    }

    async calculateSingleRoute() {
        // Use the same multi-service approach as calculateMultipleRoutes
        console.log('🔄 Fallback: Using multi-service approach for single route...');

        try {
            // Use the same multi-service routing as the main function
            const routes = await this.calculateMultipleRoutes();

            if (routes && routes.length > 0) {
                console.log(`✅ Single route fallback succeeded: ${routes.length} routes found`);

                // Store all routes
                this.availableRoutes = routes;

                // Select the first (best) route
                this.selectRoute(routes[0], 0);

                // Update UI
                this.showRouteSelection(routes);
                this.displayMultipleRoutes(routes);

                return;
            }
        } catch (error) {
            console.error('❌ Multi-service fallback failed:', error);
        }

        // Final fallback: Create demo route
        console.warn('⚠️ All routing services failed, creating demo route...');
        const start = `${this.currentLocation.lng},${this.currentLocation.lat}`;
        const end = `${this.destination.lng},${this.destination.lat}`;
        const demoRoute = await this.createDemoRoute(start, end);

        if (demoRoute) {
            this.availableRoutes = [demoRoute];
            this.selectRoute(demoRoute, 0);
            this.showRouteSelection([demoRoute]);
            this.displayMultipleRoutes([demoRoute]);
            console.log('✅ Demo route created as final fallback');
        } else {
            console.error('❌ Failed to create demo route');
        }

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

        const duration = Math.round(route.duration / 60);
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        // Calculate additional stats
        const avgSpeedKmh = Math.round((route.distance / 1000) / (route.duration / 3600));
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
                        <span class="route-stat-value">${this.formatSpeed(avgSpeedKmh)}</span>
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
        // Validate input
        if (!distanceMeters || isNaN(distanceMeters) || distanceMeters <= 0) {
            console.warn('⚠️ Invalid distance for fuel cost calculation:', distanceMeters);
            return 0;
        }

        const distanceKm = distanceMeters / 1000;
        const fuelUsed = (distanceKm / 100) * 8; // 8L per 100km average consumption (internal calculation)

        console.log('⛽ Fuel cost calculation:', {
            distanceMeters,
            distanceKm: distanceKm.toFixed(2),
            fuelUsed: fuelUsed.toFixed(2)
        });

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

    formatCurrency(amount) {
        // Handle NaN and invalid values
        if (!amount || isNaN(amount) || amount < 0) {
            console.warn('⚠️ Invalid currency amount:', amount);
            // Default to GBP for UK users, USD otherwise
            const defaultSymbol = (this.userCountry === 'GB' || !this.userCountry) ? '£' : '$';
            return `${defaultSymbol}0.00`;
        }

        // Get country-specific currency formatting
        let countryData = this.fuelPrices[this.userCountry];

        // If no user country detected, default to GB (UK) for GBP
        if (!countryData) {
            console.log('🔍 No user country detected, defaulting to GB for GBP');
            countryData = this.fuelPrices['GB'];
        }

        const { symbol } = countryData;

        return `${symbol}${amount.toFixed(2)}`;
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
        // Check if map is ready
        if (!this.map) {
            console.warn('⚠️ Map not ready, cannot display routes');
            return;
        }

        // Clear existing route lines
        this.clearRouteLines();

        // Add all routes to map with coordinate validation
        routes.forEach((route, index) => {
            const routeCoords = route.geometry.coordinates
                .map(coord => [coord[1], coord[0]])
                .filter(coord => !isNaN(coord[0]) && !isNaN(coord[1])); // Filter out NaN coordinates

            if (routeCoords.length === 0) {
                console.warn(`⚠️ Route ${index} has no valid coordinates, skipping`);
                return;
            }

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

    extractRouteSteps(route) {
        // Handle different route formats (OSRM vs Demo routes)
        if (route.legs && route.legs[0] && route.legs[0].steps) {
            // OSRM route format
            return route.legs[0].steps;
        } else if (route.steps) {
            // Demo route format
            return route.steps;
        } else {
            // Fallback: create basic steps from route data
            console.warn('⚠️ Route has no steps, creating basic navigation');
            return [{
                instruction: `Navigate to destination (${this.formatDistance(route.distance || 0)})`,
                distance: route.distance || 0,
                duration: route.duration || 0
            }];
        }
    }

    async selectRoute(route, index) {
        console.log('🎯 Route selected:', route.type, index);

        // Check if map is ready
        if (!this.map) {
            console.warn('⚠️ Map not ready, cannot display route');
            // Store route data anyway for when map becomes available
            this.routeData = route;
            this.routeSteps = this.extractRouteSteps(route);
            this.currentStepIndex = 0;
            return;
        }

        // Store selected route data
        this.routeData = route;
        this.routeSteps = this.extractRouteSteps(route);
        this.currentStepIndex = 0;

        // Set journey state to route-selected
        this.journeyState = 'route-selected';
        console.log('🎯 Journey state set to route-selected');

        // Clear all route lines
        this.clearRouteLines();

        // Add only the selected route with coordinate validation
        const routeCoords = route.geometry.coordinates
            .map(coord => [coord[1], coord[0]])
            .filter(coord => !isNaN(coord[0]) && !isNaN(coord[1])); // Filter out NaN coordinates

        if (routeCoords.length === 0) {
            console.error('❌ No valid coordinates found in route');
            this.showNotification('❌ Route display failed - invalid coordinates', 'error');
            return;
        }

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

        // Add null checks for container dimensions
        if (!mapContainer || mapContainer.offsetWidth === undefined) {
            console.warn('⚠️ Map container not available for padding calculation, using defaults');
            return [50, 50, 100, 50]; // Default padding
        }

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
        console.log('🔧 calculateDistance called with:', { lat1, lng1, lat2, lng2 });
        console.log('🔧 Parameter types:', {
            lat1Type: typeof lat1,
            lng1Type: typeof lng1,
            lat2Type: typeof lat2,
            lng2Type: typeof lng2
        });

        // Validate inputs
        if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
            console.error('❌ Invalid coordinates for distance calculation:', { lat1, lng1, lat2, lng2 });
            return 0;
        }

        console.log('📏 Calculating distance:', { lat1, lng1, lat2, lng2 });

        const R = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        console.log('📏 Distance calculated:', distance + 'm');
        return distance;
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
        // Validate distance input
        if (isNaN(meters) || meters === null || meters === undefined) {
            console.warn('⚠️ Invalid distance for formatting:', meters);
            return '0 km'; // Default fallback
        }

        const converted = this.convertDistance(meters);
        console.log('📏 formatDistance:', meters, 'meters →', converted, 'system:', this.units.system);
        return `${converted.value} ${converted.unit}`;
    }

    formatWindSpeed(kmh) {
        console.log('🌬️ formatWindSpeed called:', { kmh, system: this.units.system });
        if (this.units.system === 'imperial') {
            // Convert km/h to mph
            const mph = kmh * 0.621371;
            const result = `${Math.round(mph)} mph`;
            console.log('🌬️ Wind speed converted to imperial:', result);
            return result;
        } else {
            const result = `${kmh} km/h`;
            console.log('🌬️ Wind speed in metric:', result);
            return result;
        }
    }

    formatSpeed(kmh) {
        // Validate speed input
        if (isNaN(kmh) || kmh === null || kmh === undefined) {
            console.warn('⚠️ Invalid speed for formatting:', kmh);
            return '0 km/h'; // Default fallback
        }

        const converted = this.convertSpeed(kmh);
        return `${converted.value} ${converted.unit}`;
    }

    // Address Input and Geocoding Functions
    async handleAddressInput(inputType, query) {
        console.log(`🔍 Address input: ${inputType} = "${query}"`);

        if (!query || query.length < 3) {
            this.hideSuggestions(inputType);
            return;
        }

        // Skip geocoding for default values to prevent CORS errors
        const defaultValues = [
            'Current Location',
            'Demo Location (NYC)',
            'Demo Location',
            'current location',
            'demo location'
        ];

        if (defaultValues.some(defaultValue => query.toLowerCase().includes(defaultValue.toLowerCase()))) {
            console.log(`🚫 Skipping geocoding for default value: "${query}"`);
            this.hideSuggestions(inputType);
            return;
        }

        // Show searching notification
        this.showNotification(`🔍 Searching for "${query}"...`, 'info');

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

        // Additional protection against default values
        const defaultValues = [
            'Current Location',
            'Demo Location (NYC)',
            'Demo Location',
            'current location',
            'demo location'
        ];

        if (defaultValues.some(defaultValue => query.toLowerCase().includes(defaultValue.toLowerCase()))) {
            console.log(`🚫 Blocking geocoding request for default value: "${query}"`);
            return []; // Return empty suggestions
        }

        try {
            switch (format) {
                case 'uk_postcode':
                    // Always use geocodeLocation for UK postcodes
                    try {
                        const result = await this.geocodeLocation(query);
                        suggestions.push({
                            type: 'UK Postcode',
                            main: query.toUpperCase(),
                            details: result.name.split(',').slice(1).join(',').trim(),
                            lat: result.lat,
                            lng: result.lng
                        });
                    } catch (error) {
                        console.warn('UK postcode search failed:', error);
                    }
                    break;
                case 'us_zipcode':
                    try {
                        const result = await this.geocodeLocation(query);
                        suggestions.push({
                            type: 'US Zipcode',
                            main: query,
                            details: result.name.split(',').slice(1).join(',').trim(),
                            lat: result.lat,
                            lng: result.lng
                        });
                    } catch (error) {
                        console.warn('US zipcode search failed:', error);
                    }
                    break;
                case 'coordinates':
                    try {
                        // Parse coordinates in format "lat,lng" or "lat lng"
                        const coords = query.replace(/[^\d.,-\s]/g, '').split(/[,\s]+/);
                        if (coords.length >= 2) {
                            const lat = parseFloat(coords[0]);
                            const lng = parseFloat(coords[1]);
                            if (!isNaN(lat) && !isNaN(lng)) {
                                suggestions.push({
                                    type: 'Coordinates',
                                    main: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                                    details: 'GPS Coordinates',
                                    lat: lat,
                                    lng: lng
                                });
                            }
                        }
                    } catch (error) {
                        console.warn('Coordinate parsing failed:', error);
                    }
                    break;
                case 'street_address':
                    try {
                        const result = await this.geocodeLocation(query);
                        suggestions.push({
                            type: 'Address',
                            main: result.name.split(',')[0],
                            details: result.name.split(',').slice(1).join(',').trim(),
                            lat: result.lat,
                            lng: result.lng
                        });
                    } catch (error) {
                        console.warn('Street address search failed:', error);
                    }
                    break;
                case 'company_name':
                    try {
                        const result = await this.geocodeLocation(query);
                        suggestions.push({
                            type: 'Business',
                            main: result.name.split(',')[0],
                            details: result.name.split(',').slice(1).join(',').trim(),
                            lat: result.lat,
                            lng: result.lng
                        });
                    } catch (error) {
                        console.warn('Company name search failed:', error);
                    }
                    break;
                case 'place_name':
                default:
                    // Use GeocodingService if available, otherwise fallback to direct search
                    if (this.geocodingService) {
                        try {
                            const results = await this.geocodingService.searchPlaces(query);
                            suggestions.push(...results.map(item => ({
                                type: 'Place',
                                main: item.displayName.split(',')[0],
                                details: item.displayName.split(',').slice(1).join(',').trim(),
                                lat: item.lat,
                                lng: item.lng
                            })));
                        } catch (error) {
                            console.warn('GeocodingService search failed, using fallback:', error);
                            // Fallback to geocodeLocation
                            try {
                                const result = await this.geocodeLocation(query);
                                suggestions.push({
                                    type: 'Place',
                                    main: result.name.split(',')[0],
                                    details: result.name.split(',').slice(1).join(',').trim(),
                                    lat: result.lat,
                                    lng: result.lng
                                });
                            } catch (geocodeError) {
                                console.warn('Geocoding failed for place name:', geocodeError);
                            }
                        }
                    } else {
                        // Use searchPlaceName function as fallback
                        try {
                            const results = await this.searchPlaceName(query);
                            suggestions.push(...results);
                        } catch (searchError) {
                            console.warn('searchPlaceName failed, using geocodeLocation:', searchError);
                            // Final fallback to geocodeLocation
                            try {
                                const result = await this.geocodeLocation(query);
                                suggestions.push({
                                    type: 'Place',
                                    main: result.name.split(',')[0],
                                    details: result.name.split(',').slice(1).join(',').trim(),
                                    lat: result.lat,
                                    lng: result.lng
                                });
                            } catch (geocodeError) {
                                console.warn('All search methods failed for place name:', geocodeError);
                            }
                        }
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

                        const distanceA = this.calculateDistanceBetweenPoints({ lat, lng }, { lat: a.lat, lng: a.lng });
                        const distanceB = this.calculateDistanceBetweenPoints({ lat, lng }, { lat: b.lat, lng: b.lng });
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
        console.log('🔍 Current journey state:', this.journeyState);

        // If we have route data, allow starting journey
        if (!this.routeData) {
            this.showNotification('Please calculate a route first', 'error');
            return;
        }

        // Set journey state to route-selected if we have a route
        if (this.routeData && this.journeyState !== 'route-selected') {
            console.log('🔧 Setting journey state to route-selected');
            this.journeyState = 'route-selected';
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

        // TEMPORARILY DISABLED: Hazard detection causing false positives
        // TODO: Implement more accurate hazard detection with verified data sources
        console.log('🚫 Hazard detection temporarily disabled to prevent false positives');
        return [];

        /* DISABLED CODE:
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
        */
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
    async recenterMap() {
        console.log('🎯 Recentering map... [FIXED VERSION - ASYNC FUNCTION]');
        console.log('🔧 This function is properly declared as ASYNC!');

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
        // Default to intelligent location
        else {
            console.log('🌍 Centering on intelligent default location');
            const defaultLoc = await this.getDefaultLocation();
            this.map.setView([defaultLoc.lat, defaultLoc.lng], 10, {
                animate: true,
                duration: 0.5
            });
            this.showNotification(`🎯 Map centered on ${defaultLoc.name || 'default location'}`, 'info');
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

    // Coordinate validation helper
    validateCoordinateString(coordString) {
        if (!coordString || typeof coordString !== 'string') {
            console.error('❌ Invalid coordinate string:', coordString);
            return false;
        }

        const parts = coordString.split(',');
        if (parts.length !== 2) {
            console.error('❌ Coordinate string must have exactly 2 parts:', coordString);
            return false;
        }

        const [lng, lat] = parts.map(Number);

        // Check for NaN values
        if (isNaN(lng) || isNaN(lat)) {
            console.error('❌ Coordinate parts are not valid numbers:', { lng, lat, original: coordString });
            return false;
        }

        // Check coordinate bounds (longitude: -180 to 180, latitude: -90 to 90)
        if (lng < -180 || lng > 180) {
            console.error('❌ Longitude out of bounds:', lng);
            return false;
        }

        if (lat < -90 || lat > 90) {
            console.error('❌ Latitude out of bounds:', lat);
            return false;
        }

        return true;
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
            // OSRM only supports specific exclusion types: motorway, trunk, ferry, toll
            // Narrow roads are typically residential, but OSRM doesn't support excluding them directly
            // We'll use trunk exclusion as a compromise since trunk roads are usually wider
        }

        if (settings.steepGrades) {
            // Avoid trunk roads which may have steep grades in hilly areas
            // trunk is a valid OSRM exclusion type
            if (!baseExclusions.includes('trunk')) {
                baseExclusions.push('trunk');
            }
        }

        // Helper function to build clean exclusion strings
        const buildExclusionString = (additionalExclusions = []) => {
            const allExclusions = [...baseExclusions, ...additionalExclusions];
            const uniqueExclusions = [...new Set(allExclusions)]; // Remove duplicates
            return uniqueExclusions.length > 0 ? uniqueExclusions.join(',') : '';
        };

        return {
            fastest: buildExclusionString(),
            noHighway: buildExclusionString(['motorway']), // Avoid highways for safer route
            shortest: buildExclusionString(),
            noLights: buildExclusionString(['trunk']), // Avoid trunk roads (secondary is not a valid OSRM exclusion)
            noRailway: buildExclusionString(settings.railwayCrossings ? ['trunk'] : []) // Only use trunk (secondary is not valid)
        };
    }

    buildOSRMExcludeParams(exclusions) {
        // Convert exclusion strings to OSRM API parameters
        // OSRM only supports these exclusion types: motorway, trunk, ferry, toll
        const validOSRMExclusions = ['motorway', 'trunk', 'ferry', 'toll'];

        const buildExcludeParam = (exclusionString) => {
            if (!exclusionString || exclusionString.length === 0) {
                return '';
            }

            // Filter to only valid OSRM exclusion types
            const exclusionList = exclusionString.split(',').map(e => e.trim());
            const validExclusions = exclusionList.filter(exclusion =>
                validOSRMExclusions.includes(exclusion)
            );

            if (validExclusions.length === 0) {
                return '';
            }

            // Clean the exclusion string and build parameter
            const cleanExclusions = validExclusions.join(',');
            return `&exclude=${cleanExclusions}`;
        };

        return {
            primary: buildExcludeParam(exclusions.fastest),
            noHighway: buildExcludeParam(exclusions.noHighway),
            shortest: buildExcludeParam(exclusions.shortest),
            noRailway: buildExcludeParam(exclusions.noRailway),
            fastest: buildExcludeParam(exclusions.fastest)
        };
    }

    generateRoadLikeWaypoints(startLat, startLng, endLat, endLng) {
        // Generate waypoints that approximate road routing instead of straight lines
        const waypoints = [[startLng, startLat]];

        // Calculate the number of intermediate points based on distance
        const distance = this.calculateDistance(startLat, startLng, endLat, endLng);

        // Ensure we always have a reasonable number of points even if distance calculation fails
        let numPoints;
        if (isNaN(distance) || distance <= 0) {
            console.warn('⚠️ Invalid distance for waypoint calculation, using default points');
            numPoints = 6; // Default to 6 intermediate points
        } else {
            numPoints = Math.max(4, Math.min(8, Math.floor(distance / 3000))); // More points for better curves
        }

        console.log('🛣️ Generating road-like waypoints:', {
            distance: distance + 'm',
            numPoints,
            startLat, startLng, endLat, endLng
        });

        // Create waypoints with more pronounced deviations to simulate road routing
        for (let i = 1; i < numPoints; i++) {
            const ratio = i / numPoints;

            // Linear interpolation with road-like deviations
            let lat = startLat + (endLat - startLat) * ratio;
            let lng = startLng + (endLng - startLng) * ratio;

            // Add much more pronounced deviations to simulate realistic road paths
            const baseDeviation = 0.02; // Increased base deviation for more visible curves

            // Handle NaN distance by using a default factor
            let distanceFactor;
            if (isNaN(distance) || distance <= 0) {
                distanceFactor = 1.0; // Use full deviation for unknown distance
            } else {
                distanceFactor = Math.min(distance / 5000, 1.5); // Scale with distance, allow up to 1.5x
            }

            const deviation = baseDeviation * distanceFactor;

            // Create much more curved path with multiple sine waves for realistic routing
            const curve1 = Math.sin(ratio * Math.PI * 1.5) * deviation; // Primary curve
            const curve2 = Math.sin(ratio * Math.PI * 3) * deviation * 0.7; // Secondary curve
            const curve3 = Math.sin(ratio * Math.PI * 6) * deviation * 0.3; // Fine detail
            const randomOffset = (Math.random() - 0.5) * deviation * 0.5; // More random variation

            // Apply all curve components for much more realistic road-like path
            lat += curve1 + curve3 + randomOffset;
            lng += curve2 + curve3 + randomOffset;

            // Validate waypoint coordinates before adding
            if (isNaN(lat) || isNaN(lng)) {
                console.warn('⚠️ Invalid waypoint coordinates, skipping:', { lat, lng, ratio });
                continue;
            }

            waypoints.push([lng, lat]);
            console.log(`🛣️ Waypoint ${i}:`, [lng, lat]);
        }

        waypoints.push([endLng, endLat]);
        console.log('🛣️ Total waypoints generated:', waypoints.length);
        return waypoints;
    }

    async createDemoRoute(start, end) {
        try {
            // Parse coordinates with validation
            const [startLng, startLat] = start.split(',').map(Number);
            const [endLng, endLat] = end.split(',').map(Number);

            // Validate coordinates
            if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
                console.error('❌ Invalid coordinates for demo route:', { start, end, startLat, startLng, endLat, endLng });
                // Use intelligent default coordinates
                const defaultLoc = await this.getDefaultLocation();
                const defaultStartLat = defaultLoc.lat, defaultStartLng = defaultLoc.lng;
                const defaultEndLat = defaultLoc.lat + 0.09, defaultEndLng = defaultLoc.lng + 0.09; // ~10km away
                console.log('🔄 Using intelligent default coordinates:', { defaultStartLat, defaultStartLng, defaultEndLat, defaultEndLng });
                return await this.createDemoRoute(`${defaultStartLng},${defaultStartLat}`, `${defaultEndLng},${defaultEndLat}`);
            }

            // Create a more realistic route that approximates road paths
            let distance = this.calculateDistance(startLat, startLng, endLat, endLng);

            // If distance calculation fails, use a realistic default
            if (!distance || distance === 0 || isNaN(distance)) {
                console.warn('⚠️ Distance calculation failed, using realistic default');
                distance = 15200; // 15.2 km default distance
            }

            // Use appropriate speed for transport mode
            const currentMode = this.transportModes[this.transportMode];
            const averageSpeed = currentMode.speedKmh;
            const duration = Math.round((distance / 1000) / averageSpeed * 3600); // Convert to km, then calculate duration

            console.log('🛣️ Creating demo route:', {
                startLat, startLng, endLat, endLng,
                distance: distance + 'm',
                duration: duration + 's',
                distanceKm: (distance / 1000).toFixed(1) + 'km',
                durationMin: Math.round(duration / 60) + 'min'
            });

            // Create waypoints that approximate road routing
            const waypoints = this.generateRoadLikeWaypoints(startLat, startLng, endLat, endLng);
            console.log('🛣️ Generated waypoints:', waypoints.length, 'points');

            const demoRoute = {
                type: 'Demo Route',
                distance: distance,
                duration: duration,
                geometry: {
                    type: 'LineString',
                    coordinates: waypoints
                },
                steps: [
                    {
                        instruction: `Head towards destination (${this.formatDistance(distance)})`,
                        distance: distance,
                        duration: duration,
                        maneuver: {
                            type: 'depart',
                            instruction: `Head towards destination`
                        }
                    },
                    {
                        instruction: 'You have arrived at your destination',
                        distance: 0,
                        duration: 0,
                        maneuver: {
                            type: 'arrive',
                            instruction: 'You have arrived at your destination'
                        }
                    }
                ],
                source: 'Demo Route (Fallback)'
            };

            return demoRoute;
        } catch (error) {
            console.error('❌ Failed to create demo route:', error);
            return null;
        }
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

    // ===== FAVORITE LOCATIONS MANAGEMENT =====

    loadFavoriteLocations() {
        try {
            const saved = localStorage.getItem('vibeVoyage_favoriteLocations');
            if (saved) {
                this.favoriteLocations = JSON.parse(saved);
                console.log('📍 Loaded favorite locations:', this.favoriteLocations.length);
            }
        } catch (error) {
            console.warn('Error loading favorite locations:', error);
            this.favoriteLocations = [];
        }
    }

    saveFavoriteLocations() {
        try {
            localStorage.setItem('vibeVoyage_favoriteLocations', JSON.stringify(this.favoriteLocations));
            console.log('💾 Saved favorite locations');
        } catch (error) {
            console.error('Error saving favorite locations:', error);
        }
    }

    addToFavorites(location) {
        const favorite = {
            id: Date.now().toString(),
            name: location.name || 'Unnamed Location',
            address: location.address || location.name || '',
            lat: location.lat,
            lng: location.lng,
            addedAt: Date.now(),
            type: location.type || 'custom'
        };

        // Check if already exists
        const exists = this.favoriteLocations.find(fav =>
            Math.abs(fav.lat - favorite.lat) < 0.0001 &&
            Math.abs(fav.lng - favorite.lng) < 0.0001
        );

        if (exists) {
            this.showNotification('⭐ Location already in favorites', 'info');
            return false;
        }

        // Add to beginning of array
        this.favoriteLocations.unshift(favorite);

        // Limit to max favorites
        if (this.favoriteLocations.length > this.maxFavoriteLocations) {
            this.favoriteLocations = this.favoriteLocations.slice(0, this.maxFavoriteLocations);
        }

        this.saveFavoriteLocations();
        this.showNotification('⭐ Added to favorites!', 'success');
        return true;
    }

    removeFromFavorites(favoriteId) {
        const index = this.favoriteLocations.findIndex(fav => fav.id === favoriteId);
        if (index !== -1) {
            const removed = this.favoriteLocations.splice(index, 1)[0];
            this.saveFavoriteLocations();
            this.showNotification(`🗑️ Removed "${removed.name}" from favorites`, 'info');
            return true;
        }
        return false;
    }

    getFavoriteLocations() {
        return [...this.favoriteLocations];
    }

    // ===== RECENT SEARCHES MANAGEMENT =====

    loadRecentSearches() {
        try {
            const saved = localStorage.getItem('vibeVoyage_recentSearches');
            if (saved) {
                this.recentSearches = JSON.parse(saved);
                console.log('🔍 Loaded recent searches:', this.recentSearches.length);
            }
        } catch (error) {
            console.warn('Error loading recent searches:', error);
            this.recentSearches = [];
        }
    }

    saveRecentSearches() {
        try {
            localStorage.setItem('vibeVoyage_recentSearches', JSON.stringify(this.recentSearches));
            console.log('💾 Saved recent searches');
        } catch (error) {
            console.error('Error saving recent searches:', error);
        }
    }

    addToRecentSearches(location) {
        const search = {
            id: Date.now().toString(),
            query: location.query || location.name || '',
            name: location.name || 'Unnamed Location',
            address: location.address || location.name || '',
            lat: location.lat,
            lng: location.lng,
            searchedAt: Date.now(),
            type: location.type || 'search'
        };

        // Remove if already exists (to move to top)
        this.recentSearches = this.recentSearches.filter(recent =>
            !(Math.abs(recent.lat - search.lat) < 0.0001 &&
              Math.abs(recent.lng - search.lng) < 0.0001)
        );

        // Add to beginning of array
        this.recentSearches.unshift(search);

        // Limit to max recent searches
        if (this.recentSearches.length > this.maxRecentSearches) {
            this.recentSearches = this.recentSearches.slice(0, this.maxRecentSearches);
        }

        this.saveRecentSearches();
    }

    clearRecentSearches() {
        this.recentSearches = [];
        this.saveRecentSearches();
        this.showNotification('🗑️ Recent searches cleared', 'info');
    }

    getRecentSearches() {
        return [...this.recentSearches];
    }

    // ===== WEATHER INTEGRATION =====

    async getCurrentWeather(location = null) {
        const coords = location || this.currentLocation;
        if (!coords) {
            console.warn('No location available for weather');
            return null;
        }

        try {
            // Use free weather API (OpenWeatherMap requires API key, so we'll use a mock for now)
            const weather = await this.getMockWeatherData(coords);
            this.displayWeatherInfo(weather);
            return weather;
        } catch (error) {
            console.error('Weather fetch error:', error);
            return null;
        }
    }

    getMockWeatherData(coords) {
        // Mock weather data for demonstration
        const conditions = ['sunny', 'cloudy', 'rainy', 'partly-cloudy'];
        const condition = conditions[Math.floor(Math.random() * conditions.length)];

        return {
            location: `${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)}`,
            temperature: Math.round(15 + Math.random() * 15), // 15-30°C
            condition: condition,
            humidity: Math.round(40 + Math.random() * 40), // 40-80%
            windSpeed: Math.round(Math.random() * 20), // 0-20 km/h
            visibility: Math.round(8 + Math.random() * 7), // 8-15 km
            icon: this.getWeatherIcon(condition),
            timestamp: Date.now()
        };
    }

    getWeatherIcon(condition) {
        const icons = {
            'sunny': '☀️',
            'cloudy': '☁️',
            'rainy': '🌧️',
            'partly-cloudy': '⛅'
        };
        return icons[condition] || '🌤️';
    }

    displayWeatherInfo(weather) {
        const weatherDisplay = document.getElementById('weatherDisplay');
        if (!weatherDisplay) return;

        weatherDisplay.innerHTML = `
            <div class="weather-info" style="
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px;
                border-radius: 8px;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 10px;
            ">
                <span style="font-size: 20px;">${weather.icon}</span>
                <div>
                    <div style="font-weight: bold;">${weather.temperature}°C</div>
                    <div style="font-size: 12px; opacity: 0.8;">${weather.condition}</div>
                </div>
                <div style="font-size: 12px; opacity: 0.7;">
                    💨 ${this.formatWindSpeed(weather.windSpeed)}<br>
                    👁️ ${this.formatDistance(weather.visibility * 1000)}
                </div>
            </div>
        `;
    }

    // ===== ROUTE SHARING =====

    async shareCurrentRoute() {
        if (!this.currentLocation || !this.destination) {
            this.showNotification('❌ No active route to share', 'error');
            return;
        }

        const routeData = {
            from: {
                lat: this.currentLocation.lat,
                lng: this.currentLocation.lng,
                name: 'Current Location'
            },
            to: {
                lat: this.destination.lat,
                lng: this.destination.lng,
                name: this.destination.name || 'Destination'
            },
            timestamp: Date.now(),
            app: 'VibeVoyage'
        };

        const shareUrl = this.generateShareUrl(routeData);
        const shareText = `🗺️ Check out my route on VibeVoyage!\n\nFrom: ${routeData.from.name}\nTo: ${routeData.to.name}\n\n${shareUrl}`;

        try {
            if (navigator.share) {
                // Use native sharing if available
                await navigator.share({
                    title: 'VibeVoyage Route',
                    text: shareText,
                    url: shareUrl
                });
                this.showNotification('📤 Route shared successfully!', 'success');
            } else {
                // Fallback to clipboard
                await navigator.clipboard.writeText(shareText);
                this.showNotification('📋 Route link copied to clipboard!', 'success');
            }
        } catch (error) {
            console.error('Share error:', error);
            this.showNotification('❌ Failed to share route', 'error');
        }
    }

    generateShareUrl(routeData) {
        const baseUrl = window.location.origin + window.location.pathname;
        const params = new URLSearchParams({
            from: `${routeData.from.lat},${routeData.from.lng}`,
            to: `${routeData.to.lat},${routeData.to.lng}`,
            fromName: routeData.from.name,
            toName: routeData.to.name
        });
        return `${baseUrl}?${params.toString()}`;
    }

    parseSharedRoute() {
        const urlParams = new URLSearchParams(window.location.search);
        const from = urlParams.get('from');
        const to = urlParams.get('to');
        const fromName = urlParams.get('fromName');
        const toName = urlParams.get('toName');

        if (from && to) {
            const [fromLat, fromLng] = from.split(',').map(Number);
            const [toLat, toLng] = to.split(',').map(Number);

            if (!isNaN(fromLat) && !isNaN(fromLng) && !isNaN(toLat) && !isNaN(toLng)) {
                // Set shared route
                this.currentLocation = { lat: fromLat, lng: fromLng, name: fromName };
                this.destination = { lat: toLat, lng: toLng, name: toName };

                this.showNotification('🔗 Loaded shared route!', 'success');

                // Update UI
                if (fromName) document.getElementById('fromInput').placeholder = `From: ${fromName}`;
                if (toName) document.getElementById('toInput').value = toName;

                // Calculate route
                setTimeout(() => this.startNavigation(), 1000);

                return true;
            }
        }
        return false;
    }

    // ===== REAL-TIME ETA UPDATES =====

    startETAUpdates() {
        if (this.etaUpdateInterval) {
            clearInterval(this.etaUpdateInterval);
        }

        this.etaUpdateInterval = setInterval(() => {
            if (this.isNavigating && this.currentLocation && this.destination) {
                this.updateETA();
            }
        }, 30000); // Update every 30 seconds
    }

    stopETAUpdates() {
        if (this.etaUpdateInterval) {
            clearInterval(this.etaUpdateInterval);
            this.etaUpdateInterval = null;
        }
    }

    async updateETA() {
        try {
            const distance = this.calculateDistance(
                this.currentLocation.lat,
                this.currentLocation.lng,
                this.destination.lat,
                this.destination.lng
            );

            // Estimate based on current speed and traffic
            const currentSpeed = this.currentSpeed || 30; // Default 30 km/h
            const estimatedTime = (distance / 1000) / currentSpeed * 60; // minutes

            // Add traffic delay estimation
            const trafficDelay = this.estimateTrafficDelay(distance);
            const totalETA = estimatedTime + trafficDelay;

            this.displayETA(totalETA, distance);

        } catch (error) {
            console.error('ETA update error:', error);
        }
    }

    estimateTrafficDelay(distance) {
        // Simple traffic estimation based on time of day
        const hour = new Date().getHours();
        let trafficMultiplier = 1;

        // Rush hour traffic
        if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
            trafficMultiplier = 1.5;
        } else if (hour >= 22 || hour <= 6) {
            trafficMultiplier = 0.8; // Less traffic at night
        }

        return (distance / 1000) * trafficMultiplier * 0.5; // Additional minutes
    }

    displayETA(etaMinutes, distance) {
        const etaDisplay = document.getElementById('etaDisplay');
        if (!etaDisplay) return;

        const hours = Math.floor(etaMinutes / 60);
        const minutes = Math.round(etaMinutes % 60);
        const arrivalTime = new Date(Date.now() + etaMinutes * 60000);

        let etaText = '';
        if (hours > 0) {
            etaText = `${hours}h ${minutes}m`;
        } else {
            etaText = `${minutes}m`;
        }

        etaDisplay.innerHTML = `
            <div class="eta-info" style="
                background: rgba(0, 255, 136, 0.1);
                border: 1px solid #00FF88;
                color: #00FF88;
                padding: 10px;
                border-radius: 8px;
                font-size: 14px;
                text-align: center;
            ">
                <div style="font-size: 18px; font-weight: bold;">🕐 ${etaText}</div>
                <div style="font-size: 12px; opacity: 0.8;">
                    Arrive: ${arrivalTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style="font-size: 12px; opacity: 0.6;">
                    📏 ${(distance / 1000).toFixed(1)} km remaining
                </div>
            </div>
        `;
    }

    // ===== FAVORITES UI MANAGEMENT =====

    toggleFavorites() {
        const container = document.getElementById('favoritesContainer');
        if (container) {
            if (container.style.display === 'none' || !container.style.display) {
                this.showFavorites();
                container.style.display = 'block';
            } else {
                container.style.display = 'none';
            }
        }
    }

    showFavorites() {
        const favoritesList = document.getElementById('favoritesList');
        if (!favoritesList) return;

        const favorites = this.getFavoriteLocations();
        const recent = this.getRecentSearches();

        if (favorites.length === 0 && recent.length === 0) {
            favoritesList.innerHTML = `
                <div style="text-align: center; color: #888; padding: 20px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">📍</div>
                    <div>No favorites or recent searches yet</div>
                    <div style="font-size: 12px; margin-top: 5px;">Search for locations to add them here</div>
                </div>
            `;
            return;
        }

        let html = '';

        // Show favorites
        if (favorites.length > 0) {
            html += '<div style="margin-bottom: 20px;"><h4 style="color: #00FF88; margin-bottom: 10px;">⭐ Favorites</h4>';
            favorites.forEach(fav => {
                html += `
                    <div style="display: flex; align-items: center; padding: 8px; border: 1px solid #333; border-radius: 6px; margin-bottom: 5px; background: rgba(0,255,136,0.05);">
                        <div style="flex: 1; cursor: pointer;" onclick="navigateToFavorite('${fav.id}')">
                            <div style="font-weight: bold; color: #00FF88;">${fav.name}</div>
                            <div style="font-size: 12px; color: #888;">${fav.address}</div>
                        </div>
                        <button onclick="removeFromFavorites('${fav.id}')" style="background: #FF6B6B; border: none; color: white; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">🗑️</button>
                    </div>
                `;
            });
            html += '</div>';
        }

        // Show recent searches
        if (recent.length > 0) {
            html += '<div><h4 style="color: #888; margin-bottom: 10px;">🕐 Recent Searches</h4>';
            recent.forEach(search => {
                html += `
                    <div style="display: flex; align-items: center; padding: 8px; border: 1px solid #333; border-radius: 6px; margin-bottom: 5px; background: rgba(255,255,255,0.02);">
                        <div style="flex: 1; cursor: pointer;" onclick="navigateToRecent('${search.id}')">
                            <div style="font-weight: bold;">${search.name}</div>
                            <div style="font-size: 12px; color: #888;">${search.address}</div>
                        </div>
                        <button onclick="addRecentToFavorites('${search.id}')" style="background: #00FF88; border: none; color: black; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">⭐</button>
                    </div>
                `;
            });
            html += '</div>';
        }

        favoritesList.innerHTML = html;
    }

    // ===== TURN-BY-TURN NAVIGATION UI =====

    initTurnByTurnUI() {
        // Create turn-by-turn navigation panel
        const navPanel = document.getElementById('navPanel');
        if (!navPanel) return;

        const turnByTurnHTML = `
            <div id="turnByTurnContainer" style="
                position: fixed;
                top: 70px;
                left: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.9);
                border: 2px solid #00FF88;
                border-radius: 12px;
                padding: 15px;
                color: white;
                z-index: 1000;
                display: none;
                max-width: 400px;
                margin: 0 auto;
            ">
                <div id="currentInstruction" style="
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    margin-bottom: 10px;
                ">
                    <div id="turnIcon" style="
                        font-size: 32px;
                        min-width: 40px;
                        text-align: center;
                    ">➡️</div>
                    <div style="flex: 1;">
                        <div id="instructionText" style="
                            font-size: 16px;
                            font-weight: bold;
                            color: #00FF88;
                            margin-bottom: 5px;
                        ">Continue straight</div>
                        <div id="instructionDistance" style="
                            font-size: 14px;
                            color: #888;
                        ">for 500m</div>
                    </div>
                </div>

                <div id="nextInstruction" style="
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 10px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    font-size: 12px;
                    color: #ccc;
                ">
                    <div id="nextTurnIcon" style="font-size: 16px; min-width: 20px;">🔄</div>
                    <div>
                        <div id="nextInstructionText">Then turn right</div>
                        <div id="nextInstructionDistance">in 1.2km</div>
                    </div>
                </div>

                <div id="routeProgress" style="
                    margin-top: 10px;
                    padding: 8px;
                    background: rgba(0, 255, 136, 0.1);
                    border-radius: 6px;
                    font-size: 12px;
                    text-align: center;
                ">
                    <div id="progressText">2.5km remaining • 8 min</div>
                    <div style="
                        width: 100%;
                        height: 4px;
                        background: rgba(255, 255, 255, 0.2);
                        border-radius: 2px;
                        margin-top: 5px;
                        overflow: hidden;
                    ">
                        <div id="progressBar" style="
                            height: 100%;
                            background: #00FF88;
                            width: 35%;
                            transition: width 0.3s ease;
                        "></div>
                    </div>
                </div>
            </div>
        `;

        // Add to page if not exists
        if (!document.getElementById('turnByTurnContainer')) {
            document.body.insertAdjacentHTML('beforeend', turnByTurnHTML);
        }
    }

    showTurnByTurnNavigation() {
        this.initTurnByTurnUI();
        const container = document.getElementById('turnByTurnContainer');
        if (container) {
            container.style.display = 'block';
            this.updateTurnByTurnInstructions();
        }
    }

    hideTurnByTurnNavigation() {
        const container = document.getElementById('turnByTurnContainer');
        if (container) {
            container.style.display = 'none';
        }
    }

    updateTurnByTurnInstructions() {
        if (!this.routeSteps || this.currentStepIndex >= this.routeSteps.length) return;

        const currentStep = this.routeSteps[this.currentStepIndex];
        const nextStep = this.routeSteps[this.currentStepIndex + 1];

        // Update current instruction
        const instructionText = document.getElementById('instructionText');
        const instructionDistance = document.getElementById('instructionDistance');
        const turnIcon = document.getElementById('turnIcon');

        if (instructionText && currentStep) {
            instructionText.textContent = currentStep.maneuver?.instruction || 'Continue straight';

            if (instructionDistance) {
                instructionDistance.textContent = `for ${(currentStep.distance || 0).toFixed(0)}m`;
            }

            if (turnIcon) {
                turnIcon.textContent = this.getTurnIcon(currentStep.maneuver?.type);
            }
        }

        // Update next instruction
        const nextInstructionText = document.getElementById('nextInstructionText');
        const nextInstructionDistance = document.getElementById('nextInstructionDistance');
        const nextTurnIcon = document.getElementById('nextTurnIcon');

        if (nextStep && nextInstructionText) {
            nextInstructionText.textContent = nextStep.maneuver?.instruction || 'Continue';

            if (nextInstructionDistance) {
                const distanceToNext = this.routeSteps
                    .slice(this.currentStepIndex, this.currentStepIndex + 1)
                    .reduce((sum, step) => sum + (step.distance || 0), 0);
                nextInstructionDistance.textContent = `in ${(distanceToNext / 1000).toFixed(1)}km`;
            }

            if (nextTurnIcon) {
                nextTurnIcon.textContent = this.getTurnIcon(nextStep.maneuver?.type);
            }
        }

        // Update progress
        this.updateNavigationProgress();
    }

    getTurnIcon(maneuverType) {
        const icons = {
            'turn-left': '↰',
            'turn-right': '↱',
            'turn-slight-left': '↖️',
            'turn-slight-right': '↗️',
            'turn-sharp-left': '⬅️',
            'turn-sharp-right': '➡️',
            'continue': '⬆️',
            'merge': '🔀',
            'on-ramp': '🛣️',
            'off-ramp': '🛤️',
            'fork': '🍴',
            'roundabout': '🔄',
            'rotary': '🔄',
            'roundabout-turn': '🔄',
            'notification': '📍',
            'depart': '🚗',
            'arrive': '🏁'
        };
        return icons[maneuverType] || '➡️';
    }

    updateNavigationProgress() {
        if (!this.routeData) return;

        const progressText = document.getElementById('progressText');
        const progressBar = document.getElementById('progressBar');

        if (progressText && this.currentLocation && this.destination) {
            const remainingDistance = this.calculateDistance(
                this.currentLocation.lat,
                this.currentLocation.lng,
                this.destination.lat,
                this.destination.lng
            );

            const totalDistance = this.routeData.distance || 1000;
            const completedDistance = totalDistance - remainingDistance;
            const progressPercent = Math.max(0, Math.min(100, (completedDistance / totalDistance) * 100));

            const remainingKm = (remainingDistance / 1000).toFixed(1);
            const estimatedMinutes = Math.round(remainingDistance / 1000 / 30 * 60); // Assuming 30 km/h average

            progressText.textContent = `${remainingKm}km remaining • ${estimatedMinutes} min`;

            if (progressBar) {
                progressBar.style.width = `${progressPercent}%`;
            }
        }
    }

    // ===== PARKING & FUEL STATION FINDER =====

    async findNearbyServices(type, location = null) {
        // If no location provided, try to get current location first
        if (!location && !this.currentLocation) {
            console.log('📍 No location available, trying to get current location...');
            this.showNotification('📍 Getting your location...', 'info');

            try {
                await this.getCurrentLocation();
            } catch (error) {
                console.error('Failed to get current location:', error);
                this.showNotification('❌ Location required for nearby search', 'error');
                return [];
            }
        }

        const coords = location || this.destination || this.currentLocation;
        if (!coords || !coords.lat || !coords.lng) {
            this.showNotification('❌ No valid location available for search', 'error');
            return [];
        }

        console.log(`🔍 Searching for nearby ${type} at:`, coords);

        try {
            // Check if we're offline
            if (this.isOffline) {
                console.log(`⚠ Offline mode - using cached ${type} data`);
                this.queueOfflineOperation('poi_search', { type, location: coords });
                const mockServices = this.getMockServices(type, coords);
                this.displayNearbyServices(mockServices, type);
                this.showNotification(`⚠ Showing cached ${type} - Limited data available`, 'warning');
                return mockServices;
            }

            // Use Overpass API to find nearby services
            const services = await this.searchOverpassAPI(type, coords);

            // Cache the results for offline use
            this.cacheServiceResults(type, coords, services);

            this.displayNearbyServices(services, type);
            return services;
        } catch (error) {
            console.error(`Error finding ${type}:`, error);

            // If online but API failed, queue for retry and use cached data
            if (!this.isOffline) {
                this.queueOfflineOperation('poi_search', { type, location: coords });
            }

            // Fallback to mock data
            const mockServices = this.getMockServices(type, coords);
            this.displayNearbyServices(mockServices, type);
            return mockServices;
        }
    }

    async searchOverpassAPI(type, coords) {
        const radius = 5000; // 5km radius for better results
        console.log(`🔍 Searching for ${type} within ${radius}m of:`, coords);

        const queries = {
            parking: `[out:json][timeout:25];
                (
                  node["amenity"="parking"](around:${radius},${coords.lat},${coords.lng});
                  way["amenity"="parking"](around:${radius},${coords.lat},${coords.lng});
                );
                out center;`,
            fuel: `[out:json][timeout:25];
                (
                  node["amenity"="fuel"](around:${radius},${coords.lat},${coords.lng});
                  way["amenity"="fuel"](around:${radius},${coords.lat},${coords.lng});
                );
                out center;`,
            restaurant: `[out:json][timeout:25];
                (
                  node["amenity"="restaurant"](around:${radius},${coords.lat},${coords.lng});
                  node["amenity"="fast_food"](around:${radius},${coords.lat},${coords.lng});
                );
                out center;`,
            hospital: `[out:json][timeout:25];
                (
                  node["amenity"="hospital"](around:${radius},${coords.lat},${coords.lng});
                  node["amenity"="clinic"](around:${radius},${coords.lat},${coords.lng});
                  node["healthcare"="hospital"](around:${radius},${coords.lat},${coords.lng});
                  node["healthcare"="clinic"](around:${radius},${coords.lat},${coords.lng});
                );
                out center;`
        };

        const query = queries[type];
        if (!query) throw new Error(`Unknown service type: ${type}`);

        console.log(`📡 Sending Overpass query for ${type}:`, query);

        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `data=${encodeURIComponent(query)}`
        });

        if (!response.ok) {
            console.error(`❌ Overpass API request failed: ${response.status} ${response.statusText}`);
            throw new Error('Overpass API request failed');
        }

        const data = await response.json();
        console.log(`📊 Overpass API returned ${data.elements?.length || 0} results for ${type}`);

        return this.parseOverpassResults(data.elements || [], type);
    }

    parseOverpassResults(elements, type) {
        console.log(`📊 Parsing ${elements.length} ${type} results with currentLocation:`, this.currentLocation);

        return elements.map(element => {
            const lat = element.lat || element.center?.lat;
            const lng = element.lon || element.center?.lon;

            if (!lat || !lng) {
                console.warn('⚠️ Element missing coordinates:', element);
                return null;
            }

            // Calculate distance only if we have a valid current location
            let distance = 0;

            console.log(`🔍 Checking coordinates for ${element.tags?.name || 'unnamed'}:`, {
                currentLat: this.currentLocation?.lat,
                currentLng: this.currentLocation?.lng,
                elementLat: lat,
                elementLng: lng,
                elementRaw: element
            });

            if (this.currentLocation &&
                !isNaN(this.currentLocation.lat) &&
                !isNaN(this.currentLocation.lng) &&
                !isNaN(lat) && !isNaN(lng)) {

                console.log(`🔧 About to call calculateDistance with:`, {
                    currentLat: this.currentLocation.lat,
                    currentLng: this.currentLocation.lng,
                    elementLat: lat,
                    elementLng: lng
                });

                distance = this.calculateDistance(
                    this.currentLocation.lat,
                    this.currentLocation.lng,
                    lat,
                    lng
                );

                console.log(`📏 Distance result for ${element.tags?.name || 'unnamed'}: ${distance}m (type: ${typeof distance})`);
            } else {
                console.warn('⚠️ Cannot calculate distance - invalid coordinates:', {
                    currentLocation: this.currentLocation,
                    elementLat: lat,
                    elementLng: lng,
                    latIsNaN: isNaN(lat),
                    lngIsNaN: isNaN(lng),
                    currentLatIsNaN: isNaN(this.currentLocation?.lat),
                    currentLngIsNaN: isNaN(this.currentLocation?.lng)
                });
            }

            const service = {
                id: element.id,
                name: element.tags?.name || `${type.charAt(0).toUpperCase() + type.slice(1)} Station`,
                type: type,
                lat: lat,
                lng: lng,
                address: this.buildAddress(element.tags),
                brand: element.tags?.brand || element.tags?.operator,
                opening_hours: element.tags?.opening_hours,
                phone: element.tags?.phone,
                website: element.tags?.website,
                amenity: element.tags?.amenity,
                distance: distance
            };

            return service;
        }).filter(Boolean).sort((a, b) => a.distance - b.distance);
    }

    buildAddress(tags) {
        const parts = [];
        if (tags?.['addr:housenumber']) parts.push(tags['addr:housenumber']);
        if (tags?.['addr:street']) parts.push(tags['addr:street']);
        if (tags?.['addr:city']) parts.push(tags['addr:city']);
        return parts.join(' ') || 'Address not available';
    }

    getMockServices(type, coords) {
        // Mock data for demonstration
        const mockData = {
            parking: [
                { name: 'City Center Parking', type: 'parking', distance: 150, price: '£2/hour' },
                { name: 'Shopping Mall Parking', type: 'parking', distance: 300, price: '£1.50/hour' },
                { name: 'Street Parking', type: 'parking', distance: 80, price: '£1/hour' }
            ],
            fuel: [
                { name: 'Shell Station', type: 'fuel', distance: 200, price: '£1.45/L' },
                { name: 'BP Garage', type: 'fuel', distance: 450, price: '£1.42/L' },
                { name: 'Tesco Petrol', type: 'fuel', distance: 600, price: '£1.38/L' }
            ],
            restaurant: [
                { name: 'McDonald\'s', type: 'restaurant', distance: 120, cuisine: 'Fast Food' },
                { name: 'Pizza Express', type: 'restaurant', distance: 250, cuisine: 'Italian' },
                { name: 'Nando\'s', type: 'restaurant', distance: 380, cuisine: 'Portuguese' }
            ],
            hospital: [
                { name: 'City Hospital', type: 'hospital', distance: 800, services: 'Emergency' },
                { name: 'Medical Centre', type: 'hospital', distance: 400, services: 'GP' }
            ]
        };

        return (mockData[type] || []).map(item => ({
            ...item,
            id: Math.random().toString(36).substr(2, 9),
            lat: coords.lat + (Math.random() - 0.5) * 0.01,
            lng: coords.lng + (Math.random() - 0.5) * 0.01,
            address: 'Mock Address'
        }));
    }

    displayNearbyServices(services, type) {
        const icons = {
            parking: '🅿️',
            fuel: '⛽',
            restaurant: '🍽️',
            hospital: '🏥'
        };

        const icon = icons[type] || '📍';
        const typeName = type.charAt(0).toUpperCase() + type.slice(1);

        if (services.length === 0) {
            this.showNotification(`${icon} No ${typeName.toLowerCase()} found nearby`, 'info');
            return;
        }

        // Create services panel
        const panelHTML = `
            <div id="servicesPanel" style="
                position: fixed;
                bottom: 20px;
                left: 20px;
                right: 20px;
                max-width: 400px;
                margin: 0 auto;
                background: rgba(0, 0, 0, 0.9);
                border: 2px solid #00FF88;
                border-radius: 12px;
                padding: 15px;
                color: white;
                z-index: 1000;
                max-height: 300px;
                overflow-y: auto;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="color: #00FF88; margin: 0;">${icon} Nearby ${typeName}</h3>
                    <button onclick="closeServicesPanel()" style="background: #FF6B6B; border: none; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer;">✕</button>
                </div>
                <div id="servicesList">
                    ${services.slice(0, 5).map(service => `
                        <div style="
                            padding: 10px;
                            border: 1px solid #333;
                            border-radius: 6px;
                            margin-bottom: 8px;
                            cursor: pointer;
                            background: rgba(255, 255, 255, 0.02);
                        " onclick="navigateToService('${service.id}', ${service.lat}, ${service.lng}, '${service.name}')">
                            <div style="font-weight: bold; color: #00FF88;">${service.name}</div>
                            <div style="font-size: 12px; color: #888; margin: 2px 0;">${service.address}</div>
                            <div style="font-size: 12px; color: #ccc;">
                                📏 ${this.formatDistance(service.distance)} away
                                ${service.price ? ` • 💰 ${service.price}` : ''}
                                ${service.cuisine ? ` • 🍴 ${service.cuisine}` : ''}
                                ${service.services ? ` • 🏥 ${service.services}` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Remove existing panel
        const existingPanel = document.getElementById('servicesPanel');
        if (existingPanel) existingPanel.remove();

        // Add new panel
        document.body.insertAdjacentHTML('beforeend', panelHTML);

        // Add markers to map
        this.addServiceMarkers(services, type);

        this.showNotification(`${icon} Found ${services.length} ${typeName.toLowerCase()} nearby`, 'success');
    }

    addServiceMarkers(services, type) {
        if (!this.map) return;

        // Clear existing service markers
        if (this.serviceMarkers) {
            this.serviceMarkers.forEach(marker => this.map.removeLayer(marker));
        }
        this.serviceMarkers = [];

        const icons = {
            parking: '🅿️',
            fuel: '⛽',
            restaurant: '🍽️',
            hospital: '🏥'
        };

        services.forEach(service => {
            const marker = L.marker([service.lat, service.lng])
                .bindPopup(`
                    <div style="text-align: center;">
                        <div style="font-size: 20px;">${icons[type]}</div>
                        <div style="font-weight: bold; margin: 5px 0;">${service.name}</div>
                        <div style="font-size: 12px; color: #666;">${service.address}</div>
                        <div style="font-size: 12px; margin: 5px 0;">📏 ${this.formatDistance(service.distance)} away</div>
                        <button onclick="navigateToService('${service.id}', ${service.lat}, ${service.lng}, '${service.name}')"
                                style="background: #00FF88; color: black; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 5px;">
                            Navigate Here
                        </button>
                    </div>
                `);

            this.serviceMarkers.push(marker);
            marker.addTo(this.map);
        });
    }

    // ===== ROUTE COMPARISON TOOL =====

    showRouteComparison(routes) {
        if (!routes || routes.length < 2) {
            this.showNotification('❌ Need at least 2 routes to compare', 'error');
            return;
        }

        const comparisonHTML = `
            <div id="routeComparisonPanel" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                background: rgba(0, 0, 0, 0.95);
                border: 2px solid #00FF88;
                border-radius: 12px;
                padding: 20px;
                color: white;
                z-index: 10000;
                overflow-y: auto;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="color: #00FF88; margin: 0;">📊 Route Comparison</h3>
                    <button onclick="closeRouteComparison()" style="background: #FF6B6B; border: none; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer;">✕</button>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                    ${routes.map((route, index) => this.createRouteComparisonCard(route, index)).join('')}
                </div>

                <div style="margin-top: 20px; padding: 15px; background: rgba(0, 255, 136, 0.1); border-radius: 8px;">
                    <h4 style="color: #00FF88; margin: 0 0 10px 0;">📈 Comparison Summary</h4>
                    ${this.generateComparisonSummary(routes)}
                </div>

                <div style="text-align: center; margin-top: 15px;">
                    <button onclick="selectBestRoute()" style="background: #00FF88; color: black; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                        🏆 Select Best Route
                    </button>
                </div>
            </div>
        `;

        // Remove existing panel
        const existingPanel = document.getElementById('routeComparisonPanel');
        if (existingPanel) existingPanel.remove();

        // Add new panel
        document.body.insertAdjacentHTML('beforeend', comparisonHTML);
    }

    createRouteComparisonCard(route, index) {
        // Use formatDistance to respect user's unit preferences
        const distanceFormatted = this.formatDistance(route.distance);
        const duration = Math.round(route.duration / 60);
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        const fuelCost = this.calculateFuelCost(route.distance);
        const tollCost = this.estimateTollCost(route);
        const totalCost = fuelCost + tollCost;

        const routeTypes = {
            fastest: { icon: '⚡', name: 'Fastest Route', color: '#FF6B6B' },
            shortest: { icon: '📏', name: 'Shortest Route', color: '#4ECDC4' },
            scenic: { icon: '🌄', name: 'Scenic Route', color: '#45B7D1' },
            alternative: { icon: '🔄', name: 'Alternative Route', color: '#96CEB4' }
        };

        const routeInfo = routeTypes[route.type] || routeTypes.alternative;

        return `
            <div style="
                border: 2px solid ${routeInfo.color};
                border-radius: 8px;
                padding: 15px;
                background: rgba(255, 255, 255, 0.02);
                cursor: pointer;
                transition: all 0.3s ease;
            " onclick="selectRouteFromComparison(${index})" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='rgba(255,255,255,0.02)'">
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                    <span style="font-size: 24px; margin-right: 10px;">${routeInfo.icon}</span>
                    <div>
                        <div style="font-weight: bold; color: ${routeInfo.color};">${routeInfo.name}</div>
                        <div style="font-size: 12px; color: #888;">Route ${index + 1}</div>
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>🕐 Time:</span>
                        <span style="font-weight: bold;">${timeStr}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>📏 Distance:</span>
                        <span style="font-weight: bold;">${distanceFormatted}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>💰 Est. Cost:</span>
                        <span style="font-weight: bold;">${this.formatCurrency(totalCost)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>⛽ Fuel:</span>
                        <span>${this.formatCurrency(fuelCost)}</span>
                    </div>
                </div>

                <div style="font-size: 12px; color: #888;">
                    ${this.getRouteFeatures(route).join(' • ')}
                </div>

                <div style="margin-top: 10px;">
                    <div style="background: rgba(255, 255, 255, 0.1); height: 4px; border-radius: 2px; overflow: hidden;">
                        <div style="height: 100%; background: ${routeInfo.color}; width: ${this.getRouteScore(route)}%; transition: width 0.3s ease;"></div>
                    </div>
                    <div style="text-align: center; font-size: 10px; color: #888; margin-top: 2px;">
                        Score: ${this.getRouteScore(route)}%
                    </div>
                </div>
            </div>
        `;
    }

    generateComparisonSummary(routes) {
        const fastest = routes.reduce((min, route) => route.duration < min.duration ? route : min);
        const shortest = routes.reduce((min, route) => route.distance < min.distance ? route : min);
        const cheapest = routes.reduce((min, route) => {
            const minCost = this.calculateFuelCost(min.distance) + this.estimateTollCost(min);
            const routeCost = this.calculateFuelCost(route.distance) + this.estimateTollCost(route);
            return routeCost < minCost ? route : min;
        });

        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; font-size: 12px;">
                <div style="text-align: center;">
                    <div style="color: #FF6B6B;">⚡ Fastest</div>
                    <div>${Math.round(fastest.duration / 60)}m</div>
                </div>
                <div style="text-align: center;">
                    <div style="color: #4ECDC4;">📏 Shortest</div>
                    <div>${this.formatDistance(shortest.distance)}</div>
                </div>
                <div style="text-align: center;">
                    <div style="color: #96CEB4;">💰 Cheapest</div>
                    <div>${this.formatCurrency(this.calculateFuelCost(cheapest.distance) + this.estimateTollCost(cheapest))}</div>
                </div>
            </div>
        `;
    }

    getRouteFeatures(route) {
        const features = [];
        if (route.distance < 5000) features.push('Short');
        if (route.duration < 600) features.push('Quick');
        if (this.estimateTollCost(route) === 0) features.push('Toll-free');
        if (route.type === 'scenic') features.push('Scenic');
        return features.length > 0 ? features : ['Standard'];
    }

    getRouteScore(route) {
        // Calculate a score based on time, distance, and cost
        const timeScore = Math.max(0, 100 - (route.duration / 60)); // Lower time = higher score
        const distanceScore = Math.max(0, 100 - (route.distance / 1000)); // Lower distance = higher score
        const costScore = Math.max(0, 100 - (this.calculateFuelCost(route.distance) * 10)); // Lower cost = higher score

        return Math.round((timeScore + distanceScore + costScore) / 3);
    }

    calculateFuelCost(distance) {
        // Calculate numeric fuel cost (returns number, not formatted string)
        if (!distance || isNaN(distance) || distance <= 0) {
            console.warn('⚠️ Invalid distance for fuel cost calculation:', distance);
            return 0;
        }

        const distanceKm = distance / 1000;
        const fuelUsed = (distanceKm / 100) * 8; // 8L per 100km average consumption

        // Get country-specific pricing
        const countryData = this.fuelPrices[this.userCountry] || this.fuelPrices['DEFAULT'];
        const { price } = countryData;

        let cost;

        // Calculate cost based on fuel unit preference
        switch (this.units.fuel) {
            case 'gallons_us':
                const gallonsUs = fuelUsed * 0.264172;
                cost = gallonsUs * (this.userCountry === 'US' ? price : price * 3.78541);
                break;
            case 'gallons_uk':
                const gallonsUk = fuelUsed * 0.219969;
                cost = gallonsUk * (this.userCountry === 'GB' ? price * 4.54609 : price * 4.54609);
                break;
            case 'liters':
            default:
                cost = fuelUsed * price;
                break;
        }

        console.log('⛽ Fuel cost (numeric):', { distance, distanceKm, fuelUsed, cost });
        return cost;
    }

    estimateTollCost(route) {
        // Simple toll estimation - in real app would use toll road detection
        if (route.type === 'fastest' && route.distance > 50000) {
            return 5.50; // Estimate £5.50 for long fast routes
        }
        return 0;
    }

    // ===== GAMIFICATION SYSTEM =====

    initGamificationSystem() {
        // Initialize user stats
        this.userStats = this.loadUserStats();
        this.achievements = this.loadAchievements();
        this.updateGamificationDisplay();
    }

    loadUserStats() {
        try {
            const saved = localStorage.getItem('vibeVoyage_userStats');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.warn('Error loading user stats:', error);
        }

        // Default stats
        return {
            totalTrips: 0,
            totalDistance: 0, // in meters
            totalTime: 0, // in minutes
            hazardsAvoided: 0,
            fuelSaved: 0, // in liters
            co2Saved: 0, // in kg
            points: 0,
            level: 1,
            streakDays: 0,
            lastTripDate: null,
            achievements: []
        };
    }

    loadAchievements() {
        return [
            { id: 'first_trip', name: 'First Journey', description: 'Complete your first trip', icon: '🚗', points: 10, unlocked: false },
            { id: 'distance_10km', name: 'Explorer', description: 'Travel 10km total', icon: '🗺️', points: 25, unlocked: false },
            { id: 'distance_100km', name: 'Wanderer', description: 'Travel 100km total', icon: '🌍', points: 50, unlocked: false },
            { id: 'hazard_avoider', name: 'Safety First', description: 'Avoid 10 hazards', icon: '🛡️', points: 30, unlocked: false },
            { id: 'eco_warrior', name: 'Eco Warrior', description: 'Save 5L of fuel', icon: '🌱', points: 40, unlocked: false },
            { id: 'streak_7', name: 'Weekly Traveler', description: 'Use app 7 days in a row', icon: '🔥', points: 60, unlocked: false },
            { id: 'level_5', name: 'Navigator', description: 'Reach level 5', icon: '⭐', points: 100, unlocked: false },
            { id: 'speed_demon', name: 'Speed Demon', description: 'Complete 5 fastest routes', icon: '⚡', points: 35, unlocked: false },
            { id: 'scenic_lover', name: 'Scenic Lover', description: 'Complete 3 scenic routes', icon: '🌄', points: 45, unlocked: false }
        ];
    }

    saveUserStats() {
        try {
            localStorage.setItem('vibeVoyage_userStats', JSON.stringify(this.userStats));
        } catch (error) {
            console.error('Error saving user stats:', error);
        }
    }

    addTripStats(distance, duration, routeType, hazardsAvoided = 0) {
        if (!this.userStats) this.initGamificationSystem();

        // Update stats
        this.userStats.totalTrips++;
        this.userStats.totalDistance += distance;
        this.userStats.totalTime += Math.round(duration / 60); // Convert to minutes
        this.userStats.hazardsAvoided += hazardsAvoided;

        // Calculate fuel and CO2 savings (estimates)
        const fuelEfficiency = this.units?.fuelEfficiency || 8; // L/100km
        const fuelUsed = (distance / 1000) * (fuelEfficiency / 100);
        const fuelSaved = fuelUsed * 0.1; // Assume 10% savings from route optimization
        this.userStats.fuelSaved += fuelSaved;
        this.userStats.co2Saved += fuelSaved * 2.31; // 2.31kg CO2 per liter of fuel

        // Add points based on trip
        let points = Math.round(distance / 1000) * 2; // 2 points per km
        if (routeType === 'scenic') points += 5;
        if (routeType === 'shortest') points += 3;
        if (hazardsAvoided > 0) points += hazardsAvoided * 2;

        this.userStats.points += points;

        // Update level (every 100 points = 1 level)
        const newLevel = Math.floor(this.userStats.points / 100) + 1;
        if (newLevel > this.userStats.level) {
            this.userStats.level = newLevel;
            this.showLevelUpNotification(newLevel);
        }

        // Update streak
        this.updateStreak();

        // Check achievements
        this.checkAchievements();

        // Save and update display
        this.saveUserStats();
        this.updateGamificationDisplay();

        // Show trip summary
        this.showTripSummary(distance, duration, points, routeType);
    }

    updateStreak() {
        const today = new Date().toDateString();
        const lastTrip = this.userStats.lastTripDate;

        if (!lastTrip) {
            this.userStats.streakDays = 1;
        } else {
            const lastTripDate = new Date(lastTrip).toDateString();
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

            if (lastTripDate === today) {
                // Same day, no change
            } else if (lastTripDate === yesterday) {
                // Consecutive day
                this.userStats.streakDays++;
            } else {
                // Streak broken
                this.userStats.streakDays = 1;
            }
        }

        this.userStats.lastTripDate = Date.now();
    }

    checkAchievements() {
        this.achievements.forEach(achievement => {
            if (achievement.unlocked) return;

            let shouldUnlock = false;

            switch (achievement.id) {
                case 'first_trip':
                    shouldUnlock = this.userStats.totalTrips >= 1;
                    break;
                case 'distance_10km':
                    shouldUnlock = this.userStats.totalDistance >= 10000;
                    break;
                case 'distance_100km':
                    shouldUnlock = this.userStats.totalDistance >= 100000;
                    break;
                case 'hazard_avoider':
                    shouldUnlock = this.userStats.hazardsAvoided >= 10;
                    break;
                case 'eco_warrior':
                    shouldUnlock = this.userStats.fuelSaved >= 5;
                    break;
                case 'streak_7':
                    shouldUnlock = this.userStats.streakDays >= 7;
                    break;
                case 'level_5':
                    shouldUnlock = this.userStats.level >= 5;
                    break;
            }

            if (shouldUnlock) {
                achievement.unlocked = true;
                this.userStats.achievements.push(achievement.id);
                this.userStats.points += achievement.points;
                this.showAchievementUnlocked(achievement);
            }
        });
    }

    showLevelUpNotification(level) {
        this.showNotification(`🎉 Level Up! You're now level ${level}!`, 'success');

        // Create level up animation
        const levelUpDiv = document.createElement('div');
        levelUpDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(45deg, #FFD700, #FFA500);
            color: black;
            padding: 20px;
            border-radius: 15px;
            font-size: 24px;
            font-weight: bold;
            z-index: 10000;
            animation: levelUpPulse 2s ease-in-out;
            text-align: center;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
        `;
        levelUpDiv.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
            <div>LEVEL UP!</div>
            <div style="font-size: 18px; margin-top: 5px;">Level ${level}</div>
        `;

        document.body.appendChild(levelUpDiv);
        setTimeout(() => levelUpDiv.remove(), 3000);
    }

    showAchievementUnlocked(achievement) {
        this.showNotification(`🏆 Achievement Unlocked: ${achievement.name}!`, 'success');

        // Create achievement animation
        const achievementDiv = document.createElement('div');
        achievementDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: #FFD700;
            padding: 15px;
            border-radius: 10px;
            border: 2px solid #FFD700;
            z-index: 10000;
            animation: slideInRight 0.5s ease-out;
            max-width: 300px;
        `;
        achievementDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 32px;">${achievement.icon}</span>
                <div>
                    <div style="font-weight: bold;">Achievement Unlocked!</div>
                    <div style="font-size: 14px;">${achievement.name}</div>
                    <div style="font-size: 12px; color: #ccc;">${achievement.description}</div>
                    <div style="font-size: 12px; color: #FFD700;">+${achievement.points} points</div>
                </div>
            </div>
        `;

        document.body.appendChild(achievementDiv);
        setTimeout(() => achievementDiv.remove(), 5000);
    }

    showTripSummary(distance, duration, points, routeType) {
        const distanceKm = (distance / 1000).toFixed(1);
        const durationMin = Math.round(duration / 60);

        const summaryDiv = document.createElement('div');
        summaryDiv.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 255, 136, 0.9);
            color: black;
            padding: 15px;
            border-radius: 10px;
            z-index: 10000;
            animation: slideInUp 0.5s ease-out;
            max-width: 250px;
            font-size: 14px;
        `;
        summaryDiv.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px;">🎯 Trip Complete!</div>
            <div>📏 Distance: ${distanceKm} km</div>
            <div>⏱️ Time: ${durationMin} min</div>
            <div>🏆 Points: +${points}</div>
            <div>🚗 Route: ${routeType}</div>
        `;

        document.body.appendChild(summaryDiv);
        setTimeout(() => summaryDiv.remove(), 4000);
    }

    updateGamificationDisplay() {
        // Update stats in UI if elements exist
        const levelDisplay = document.getElementById('userLevel');
        const pointsDisplay = document.getElementById('userPoints');
        const streakDisplay = document.getElementById('userStreak');

        if (levelDisplay) levelDisplay.textContent = this.userStats.level;
        if (pointsDisplay) pointsDisplay.textContent = this.userStats.points;
        if (streakDisplay) streakDisplay.textContent = this.userStats.streakDays;
    }

    showGamificationPanel() {
        if (!this.userStats) this.initGamificationSystem();

        const panelHTML = `
            <div id="gamificationPanel" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 90%;
                max-width: 500px;
                max-height: 80vh;
                background: rgba(0, 0, 0, 0.95);
                border: 2px solid #FFD700;
                border-radius: 12px;
                padding: 20px;
                color: white;
                z-index: 10000;
                overflow-y: auto;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="color: #FFD700; margin: 0;">🏆 Your Stats & Achievements</h3>
                    <button onclick="closeGamificationPanel()" style="background: #FF6B6B; border: none; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer;">✕</button>
                </div>

                <!-- User Level & Points -->
                <div style="background: linear-gradient(45deg, #FFD700, #FFA500); color: black; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold;">Level ${this.userStats.level}</div>
                    <div style="font-size: 16px;">${this.userStats.points} Points</div>
                    <div style="font-size: 12px; margin-top: 5px;">🔥 ${this.userStats.streakDays} day streak</div>
                </div>

                <!-- Stats Grid -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px;">
                    <div style="background: rgba(255, 255, 255, 0.1); padding: 10px; border-radius: 6px; text-align: center;">
                        <div style="font-size: 20px;">🚗</div>
                        <div style="font-size: 18px; font-weight: bold;">${this.userStats.totalTrips}</div>
                        <div style="font-size: 12px; color: #ccc;">Total Trips</div>
                    </div>
                    <div style="background: rgba(255, 255, 255, 0.1); padding: 10px; border-radius: 6px; text-align: center;">
                        <div style="font-size: 20px;">📏</div>
                        <div style="font-size: 18px; font-weight: bold;">${(this.userStats.totalDistance / 1000).toFixed(1)}km</div>
                        <div style="font-size: 12px; color: #ccc;">Distance</div>
                    </div>
                    <div style="background: rgba(255, 255, 255, 0.1); padding: 10px; border-radius: 6px; text-align: center;">
                        <div style="font-size: 20px;">⛽</div>
                        <div style="font-size: 18px; font-weight: bold;">${this.userStats.fuelSaved.toFixed(1)}L</div>
                        <div style="font-size: 12px; color: #ccc;">Fuel Saved</div>
                    </div>
                    <div style="background: rgba(255, 255, 255, 0.1); padding: 10px; border-radius: 6px; text-align: center;">
                        <div style="font-size: 20px;">🌱</div>
                        <div style="font-size: 18px; font-weight: bold;">${this.userStats.co2Saved.toFixed(1)}kg</div>
                        <div style="font-size: 12px; color: #ccc;">CO₂ Saved</div>
                    </div>
                </div>

                <!-- Achievements -->
                <div>
                    <h4 style="color: #FFD700; margin-bottom: 15px;">🏅 Achievements</h4>
                    <div style="display: grid; gap: 8px;">
                        ${this.achievements.map(achievement => `
                            <div style="
                                display: flex;
                                align-items: center;
                                padding: 10px;
                                background: ${achievement.unlocked ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
                                border: 1px solid ${achievement.unlocked ? '#FFD700' : '#333'};
                                border-radius: 6px;
                                ${achievement.unlocked ? '' : 'opacity: 0.6;'}
                            ">
                                <span style="font-size: 24px; margin-right: 10px; ${achievement.unlocked ? '' : 'filter: grayscale(100%);'}">${achievement.icon}</span>
                                <div style="flex: 1;">
                                    <div style="font-weight: bold; color: ${achievement.unlocked ? '#FFD700' : '#ccc'};">${achievement.name}</div>
                                    <div style="font-size: 12px; color: #888;">${achievement.description}</div>
                                </div>
                                <div style="text-align: right; font-size: 12px; color: ${achievement.unlocked ? '#FFD700' : '#666'};">
                                    ${achievement.unlocked ? '✅' : `${achievement.points}pts`}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="resetGamificationStats()" style="background: #FF6B6B; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                        🔄 Reset Stats
                    </button>
                </div>
            </div>
        `;

        // Remove existing panel
        const existingPanel = document.getElementById('gamificationPanel');
        if (existingPanel) existingPanel.remove();

        // Add new panel
        document.body.insertAdjacentHTML('beforeend', panelHTML);
    }

    // ===== MULTI-LANGUAGE SUPPORT =====

    initLanguageSystem() {
        // Load saved language or detect from browser
        this.currentLanguage = this.loadLanguage();
        this.translations = this.getTranslations();
        console.log(`🌍 Language system initialized: ${this.currentLanguage}`);
    }

    loadLanguage() {
        try {
            const saved = localStorage.getItem('vibeVoyage_language');
            if (saved) {
                return saved;
            }
        } catch (error) {
            console.warn('Error loading language:', error);
        }

        // Auto-detect from browser
        const browserLang = navigator.language || navigator.userLanguage;
        const langCode = browserLang.split('-')[0].toLowerCase();

        // Support common languages
        const supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ru'];
        return supportedLanguages.includes(langCode) ? langCode : 'en';
    }

    saveLanguage(language) {
        try {
            localStorage.setItem('vibeVoyage_language', language);
            this.currentLanguage = language;
            console.log(`🌍 Language saved: ${language}`);
        } catch (error) {
            console.error('Error saving language:', error);
        }
    }

    getTranslations() {
        return {
            en: {
                // Navigation
                startNavigation: 'Start Navigation',
                stopNavigation: 'Stop Navigation',
                currentLocation: 'Current Location',
                destination: 'Destination',
                calculating: 'Calculating route...',
                routeFound: 'Route found',
                navigationStarted: 'Navigation started',
                navigationStopped: 'Navigation stopped',

                // Directions
                turnLeft: 'Turn left',
                turnRight: 'Turn right',
                goStraight: 'Go straight',
                arrive: 'You have arrived',

                // Features
                favorites: 'Favorites',
                recentSearches: 'Recent Searches',
                settings: 'Settings',
                achievements: 'Achievements',

                // Hazards
                speedCamera: 'Speed Camera',
                accident: 'Accident',
                roadwork: 'Road Work',

                // Units
                kilometers: 'km',
                miles: 'mi',
                meters: 'm',
                feet: 'ft'
            },
            es: {
                // Navigation
                startNavigation: 'Iniciar Navegación',
                stopNavigation: 'Detener Navegación',
                currentLocation: 'Ubicación Actual',
                destination: 'Destino',
                calculating: 'Calculando ruta...',
                routeFound: 'Ruta encontrada',
                navigationStarted: 'Navegación iniciada',
                navigationStopped: 'Navegación detenida',

                // Directions
                turnLeft: 'Gire a la izquierda',
                turnRight: 'Gire a la derecha',
                goStraight: 'Siga recto',
                arrive: 'Ha llegado',

                // Features
                favorites: 'Favoritos',
                recentSearches: 'Búsquedas Recientes',
                settings: 'Configuración',
                achievements: 'Logros',

                // Hazards
                speedCamera: 'Cámara de Velocidad',
                accident: 'Accidente',
                roadwork: 'Obras',

                // Units
                kilometers: 'km',
                miles: 'mi',
                meters: 'm',
                feet: 'ft'
            },
            fr: {
                // Navigation
                startNavigation: 'Démarrer Navigation',
                stopNavigation: 'Arrêter Navigation',
                currentLocation: 'Position Actuelle',
                destination: 'Destination',
                calculating: 'Calcul de l\'itinéraire...',
                routeFound: 'Itinéraire trouvé',
                navigationStarted: 'Navigation démarrée',
                navigationStopped: 'Navigation arrêtée',

                // Directions
                turnLeft: 'Tournez à gauche',
                turnRight: 'Tournez à droite',
                goStraight: 'Continuez tout droit',
                arrive: 'Vous êtes arrivé',

                // Features
                favorites: 'Favoris',
                recentSearches: 'Recherches Récentes',
                settings: 'Paramètres',
                achievements: 'Succès',

                // Hazards
                speedCamera: 'Radar',
                accident: 'Accident',
                roadwork: 'Travaux',

                // Units
                kilometers: 'km',
                miles: 'mi',
                meters: 'm',
                feet: 'ft'
            },
            de: {
                // Navigation
                startNavigation: 'Navigation Starten',
                stopNavigation: 'Navigation Stoppen',
                currentLocation: 'Aktueller Standort',
                destination: 'Ziel',
                calculating: 'Route wird berechnet...',
                routeFound: 'Route gefunden',
                navigationStarted: 'Navigation gestartet',
                navigationStopped: 'Navigation gestoppt',

                // Directions
                turnLeft: 'Links abbiegen',
                turnRight: 'Rechts abbiegen',
                goStraight: 'Geradeaus fahren',
                arrive: 'Sie sind angekommen',

                // Features
                favorites: 'Favoriten',
                recentSearches: 'Letzte Suchen',
                settings: 'Einstellungen',
                achievements: 'Erfolge',

                // Hazards
                speedCamera: 'Blitzer',
                accident: 'Unfall',
                roadwork: 'Baustelle',

                // Units
                kilometers: 'km',
                miles: 'mi',
                meters: 'm',
                feet: 'ft'
            }
        };
    }

    translate(key) {
        const translations = this.translations[this.currentLanguage] || this.translations['en'];
        return translations[key] || key;
    }

    changeLanguage(language) {
        this.saveLanguage(language);
        this.translations = this.getTranslations();
        this.updateUILanguage();
        this.showNotification(`🌍 Language changed to ${language.toUpperCase()}`, 'success');
    }

    updateUILanguage() {
        // Update navigation button
        const navBtn = document.getElementById('navigateBtn');
        if (navBtn && !this.isNavigating) {
            navBtn.textContent = `🚗 ${this.translate('startNavigation')}`;
        }

        // Update input placeholders
        const fromInput = document.getElementById('fromInput');
        const toInput = document.getElementById('toInput');

        if (fromInput) {
            fromInput.placeholder = this.translate('currentLocation');
        }
        if (toInput) {
            toInput.placeholder = this.translate('destination');
        }

        // Update other UI elements as needed
        console.log('🌍 UI language updated');
    }

    // ===== HAZARDS COUNTER MANAGEMENT =====

    resetHazardsCounter() {
        this.currentHazards = [];
        this.updateHazardsDisplay();
        console.log('🔄 Hazards counter reset on app start');
    }

    updateHazardsDisplay() {
        const hazardTotal = document.getElementById('hazardTotal');
        if (hazardTotal) {
            const count = this.currentHazards ? this.currentHazards.length : 0;
            hazardTotal.textContent = count === 0 ? 'None detected' :
                                     count === 1 ? '1 ahead' :
                                     `${count} ahead`;

            // Add hazard avoidance button if there are avoidable hazards
            setTimeout(() => this.addHazardAvoidanceButton(), 100);
        }
    }

    addHazard(hazard) {
        if (!this.currentHazards) this.currentHazards = [];

        // Check if hazard already exists (avoid duplicates)
        const exists = this.currentHazards.some(h =>
            h.type === hazard.type &&
            Math.abs(h.lat - hazard.lat) < 0.001 &&
            Math.abs(h.lng - hazard.lng) < 0.001
        );

        if (!exists) {
            this.currentHazards.push(hazard);
            this.updateHazardsDisplay();
            console.log(`⚠️ Hazard added: ${hazard.type} at ${hazard.lat.toFixed(4)}, ${hazard.lng.toFixed(4)}`);
        }
    }

    removeHazard(hazardId) {
        if (!this.currentHazards) return;

        this.currentHazards = this.currentHazards.filter(h => h.id !== hazardId);
        this.updateHazardsDisplay();
        console.log(`✅ Hazard removed: ${hazardId}`);
    }

    clearAllHazards() {
        this.currentHazards = [];
        this.updateHazardsDisplay();
        this.clearHazardMarkers();
        console.log('🧹 All hazards cleared');
    }

    clearHazardMarkers() {
        if (this.hazardMarkers && this.map) {
            this.hazardMarkers.forEach(hazardMarker => {
                this.map.removeLayer(hazardMarker.marker);
            });
            this.hazardMarkers = [];
            console.log('🗑️ Hazard markers cleared from map');
        }
    }

    simulateRouteHazards(route) {
        // DISABLED: Fake hazard simulation causing false toll booth alerts
        console.log('🚫 Route hazard simulation disabled to prevent false alerts');

        // Clear existing hazards to ensure clean route
        this.clearAllHazards();

        // Only use real hazard detection if available
        if (this.hazardDetectionService && route && route.geometry) {
            console.log('🔍 Using real hazard detection instead of simulation');
            // Real hazard detection would go here, but it's also disabled
            // to prevent false positives until accurate data sources are available
        }

        return; // Exit early - no fake hazards

        /* DISABLED FAKE HAZARD CODE:
        if (!route || !route.geometry || !route.geometry.coordinates) {
            return;
        }

        // Simulate hazards along the route
        const coordinates = route.geometry.coordinates;
        const routeLength = coordinates.length;

        // Add 0-3 random hazards along the route
        const hazardCount = Math.floor(Math.random() * 4); // 0-3 hazards

        const hazardTypes = [
            { type: 'speedCameras', icon: '📷', description: 'Speed Camera', color: '#FF6B6B', avoidable: true },
            { type: 'roadwork', icon: '🚧', description: 'Road Work', color: '#FFB347', avoidable: true },
            { type: 'accidents', icon: '🚗💥', description: 'Accident Reported', color: '#FF4444', avoidable: true },
            { type: 'policeReports', icon: '👮', description: 'Police Activity', color: '#4ECDC4', avoidable: true },
            { type: 'schoolZones', icon: '🏫', description: 'School Zone', color: '#45B7D1', avoidable: true },
            { type: 'railwayCrossings', icon: '🚂', description: 'Railway Crossing', color: '#96CEB4', avoidable: true },
            { type: 'tollBooths', icon: '💰', description: 'Toll Booth', color: '#DDA0DD', avoidable: true }
        ];

        // Filter hazard types based on avoidance settings
        console.log('🚨 Current hazard avoidance settings:', this.hazardAvoidanceSettings);

        const availableHazardTypes = hazardTypes.filter(hazardType => {
            // Only include hazards that are NOT being avoided
            // If avoidance is enabled for this hazard type, exclude it from simulation
            const isAvoiding = this.shouldAvoidHazard(hazardType.type);
            const settingValue = this.hazardAvoidanceSettings[hazardType.type];
            console.log(`🔍 Hazard ${hazardType.type}: setting=${settingValue}, avoiding=${isAvoiding}, will simulate=${!isAvoiding}`);
            return !isAvoiding;
        */
    }

    calculateDistanceAlongRoute(coordinates, targetIndex) {
        let distance = 0;
        for (let i = 0; i < targetIndex && i < coordinates.length - 1; i++) {
            const from = coordinates[i];
            const to = coordinates[i + 1];
            distance += this.calculateDistance(
                { lat: from[1], lng: from[0] },
                { lat: to[1], lng: to[0] }
            );
        }
        return Math.round(distance);
    }

    addHazardToMap(hazard) {
        if (!this.map) return;

        // Create custom hazard icon
        const hazardIcon = L.divIcon({
            className: 'hazard-marker',
            html: `
                <div style="
                    background: ${hazard.color};
                    color: white;
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    border: 2px solid white;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    animation: pulse 2s infinite;
                ">${hazard.icon}</div>
                <style>
                    @keyframes pulse {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.1); }
                        100% { transform: scale(1); }
                    }
                </style>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        // Add marker to map
        const marker = L.marker([hazard.lat, hazard.lng], { icon: hazardIcon })
            .addTo(this.map)
            .bindPopup(`
                <div style="text-align: center;">
                    <strong>${hazard.icon} ${hazard.description}</strong><br>
                    <small>Distance: ${hazard.distance}m ahead</small><br>
                    <small>${hazard.avoidable ? '⚠️ Route can avoid this' : 'ℹ️ Informational only'}</small>
                </div>
            `);

        // Store marker reference for cleanup
        if (!this.hazardMarkers) this.hazardMarkers = [];
        this.hazardMarkers.push({ id: hazard.id, marker: marker });

        console.log(`📍 Added hazard marker: ${hazard.description} at ${hazard.lat.toFixed(4)}, ${hazard.lng.toFixed(4)}`);
    }

    // ===== ROUTE AVOIDANCE SYSTEM =====

    calculateAlternativeRoute() {
        if (!this.currentHazards || this.currentHazards.length === 0) {
            this.showNotification('ℹ️ No hazards to avoid on current route', 'info');
            return;
        }

        const avoidableHazards = this.currentHazards.filter(h => h.avoidable);

        if (avoidableHazards.length === 0) {
            this.showNotification('ℹ️ Current hazards cannot be avoided', 'info');
            return;
        }

        console.log(`🔄 Calculating alternative route to avoid ${avoidableHazards.length} hazards...`);

        // Show user that we're avoiding hazards
        this.showNotification(`🛣️ Finding route to avoid ${avoidableHazards.length} hazard${avoidableHazards.length > 1 ? 's' : ''}...`, 'info');

        // Simulate alternative route calculation
        setTimeout(() => {
            this.generateAlternativeRoute(avoidableHazards);
        }, 1500);
    }

    generateAlternativeRoute(avoidableHazards) {
        // Clear current hazards
        this.clearAllHazards();

        // Recalculate route (this will generate new hazards)
        this.calculateRoute().then(() => {
            const newHazardCount = this.currentHazards ? this.currentHazards.length : 0;
            const avoided = avoidableHazards.length;

            if (newHazardCount < avoided) {
                this.showNotification(`✅ Alternative route found! Avoided ${avoided} hazard${avoided > 1 ? 's' : ''}`, 'success');
                console.log(`✅ Successfully avoided ${avoided} hazards. New route has ${newHazardCount} hazards.`);
            } else {
                this.showNotification(`⚠️ Alternative route has ${newHazardCount} hazard${newHazardCount !== 1 ? 's' : ''}`, 'warning');
                console.log(`⚠️ Alternative route calculated but still has ${newHazardCount} hazards.`);
            }
        }).catch(error => {
            console.error('❌ Failed to calculate alternative route:', error);
            this.showNotification('❌ Failed to find alternative route', 'error');
        });
    }

    // Add button to UI for hazard avoidance
    addHazardAvoidanceButton() {
        const hazardTotal = document.getElementById('hazardTotal');
        if (hazardTotal && this.currentHazards && this.currentHazards.length > 0) {
            const avoidableCount = this.currentHazards.filter(h => h.avoidable).length;

            if (avoidableCount > 0) {
                // Remove existing button if present
                const existingBtn = document.getElementById('avoidHazardsBtn');
                if (existingBtn) existingBtn.remove();

                // Create avoid hazards button
                const avoidBtn = document.createElement('button');
                avoidBtn.id = 'avoidHazardsBtn';
                avoidBtn.innerHTML = `🛣️ Avoid ${avoidableCount} Hazard${avoidableCount > 1 ? 's' : ''}`;
                avoidBtn.style.cssText = `
                    background: #FFB347;
                    color: black;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    cursor: pointer;
                    margin-left: 10px;
                    transition: all 0.3s ease;
                `;

                avoidBtn.onmouseover = () => avoidBtn.style.background = '#FF9500';
                avoidBtn.onmouseout = () => avoidBtn.style.background = '#FFB347';
                avoidBtn.onclick = () => this.calculateAlternativeRoute();

                hazardTotal.parentNode.appendChild(avoidBtn);
            }
        }
    }

    // Helper function for distance calculation between coordinate objects
    calculateDistanceBetweenPoints(from, to) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = from.lat * Math.PI / 180;
        const φ2 = to.lat * Math.PI / 180;
        const Δφ = (to.lat - from.lat) * Math.PI / 180;
        const Δλ = (to.lng - from.lng) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // Distance in meters
    }

    // ===== OFFLINE FUNCTIONALITY =====

    initOfflineDetection() {
        // Listen for online/offline events
        window.addEventListener('online', () => {
            console.log('📶 Connection restored - going online');
            this.handleOnlineEvent();
        });

        window.addEventListener('offline', () => {
            console.log('📵 Connection lost - going offline');
            this.handleOfflineEvent();
        });

        // Check initial connection status and show indicator
        this.isOffline = !navigator.onLine;

        // Always create and show the connection status indicator
        this.updateOfflineUI(this.isOffline);

        if (this.isOffline) {
            this.handleOfflineEvent();
        }

        console.log('📱 Offline detection initialized, currently:', navigator.onLine ? 'online' : 'offline');
    }

    async initOfflineStorage() {
        try {
            // Initialize IndexedDB for offline data storage
            const request = indexedDB.open('VibeVoyageOffline', 2);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores for different data types
                if (!db.objectStoreNames.contains('routes')) {
                    const routeStore = db.createObjectStore('routes', { keyPath: 'id' });
                    routeStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                if (!db.objectStoreNames.contains('locations')) {
                    const locationStore = db.createObjectStore('locations', { keyPath: 'id' });
                    locationStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                if (!db.objectStoreNames.contains('pois')) {
                    const poiStore = db.createObjectStore('pois', { keyPath: 'id' });
                    poiStore.createIndex('type', 'type', { unique: false });
                }

                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };

            request.onsuccess = (event) => {
                this.offlineDB = event.target.result;
                console.log('📱 Offline storage initialized successfully');
            };

            request.onerror = (event) => {
                console.error('❌ Failed to initialize offline storage:', event.target.error);
            };

        } catch (error) {
            console.error('❌ Error initializing offline storage:', error);
        }
    }

    handleOfflineEvent() {
        this.isOffline = true;
        this.lastOnlineTime = Date.now();

        // Show offline notification
        this.showNotification('⚠ You\'re offline - Using cached data for navigation', 'warning');

        // Switch to offline mode UI
        this.updateOfflineUI(true);

        // Cache current location and route data
        this.cacheCurrentData();

        console.log('📵 Offline mode activated');
    }

    handleOnlineEvent() {
        this.isOffline = false;
        const offlineDuration = Date.now() - this.lastOnlineTime;

        // Show online notification
        this.showNotification('✓ Back online - Syncing data...', 'success');

        // Switch back to online mode UI
        this.updateOfflineUI(false);

        // Sync offline data
        this.syncOfflineData();

        console.log(`📶 Online mode restored after ${Math.round(offlineDuration / 1000)}s offline`);
    }

    updateOfflineUI(isOffline) {
        console.log(`📱 Updating offline UI, isOffline: ${isOffline}`);

        // Update UI to show offline status
        const statusIndicator = document.getElementById('connectionStatus') || this.createConnectionStatusIndicator();

        if (isOffline) {
            statusIndicator.innerHTML = '⚠ Offline';
            statusIndicator.className = 'connection-status offline';
            statusIndicator.title = 'You\'re offline - Using cached data';
            console.log('📱 Set indicator to: ⚠ Offline');
        } else {
            statusIndicator.innerHTML = '✓ Online';
            statusIndicator.className = 'connection-status online';
            statusIndicator.title = 'Connected to internet';
            console.log('📱 Set indicator to: ✓ Online');
        }

        console.log('📱 Indicator position:', statusIndicator.style.position, statusIndicator.style.top, statusIndicator.style.right);
        console.log('📱 Indicator content:', statusIndicator.innerHTML);
    }

    createConnectionStatusIndicator() {
        console.log('📱 Creating connection status indicator...');
        const indicator = document.createElement('div');
        indicator.id = 'connectionStatus';

        // Use individual style properties to avoid CSS conflicts
        // Position top-left to avoid header buttons and notifications
        indicator.style.position = 'fixed';
        indicator.style.top = '60px';   // Below the header (header height ~50px)
        indicator.style.left = '15px';  // Left side to avoid notifications on right
        indicator.style.padding = '6px 10px';
        indicator.style.borderRadius = '12px';
        indicator.style.fontSize = '12px';
        indicator.style.fontWeight = 'bold';
        indicator.style.zIndex = '99999';
        indicator.style.transition = 'all 0.3s ease';
        indicator.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
        indicator.style.display = 'inline-block';  // Prevent stretching
        indicator.style.visibility = 'visible';
        indicator.style.pointerEvents = 'none';
        indicator.style.userSelect = 'none';
        indicator.style.fontFamily = 'Arial, sans-serif';
        indicator.style.width = 'auto';           // Auto width, don't stretch
        indicator.style.maxWidth = '100px';       // Maximum width constraint
        indicator.style.whiteSpace = 'nowrap';    // Keep text on one line
        indicator.style.textAlign = 'center';     // Center the text

        document.body.appendChild(indicator);
        console.log('✅ Connection status indicator created and added to page at top-right');
        return indicator;
    }

    async cacheCurrentData() {
        if (!this.offlineDB) return;

        try {
            const transaction = this.offlineDB.transaction(['routes', 'locations'], 'readwrite');

            // Cache current route if available
            if (this.routeData) {
                const routeStore = transaction.objectStore('routes');
                await routeStore.put({
                    id: 'current_route',
                    data: this.routeData,
                    timestamp: Date.now(),
                    transportMode: this.transportMode
                });
            }

            // Cache current location
            if (this.currentLocation) {
                const locationStore = transaction.objectStore('locations');
                await locationStore.put({
                    id: 'current_location',
                    data: this.currentLocation,
                    timestamp: Date.now()
                });
            }

            console.log('📱 Current data cached for offline use');
        } catch (error) {
            console.error('❌ Error caching current data:', error);
        }
    }

    async syncOfflineData() {
        if (!this.offlineDB || this.offlineQueue.length === 0) return;

        console.log(`📱 Syncing ${this.offlineQueue.length} offline operations...`);

        const failedOperations = [];

        for (const operation of this.offlineQueue) {
            try {
                await this.executeOfflineOperation(operation);
                console.log(`✅ Synced offline operation: ${operation.type}`);
            } catch (error) {
                console.error(`❌ Failed to sync operation ${operation.type}:`, error);
                failedOperations.push(operation);
            }
        }

        // Keep failed operations for retry
        this.offlineQueue = failedOperations;

        if (failedOperations.length === 0) {
            this.showNotification('✅ All offline data synced successfully', 'success');
        } else {
            this.showNotification(`⚠️ ${failedOperations.length} operations failed to sync`, 'warning');
        }
    }

    async executeOfflineOperation(operation) {
        switch (operation.type) {
            case 'route_request':
                // Re-calculate route with fresh data
                if (operation.data.from && operation.data.to) {
                    await this.calculateRoute();
                }
                break;

            case 'location_search':
                // Re-search location with fresh data
                if (operation.data.query) {
                    await this.searchLocation(operation.data.query);
                }
                break;

            case 'poi_search':
                // Re-search POIs with fresh data
                if (operation.data.type && operation.data.location) {
                    await this.findNearbyServices(operation.data.type, operation.data.location);
                }
                break;

            default:
                console.warn('Unknown offline operation type:', operation.type);
        }
    }

    queueOfflineOperation(type, data) {
        const operation = {
            id: Date.now() + Math.random(),
            type,
            data,
            timestamp: Date.now(),
            retryCount: 0
        };

        this.offlineQueue.push(operation);
        console.log(`📱 Queued offline operation: ${type}`);
    }

    async getOfflineRoute(from, to, transportMode = 'driving') {
        if (!this.offlineDB) return null;

        try {
            const transaction = this.offlineDB.transaction(['routes'], 'readonly');
            const routeStore = transaction.objectStore('routes');

            // Try to find a cached route
            const cachedRoute = await routeStore.get('current_route');

            if (cachedRoute && cachedRoute.data) {
                console.log('📱 Using cached route for offline navigation');
                return cachedRoute.data;
            }

            // Generate basic offline route
            return this.generateOfflineRoute(from, to, transportMode);

        } catch (error) {
            console.error('❌ Error getting offline route:', error);
            return this.generateOfflineRoute(from, to, transportMode);
        }
    }

    generateOfflineRoute(from, to, transportMode) {
        // Generate a basic straight-line route for offline use
        const distance = this.calculateDistance(from.lat, from.lng, to.lat, to.lng);
        const currentMode = this.transportModes[transportMode];
        const duration = Math.round((distance / 1000) / currentMode.speedKmh * 3600);

        // Create simple route coordinates (straight line with some waypoints)
        const coordinates = this.generateStraightLineRoute(from, to);

        return {
            distance: distance,
            duration: duration,
            geometry: {
                type: 'LineString',
                coordinates: coordinates
            },
            steps: [{
                instruction: `Head ${this.getDirection(from, to)} toward destination`,
                distance: distance,
                duration: duration
            }],
            offline: true,
            transportMode: transportMode
        };
    }

    generateStraightLineRoute(from, to, numPoints = 10) {
        const coordinates = [];

        for (let i = 0; i <= numPoints; i++) {
            const ratio = i / numPoints;
            const lat = from.lat + (to.lat - from.lat) * ratio;
            const lng = from.lng + (to.lng - from.lng) * ratio;
            coordinates.push([lng, lat]);
        }

        return coordinates;
    }

    getDirection(from, to) {
        const deltaLat = to.lat - from.lat;
        const deltaLng = to.lng - from.lng;

        const angle = Math.atan2(deltaLng, deltaLat) * 180 / Math.PI;

        if (angle >= -22.5 && angle < 22.5) return 'north';
        if (angle >= 22.5 && angle < 67.5) return 'northeast';
        if (angle >= 67.5 && angle < 112.5) return 'east';
        if (angle >= 112.5 && angle < 157.5) return 'southeast';
        if (angle >= 157.5 || angle < -157.5) return 'south';
        if (angle >= -157.5 && angle < -112.5) return 'southwest';
        if (angle >= -112.5 && angle < -67.5) return 'west';
        if (angle >= -67.5 && angle < -22.5) return 'northwest';

        return 'toward';
    }

    async cacheServiceResults(type, coords, services) {
        if (!this.offlineDB) return;

        try {
            const transaction = this.offlineDB.transaction(['pois'], 'readwrite');
            const poiStore = transaction.objectStore('pois');

            const cacheKey = `${type}_${coords.lat.toFixed(4)}_${coords.lng.toFixed(4)}`;

            await poiStore.put({
                id: cacheKey,
                type: type,
                location: coords,
                services: services,
                timestamp: Date.now()
            });

            console.log(`📱 Cached ${services.length} ${type} services for offline use`);
        } catch (error) {
            console.error('❌ Error caching service results:', error);
        }
    }

    async getCachedServiceResults(type, coords) {
        if (!this.offlineDB) return null;

        try {
            const transaction = this.offlineDB.transaction(['pois'], 'readonly');
            const poiStore = transaction.objectStore('pois');

            const cacheKey = `${type}_${coords.lat.toFixed(4)}_${coords.lng.toFixed(4)}`;
            const cached = await poiStore.get(cacheKey);

            if (cached && cached.services) {
                // Check if cache is still valid (within 24 hours)
                const cacheAge = Date.now() - cached.timestamp;
                if (cacheAge < 24 * 60 * 60 * 1000) {
                    console.log(`📱 Using cached ${type} services (${cached.services.length} results)`);
                    return cached.services;
                }
            }

            return null;
        } catch (error) {
            console.error('❌ Error getting cached service results:', error);
            return null;
        }
    }

    // ===== MAP DISPLAY FIXES =====

    fixMapDisplay() {
        try {
            const mapElement = document.getElementById('map');
            if (mapElement) {
                // Ensure map container has proper dimensions
                mapElement.style.height = '400px';
                mapElement.style.minHeight = '400px';
                mapElement.style.width = '100%';
                mapElement.style.display = 'block';
                mapElement.style.visibility = 'visible';

                // Force map resize if Leaflet map exists
                if (this.map) {
                    setTimeout(() => {
                        this.map.invalidateSize();
                        console.log('🔄 Map display fixed and resized');
                    }, 100);
                }
            }
        } catch (error) {
            console.error('❌ Error fixing map display:', error);
        }
    }

    addMapResizeHandler() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                try {
                    // Check if map and container exist before resizing
                    if (this.map && this.map.getContainer() && this.map.getContainer().offsetWidth > 0) {
                        this.fixMapDisplay();
                        console.log('🔄 Map resized due to window resize');
                    } else {
                        console.warn('⚠️ Map container not ready for resize');
                    }
                } catch (error) {
                    console.warn('⚠️ Map resize error (safely handled):', error.message);
                }
            }, 250);
        });

        console.log('📏 Map resize handler added');
    }

    // ===== HAZARD AVOIDANCE SETTINGS =====

    initHazardAvoidanceSettings() {
        // Default hazard avoidance settings
        this.hazardAvoidanceSettings = {
            speedCameras: true,
            redLightCameras: true,
            policeReports: true,
            roadwork: false,
            railwayCrossings: true,
            trafficLights: false,
            schoolZones: true,
            hospitalZones: true,
            tollBooths: false,
            bridges: false,
            accidents: true,
            weather: false,
            steepGrades: false,
            narrowRoads: false
        };

        // Load saved settings
        this.loadHazardAvoidanceSettings();
        console.log('🚨 Hazard avoidance settings initialized');
    }

    loadHazardAvoidanceSettings() {
        try {
            const saved = localStorage.getItem('vibeVoyage_hazardAvoidance');
            if (saved) {
                const savedSettings = JSON.parse(saved);
                this.hazardAvoidanceSettings = { ...this.hazardAvoidanceSettings, ...savedSettings };
                console.log('📋 Hazard avoidance settings loaded from storage');
            }
        } catch (error) {
            console.warn('⚠️ Error loading hazard avoidance settings:', error);
        }
    }

    saveHazardAvoidanceSettings() {
        try {
            localStorage.setItem('vibeVoyage_hazardAvoidance', JSON.stringify(this.hazardAvoidanceSettings));
            console.log('💾 Hazard avoidance settings saved');
        } catch (error) {
            console.error('❌ Error saving hazard avoidance settings:', error);
        }
    }

    updateHazardAvoidanceSetting(hazardType, enabled) {
        this.hazardAvoidanceSettings[hazardType] = enabled;
        this.saveHazardAvoidanceSettings();
        console.log(`🔄 Hazard avoidance updated: ${hazardType} = ${enabled}`);

        // If we have a current route, recalculate to apply new settings
        if (this.currentLocation && this.destination) {
            this.showNotification(`🔄 Recalculating route with updated hazard settings...`, 'info');
            setTimeout(() => {
                this.calculateRoute();
            }, 1000);
        }
    }

    shouldAvoidHazard(hazardType) {
        return this.hazardAvoidanceSettings[hazardType] === true;
    }

    updateHazardAvoidanceSettings() {
        // Update settings based on checkbox states
        const hazardTypes = [
            'speedCameras', 'redLightCameras', 'policeReports', 'roadwork',
            'railwayCrossings', 'trafficLights', 'schoolZones', 'hospitalZones',
            'tollBooths', 'bridges', 'accidents', 'weather', 'steepGrades', 'narrowRoads'
        ];

        let changesDetected = false;
        hazardTypes.forEach(hazardType => {
            const checkbox = document.getElementById(hazardType);
            if (checkbox) {
                const newValue = checkbox.checked;
                if (this.hazardAvoidanceSettings[hazardType] !== newValue) {
                    this.hazardAvoidanceSettings[hazardType] = newValue;
                    changesDetected = true;
                    console.log(`🔄 Hazard setting changed: ${hazardType} = ${newValue}`);
                }
            }
        });

        if (changesDetected) {
            this.saveHazardAvoidanceSettings();
            this.showNotification('🔄 Hazard avoidance settings updated', 'success');

            // If we have a current route, recalculate to apply new settings
            if (this.currentLocation && this.destination) {
                setTimeout(() => {
                    this.showNotification('🛣️ Recalculating route with new settings...', 'info');
                    this.calculateRoute();
                }, 1500);
            }
        }
    }

    showLanguagePanel() {
        const languages = [
            { code: 'en', name: 'English', flag: '🇺🇸' },
            { code: 'es', name: 'Español', flag: '🇪🇸' },
            { code: 'fr', name: 'Français', flag: '🇫🇷' },
            { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
            { code: 'it', name: 'Italiano', flag: '🇮🇹' },
            { code: 'pt', name: 'Português', flag: '🇵🇹' },
            { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
            { code: 'pl', name: 'Polski', flag: '🇵🇱' },
            { code: 'ru', name: 'Русский', flag: '🇷🇺' }
        ];

        const panelHTML = `
            <div id="languagePanel" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 90%;
                max-width: 400px;
                background: rgba(0, 0, 0, 0.95);
                border: 2px solid #00FF88;
                border-radius: 12px;
                padding: 20px;
                color: white;
                z-index: 10000;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="color: #00FF88; margin: 0;">🌍 Select Language</h3>
                    <button onclick="closeLanguagePanel()" style="background: #FF6B6B; border: none; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer;">✕</button>
                </div>

                <div style="display: grid; gap: 8px;">
                    ${languages.map(lang => `
                        <button onclick="changeLanguage('${lang.code}')" style="
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            padding: 12px;
                            background: ${this.currentLanguage === lang.code ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
                            border: 1px solid ${this.currentLanguage === lang.code ? '#00FF88' : '#333'};
                            border-radius: 6px;
                            color: white;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            width: 100%;
                            text-align: left;
                        " onmouseover="this.style.background='rgba(0, 255, 136, 0.1)'" onmouseout="this.style.background='${this.currentLanguage === lang.code ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 255, 255, 0.05)'}'">
                            <span style="font-size: 24px;">${lang.flag}</span>
                            <div>
                                <div style="font-weight: bold;">${lang.name}</div>
                                <div style="font-size: 12px; color: #888;">${lang.code.toUpperCase()}</div>
                            </div>
                            ${this.currentLanguage === lang.code ? '<span style="margin-left: auto; color: #00FF88;">✓</span>' : ''}
                        </button>
                    `).join('')}
                </div>

                <div style="text-align: center; margin-top: 15px; font-size: 12px; color: #888;">
                    Current: ${languages.find(l => l.code === this.currentLanguage)?.name || 'English'}
                </div>
            </div>
        `;

        // Remove existing panel
        const existingPanel = document.getElementById('languagePanel');
        if (existingPanel) existingPanel.remove();

        // Add new panel
        document.body.insertAdjacentHTML('beforeend', panelHTML);
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

        // Update TrafficCameraService settings to match UI
        if (this.trafficCameraService) {
            const trafficServiceSettings = {
                avoidSpeedCameras: settings.speedCameras,
                avoidRedLightCameras: settings.redLightCameras,
                avoidTrafficEnforcement: settings.speedCameras, // Use speed cameras setting for general traffic enforcement
                avoidRailwayCrossings: settings.railwayCrossings,
                avoidPoliceCheckpoints: settings.policeReports,
                avoidPoliceStations: settings.policeReports,
                avoidTollRoads: settings.tollBooths,
                avoidDifficultJunctions: settings.trafficLights,
                avoidSteepGrades: settings.steepGrades,
                avoidNarrowRoads: settings.narrowRoads
            };

            this.trafficCameraService.updateSettings(trafficServiceSettings);
            console.log('📷 Updated TrafficCameraService settings:', trafficServiceSettings);
        }

        // If we have a current route, recalculate with new settings
        if (this.currentLocation && this.destination) {
            console.log('🔄 Recalculating routes with new hazard settings...');
            this.showNotification('🔄 Recalculating routes with hazard avoidance...', 'info');
            this.calculateMultipleRoutes();
        }

        // Update any existing hazard markers on the map
        this.updateHazardMarkersVisibility();
    }

    // Update hazard marker visibility based on current settings
    updateHazardMarkersVisibility() {
        if (!this.map || !this.trafficCameraService) return;

        // Get current hazard data and apply visibility settings
        const settings = this.hazardAvoidanceSettings;

        // Hide/show speed camera markers based on settings
        if (this.hazardMarkers) {
            this.hazardMarkers.forEach(marker => {
                const hazardType = marker.hazardType;
                let shouldShow = true;

                switch (hazardType) {
                    case 'speed_camera':
                        shouldShow = settings.speedCameras;
                        break;
                    case 'red_light_camera':
                    case 'traffic_camera':
                        shouldShow = settings.redLightCameras;
                        break;
                    case 'railway_crossing':
                        shouldShow = settings.railwayCrossings;
                        break;
                    case 'police_station':
                    case 'police_checkpoint':
                        shouldShow = settings.policeReports;
                        break;
                    case 'toll_booth':
                        shouldShow = settings.tollBooths;
                        break;
                }

                if (shouldShow) {
                    if (!this.map.hasLayer(marker)) {
                        marker.addTo(this.map);
                    }
                } else {
                    if (this.map.hasLayer(marker)) {
                        this.map.removeLayer(marker);
                    }
                }
            });
        }

        console.log('🎯 Updated hazard marker visibility based on avoidance settings');
    }

    // Build avoidance parameters for routing API based on user settings
    buildAvoidanceParameters() {
        if (!this.hazardAvoidanceSettings) {
            return '';
        }

        const settings = this.hazardAvoidanceSettings;
        const avoidanceFeatures = [];

        // Note: OSRM has limited built-in avoidance features
        // We'll implement post-processing avoidance for cameras

        // For now, we can avoid certain road types that OSRM supports
        if (settings.tollBooths) {
            // OSRM doesn't have direct toll avoidance, but we'll mark it for post-processing
            console.log('📷 Toll booth avoidance enabled - will be applied in post-processing');
        }

        if (settings.railwayCrossings) {
            console.log('🚂 Railway crossing avoidance enabled - will be applied in post-processing');
        }

        if (settings.speedCameras || settings.redLightCameras) {
            console.log('📷 Camera avoidance enabled - will be applied in post-processing');
        }

        // OSRM supports excluding certain road types
        // For now, return empty string as we'll do post-processing avoidance
        return '';
    }

    // Apply post-processing avoidance to routes based on hazard settings
    async applyHazardAvoidanceToRoutes(routes) {
        if (!this.trafficCameraService || !this.hazardAvoidanceSettings) {
            return routes;
        }

        console.log('🎯 Applying hazard avoidance to routes...');
        const settings = this.hazardAvoidanceSettings;

        return routes.map(route => {
            // Calculate avoidance score based on hazards along the route
            let avoidanceScore = 0;
            const hazardsOnRoute = [];

            if (route.coordinates) {
                // Check for hazards along the route
                route.coordinates.forEach(coord => {
                    // Simulate hazard detection (in real implementation, this would query the TrafficCameraService)
                    const nearbyHazards = this.simulateHazardDetection(coord);

                    nearbyHazards.forEach(hazard => {
                        let shouldAvoid = false;
                        let penalty = 0;

                        switch (hazard.type) {
                            case 'speed_camera':
                                shouldAvoid = settings.speedCameras;
                                penalty = 300; // 5 minutes penalty
                                break;
                            case 'red_light_camera':
                                shouldAvoid = settings.redLightCameras;
                                penalty = 180; // 3 minutes penalty
                                break;
                            case 'railway_crossing':
                                shouldAvoid = settings.railwayCrossings;
                                penalty = 99999; // Absolute avoidance
                                break;
                            case 'toll_booth':
                                shouldAvoid = settings.tollBooths;
                                penalty = 120; // 2 minutes penalty
                                break;
                        }

                        if (shouldAvoid) {
                            avoidanceScore += penalty;
                            hazardsOnRoute.push(hazard);
                        }
                    });
                });
            }

            // Add avoidance information to route
            route.avoidanceScore = avoidanceScore;
            route.hazardsOnRoute = hazardsOnRoute;
            route.avoidanceApplied = true;

            // Adjust route duration based on avoidance score
            if (avoidanceScore > 0) {
                route.duration = (route.duration || 0) + avoidanceScore;
                route.avoidancePenalty = avoidanceScore;
            }

            return route;
        });
    }

    // Simulate hazard detection for a coordinate (placeholder for real implementation)
    simulateHazardDetection(coord) {
        // This is a placeholder - in real implementation, this would query actual hazard databases
        const hazards = [];

        // Randomly simulate some hazards for demonstration
        if (Math.random() < 0.1) { // 10% chance of speed camera
            hazards.push({
                type: 'speed_camera',
                location: coord,
                id: `sim_speed_${Date.now()}_${Math.random()}`
            });
        }

        if (Math.random() < 0.05) { // 5% chance of railway crossing
            hazards.push({
                type: 'railway_crossing',
                location: coord,
                id: `sim_railway_${Date.now()}_${Math.random()}`
            });
        }

        return hazards;
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
                                <input type="checkbox" id="speedCameras" checked onchange="updateHazardAvoidanceSettings()"> 📷 Speed Cameras
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="redLightCameras" checked onchange="updateHazardAvoidanceSettings()"> 🚦 Red Light Cameras
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="policeReports" checked onchange="updateHazardAvoidanceSettings()"> 🚨 Police Reports
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="roadwork" onchange="updateHazardAvoidanceSettings()"> 🚧 Road Works
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="railwayCrossings" checked onchange="updateHazardAvoidanceSettings()"> 🚂 Railway Crossings (⚠️ Avoid at all costs)
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="trafficLights" onchange="updateHazardAvoidanceSettings()"> 🚦 Complex Junctions
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="schoolZones" checked onchange="updateHazardAvoidanceSettings()"> 🏫 School Zones
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="hospitalZones" checked onchange="updateHazardAvoidanceSettings()"> 🏥 Hospital Zones
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="tollBooths" onchange="updateHazardAvoidanceSettings()"> 💰 Toll Booths
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="bridges" onchange="updateHazardAvoidanceSettings()"> 🌉 Bridges/Tunnels
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="accidents" checked onchange="updateHazardAvoidanceSettings()"> 💥 Accident Reports
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="weather" onchange="updateHazardAvoidanceSettings()"> 🌧️ Weather Alerts
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="steepGrades" onchange="updateHazardAvoidanceSettings()"> ⛰️ Steep Grades
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <input type="checkbox" id="narrowRoads" onchange="updateHazardAvoidanceSettings()"> 🛤️ Narrow Roads
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

    // Map control functions (duplicate - removing this one)
    // This function is duplicated above, removing to avoid conflicts

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
        // Record trip stats before stopping
        if (this.routeData && this.navigationStartTime) {
            const tripDuration = Date.now() - this.navigationStartTime;
            const tripDistance = this.routeData.distance || 0;
            const routeType = this.routeData.type || 'standard';
            const hazardsAvoided = this.hazardsAvoidedCount || 0;

            this.addTripStats(tripDistance, tripDuration, routeType, hazardsAvoided);
        }

        this.isNavigating = false;

        // Hide navigation panel
        document.getElementById('navPanel').classList.remove('active');

        // Stop location tracking
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        // Stop ETA updates
        this.stopETAUpdates();

        // Hide turn-by-turn navigation
        this.hideTurnByTurnNavigation();

        // Reset navigation button
        const navBtn = document.getElementById('navigateBtn');
        navBtn.innerHTML = '🚗 Start Navigation';
        navBtn.onclick = () => this.startNavigation();

        // Reset trip tracking
        this.navigationStartTime = null;
        this.hazardsAvoidedCount = 0;

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
        // Validate input
        if (isNaN(remainingDistance) || remainingDistance <= 0) {
            console.warn('⚠️ Invalid remaining distance for ETA calculation:', remainingDistance);
            return '--:--';
        }

        // Use appropriate average speed based on user's speed unit
        let averageSpeedKmh = 50; // Default 50 km/h
        if (this.units && this.units.speed === 'mph') {
            averageSpeedKmh = 31; // ~50 km/h in mph equivalent
        }

        const averageSpeed = averageSpeedKmh * 1000 / 3600; // Convert to m/s
        const remainingTime = remainingDistance / averageSpeed;

        // Validate calculation
        if (isNaN(remainingTime) || remainingTime <= 0) {
            console.warn('⚠️ Invalid remaining time calculation:', remainingTime);
            return '--:--';
        }

        const eta = new Date(Date.now() + remainingTime * 1000);

        // Validate date
        if (isNaN(eta.getTime())) {
            console.warn('⚠️ Invalid ETA date calculation');
            return '--:--';
        }

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
        const fromInput = document.getElementById('fromInput');

        // Check if required elements exist (they might not in diagnostic/test environments)
        if (!toInput || !fromInput) {
            console.log('⚠️ Some UI elements not found, skipping event listener setup');
            return;
        }

        // To input handling
        toInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            const navigateBtn = document.getElementById('navigateBtn');
            if (navigateBtn) {
                navigateBtn.disabled = !value;
            }

            // Handle address input with longer debouncing for better UX
            clearTimeout(this.toInputTimeout);
            this.toInputTimeout = setTimeout(() => {
                this.handleAddressInput('to', value);
            }, 500); // Increased from 300ms to 500ms
        });

        // From input handling
        if (fromInput) {
            fromInput.addEventListener('input', (e) => {
                const value = e.target.value.trim();

                // Handle address input with longer debouncing for better UX
                clearTimeout(this.fromInputTimeout);
                this.fromInputTimeout = setTimeout(() => {
                    this.handleAddressInput('from', value);
                }, 500); // Increased from 300ms to 500ms
            });
        }

        // Click outside to hide suggestions
        document.addEventListener('click', (e) => {
            const toSuggestions = document.getElementById('toSuggestions');
            const fromSuggestions = document.getElementById('fromSuggestions');

            if (toSuggestions && !toInput.contains(e.target) && !toSuggestions.contains(e.target)) {
                this.hideSuggestions('to');
            }

            if (fromSuggestions && fromInput && !fromInput.contains(e.target) && !fromSuggestions.contains(e.target)) {
                this.hideSuggestions('from');
            }
        });

        // Online/offline status is now handled by initOfflineDetection()
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isNavigating) {
                this.stopNavigation();
            }
        });
    }
    

    
    showNotification(message, type = 'info') {
        console.log(`📢 Notification: ${message} (${type})`);

        const notification = document.getElementById('notification');
        if (!notification) {
            console.error('❌ Notification element not found!');
            return;
        }

        // Clear any existing timeout
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }

        // Set content and show
        notification.textContent = message;
        notification.className = `notification ${type} show`;

        // Auto-hide after 4 seconds
        this.notificationTimeout = setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);

        console.log(`✅ Notification displayed: "${message}"`);
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

        // Remove existing car marker to prevent duplicates
        if (this.carMarker) {
            this.map.removeLayer(this.carMarker);
            this.carMarker = null;
        }

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
            // Register service worker with faster timeout for PWA Builder
            navigator.serviceWorker.register('./sw.js', {
                scope: './',
                updateViaCache: 'none'
            })
                .then(registration => {
                    console.log('✅ SW registered successfully:', registration.scope);

                    // Force immediate activation for PWA Builder
                    if (registration.waiting) {
                        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }

                    // Initialize background sync
                    this.initBackgroundSync(registration);
                })
                .catch(error => {
                    console.error('❌ SW registration failed:', error);
                });
        } else {
            console.warn('⚠️ Service Worker not supported');
        }
    }

    initBackgroundSync(registration) {
        if ('sync' in window.ServiceWorkerRegistration.prototype) {
            console.log('✅ Background Sync supported');
            this.serviceWorkerRegistration = registration;

            // Listen for online/offline events to trigger sync
            window.addEventListener('online', () => {
                console.log('🔄 Back online - triggering background sync');
                this.triggerBackgroundSync();
            });

        } else {
            console.warn('⚠️ Background Sync not supported');
        }
    }

    async triggerBackgroundSync() {
        if (this.serviceWorkerRegistration && 'sync' in window.ServiceWorkerRegistration.prototype) {
            try {
                // Register background sync for different types of data
                await this.serviceWorkerRegistration.sync.register('background-sync-routes');
                await this.serviceWorkerRegistration.sync.register('background-sync-hazards');
                await this.serviceWorkerRegistration.sync.register('background-sync-locations');
                console.log('✅ Background sync registered for all data types');
            } catch (error) {
                console.error('❌ Background sync registration failed:', error);
            }
        }
    }

    // Handle widget actions from URL parameters
    handleWidgetActions() {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        const destination = urlParams.get('destination');

        console.log('🔍 Checking for widget actions:', { action, destination });

        if (action) {
            setTimeout(() => {
                switch (action) {
                    case 'navigate':
                        if (destination) {
                            console.log('🚗 Widget navigation request:', destination);
                            const toInput = document.getElementById('toInput');
                            if (toInput) {
                                toInput.value = destination;
                                this.calculateRoute();
                            }
                        } else {
                            // Focus on destination input for manual entry
                            const toInput = document.getElementById('toInput');
                            if (toInput) {
                                toInput.focus();
                            }
                        }
                        break;

                    case 'gas':
                        console.log('⛽ Widget gas station request');
                        this.findNearbyServices('fuel');
                        break;

                    case 'repair':
                        console.log('🔧 Widget repair shop request');
                        this.findNearbyServices('repair');
                        break;

                    case 'report':
                        console.log('⚠️ Widget hazard report request');
                        // Open hazard reporting interface
                        const reportBtn = document.querySelector('[onclick*="reportHazard"]');
                        if (reportBtn) {
                            reportBtn.click();
                        }
                        break;

                    default:
                        console.log('❓ Unknown widget action:', action);
                }
            }, 1000); // Wait for app to fully initialize
        }
    }
}

// Debug: Class definition complete
console.log('✅ VibeVoyageApp class defined successfully');

// Make VibeVoyageApp available globally
window.VibeVoyageApp = VibeVoyageApp;
console.log('✅ VibeVoyageApp assigned to window object');

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
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
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

// ===== NEW FEATURE FUNCTIONS =====

function shareCurrentRoute() {
    if (window.app && window.app.shareCurrentRoute) {
        window.app.shareCurrentRoute();
    } else {
        console.error('❌ App not ready yet');
    }
}

function toggleFavorites() {
    if (window.app && window.app.toggleFavorites) {
        window.app.toggleFavorites();
    } else {
        console.error('❌ App not ready yet');
    }
}

function navigateToFavorite(favoriteId) {
    if (window.app) {
        const favorite = window.app.favoriteLocations.find(fav => fav.id === favoriteId);
        if (favorite) {
            window.app.setDestination({ lat: favorite.lat, lng: favorite.lng, name: favorite.name });
            document.getElementById('toInput').value = favorite.name;
            document.getElementById('favoritesContainer').style.display = 'none';
            window.app.showNotification(`🎯 Destination set: ${favorite.name}`, 'success');
        }
    }
}

function navigateToRecent(searchId) {
    if (window.app) {
        const recent = window.app.recentSearches.find(search => search.id === searchId);
        if (recent) {
            window.app.setDestination({ lat: recent.lat, lng: recent.lng, name: recent.name });
            document.getElementById('toInput').value = recent.name;
            document.getElementById('favoritesContainer').style.display = 'none';
            window.app.showNotification(`🎯 Destination set: ${recent.name}`, 'success');
        }
    }
}

function removeFromFavorites(favoriteId) {
    if (window.app && window.app.removeFromFavorites) {
        window.app.removeFromFavorites(favoriteId);
        window.app.showFavorites(); // Refresh the display
    }
}

function addRecentToFavorites(searchId) {
    if (window.app) {
        const recent = window.app.recentSearches.find(search => search.id === searchId);
        if (recent) {
            window.app.addToFavorites({
                name: recent.name,
                address: recent.address,
                lat: recent.lat,
                lng: recent.lng
            });
            window.app.showFavorites(); // Refresh the display
        }
    }
}

function clearAllFavorites() {
    if (window.app && confirm('Are you sure you want to clear all favorites?')) {
        window.app.favoriteLocations = [];
        window.app.saveFavoriteLocations();
        window.app.showFavorites(); // Refresh the display
        window.app.showNotification('🗑️ All favorites cleared', 'info');
    }
}

// ===== NEW FEATURE FUNCTIONS =====

function findNearbyParking() {
    if (window.app && window.app.findNearbyServices) {
        window.app.findNearbyServices('parking');
    }
}

function findNearbyFuel() {
    if (window.app && window.app.findNearbyServices) {
        window.app.findNearbyServices('fuel');
    }
}

function findNearbyRestaurants() {
    if (window.app && window.app.findNearbyServices) {
        window.app.findNearbyServices('restaurant');
    }
}

function findNearbyHospitals() {
    if (window.app && window.app.findNearbyServices) {
        window.app.findNearbyServices('hospital');
    }
}

function navigateToService(serviceId, lat, lng, name) {
    if (window.app) {
        window.app.setDestination({ lat: lat, lng: lng, name: name });
        document.getElementById('toInput').value = name;
        closeServicesPanel();
        window.app.showNotification(`🎯 Navigating to ${name}`, 'success');
    }
}

function closeServicesPanel() {
    const panel = document.getElementById('servicesPanel');
    if (panel) panel.remove();
}

function compareRoutes() {
    if (window.app) {
        // If we don't have multiple routes, calculate them first
        if (!window.app.availableRoutes || window.app.availableRoutes.length <= 1) {
            window.app.showNotification('🔄 Calculating alternative routes for comparison...', 'info');
            window.app.calculateMultipleRoutes().then(() => {
                if (window.app.availableRoutes && window.app.availableRoutes.length > 1) {
                    window.app.showRouteComparison(window.app.availableRoutes);
                } else {
                    window.app.showNotification('❌ Unable to find alternative routes', 'error');
                }
            }).catch(error => {
                console.error('Error calculating routes for comparison:', error);
                window.app.showNotification('❌ Error calculating alternative routes', 'error');
            });
        } else {
            window.app.showRouteComparison(window.app.availableRoutes);
        }
    }
}

function closeRouteComparison() {
    const panel = document.getElementById('routeComparisonPanel');
    if (panel) panel.remove();
}

async function selectRouteFromComparison(index) {
    if (window.app && window.app.availableRoutes && window.app.availableRoutes[index]) {
        await window.app.selectRoute(window.app.availableRoutes[index], index);
        closeRouteComparison();
        window.app.showNotification('✅ Route selected from comparison', 'success');
    }
}

async function selectBestRoute() {
    if (window.app && window.app.availableRoutes && window.app.availableRoutes.length > 0) {
        // Select the route with the highest score
        let bestRoute = window.app.availableRoutes[0];
        let bestIndex = 0;
        let bestScore = window.app.getRouteScore(bestRoute);

        window.app.availableRoutes.forEach((route, index) => {
            const score = window.app.getRouteScore(route);
            if (score > bestScore) {
                bestScore = score;
                bestRoute = route;
                bestIndex = index;
            }
        });

        await window.app.selectRoute(bestRoute, bestIndex);
        closeRouteComparison();
        window.app.showNotification(`🏆 Best route selected (Score: ${bestScore}%)`, 'success');
    }
}

function showGamificationStats() {
    if (window.app && window.app.showGamificationPanel) {
        window.app.showGamificationPanel();
    } else {
        console.error('❌ App not ready yet');
    }
}

function closeGamificationPanel() {
    const panel = document.getElementById('gamificationPanel');
    if (panel) panel.remove();
}

function resetGamificationStats() {
    if (window.app && confirm('Are you sure you want to reset all your stats and achievements? This cannot be undone.')) {
        localStorage.removeItem('vibeVoyage_userStats');
        window.app.initGamificationSystem();
        window.app.showGamificationPanel();
        window.app.showNotification('🔄 Stats reset successfully!', 'info');
    }
}

function showLanguageSelector() {
    if (window.app && window.app.showLanguagePanel) {
        window.app.showLanguagePanel();
    } else {
        console.error('❌ App not ready yet');
    }
}

function changeLanguage(language) {
    if (window.app && window.app.changeLanguage) {
        window.app.changeLanguage(language);
        closeLanguagePanel();
    }
}

function closeLanguagePanel() {
    const panel = document.getElementById('languagePanel');
    if (panel) panel.remove();
}

function updateHazardAvoidanceSettings() {
    if (window.app && window.app.updateHazardAvoidanceSettings) {
        window.app.updateHazardAvoidanceSettings();
    } else {
        console.error('❌ App not ready yet');
    }
}

// Global functions for button clicks
function toggleHazardSettings() {
    if (window.app && window.app.toggleHazardSettings) {
        window.app.toggleHazardSettings();
    } else {
        console.error('❌ App not ready yet - toggleHazardSettings');
    }
}

// Transport Mode Selection
function selectTransportMode(mode) {
    console.log(`🚶🚴🚗 Selecting transport mode: ${mode}`);

    if (!window.app || !window.app.transportModes[mode]) {
        console.error('❌ Invalid transport mode or app not ready:', mode);
        return;
    }

    // Update app transport mode
    window.app.transportMode = mode;
    const modeConfig = window.app.transportModes[mode];

    // Update UI - remove active class from all buttons
    document.querySelectorAll('.transport-mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Add active class to selected button
    const selectedBtn = document.querySelector(`[data-mode="${mode}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }

    // Update navigate button
    const navigateBtn = document.getElementById('navigateBtn');
    const navigateBtnIcon = document.getElementById('navigateBtnIcon');
    const navigateBtnText = document.getElementById('navigateBtnText');

    if (navigateBtnIcon && navigateBtnText) {
        navigateBtnIcon.textContent = modeConfig.icon;
        navigateBtnText.textContent = `Start ${modeConfig.name === 'Drive' ? 'Navigation' : modeConfig.name + 'ing'}`;
    }

    // Show notification
    window.app.showNotification(`${modeConfig.icon} ${modeConfig.name} mode selected - ${modeConfig.description}`, 'info');

    // If there's an existing route, recalculate with new mode
    if (window.app.currentLocation && window.app.destination) {
        console.log('🔄 Recalculating route with new transport mode...');
        window.app.calculateRoute().catch(error => {
            console.error('Error recalculating route:', error);
        });
    }

    console.log(`✅ Transport mode changed to: ${mode} (${modeConfig.profile})`);
}

// ===== OFFLINE FUNCTIONALITY =====

// Initialize offline detection and management
function initOfflineDetection() {
    if (!window.app) return;

    // Listen for online/offline events
    window.addEventListener('online', () => {
        console.log('📶 Connection restored - going online');
        window.app.handleOnlineEvent();
    });

    window.addEventListener('offline', () => {
        console.log('📵 Connection lost - going offline');
        window.app.handleOfflineEvent();
    });

    // Check initial connection status
    window.app.isOffline = !navigator.onLine;
    if (window.app.isOffline) {
        window.app.handleOfflineEvent();
    }

    console.log('📱 Offline detection initialized, currently:', navigator.onLine ? 'online' : 'offline');
}



// Test function for notifications
function testNotifications() {
    if (window.app && window.app.showNotification) {
        window.app.showNotification('🧪 Test notification - Success!', 'success');
        setTimeout(() => window.app.showNotification('🧪 Test notification - Info!', 'info'), 1000);
        setTimeout(() => window.app.showNotification('🧪 Test notification - Warning!', 'warning'), 2000);
        setTimeout(() => window.app.showNotification('🧪 Test notification - Error!', 'error'), 3000);
    } else {
        console.error('❌ App not ready for notification test');
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

async function selectRouteForJourney() {
    try {
        if (app && app.availableRoutes && app.availableRoutes.length > 0) {
            const selectedRoute = app.availableRoutes[app.selectedRouteIndex || 0];
            if (selectedRoute) {
                console.log('🎯 Selecting route for journey:', selectedRoute.type);
                await app.selectRoute(selectedRoute, app.selectedRouteIndex || 0);
                hideRouteSelection();
                app.showNotification('✅ Route selected successfully', 'success');
            } else {
                console.error('❌ Selected route is undefined');
                app.showNotification('❌ Route selection failed', 'error');
            }
        } else {
            console.error('❌ No routes available for selection');
            app.showNotification('❌ No routes available', 'error');
        }
    } catch (error) {
        console.error('❌ Error selecting route for journey:', error);
        app.showNotification('❌ Route selection failed', 'error');
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
        // Check if app is already initialized
        if (window.app && window.app.mapInitialized) {
            console.log('✅ VibeVoyage already initialized, returning existing instance');
            return window.app;
        }

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

            // Set global flags for diagnostics
            window.vibeVoyageLoaded = true;
            window.vibeVoyageLoading = false;

            // Ensure map is visible after initialization
            setTimeout(() => {
                if (window.app.map && window.app.map._container) {
                    window.app.map.invalidateSize();
                    console.log('🗺️ Map size refreshed for visibility');
                }
            }, 1000);

            return window.app; // Return the app instance
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
        return null; // Return null on error
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
console.log('✅ initializeVibeVoyage assigned to window object');

console.log('🚀 VibeVoyage PWA Loaded!');
console.log('🔍 Final check - VibeVoyageApp available:', typeof VibeVoyageApp !== 'undefined');
console.log('🔍 Final check - window.VibeVoyageApp available:', typeof window.VibeVoyageApp !== 'undefined');
console.log('🔍 Final check - initializeVibeVoyage available:', typeof initializeVibeVoyage !== 'undefined');
