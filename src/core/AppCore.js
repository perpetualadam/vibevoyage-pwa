/**
 * VibeVoyage Core Application Class
 * Main application controller that coordinates all modules
 */
class AppCore {
    constructor() {
        console.log('🌟 VibeVoyage Core Initializing...');
        
        // Core state
        this.isInitialized = false;
        this.currentLocation = null;
        this.destination = null;
        this.isNavigating = false;
        this.journeyState = 'idle';
        
        // Module instances
        this.mapManager = null;
        this.navigationManager = null;
        this.routeManager = null;
        this.locationManager = null;
        this.uiManager = null;
        this.settingsManager = null;
        this.gamificationManager = null;
        this.languageManager = null;
        this.hazardManager = null;
        
        // Event system
        this.eventListeners = new Map();
        
        this.initializeModules();
    }

    /**
     * Initialize all application modules
     */
    async initializeModules() {
        try {
            console.log('🔧 Initializing application modules...');
            
            // Initialize core modules in order
            this.settingsManager = new SettingsManager();
            this.languageManager = new LanguageManager();
            this.mapManager = new MapManager();
            this.locationManager = new LocationManager();
            this.routeManager = new RouteManager();
            this.navigationManager = new NavigationManager();
            this.uiManager = new UIManager();
            this.gamificationManager = new GamificationManager();
            this.hazardManager = new HazardManager();
            
            // Set up inter-module communication
            this.setupModuleCommunication();
            
            // Initialize modules
            await this.settingsManager.initialize();
            await this.languageManager.initialize();
            await this.mapManager.initialize();
            await this.locationManager.initialize();
            await this.routeManager.initialize();
            await this.navigationManager.initialize();
            await this.uiManager.initialize();
            await this.gamificationManager.initialize();
            await this.hazardManager.initialize();
            
            this.isInitialized = true;
            console.log('✅ All modules initialized successfully');
            
            // Emit initialization complete event
            this.emit('app:initialized');
            
        } catch (error) {
            console.error('❌ Module initialization failed:', error);
            throw error;
        }
    }

    /**
     * Set up communication between modules
     */
    setupModuleCommunication() {
        // Location updates
        this.locationManager.on('location:updated', (location) => {
            this.currentLocation = location;
            this.mapManager.updateCurrentLocation(location);
            this.navigationManager.updateLocation(location);
            this.emit('location:changed', location);
        });

        // Route events
        this.routeManager.on('route:calculated', (route) => {
            this.mapManager.displayRoute(route);
            this.emit('route:ready', route);
        });

        // Navigation events
        this.navigationManager.on('navigation:started', () => {
            this.isNavigating = true;
            this.journeyState = 'navigating';
            this.gamificationManager.startTrip();
            this.emit('navigation:started');
        });

        this.navigationManager.on('navigation:stopped', (tripData) => {
            this.isNavigating = false;
            this.journeyState = 'idle';
            this.gamificationManager.endTrip(tripData);
            this.emit('navigation:stopped');
        });

        // UI events
        this.uiManager.on('destination:selected', (destination) => {
            this.setDestination(destination);
        });

        this.uiManager.on('navigation:start', () => {
            this.startNavigation();
        });

        this.uiManager.on('navigation:stop', () => {
            this.stopNavigation();
        });
    }

    /**
     * Event system methods
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Core application methods
     */
    async setDestination(destination) {
        this.destination = destination;
        this.emit('destination:set', destination);
        
        if (this.currentLocation) {
            await this.calculateRoute();
        }
    }

    async calculateRoute() {
        if (!this.currentLocation || !this.destination) {
            throw new Error('Missing location or destination');
        }

        try {
            const route = await this.routeManager.calculateRoute(
                this.currentLocation,
                this.destination
            );
            return route;
        } catch (error) {
            console.error('Route calculation failed:', error);
            throw error;
        }
    }

    async startNavigation() {
        if (!this.destination) {
            throw new Error('No destination set');
        }

        try {
            await this.navigationManager.startNavigation(
                this.currentLocation,
                this.destination
            );
        } catch (error) {
            console.error('Navigation start failed:', error);
            throw error;
        }
    }

    stopNavigation() {
        this.navigationManager.stopNavigation();
    }

    /**
     * Get current application state
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            currentLocation: this.currentLocation,
            destination: this.destination,
            isNavigating: this.isNavigating,
            journeyState: this.journeyState
        };
    }

    /**
     * Cleanup method
     */
    destroy() {
        console.log('🧹 Cleaning up application...');
        
        // Cleanup all modules
        if (this.mapManager) this.mapManager.destroy();
        if (this.navigationManager) this.navigationManager.destroy();
        if (this.routeManager) this.routeManager.destroy();
        if (this.locationManager) this.locationManager.destroy();
        if (this.uiManager) this.uiManager.destroy();
        if (this.settingsManager) this.settingsManager.destroy();
        if (this.gamificationManager) this.gamificationManager.destroy();
        if (this.languageManager) this.languageManager.destroy();
        if (this.hazardManager) this.hazardManager.destroy();
        
        // Clear event listeners
        this.eventListeners.clear();
        
        console.log('✅ Application cleanup complete');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppCore;
} else {
    window.AppCore = AppCore;
}
