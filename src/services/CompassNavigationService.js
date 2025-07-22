import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

class CompassNavigationService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.compassEnabled = true;
    this.showInVoice = true;
    this.showInVisual = true;
    this.currentHeading = 0;
    this.calibrationAccuracy = 'high';
    this.lastCalibrationTime = null;
    
    // Compass settings
    this.compassSettings = {
      enabled: true,
      showInVoiceAnnouncements: true,
      showInVisualInstructions: true,
      showInPOIAnnouncements: true,
      showInObstacleAlerts: true,
      calibrationReminders: true,
      accuracyThreshold: 'medium', // 'high', 'medium', 'low'
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadSettings();
      this.setupCompassListeners();
      
      this.isInitialized = true;
      console.log('CompassNavigationService initialized successfully');
    } catch (error) {
      console.error('CompassNavigationService initialization failed:', error);
      throw error;
    }
  }

  setupCompassListeners() {
    // Listen for heading updates from LocationService
    DeviceEventEmitter.addListener('headingUpdate', (heading) => {
      this.currentHeading = heading.magneticHeading || heading.trueHeading || 0;
      this.calibrationAccuracy = this.determineAccuracy(heading.accuracy);
      
      this.notifyListeners('headingChanged', {
        heading: this.currentHeading,
        accuracy: this.calibrationAccuracy,
      });
    });
  }

  determineAccuracy(accuracy) {
    if (accuracy < 15) return 'high';
    if (accuracy < 30) return 'medium';
    return 'low';
  }

  // Cardinal direction utilities
  getCardinalDirection(degrees) {
    const directions = [
      { name: 'north', short: 'N', range: [337.5, 22.5] },
      { name: 'northeast', short: 'NE', range: [22.5, 67.5] },
      { name: 'east', short: 'E', range: [67.5, 112.5] },
      { name: 'southeast', short: 'SE', range: [112.5, 157.5] },
      { name: 'south', short: 'S', range: [157.5, 202.5] },
      { name: 'southwest', short: 'SW', range: [202.5, 247.5] },
      { name: 'west', short: 'W', range: [247.5, 292.5] },
      { name: 'northwest', short: 'NW', range: [292.5, 337.5] },
    ];

    const normalizedDegrees = ((degrees % 360) + 360) % 360;
    
    for (const direction of directions) {
      const [start, end] = direction.range;
      if (start > end) {
        // Handle wrap-around (e.g., north: 337.5 to 22.5)
        if (normalizedDegrees >= start || normalizedDegrees <= end) {
          return direction;
        }
      } else {
        if (normalizedDegrees >= start && normalizedDegrees <= end) {
          return direction;
        }
      }
    }
    
    return directions[0]; // Default to north
  }

  getDirectionFromBearing(bearing) {
    return this.getCardinalDirection(bearing);
  }

  // Calculate bearing between two points
  calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    
    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return ((bearing + 360) % 360);
  }

  // Enhanced navigation instruction formatting
  formatNavigationWithCompass(instruction, bearing = null, streetName = '') {
    if (!this.compassSettings.enabled || !this.compassSettings.showInVisualInstructions) {
      return instruction;
    }

    const targetBearing = bearing || this.currentHeading;
    const direction = this.getCardinalDirection(targetBearing);
    
    // Enhanced instruction patterns
    const patterns = {
      'turn left': `Turn left onto ${streetName} heading ${direction.name}`,
      'turn right': `Turn right onto ${streetName} heading ${direction.name}`,
      'continue straight': `Continue straight ${streetName ? 'on ' + streetName : ''} toward the ${direction.name}`,
      'merge': `Merge ${streetName ? 'onto ' + streetName : ''} heading ${direction.name}`,
      'exit': `Take the exit ${streetName ? 'onto ' + streetName : ''} toward the ${direction.name}`,
      'roundabout': `Enter roundabout and exit ${streetName ? 'onto ' + streetName : ''} heading ${direction.name}`,
    };

    // Find matching pattern
    for (const [pattern, template] of Object.entries(patterns)) {
      if (instruction.toLowerCase().includes(pattern)) {
        return template;
      }
    }

    // Default enhancement
    if (streetName) {
      return `${instruction} heading ${direction.name}`;
    }

    return `${instruction} toward the ${direction.name}`;
  }

  // Enhanced voice announcement formatting
  formatVoiceAnnouncementWithCompass(text, bearing = null, additionalInfo = {}) {
    if (!this.compassSettings.enabled || !this.compassSettings.showInVoiceAnnouncements) {
      return text;
    }

    const targetBearing = bearing || this.currentHeading;
    const direction = this.getCardinalDirection(targetBearing);
    
    // Add compass direction to various announcement types
    if (text.includes('turn left')) {
      return text.replace('turn left', `turn left heading ${direction.name}`);
    }
    
    if (text.includes('turn right')) {
      return text.replace('turn right', `turn right heading ${direction.name}`);
    }
    
    if (text.includes('continue straight')) {
      return text.replace('continue straight', `continue straight toward the ${direction.name}`);
    }
    
    if (text.includes('ahead')) {
      return text.replace('ahead', `ahead to the ${direction.name}`);
    }

    // For obstacle announcements
    if (additionalInfo.isObstacle) {
      return `${text} to the ${direction.name}`;
    }

    // For POI announcements
    if (additionalInfo.isPOI) {
      return `${text} to the ${direction.name}`;
    }

    return text;
  }

  // POI announcement with compass
  formatPOIAnnouncementWithCompass(poiName, distance, bearing, category = '') {
    if (!this.compassSettings.enabled || !this.compassSettings.showInPOIAnnouncements) {
      return `${poiName} ${distance} ahead`;
    }

    const direction = this.getCardinalDirection(bearing);
    const categoryText = category ? `${category} ` : '';
    
    return `${categoryText}${poiName} ${distance} ahead to the ${direction.name}`;
  }

  // Obstacle announcement with compass
  formatObstacleAnnouncementWithCompass(obstacleType, distance, bearing) {
    if (!this.compassSettings.enabled || !this.compassSettings.showInObstacleAlerts) {
      return `${obstacleType} ${distance} ahead`;
    }

    const direction = this.getCardinalDirection(bearing);
    return `${obstacleType} ${distance} ahead to the ${direction.name}`;
  }

  // Compass calibration utilities
  needsCalibration() {
    if (this.calibrationAccuracy === 'low') return true;
    
    const lastCalibration = this.lastCalibrationTime;
    if (!lastCalibration) return true;
    
    const timeSinceCalibration = Date.now() - lastCalibration;
    const calibrationInterval = 30 * 60 * 1000; // 30 minutes
    
    return timeSinceCalibration > calibrationInterval;
  }

  getCalibrationMessage() {
    return "Compass signal weak. Please recalibrate your device by moving it in a figure-eight pattern.";
  }

  markCalibrationComplete() {
    this.lastCalibrationTime = Date.now();
    this.calibrationAccuracy = 'high';
    
    this.notifyListeners('calibrationComplete', {
      timestamp: this.lastCalibrationTime,
      accuracy: this.calibrationAccuracy,
    });
  }

  // Settings management
  async updateCompassSettings(newSettings) {
    this.compassSettings = { ...this.compassSettings, ...newSettings };
    await this.saveSettings();
    
    this.notifyListeners('settingsUpdated', {
      settings: this.compassSettings,
    });
  }

  async toggleCompassDirections(enabled) {
    await this.updateCompassSettings({ enabled });
  }

  async toggleVoiceDirections(enabled) {
    await this.updateCompassSettings({ showInVoiceAnnouncements: enabled });
  }

  async toggleVisualDirections(enabled) {
    await this.updateCompassSettings({ showInVisualInstructions: enabled });
  }

  async togglePOIDirections(enabled) {
    await this.updateCompassSettings({ showInPOIAnnouncements: enabled });
  }

  async toggleObstacleDirections(enabled) {
    await this.updateCompassSettings({ showInObstacleAlerts: enabled });
  }

  // Getters
  isCompassEnabled() {
    return this.compassSettings.enabled;
  }

  isVoiceDirectionsEnabled() {
    return this.compassSettings.enabled && this.compassSettings.showInVoiceAnnouncements;
  }

  isVisualDirectionsEnabled() {
    return this.compassSettings.enabled && this.compassSettings.showInVisualInstructions;
  }

  isPOIDirectionsEnabled() {
    return this.compassSettings.enabled && this.compassSettings.showInPOIAnnouncements;
  }

  isObstacleDirectionsEnabled() {
    return this.compassSettings.enabled && this.compassSettings.showInObstacleAlerts;
  }

  getCurrentHeading() {
    return this.currentHeading;
  }

  getCurrentDirection() {
    return this.getCardinalDirection(this.currentHeading);
  }

  getCalibrationAccuracy() {
    return this.calibrationAccuracy;
  }

  getCompassSettings() {
    return { ...this.compassSettings };
  }

  // Storage
  async saveSettings() {
    try {
      const data = {
        compassSettings: this.compassSettings,
        lastCalibrationTime: this.lastCalibrationTime,
      };
      await AsyncStorage.setItem('compassNavigationSettings', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving compass navigation settings:', error);
    }
  }

  async loadSettings() {
    try {
      const stored = await AsyncStorage.getItem('compassNavigationSettings');
      if (stored) {
        const data = JSON.parse(stored);
        this.compassSettings = { ...this.compassSettings, ...data.compassSettings };
        this.lastCalibrationTime = data.lastCalibrationTime;
      }
    } catch (error) {
      console.error('Error loading compass navigation settings:', error);
    }
  }

  // Listener management
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('CompassNavigationService listener error:', error);
      }
    });
  }

  destroy() {
    this.listeners = [];
    this.isInitialized = false;
  }
}

export default new CompassNavigationService();
