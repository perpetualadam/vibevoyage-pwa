/**
 * Base Module Class
 * Provides common functionality for all application modules
 */
class BaseModule {
    constructor(name) {
        this.name = name;
        this.isInitialized = false;
        this.eventListeners = new Map();
        
        console.log(`📦 ${this.name} module created`);
    }

    /**
     * Initialize the module
     * Override in subclasses
     */
    async initialize() {
        console.log(`🔧 Initializing ${this.name} module...`);
        this.isInitialized = true;
        console.log(`✅ ${this.name} module initialized`);
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

    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${this.name} event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Utility methods
     */
    log(message, type = 'info') {
        const emoji = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            debug: '🐛'
        };
        
        console.log(`${emoji[type]} [${this.name}] ${message}`);
    }

    /**
     * Error handling
     */
    handleError(error, context = '') {
        const message = context ? `${context}: ${error.message}` : error.message;
        this.log(message, 'error');
        this.emit('error', { error, context, module: this.name });
    }

    /**
     * Validation helpers
     */
    validateRequired(obj, fields) {
        const missing = fields.filter(field => !obj[field]);
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
    }

    validateLocation(location) {
        if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
            throw new Error('Invalid location object');
        }
        
        if (location.lat < -90 || location.lat > 90) {
            throw new Error('Invalid latitude');
        }
        
        if (location.lng < -180 || location.lng > 180) {
            throw new Error('Invalid longitude');
        }
    }

    /**
     * Storage helpers
     */
    saveToStorage(key, data) {
        try {
            const prefixedKey = `vibeVoyage_${this.name}_${key}`;
            localStorage.setItem(prefixedKey, JSON.stringify(data));
            this.log(`Data saved to storage: ${key}`, 'debug');
        } catch (error) {
            this.handleError(error, 'Storage save failed');
        }
    }

    loadFromStorage(key, defaultValue = null) {
        try {
            const prefixedKey = `vibeVoyage_${this.name}_${key}`;
            const data = localStorage.getItem(prefixedKey);
            if (data) {
                return JSON.parse(data);
            }
            return defaultValue;
        } catch (error) {
            this.handleError(error, 'Storage load failed');
            return defaultValue;
        }
    }

    removeFromStorage(key) {
        try {
            const prefixedKey = `vibeVoyage_${this.name}_${key}`;
            localStorage.removeItem(prefixedKey);
            this.log(`Data removed from storage: ${key}`, 'debug');
        } catch (error) {
            this.handleError(error, 'Storage remove failed');
        }
    }

    /**
     * Async helpers
     */
    async withTimeout(promise, timeoutMs, errorMessage = 'Operation timed out') {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
            )
        ]);
    }

    async retry(fn, maxAttempts = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt === maxAttempts) {
                    throw error;
                }
                this.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`, 'warning');
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * Cleanup method
     */
    destroy() {
        this.log(`Cleaning up ${this.name} module...`, 'info');
        this.eventListeners.clear();
        this.isInitialized = false;
        this.log(`${this.name} module cleanup complete`, 'success');
    }

    /**
     * Get module status
     */
    getStatus() {
        return {
            name: this.name,
            isInitialized: this.isInitialized,
            eventListeners: this.eventListeners.size
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseModule;
} else {
    window.BaseModule = BaseModule;
}
