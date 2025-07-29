/**
 * VibeVoyage PWA - Smart Navigation Application (FIXED VERSION)
 * This is a temporary fix to bypass browser caching issues
 */

// Debug: File loading check - CACHE BUSTER
console.log('🔄 App-Fixed.js file is loading... Version: 2025.01.29-FIXED', new Date().toISOString());
console.log('🔧 CACHE BUSTER: This is the FIXED version of the file!');
console.log('🔧 If you see this message, the new file is loading correctly!');

class VibeVoyageApp {
    constructor() {
        console.log('🚀 VibeVoyageApp constructor called - FIXED VERSION');
        
        // Initialize core properties
        this.map = null;
        this.currentLocation = null;
        this.destination = null;
        this.currentRoute = null;
        this.isNavigating = false;
        this.followMode = true;
        
        // Initialize the app
        this.init();
    }

    async init() {
        console.log('🚀 Initializing VibeVoyage... FIXED VERSION');
        
        try {
            // Initialize map
            await this.initLeafletMap();
            
            // Get current location
            await this.getCurrentLocation();
            
            console.log('✅ VibeVoyage app initialized successfully - FIXED VERSION');
        } catch (error) {
            console.error('❌ Error initializing VibeVoyage:', error);
        }
    }

    async initLeafletMap() {
        console.log('🗺️ Initializing Leaflet map...');
        
        // Initialize map with default location
        const defaultLoc = await this.getDefaultLocation();
        
        this.map = L.map('map').setView([defaultLoc.lat, defaultLoc.lng], 13);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        console.log('✅ Map initialized successfully');
    }

    async getCurrentLocation() {
        console.log('📍 Getting current location...');
        
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                console.warn('⚠️ Geolocation not supported');
                resolve(this.getDefaultLocation());
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    console.log('✅ Current location obtained:', this.currentLocation);
                    resolve(this.currentLocation);
                },
                (error) => {
                    console.warn('⚠️ Geolocation error:', error);
                    resolve(this.getDefaultLocation());
                }
            );
        });
    }

    async getDefaultLocation() {
        // Default to Sheffield, UK
        return {
            lat: 53.3811,
            lng: -1.4701,
            name: 'Sheffield, UK'
        };
    }

    // FIXED: This function is properly declared as async
    async recenterMap() {
        console.log('🎯 Recentering map... [FIXED VERSION - ASYNC FUNCTION]');
        console.log('🔧 This function is properly declared as ASYNC!');

        if (!this.map) {
            console.log('❌ Map not initialized');
            return;
        }

        // If we have a current location, center on it
        if (this.currentLocation) {
            console.log('📍 Centering on current location:', this.currentLocation);
            this.map.setView([this.currentLocation.lat, this.currentLocation.lng], 15, {
                animate: true,
                duration: 0.5
            });
        }
        // Default to intelligent location
        else {
            console.log('🌍 Centering on intelligent default location');
            const defaultLoc = await this.getDefaultLocation(); // This await is now properly in an async function
            this.map.setView([defaultLoc.lat, defaultLoc.lng], 10, {
                animate: true,
                duration: 0.5
            });
        }
    }

    showNotification(message, type = 'info') {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
    }
}

// Debug: Class definition complete
console.log('✅ VibeVoyageApp class defined successfully - FIXED VERSION');

// Make VibeVoyageApp available globally
window.VibeVoyageApp = VibeVoyageApp;
console.log('✅ VibeVoyageApp assigned to window object - FIXED VERSION');

// Initialize the app
function initializeVibeVoyage() {
    console.log('🚀 Initializing VibeVoyage... FIXED VERSION');
    
    if (typeof VibeVoyageApp === 'undefined') {
        console.error('❌ VibeVoyageApp class not found');
        return;
    }
    
    try {
        window.app = new VibeVoyageApp();
        console.log('✅ VibeVoyage app initialized successfully - FIXED VERSION');
        console.log('✅ App is accessible via window.app');
    } catch (error) {
        console.error('❌ Error initializing VibeVoyage:', error);
    }
}

// Manual initialization function for debugging
window.initializeVibeVoyage = initializeVibeVoyage;
console.log('✅ initializeVibeVoyage assigned to window object - FIXED VERSION');

console.log('🚀 VibeVoyage PWA Loaded! - FIXED VERSION');
console.log('🔍 Final check - VibeVoyageApp available:', typeof VibeVoyageApp !== 'undefined');
console.log('🔍 Final check - window.VibeVoyageApp available:', typeof window.VibeVoyageApp !== 'undefined');
console.log('🔍 Final check - initializeVibeVoyage available:', typeof initializeVibeVoyage !== 'undefined');

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeVibeVoyage);
} else {
    initializeVibeVoyage();
}
