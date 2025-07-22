import AsyncStorage from '@react-native-async-storage/async-storage';

class UnitsService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.currentUnits = {
      distance: 'metric', // 'metric' (km/m) or 'imperial' (miles/feet)
      speed: 'metric', // 'metric' (km/h) or 'imperial' (mph)
      temperature: 'celsius', // 'celsius' or 'fahrenheit'
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadSettings();
      this.isInitialized = true;
      console.log('UnitsService initialized successfully');
    } catch (error) {
      console.error('UnitsService initialization failed:', error);
      throw error;
    }
  }

  // Distance conversions
  formatDistance(meters, precision = 1) {
    if (this.currentUnits.distance === 'imperial') {
      return this.formatDistanceImperial(meters, precision);
    } else {
      return this.formatDistanceMetric(meters, precision);
    }
  }

  formatDistanceMetric(meters, precision = 1) {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    } else {
      const km = meters / 1000;
      return `${km.toFixed(precision)} km`;
    }
  }

  formatDistanceImperial(meters, precision = 1) {
    const feet = meters * 3.28084;
    const miles = meters * 0.000621371;

    if (feet < 1000) {
      return `${Math.round(feet)} ft`;
    } else {
      return `${miles.toFixed(precision)} mi`;
    }
  }

  // Speed conversions
  formatSpeed(kmh, precision = 0) {
    if (this.currentUnits.speed === 'imperial') {
      const mph = kmh * 0.621371;
      return `${mph.toFixed(precision)} mph`;
    } else {
      return `${kmh.toFixed(precision)} km/h`;
    }
  }

  // Voice-friendly distance formatting
  formatDistanceForVoice(meters) {
    if (this.currentUnits.distance === 'imperial') {
      return this.formatDistanceImperialVoice(meters);
    } else {
      return this.formatDistanceMetricVoice(meters);
    }
  }

  formatDistanceMetricVoice(meters) {
    if (meters < 100) {
      const rounded = Math.round(meters / 10) * 10;
      return `${rounded} meters`;
    } else if (meters < 1000) {
      const rounded = Math.round(meters / 50) * 50;
      return `${rounded} meters`;
    } else {
      const km = meters / 1000;
      if (km < 2) {
        return `${km.toFixed(1)} kilometer${km !== 1 ? 's' : ''}`;
      } else {
        const rounded = Math.round(km);
        return `${rounded} kilometer${rounded !== 1 ? 's' : ''}`;
      }
    }
  }

  formatDistanceImperialVoice(meters) {
    const feet = meters * 3.28084;
    const miles = meters * 0.000621371;

    if (feet < 500) {
      const rounded = Math.round(feet / 50) * 50;
      return `${rounded} feet`;
    } else if (miles < 0.2) {
      const rounded = Math.round(feet / 100) * 100;
      return `${rounded} feet`;
    } else if (miles < 1) {
      return `${miles.toFixed(1)} mile${miles !== 1 ? 's' : ''}`;
    } else {
      const rounded = Math.round(miles * 10) / 10;
      return `${rounded} mile${rounded !== 1 ? 's' : ''}`;
    }
  }

  // Speed for voice
  formatSpeedForVoice(kmh) {
    if (this.currentUnits.speed === 'imperial') {
      const mph = Math.round(kmh * 0.621371);
      return `${mph} miles per hour`;
    } else {
      const rounded = Math.round(kmh);
      return `${rounded} kilometers per hour`;
    }
  }

  // Temperature conversions
  formatTemperature(celsius, precision = 0) {
    if (this.currentUnits.temperature === 'fahrenheit') {
      const fahrenheit = (celsius * 9/5) + 32;
      return `${fahrenheit.toFixed(precision)}°F`;
    } else {
      return `${celsius.toFixed(precision)}°C`;
    }
  }

  // Conversion utilities
  metersToKm(meters) {
    return meters / 1000;
  }

  metersToMiles(meters) {
    return meters * 0.000621371;
  }

  metersToFeet(meters) {
    return meters * 3.28084;
  }

  kmhToMph(kmh) {
    return kmh * 0.621371;
  }

  mphToKmh(mph) {
    return mph * 1.60934;
  }

  // Get raw values for calculations
  getDistanceValue(meters) {
    if (this.currentUnits.distance === 'imperial') {
      const miles = this.metersToMiles(meters);
      return miles < 0.1 ? this.metersToFeet(meters) : miles;
    } else {
      return meters < 1000 ? meters : this.metersToKm(meters);
    }
  }

  getDistanceUnit(meters) {
    if (this.currentUnits.distance === 'imperial') {
      const miles = this.metersToMiles(meters);
      return miles < 0.1 ? 'ft' : 'mi';
    } else {
      return meters < 1000 ? 'm' : 'km';
    }
  }

  getSpeedValue(kmh) {
    return this.currentUnits.speed === 'imperial' ? this.kmhToMph(kmh) : kmh;
  }

  getSpeedUnit() {
    return this.currentUnits.speed === 'imperial' ? 'mph' : 'km/h';
  }

  // Settings management
  async updateUnits(unitType, value) {
    if (!['distance', 'speed', 'temperature'].includes(unitType)) {
      throw new Error('Invalid unit type');
    }

    const validValues = {
      distance: ['metric', 'imperial'],
      speed: ['metric', 'imperial'],
      temperature: ['celsius', 'fahrenheit'],
    };

    if (!validValues[unitType].includes(value)) {
      throw new Error('Invalid unit value');
    }

    this.currentUnits[unitType] = value;
    await this.saveSettings();
    this.notifyListeners('unitsUpdated', { unitType, value, currentUnits: this.currentUnits });
  }

  async updateAllUnits(units) {
    this.currentUnits = { ...this.currentUnits, ...units };
    await this.saveSettings();
    this.notifyListeners('unitsUpdated', { currentUnits: this.currentUnits });
  }

  getCurrentUnits() {
    return { ...this.currentUnits };
  }

  isMetric() {
    return this.currentUnits.distance === 'metric';
  }

  isImperial() {
    return this.currentUnits.distance === 'imperial';
  }

  // Preset configurations
  setMetricUnits() {
    return this.updateAllUnits({
      distance: 'metric',
      speed: 'metric',
      temperature: 'celsius',
    });
  }

  setImperialUnits() {
    return this.updateAllUnits({
      distance: 'imperial',
      speed: 'imperial',
      temperature: 'fahrenheit',
    });
  }

  // Auto-detect based on locale
  async autoDetectUnits() {
    try {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale;
      const country = locale.split('-')[1] || locale.split('_')[1];
      
      // Countries that primarily use imperial system
      const imperialCountries = ['US', 'LR', 'MM']; // USA, Liberia, Myanmar
      const useImperial = imperialCountries.includes(country);

      if (useImperial) {
        await this.setImperialUnits();
      } else {
        await this.setMetricUnits();
      }

      this.notifyListeners('unitsAutoDetected', { 
        locale, 
        country, 
        units: this.currentUnits 
      });

    } catch (error) {
      console.error('Error auto-detecting units:', error);
      // Default to metric if detection fails
      await this.setMetricUnits();
    }
  }

  // Navigation-specific formatting
  formatNavigationDistance(meters) {
    const formatted = this.formatDistance(meters);
    const voice = this.formatDistanceForVoice(meters);
    
    return {
      display: formatted,
      voice: voice,
      value: this.getDistanceValue(meters),
      unit: this.getDistanceUnit(meters),
    };
  }

  formatNavigationSpeed(kmh) {
    const formatted = this.formatSpeed(kmh);
    const voice = this.formatSpeedForVoice(kmh);
    
    return {
      display: formatted,
      voice: voice,
      value: this.getSpeedValue(kmh),
      unit: this.getSpeedUnit(),
    };
  }

  // Announcement distance thresholds based on units
  getAnnouncementDistances() {
    if (this.currentUnits.distance === 'imperial') {
      return [
        1609, // 1 mile
        805,  // 0.5 miles
        402,  // 0.25 miles
        201,  // 0.125 miles (660 feet)
        61,   // 200 feet
      ];
    } else {
      return [
        2000, // 2 km
        1000, // 1 km
        500,  // 500 m
        200,  // 200 m
        100,  // 100 m
      ];
    }
  }

  // Settings persistence
  async saveSettings() {
    try {
      await AsyncStorage.setItem('unitsSettings', JSON.stringify(this.currentUnits));
    } catch (error) {
      console.error('Error saving units settings:', error);
    }
  }

  async loadSettings() {
    try {
      const stored = await AsyncStorage.getItem('unitsSettings');
      if (stored) {
        this.currentUnits = { ...this.currentUnits, ...JSON.parse(stored) };
      } else {
        // Auto-detect on first run
        await this.autoDetectUnits();
      }
    } catch (error) {
      console.error('Error loading units settings:', error);
      // Use defaults if loading fails
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
        console.error('UnitsService listener error:', error);
      }
    });
  }

  destroy() {
    this.listeners = [];
    this.isInitialized = false;
  }
}

export default new UnitsService();
