/**
 * VibeVoyage Application - Refactored Version
 * Main application entry point using modular architecture
 */
class VibeVoyageApp {
    constructor() {
        console.log('🚀 VibeVoyage Application Starting...');
        
        // Core application instance
        this.app = null;
        this.moduleLoader = null;
        
        // Application state
        this.isInitialized = false;
        this.initializationPromise = null;
        
        // Legacy compatibility
        this.setupLegacyCompatibility();
    }

    /**
     * Initialize the application
     */
    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this.doInitialize();
        return this.initializationPromise;
    }

    async doInitialize() {
        try {
            console.log('🔧 Initializing VibeVoyage modules...');
            
            // Load base module first
            await this.loadBaseModule();
            
            // Initialize module loader
            this.moduleLoader = new ModuleLoader();
            
            // Validate dependencies
            const depErrors = this.moduleLoader.validateDependencies();
            if (depErrors.length > 0) {
                console.warn('⚠️ Dependency validation warnings:', depErrors);
            }
            
            // Initialize core application
            this.app = new AppCore();
            
            // Wait for app initialization
            await new Promise((resolve, reject) => {
                this.app.on('app:initialized', resolve);
                this.app.on('error', reject);
                
                // Timeout after 30 seconds
                setTimeout(() => reject(new Error('Initialization timeout')), 30000);
            });
            
            this.isInitialized = true;
            console.log('✅ VibeVoyage initialized successfully');
            
            // Set up global access
            this.setupGlobalAccess();
            
            // Emit ready event
            this.emit('app:ready');
            
        } catch (error) {
            console.error('❌ VibeVoyage initialization failed:', error);
            this.handleInitializationError(error);
            throw error;
        }
    }

    async loadBaseModule() {
        // Ensure BaseModule is available
        if (typeof BaseModule === 'undefined') {
            try {
                // Try to load BaseModule
                if (typeof window !== 'undefined') {
                    await this.loadScript('./src/core/BaseModule.js');
                }
            } catch (error) {
                console.error('Failed to load BaseModule:', error);
                throw new Error('BaseModule is required but not available');
            }
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    handleInitializationError(error) {
        // Show user-friendly error message
        this.showErrorMessage('Failed to initialize VibeVoyage. Please refresh the page.');
        
        // Log detailed error for debugging
        console.error('Initialization error details:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }

    showErrorMessage(message) {
        // Create error display
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
            z-index: 10000;
            text-align: center;
            max-width: 400px;
        `;
        errorDiv.innerHTML = `
            <h3>⚠️ Initialization Error</h3>
            <p>${message}</p>
            <button onclick="location.reload()" style="
                background: white;
                color: #FF6B6B;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
            ">Refresh Page</button>
        `;
        document.body.appendChild(errorDiv);
    }

    /**
     * Legacy compatibility layer
     */
    setupLegacyCompatibility() {
        // Map old method names to new ones for backward compatibility
        this.legacyMethods = {
            'getCurrentLocation': () => this.app?.locationManager?.getCurrentLocation(),
            'setDestination': (dest) => this.app?.setDestination(dest),
            'startNavigation': () => this.app?.startNavigation(),
            'stopNavigation': () => this.app?.stopNavigation(),
            'calculateRoute': () => this.app?.calculateRoute(),
            'showNotification': (msg, type) => this.app?.uiManager?.showNotification(msg, type)
        };
    }

    setupGlobalAccess() {
        // Make app accessible globally for legacy code
        if (typeof window !== 'undefined') {
            window.app = this;
            window.vibeVoyage = this;
            
            // Legacy global functions
            window.getCurrentLocation = () => this.getCurrentLocation();
            window.startNavigation = () => this.startNavigation();
            window.stopNavigation = () => this.stopNavigation();
        }
    }

    /**
     * Public API methods
     */
    getCurrentLocation() {
        return this.app?.locationManager?.getCurrentLocation() || null;
    }

    async setDestination(destination) {
        if (!this.isInitialized) {
            throw new Error('App not initialized');
        }
        return this.app.setDestination(destination);
    }

    async startNavigation() {
        if (!this.isInitialized) {
            throw new Error('App not initialized');
        }
        return this.app.startNavigation();
    }

    stopNavigation() {
        if (!this.isInitialized) {
            return;
        }
        this.app.stopNavigation();
    }

    async calculateRoute() {
        if (!this.isInitialized) {
            throw new Error('App not initialized');
        }
        return this.app.calculateRoute();
    }

    showNotification(message, type = 'info') {
        if (this.app?.uiManager) {
            return this.app.uiManager.showNotification(message, type);
        }
    }

    /**
     * Settings access
     */
    getSetting(category, key) {
        return this.app?.settingsManager?.getSetting(category, key);
    }

    setSetting(category, key, value) {
        return this.app?.settingsManager?.setSetting(category, key, value);
    }

    /**
     * Module access
     */
    getModule(moduleName) {
        return this.moduleLoader?.getLoadedModule(moduleName);
    }

    /**
     * Application state
     */
    getState() {
        if (!this.isInitialized) {
            return { initialized: false };
        }
        
        return {
            initialized: true,
            ...this.app.getState(),
            modules: this.moduleLoader?.getLoadedModules() || []
        };
    }

    isReady() {
        return this.isInitialized;
    }

    /**
     * Event system
     */
    on(event, callback) {
        if (this.app) {
            this.app.on(event, callback);
        }
    }

    emit(event, data) {
        if (this.app) {
            this.app.emit(event, data);
        }
    }

    /**
     * Development helpers
     */
    getModuleHealth() {
        return this.moduleLoader?.checkModuleHealth();
    }

    getDependencyGraph() {
        return this.moduleLoader?.getDependencyGraph();
    }

    /**
     * Cleanup
     */
    destroy() {
        console.log('🧹 Destroying VibeVoyage application...');
        
        if (this.app) {
            this.app.destroy();
            this.app = null;
        }
        
        if (this.moduleLoader) {
            this.moduleLoader.unloadAllModules();
            this.moduleLoader = null;
        }
        
        this.isInitialized = false;
        this.initializationPromise = null;
        
        // Clean up global references
        if (typeof window !== 'undefined') {
            delete window.app;
            delete window.vibeVoyage;
        }
        
        console.log('✅ VibeVoyage cleanup complete');
    }
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            console.log('🌟 DOM loaded, initializing VibeVoyage...');
            window.vibeVoyageApp = new VibeVoyageApp();
            await window.vibeVoyageApp.initialize();
        } catch (error) {
            console.error('❌ Failed to auto-initialize VibeVoyage:', error);
        }
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VibeVoyageApp;
} else if (typeof window !== 'undefined') {
    window.VibeVoyageApp = VibeVoyageApp;
}
