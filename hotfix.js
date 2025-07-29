/**
 * VibeVoyage Hotfix - Direct Browser Memory Patch
 * This script directly patches the problematic function in the browser's memory
 */

console.log('🔧 HOTFIX: Loading direct browser memory patch...');

// Wait for the page to load
function applyHotfix() {
    console.log('🔧 HOTFIX: Applying direct memory patch...');
    
    // Check if VibeVoyageApp exists in any form
    if (typeof VibeVoyageApp !== 'undefined') {
        console.log('✅ HOTFIX: Found VibeVoyageApp class, patching recenterMap...');
        
        // Patch the recenterMap function directly
        VibeVoyageApp.prototype.recenterMap = async function() {
            console.log('🎯 Recentering map... [HOTFIX PATCHED VERSION]');
            console.log('🔧 This function has been PATCHED to be async!');

            if (!this.map) {
                console.log('❌ Map not initialized');
                this.showNotification && this.showNotification('Map not ready', 'warning');
                return;
            }

            // If we have a current location, center on it
            if (this.currentLocation) {
                console.log('📍 Centering on current location:', this.currentLocation);
                this.map.setView([this.currentLocation.lat, this.currentLocation.lng], 15, {
                    animate: true,
                    duration: 0.5
                });
                this.showNotification && this.showNotification('🎯 Map recentered on your location', 'success');
                this.addVoiceLogEntry && this.addVoiceLogEntry('Map recentered on current location');
            }
            // If we have a destination but no current location, center on destination
            else if (this.destination) {
                console.log('🎯 Centering on destination:', this.destination);
                this.map.setView([this.destination.lat, this.destination.lng], 15, {
                    animate: true,
                    duration: 0.5
                });
                this.showNotification && this.showNotification('🎯 Map centered on destination', 'info');
            }
            // If we have a route, fit the route bounds
            else if (this.currentRoute && this.currentRoute.coordinates) {
                console.log('🗺️ Fitting route bounds');
                const bounds = L.latLngBounds(this.currentRoute.coordinates);
                this.map.fitBounds(bounds, { padding: [20, 20] });
                this.showNotification && this.showNotification('🎯 Map centered on route', 'info');
            }
            // Default to intelligent location
            else {
                console.log('🌍 Centering on intelligent default location');
                try {
                    const defaultLoc = await this.getDefaultLocation();
                    this.map.setView([defaultLoc.lat, defaultLoc.lng], 10, {
                        animate: true,
                        duration: 0.5
                    });
                    this.showNotification && this.showNotification(`🎯 Map centered on ${defaultLoc.name || 'default location'}`, 'info');
                } catch (error) {
                    console.error('❌ Error getting default location:', error);
                    // Fallback to Sheffield, UK
                    this.map.setView([53.3811, -1.4701], 10, {
                        animate: true,
                        duration: 0.5
                    });
                    this.showNotification && this.showNotification('🎯 Map centered on default location', 'info');
                }
            }
        };
        
        console.log('✅ HOTFIX: recenterMap function patched successfully!');
        
        // Also patch any existing app instance
        if (window.app && window.app.recenterMap) {
            window.app.recenterMap = VibeVoyageApp.prototype.recenterMap.bind(window.app);
            console.log('✅ HOTFIX: Existing app instance patched!');
        }
        
    } else {
        console.log('⚠️ HOTFIX: VibeVoyageApp class not found, will retry...');
        
        // Try to create a minimal working version
        window.VibeVoyageApp = class VibeVoyageApp {
            constructor() {
                console.log('🚀 HOTFIX: Creating minimal VibeVoyageApp...');
                this.map = null;
                this.currentLocation = null;
                this.destination = null;
                this.currentRoute = null;
                this.isNavigating = false;
                this.followMode = true;
            }
            
            async recenterMap() {
                console.log('🎯 HOTFIX: Minimal recenterMap called');
                if (this.map) {
                    this.map.setView([53.3811, -1.4701], 10);
                }
            }
            
            showNotification(message, type) {
                console.log(`📢 ${type}: ${message}`);
            }
            
            async getDefaultLocation() {
                return { lat: 53.3811, lng: -1.4701, name: 'Sheffield, UK' };
            }
        };
        
        // Create a minimal app instance
        if (!window.app) {
            window.app = new window.VibeVoyageApp();
            console.log('✅ HOTFIX: Minimal app instance created!');
        }
        
        // Create minimal initialization function
        window.initializeVibeVoyage = function() {
            console.log('🚀 HOTFIX: Minimal initialization...');
            if (!window.app) {
                window.app = new window.VibeVoyageApp();
            }
            return window.app;
        };
        
        console.log('✅ HOTFIX: Minimal VibeVoyageApp created!');
    }
}

// Apply the hotfix immediately if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyHotfix);
} else {
    applyHotfix();
}

// Also try applying after a delay to catch late-loading scripts
setTimeout(applyHotfix, 1000);
setTimeout(applyHotfix, 3000);
setTimeout(applyHotfix, 5000);

console.log('🔧 HOTFIX: Script loaded and scheduled!');
