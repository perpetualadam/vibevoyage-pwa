/**
 * Settings Manager Module
 * Handles application settings, preferences, and configuration
 */
class SettingsManager extends BaseModule {
    constructor() {
        super('SettingsManager');
        
        // Default settings
        this.defaultSettings = {
            // Units
            units: {
                distance: 'metric', // metric, imperial
                speed: 'kmh', // kmh, mph
                temperature: 'celsius', // celsius, fahrenheit
                fuelEfficiency: 8.0 // L/100km or MPG
            },
            
            // Navigation preferences
            navigation: {
                voiceEnabled: true,
                voiceVolume: 0.8,
                autoRecalculate: true,
                avoidTolls: false,
                avoidHighways: false,
                avoidFerries: false,
                routeType: 'fastest' // fastest, shortest, scenic
            },
            
            // Map preferences
            map: {
                followMode: true,
                showTraffic: false,
                showHazards: true,
                mapStyle: 'default', // default, satellite, terrain
                zoomLevel: 15
            },
            
            // Hazard avoidance
            hazards: {
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
            },
            
            // UI preferences
            ui: {
                theme: 'dark', // dark, light, auto
                language: 'en',
                showSpeedometer: true,
                showETA: true,
                showWeather: true,
                compactMode: false
            },
            
            // Privacy and data
            privacy: {
                shareLocation: false,
                saveHistory: true,
                analytics: false,
                crashReporting: true
            },
            
            // Gamification
            gamification: {
                enabled: true,
                showAchievements: true,
                showStats: true,
                soundEffects: true
            }
        };
        
        // Current settings
        this.settings = {};
        
        // Settings validation rules
        this.validationRules = this.createValidationRules();
    }

    async initialize() {
        await super.initialize();
        
        try {
            this.loadSettings();
            this.validateSettings();
            this.applySettings();
            this.log('Settings manager initialized successfully', 'success');
        } catch (error) {
            this.handleError(error, 'Settings manager initialization failed');
            this.resetToDefaults();
        }
    }

    createValidationRules() {
        return {
            'units.distance': ['metric', 'imperial'],
            'units.speed': ['kmh', 'mph'],
            'units.temperature': ['celsius', 'fahrenheit'],
            'units.fuelEfficiency': (value) => typeof value === 'number' && value > 0,
            
            'navigation.voiceVolume': (value) => typeof value === 'number' && value >= 0 && value <= 1,
            'navigation.routeType': ['fastest', 'shortest', 'scenic'],
            
            'map.mapStyle': ['default', 'satellite', 'terrain'],
            'map.zoomLevel': (value) => typeof value === 'number' && value >= 1 && value <= 20,
            
            'ui.theme': ['dark', 'light', 'auto'],
            'ui.language': (value) => typeof value === 'string' && value.length === 2
        };
    }

    loadSettings() {
        try {
            const saved = this.loadFromStorage('settings');
            if (saved) {
                this.settings = this.mergeSettings(this.defaultSettings, saved);
                this.log('Settings loaded from storage', 'debug');
            } else {
                this.settings = { ...this.defaultSettings };
                this.log('Using default settings', 'debug');
            }
        } catch (error) {
            this.handleError(error, 'Failed to load settings');
            this.settings = { ...this.defaultSettings };
        }
    }

    mergeSettings(defaults, saved) {
        const merged = {};
        
        for (const [key, value] of Object.entries(defaults)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                merged[key] = this.mergeSettings(value, saved[key] || {});
            } else {
                merged[key] = saved.hasOwnProperty(key) ? saved[key] : value;
            }
        }
        
        return merged;
    }

    validateSettings() {
        const errors = [];
        
        for (const [path, rule] of Object.entries(this.validationRules)) {
            const value = this.getSettingByPath(path);
            
            if (Array.isArray(rule)) {
                if (!rule.includes(value)) {
                    errors.push(`Invalid value for ${path}: ${value}`);
                }
            } else if (typeof rule === 'function') {
                if (!rule(value)) {
                    errors.push(`Validation failed for ${path}: ${value}`);
                }
            }
        }
        
        if (errors.length > 0) {
            this.log(`Settings validation errors: ${errors.join(', ')}`, 'warning');
            // Fix invalid settings
            this.fixInvalidSettings();
        }
    }

    fixInvalidSettings() {
        for (const [path, rule] of Object.entries(this.validationRules)) {
            const value = this.getSettingByPath(path);
            const defaultValue = this.getSettingByPath(path, this.defaultSettings);
            
            let isValid = false;
            
            if (Array.isArray(rule)) {
                isValid = rule.includes(value);
            } else if (typeof rule === 'function') {
                isValid = rule(value);
            }
            
            if (!isValid) {
                this.setSettingByPath(path, defaultValue);
                this.log(`Fixed invalid setting ${path}: ${value} -> ${defaultValue}`, 'info');
            }
        }
    }

    applySettings() {
        // Apply settings to the application
        this.emit('settings:applied', this.settings);
        
        // Apply specific settings
        this.applyUISettings();
        this.applyMapSettings();
        this.applyNavigationSettings();
    }

    applyUISettings() {
        const ui = this.settings.ui;
        
        // Apply theme
        document.body.setAttribute('data-theme', ui.theme);
        
        // Apply language
        document.documentElement.setAttribute('lang', ui.language);
        
        this.emit('ui:settings:applied', ui);
    }

    applyMapSettings() {
        this.emit('map:settings:applied', this.settings.map);
    }

    applyNavigationSettings() {
        this.emit('navigation:settings:applied', this.settings.navigation);
    }

    /**
     * Settings access methods
     */
    getSetting(category, key = null) {
        if (key === null) {
            return this.settings[category] || {};
        }
        return this.settings[category]?.[key];
    }

    getSettingByPath(path, source = null) {
        const settings = source || this.settings;
        return path.split('.').reduce((obj, key) => obj?.[key], settings);
    }

    setSetting(category, key, value) {
        if (!this.settings[category]) {
            this.settings[category] = {};
        }
        
        const oldValue = this.settings[category][key];
        this.settings[category][key] = value;
        
        this.saveSettings();
        this.emit('setting:changed', {
            category,
            key,
            value,
            oldValue,
            path: `${category}.${key}`
        });
        
        this.log(`Setting changed: ${category}.${key} = ${value}`, 'debug');
    }

    setSettingByPath(path, value) {
        const keys = path.split('.');
        let current = this.settings;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        const lastKey = keys[keys.length - 1];
        const oldValue = current[lastKey];
        current[lastKey] = value;
        
        this.saveSettings();
        this.emit('setting:changed', {
            path,
            value,
            oldValue
        });
    }

    updateSettings(updates) {
        const changes = [];
        
        for (const [path, value] of Object.entries(updates)) {
            const oldValue = this.getSettingByPath(path);
            if (oldValue !== value) {
                this.setSettingByPath(path, value);
                changes.push({ path, value, oldValue });
            }
        }
        
        if (changes.length > 0) {
            this.emit('settings:updated', changes);
        }
    }

    saveSettings() {
        try {
            this.saveToStorage('settings', this.settings);
            this.log('Settings saved to storage', 'debug');
        } catch (error) {
            this.handleError(error, 'Failed to save settings');
        }
    }

    resetToDefaults() {
        this.settings = { ...this.defaultSettings };
        this.saveSettings();
        this.applySettings();
        this.emit('settings:reset');
        this.log('Settings reset to defaults', 'info');
    }

    resetCategory(category) {
        if (this.defaultSettings[category]) {
            this.settings[category] = { ...this.defaultSettings[category] };
            this.saveSettings();
            this.emit('settings:category:reset', category);
            this.log(`Settings category reset: ${category}`, 'info');
        }
    }

    /**
     * Import/Export functionality
     */
    exportSettings() {
        try {
            const exported = {
                version: '1.0',
                timestamp: Date.now(),
                settings: this.settings
            };
            
            return JSON.stringify(exported, null, 2);
        } catch (error) {
            this.handleError(error, 'Failed to export settings');
            throw error;
        }
    }

    importSettings(settingsJson) {
        try {
            const imported = JSON.parse(settingsJson);
            
            if (!imported.settings) {
                throw new Error('Invalid settings format');
            }
            
            this.settings = this.mergeSettings(this.defaultSettings, imported.settings);
            this.validateSettings();
            this.saveSettings();
            this.applySettings();
            
            this.emit('settings:imported');
            this.log('Settings imported successfully', 'success');
            
        } catch (error) {
            this.handleError(error, 'Failed to import settings');
            throw error;
        }
    }

    /**
     * Utility methods
     */
    getAllSettings() {
        return { ...this.settings };
    }

    getDefaultSettings() {
        return { ...this.defaultSettings };
    }

    isDefaultValue(category, key) {
        const current = this.getSetting(category, key);
        const defaultValue = this.defaultSettings[category]?.[key];
        return current === defaultValue;
    }

    getChangedSettings() {
        const changed = {};
        
        const compareObjects = (current, defaults, path = '') => {
            for (const [key, value] of Object.entries(current)) {
                const currentPath = path ? `${path}.${key}` : key;
                const defaultValue = defaults[key];
                
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    if (typeof defaultValue === 'object' && defaultValue !== null) {
                        compareObjects(value, defaultValue, currentPath);
                    }
                } else if (value !== defaultValue) {
                    changed[currentPath] = { current: value, default: defaultValue };
                }
            }
        };
        
        compareObjects(this.settings, this.defaultSettings);
        return changed;
    }

    destroy() {
        this.saveSettings();
        super.destroy();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsManager;
} else {
    window.SettingsManager = SettingsManager;
}
