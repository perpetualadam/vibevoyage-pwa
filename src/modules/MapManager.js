/**
 * Map Manager Module
 * Handles all map-related functionality including initialization, markers, and layers
 */
class MapManager extends BaseModule {
    constructor() {
        super('MapManager');
        
        // Map instance and layers
        this.map = null;
        this.tileLayer = null;
        this.markersLayer = null;
        this.routeLayer = null;
        this.hazardsLayer = null;
        this.vehicleLayer = null;
        
        // Markers
        this.currentLocationMarker = null;
        this.destinationMarker = null;
        this.carMarker = null;
        
        // Map state
        this.isMapReady = false;
        this.followMode = false;
        this.mapContainer = null;
    }

    async initialize() {
        await super.initialize();
        
        try {
            await this.initializeMap();
            this.setupEventHandlers();
            this.isMapReady = true;
            this.emit('map:ready');
        } catch (error) {
            this.handleError(error, 'Map initialization failed');
            throw error;
        }
    }

    async initializeMap() {
        this.log('Initializing Leaflet map...');
        
        // Get map container
        this.mapContainer = document.getElementById('map');
        if (!this.mapContainer) {
            throw new Error('Map container not found');
        }

        // Clean up any existing map
        await this.cleanupExistingMap();

        // Create new map instance
        this.map = L.map('map', {
            center: [40.7128, -74.0060], // Default to NYC
            zoom: 13,
            zoomControl: false,
            attributionControl: false,
            tap: true,
            tapTolerance: 15,
            touchZoom: true,
            doubleClickZoom: true,
            scrollWheelZoom: 'center',
            boxZoom: false,
            keyboard: true,
            dragging: true,
            maxZoom: 20,
            minZoom: 3
        });

        if (!this.map) {
            throw new Error('Failed to create Leaflet map instance');
        }

        // Add tile layer
        this.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 20,
            crossOrigin: true
        }).addTo(this.map);

        // Initialize layers
        this.initializeLayers();

        // Set up map event handlers
        this.setupMapEvents();

        this.log('Map initialized successfully', 'success');
    }

    async cleanupExistingMap() {
        if (this.map) {
            try {
                this.map.remove();
                this.map = null;
            } catch (error) {
                this.log('Error removing existing map', 'warning');
            }
        }

        // Clean container
        if (this.mapContainer) {
            this.mapContainer.innerHTML = '';
            Object.keys(this.mapContainer).forEach(key => {
                if (key.startsWith('_leaflet')) {
                    delete this.mapContainer[key];
                }
            });
        }
    }

    initializeLayers() {
        this.markersLayer = L.layerGroup().addTo(this.map);
        this.routeLayer = L.layerGroup().addTo(this.map);
        this.hazardsLayer = L.layerGroup().addTo(this.map);
        this.vehicleLayer = L.layerGroup().addTo(this.map);
        
        this.log('Map layers initialized', 'success');
    }

    setupMapEvents() {
        this.map.on('click', (e) => {
            this.emit('map:clicked', e.latlng);
        });

        this.map.on('moveend', () => {
            this.emit('map:moved', {
                center: this.map.getCenter(),
                zoom: this.map.getZoom()
            });
        });

        this.map.on('zoomend', () => {
            this.emit('map:zoomed', this.map.getZoom());
        });
    }

    setupEventHandlers() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.invalidateSize();
        });
    }

    /**
     * Map control methods
     */
    invalidateSize() {
        if (this.map) {
            setTimeout(() => {
                this.map.invalidateSize();
            }, 100);
        }
    }

    setView(location, zoom = 15) {
        this.validateLocation(location);
        if (this.map) {
            this.map.setView([location.lat, location.lng], zoom);
        }
    }

    fitBounds(bounds) {
        if (this.map && bounds) {
            this.map.fitBounds(bounds);
        }
    }

    /**
     * Marker management
     */
    updateCurrentLocation(location) {
        this.validateLocation(location);
        
        if (this.currentLocationMarker) {
            this.markersLayer.removeLayer(this.currentLocationMarker);
        }

        this.currentLocationMarker = L.marker([location.lat, location.lng], {
            icon: this.createLocationIcon()
        }).addTo(this.markersLayer);

        if (this.followMode) {
            this.setView(location);
        }

        this.emit('location:marker:updated', location);
    }

    setDestinationMarker(location) {
        this.validateLocation(location);
        
        if (this.destinationMarker) {
            this.markersLayer.removeLayer(this.destinationMarker);
        }

        this.destinationMarker = L.marker([location.lat, location.lng], {
            icon: this.createDestinationIcon()
        }).addTo(this.markersLayer);

        this.emit('destination:marker:set', location);
    }

    updateVehicleMarker(location, heading = 0) {
        this.validateLocation(location);
        
        if (this.carMarker) {
            this.vehicleLayer.removeLayer(this.carMarker);
        }

        this.carMarker = L.marker([location.lat, location.lng], {
            icon: this.createVehicleIcon(heading),
            rotationAngle: heading
        }).addTo(this.vehicleLayer);
    }

    /**
     * Route display
     */
    displayRoute(route) {
        this.clearRoutes();
        
        if (!route || !route.geometry) {
            this.log('Invalid route data', 'warning');
            return;
        }

        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        
        const routeLine = L.polyline(coordinates, {
            color: '#00FF88',
            weight: 6,
            opacity: 0.8
        }).addTo(this.routeLayer);

        // Fit map to route
        this.fitBounds(routeLine.getBounds());
        
        this.emit('route:displayed', route);
    }

    clearRoutes() {
        if (this.routeLayer) {
            this.routeLayer.clearLayers();
        }
    }

    /**
     * Icon creation methods
     */
    createLocationIcon() {
        return L.divIcon({
            className: 'current-location-marker',
            html: '<div class="location-pulse"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
    }

    createDestinationIcon() {
        return L.divIcon({
            className: 'destination-marker',
            html: '🎯',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
    }

    createVehicleIcon(heading = 0) {
        return L.divIcon({
            className: 'vehicle-marker',
            html: `<div style="transform: rotate(${heading}deg);">🚗</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
    }

    /**
     * Utility methods
     */
    isReady() {
        return this.isMapReady && this.map !== null;
    }

    getCenter() {
        return this.map ? this.map.getCenter() : null;
    }

    getZoom() {
        return this.map ? this.map.getZoom() : 13;
    }

    setFollowMode(enabled) {
        this.followMode = enabled;
        this.emit('follow:mode:changed', enabled);
    }

    destroy() {
        this.cleanupExistingMap();
        super.destroy();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapManager;
} else {
    window.MapManager = MapManager;
}
