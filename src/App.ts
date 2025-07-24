/**
 * VibeVoyage PWA - Smart Navigation Application
 * TypeScript implementation for better type safety and reduced issues
 */

class VibeVoyageApp {
    // Core properties with proper typing
    public map: any = null;
    public currentLocation: Location | null = null;
    public destination: Location | null = null;
    public routeData: RouteData | null = null;
    public currentRoute: RouteData | null = null;
    public isNavigating: boolean = false;
    public followMode: boolean = true;
    public currentMapType: string = 'street';
    
    // Map layers
    private tileLayer: any = null;
    private markersLayer: any = null;
    private routeLayer: any = null;
    private hazardsLayer: any = null;
    private vehicleLayer: any = null;
    private vehicleMarker: any = null;
    private currentRouteLine: any = null;
    
    // Navigation properties
    private watchId: number | null = null;
    private routeSteps: RouteStep[] = [];
    private currentStepIndex: number = 0;
    private routeProgress: RouteProgress | null = null;
    private offRouteTimeout: number | null = null;
    
    // Unit measurement system with proper typing
    public units: Units = {
        distance: 'metric',
        speed: 'kmh', 
        temperature: 'celsius',
        fuel: 'liters',
        pressure: 'bar'
    };
    
    // Currency and location system with proper typing
    public userCountry: string | null = null;
    public userCurrency: string = 'USD';
    public fuelPrices: Record<string, FuelPriceData> = {
        'US': { currency: 'USD', symbol: '$', price: 3.45 },
        'GB': { currency: 'GBP', symbol: '£', price: 1.48 },
        'CA': { currency: 'CAD', symbol: 'C$', price: 1.65 },
        'AU': { currency: 'AUD', symbol: 'A$', price: 1.85 },
        'DE': { currency: 'EUR', symbol: '€', price: 1.75 },
        'FR': { currency: 'EUR', symbol: '€', price: 1.82 },
        'JP': { currency: 'JPY', symbol: '¥', price: 165 },
        'DEFAULT': { currency: 'USD', symbol: '$', price: 1.50 }
    };

    constructor() {
        console.log('🌟 VibeVoyage PWA Initializing...');
        this.init();
    }
    
    public async init(): Promise<void> {
        console.log('🌟 VibeVoyage PWA Starting...');
        
        // Initialize map
        this.initMap();
        
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
        
        console.log('✅ VibeVoyage PWA Ready!');
        this.showNotification('Welcome to VibeVoyage! 🚗', 'success');
    }
    
    public initMap(): void {
        console.log('🗺️ Initializing map...');

        // Check if Leaflet is available
        if (typeof L === 'undefined') {
            console.error('❌ Leaflet library not loaded');
            console.log('🔍 Checking if Leaflet script is in DOM...');
            const leafletScript = document.querySelector('script[src*="leaflet"]');
            console.log('📜 Leaflet script found:', !!leafletScript);
            this.showMapPlaceholder();
            return;
        }

        // Check if map container exists
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error('❌ Map container not found');
            console.log('🔍 Available elements with "map" in ID:', 
                Array.from(document.querySelectorAll('[id*="map"]')).map(el => el.id));
            return;
        }
        
        console.log('✅ Map container found:', mapContainer);
        console.log('📐 Map container dimensions:', {
            width: mapContainer.offsetWidth,
            height: mapContainer.offsetHeight,
            display: getComputedStyle(mapContainer).display
        });

        try {
            // Clear any existing content
            mapContainer.innerHTML = '';

            // Initialize Leaflet map with better options
            this.map = L.map('map', {
                center: [40.7128, -74.0060], // Default to NYC
                zoom: 13,
                zoomControl: false,
                attributionControl: false
            });

            // Add OpenStreetMap tiles
            this.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19,
                crossOrigin: true
            }).addTo(this.map);

            // Initialize map layers for different elements
            this.markersLayer = L.layerGroup().addTo(this.map);
            this.routeLayer = L.layerGroup().addTo(this.map);
            this.hazardsLayer = L.layerGroup().addTo(this.map);
            this.vehicleLayer = L.layerGroup().addTo(this.map);

            // Add click handler for destination selection
            this.map.on('click', (e: any) => {
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
                }
            }, 500);

            console.log('✅ Map initialized successfully');
        } catch (error) {
            console.error('❌ Map initialization failed:', error);
            this.showMapPlaceholder();
        }
    }
    
    private showMapPlaceholder(): void {
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.innerHTML = `
                <div class="map-placeholder">
                    <div class="icon">🗺️</div>
                    <div>Map Loading...</div>
                    <small>Click to retry if map doesn't load</small>
                    <button onclick="app.initMap()" class="btn btn-secondary" style="margin-top: 10px;">
                        🔄 Retry Map Load
                    </button>
                </div>
            `;
        }
    }

    public async getCurrentLocation(): Promise<void> {
        console.log('📍 Getting current location...');
        const statusElement = document.getElementById('locationStatus');

        if (!navigator.geolocation) {
            console.error('❌ Geolocation not supported');
            if (statusElement) {
                statusElement.textContent = 'Location not supported';
                statusElement.className = 'status-offline';
            }
            this.showNotification('Location services not available', 'error');
            return;
        }

        if (statusElement) {
            statusElement.textContent = 'Getting location...';
            statusElement.className = 'status-warning';
        }

        try {
            console.log('📍 Requesting location permission...');
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                });
            });

            const { latitude, longitude } = position.coords;
            this.currentLocation = { lat: latitude, lng: longitude };

            console.log(`✅ Location obtained: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            
            if (statusElement) {
                statusElement.textContent = 'Location active';
                statusElement.className = 'status-online';
            }

            // Update map view and add marker
            if (this.map) {
                this.map.setView([latitude, longitude], 15);
                this.updateCarPosition(latitude, longitude);
            }

            // Update from input with current location
            const fromInput = document.getElementById('fromInput') as HTMLInputElement;
            if (fromInput && !fromInput.value) {
                fromInput.placeholder = 'From: Current Location';
            }

            this.showNotification('📍 Location found!', 'success');

        } catch (error) {
            console.error('❌ Location error:', error);
            if (statusElement) {
                statusElement.textContent = 'Location unavailable';
                statusElement.className = 'status-offline';
            }
            this.showNotification('Could not get your location', 'error');
        }
    }

    public showNotification(message: string, type: NotificationType = 'info'): void {
        const notification = document.getElementById('notification');
        if (!notification) return;

        notification.textContent = message;
        notification.className = `notification ${type} show`;

        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // Placeholder methods - will be implemented in subsequent steps
    public setDestination(location: Location): void {
        this.destination = location;
        console.log('🎯 Destination set:', location);
    }

    public async calculateRoute(): Promise<void> {
        console.log('🗺️ Calculating route...');
        // Implementation will be added
    }

    public startNavigation(): void {
        console.log('🚗 Starting navigation...');
        this.isNavigating = true;
    }

    public stopNavigation(): void {
        console.log('🛑 Stopping navigation...');
        this.isNavigating = false;
    }

    public updateCarPosition(lat: number, lng: number, heading: number = 0): void {
        console.log(`🚗 Updating car position: ${lat}, ${lng}`);
        // Implementation will be added
    }

    public formatDistance(meters: number): string {
        return `${(meters / 1000).toFixed(1)} km`;
    }

    public formatSpeed(kmh: number): string {
        return `${kmh.toFixed(1)} km/h`;
    }

    public async handleAddressInput(inputType: string, query: string): Promise<void> {
        console.log(`🔍 Address input: ${inputType} - ${query}`);
        // Implementation will be added
    }

    public async detectUserCountry(): Promise<void> {
        console.log('🌍 Detecting user country...');
        // Implementation will be added
    }

    public updateUnitDisplays(): void {
        console.log('📏 Updating unit displays...');
        // Implementation will be added
    }

    private setupEventListeners(): void {
        console.log('🎧 Setting up event listeners...');
        // Implementation will be added
    }

    private setupMapInteractionHandlers(): void {
        console.log('🗺️ Setting up map interaction handlers...');
        // Implementation will be added
    }

    private updateConnectionStatus(): void {
        console.log('🌐 Checking connection status...');
        // Implementation will be added
    }

    private initServiceWorker(): void {
        console.log('⚙️ Initializing service worker...');
        // Implementation will be added
    }

    private loadUnitsFromStorage(): void {
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
}

// Make VibeVoyageApp available globally
(window as any).VibeVoyageApp = VibeVoyageApp;
