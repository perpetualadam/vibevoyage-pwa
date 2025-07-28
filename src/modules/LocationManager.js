/**
 * Location Manager Module
 * Handles geolocation, tracking, and location-related functionality
 */
class LocationManager extends BaseModule {
    constructor() {
        super('LocationManager');
        
        // Location state
        this.currentLocation = null;
        this.lastKnownLocation = null;
        this.isTracking = false;
        this.watchId = null;
        
        // Location settings
        this.trackingOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000
        };
        
        // Speed and movement tracking
        this.currentSpeed = 0;
        this.currentHeading = 0;
        this.locationHistory = [];
        this.maxHistorySize = 50;
    }

    async initialize() {
        await super.initialize();
        
        try {
            await this.checkGeolocationSupport();
            await this.getCurrentLocation();
            this.log('Location manager initialized successfully', 'success');
        } catch (error) {
            this.handleError(error, 'Location manager initialization failed');
        }
    }

    async checkGeolocationSupport() {
        if (!navigator.geolocation) {
            throw new Error('Geolocation is not supported by this browser');
        }
        
        // Check permissions
        try {
            const permission = await navigator.permissions.query({ name: 'geolocation' });
            this.log(`Geolocation permission: ${permission.state}`, 'info');
            
            if (permission.state === 'denied') {
                throw new Error('Geolocation permission denied');
            }
        } catch (error) {
            this.log('Could not check geolocation permissions', 'warning');
        }
    }

    async getCurrentLocation() {
        this.log('Getting current location...');
        
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = this.processPosition(position);
                    this.currentLocation = location;
                    this.addToHistory(location);
                    this.emit('location:updated', location);
                    this.log('Current location obtained', 'success');
                    resolve(location);
                },
                (error) => {
                    this.handleGeolocationError(error);
                    reject(error);
                },
                this.trackingOptions
            );
        });
    }

    startTracking() {
        if (this.isTracking) {
            this.log('Location tracking already active', 'warning');
            return;
        }

        this.log('Starting location tracking...');
        
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const location = this.processPosition(position);
                this.updateLocation(location);
            },
            (error) => {
                this.handleGeolocationError(error);
            },
            this.trackingOptions
        );

        this.isTracking = true;
        this.emit('tracking:started');
        this.log('Location tracking started', 'success');
    }

    stopTracking() {
        if (!this.isTracking) {
            return;
        }

        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        this.isTracking = false;
        this.emit('tracking:stopped');
        this.log('Location tracking stopped', 'info');
    }

    updateLocation(location) {
        this.lastKnownLocation = this.currentLocation;
        this.currentLocation = location;
        
        // Calculate speed and heading if we have previous location
        if (this.lastKnownLocation) {
            this.calculateMovementData(this.lastKnownLocation, location);
        }
        
        this.addToHistory(location);
        this.emit('location:updated', location);
    }

    processPosition(position) {
        const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            speed: position.coords.speed || 0,
            heading: position.coords.heading || 0
        };

        // Validate location
        this.validateLocation(location);
        
        return location;
    }

    calculateMovementData(fromLocation, toLocation) {
        // Calculate distance
        const distance = this.calculateDistance(fromLocation, toLocation);
        
        // Calculate time difference
        const timeDiff = (toLocation.timestamp - fromLocation.timestamp) / 1000; // seconds
        
        // Calculate speed (m/s)
        if (timeDiff > 0) {
            this.currentSpeed = distance / timeDiff;
        }
        
        // Calculate heading
        this.currentHeading = this.calculateBearing(fromLocation, toLocation);
        
        this.emit('movement:updated', {
            speed: this.currentSpeed,
            heading: this.currentHeading,
            distance: distance
        });
    }

    calculateDistance(from, to) {
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

    calculateBearing(from, to) {
        const φ1 = from.lat * Math.PI / 180;
        const φ2 = to.lat * Math.PI / 180;
        const Δλ = (to.lng - from.lng) * Math.PI / 180;

        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

        const θ = Math.atan2(y, x);
        return (θ * 180 / Math.PI + 360) % 360; // Bearing in degrees
    }

    addToHistory(location) {
        this.locationHistory.push(location);
        
        // Keep history size manageable
        if (this.locationHistory.length > this.maxHistorySize) {
            this.locationHistory.shift();
        }
    }

    handleGeolocationError(error) {
        let message = 'Unknown geolocation error';
        
        switch (error.code) {
            case error.PERMISSION_DENIED:
                message = 'Geolocation permission denied';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'Location information unavailable';
                break;
            case error.TIMEOUT:
                message = 'Location request timed out';
                break;
        }
        
        this.handleError(new Error(message), 'Geolocation error');
        this.emit('location:error', { code: error.code, message });
    }

    /**
     * Utility methods
     */
    getCurrentLocation() {
        return this.currentLocation;
    }

    getLastKnownLocation() {
        return this.lastKnownLocation;
    }

    getCurrentSpeed() {
        return this.currentSpeed;
    }

    getCurrentHeading() {
        return this.currentHeading;
    }

    getLocationHistory() {
        return [...this.locationHistory];
    }

    isLocationAvailable() {
        return this.currentLocation !== null;
    }

    getLocationAccuracy() {
        return this.currentLocation ? this.currentLocation.accuracy : null;
    }

    /**
     * Settings methods
     */
    updateTrackingOptions(options) {
        this.trackingOptions = { ...this.trackingOptions, ...options };
        
        // Restart tracking if active
        if (this.isTracking) {
            this.stopTracking();
            this.startTracking();
        }
    }

    destroy() {
        this.stopTracking();
        this.locationHistory = [];
        super.destroy();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocationManager;
} else {
    window.LocationManager = LocationManager;
}
