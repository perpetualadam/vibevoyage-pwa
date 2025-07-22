import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

class SpeedLimitService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.speedLimitCache = new Map();
    this.currentSpeedLimit = null;
    this.lastLocation = null;
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
    this.settings = {
      enableCrowdsourcing: true,
      autoReportIncorrect: false,
      confidenceThreshold: 0.7,
      updateRadius: 100, // meters
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadSettings();
      await this.loadSpeedLimitCache();
      this.isInitialized = true;
      console.log('SpeedLimitService initialized successfully');
    } catch (error) {
      console.error('SpeedLimitService initialization failed:', error);
      throw error;
    }
  }

  async getSpeedLimit(location, roadType = null) {
    if (!location) return null;

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(location);
      const cached = this.speedLimitCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
        return cached.speedLimit;
      }

      // Fetch from multiple sources
      const speedLimitSources = await Promise.allSettled([
        this.fetchFromOpenStreetMap(location),
        this.fetchFromCrowdsourcedData(location),
        this.fetchFromTomTom(location),
        this.getDefaultSpeedLimit(roadType, location),
      ]);

      const speedLimit = this.consolidateSpeedLimitData(speedLimitSources, location);
      
      // Cache the result
      this.speedLimitCache.set(cacheKey, {
        speedLimit,
        timestamp: Date.now(),
        location,
        confidence: speedLimit?.confidence || 0.5,
      });

      // Save cache periodically
      if (this.speedLimitCache.size % 10 === 0) {
        await this.saveSpeedLimitCache();
      }

      this.notifyListeners('speedLimitUpdated', { speedLimit, location });
      return speedLimit;

    } catch (error) {
      console.error('Error fetching speed limit:', error);
      return this.getDefaultSpeedLimit(roadType, location);
    }
  }

  async fetchFromOpenStreetMap(location) {
    try {
      const radius = 50; // 50 meter radius
      const query = `
        [out:json][timeout:10];
        (
          way["highway"]["maxspeed"](around:${radius},${location.latitude},${location.longitude});
        );
        out geom;
      `;

      const response = await axios.post('https://overpass-api.de/api/interpreter', query, {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 5000,
      });

      return this.parseOSMSpeedLimit(response.data, location);
    } catch (error) {
      console.error('OSM speed limit fetch error:', error);
      return null;
    }
  }

  parseOSMSpeedLimit(data, location) {
    if (!data.elements || data.elements.length === 0) return null;

    // Find the closest road segment
    let closestElement = null;
    let minDistance = Infinity;

    data.elements.forEach(element => {
      if (element.tags && element.tags.maxspeed && element.geometry) {
        const distance = this.getDistanceToRoad(location, element.geometry);
        if (distance < minDistance) {
          minDistance = distance;
          closestElement = element;
        }
      }
    });

    if (!closestElement || minDistance > 100) return null;

    const maxspeed = closestElement.tags.maxspeed;
    const speedLimit = this.parseSpeedLimitValue(maxspeed);

    if (speedLimit) {
      return {
        value: speedLimit,
        unit: 'km/h',
        source: 'openstreetmap',
        confidence: 0.8,
        roadType: closestElement.tags.highway,
        lastUpdated: Date.now(),
      };
    }

    return null;
  }

  parseSpeedLimitValue(maxspeedString) {
    if (!maxspeedString) return null;

    // Handle various formats: "50", "50 km/h", "30 mph", "none", "signals"
    const numericMatch = maxspeedString.match(/(\d+)/);
    if (!numericMatch) return null;

    let speed = parseInt(numericMatch[1]);
    
    // Convert mph to km/h if needed
    if (maxspeedString.toLowerCase().includes('mph')) {
      speed = Math.round(speed * 1.60934);
    }

    return speed;
  }

  async fetchFromCrowdsourcedData(location) {
    if (!this.settings.enableCrowdsourcing) return null;

    try {
      // Check local crowdsourced reports
      const reports = await this.getCrowdsourcedReports(location);
      
      if (reports.length === 0) return null;

      // Calculate weighted average based on confidence and recency
      let totalWeight = 0;
      let weightedSum = 0;

      reports.forEach(report => {
        const age = Date.now() - report.timestamp;
        const ageWeight = Math.max(0, 1 - (age / (30 * 24 * 60 * 60 * 1000))); // 30 days decay
        const weight = report.confidence * ageWeight * report.votes;
        
        totalWeight += weight;
        weightedSum += report.speedLimit * weight;
      });

      if (totalWeight === 0) return null;

      const averageSpeedLimit = Math.round(weightedSum / totalWeight);
      const confidence = Math.min(0.9, totalWeight / reports.length);

      return {
        value: averageSpeedLimit,
        unit: 'km/h',
        source: 'crowdsourced',
        confidence,
        reportCount: reports.length,
        lastUpdated: Date.now(),
      };

    } catch (error) {
      console.error('Crowdsourced speed limit fetch error:', error);
      return null;
    }
  }

  async fetchFromTomTom(location) {
    const apiKey = process.env.TOMTOM_API_KEY;
    if (!apiKey) return null;

    try {
      const url = `https://api.tomtom.com/search/2/reverseGeocode/${location.latitude},${location.longitude}.json`;
      const params = {
        key: apiKey,
        radius: 100,
        roadUse: 'true',
      };

      const response = await axios.get(url, { params, timeout: 5000 });
      
      if (response.data.addresses && response.data.addresses.length > 0) {
        const address = response.data.addresses[0];
        const speedLimit = address.address?.speedLimit;
        
        if (speedLimit) {
          return {
            value: speedLimit,
            unit: 'km/h',
            source: 'tomtom',
            confidence: 0.9,
            roadType: address.address?.roadType,
            lastUpdated: Date.now(),
          };
        }
      }

      return null;
    } catch (error) {
      console.error('TomTom speed limit fetch error:', error);
      return null;
    }
  }

  getDefaultSpeedLimit(roadType, location) {
    // Default speed limits by road type and region
    const defaults = {
      'motorway': 120,
      'trunk': 100,
      'primary': 80,
      'secondary': 60,
      'tertiary': 50,
      'residential': 30,
      'living_street': 20,
      'service': 20,
      'unclassified': 50,
    };

    const speedLimit = defaults[roadType] || 50; // Default to 50 km/h

    return {
      value: speedLimit,
      unit: 'km/h',
      source: 'default',
      confidence: 0.3,
      roadType,
      lastUpdated: Date.now(),
    };
  }

  consolidateSpeedLimitData(sources, location) {
    const validSources = sources
      .filter(result => result.status === 'fulfilled' && result.value)
      .map(result => result.value);

    if (validSources.length === 0) return null;

    // Weight sources by confidence and reliability
    const sourceWeights = {
      'tomtom': 1.0,
      'openstreetmap': 0.8,
      'crowdsourced': 0.6,
      'default': 0.3,
    };

    let totalWeight = 0;
    let weightedSum = 0;
    let bestSource = null;
    let maxConfidence = 0;

    validSources.forEach(source => {
      const weight = sourceWeights[source.source] * source.confidence;
      totalWeight += weight;
      weightedSum += source.value * weight;

      if (source.confidence > maxConfidence) {
        maxConfidence = source.confidence;
        bestSource = source;
      }
    });

    if (totalWeight === 0) return null;

    const consolidatedSpeedLimit = Math.round(weightedSum / totalWeight);
    const consolidatedConfidence = Math.min(0.95, totalWeight / validSources.length);

    return {
      value: consolidatedSpeedLimit,
      unit: 'km/h',
      source: 'consolidated',
      confidence: consolidatedConfidence,
      sources: validSources,
      primarySource: bestSource?.source,
      lastUpdated: Date.now(),
    };
  }

  async reportIncorrectSpeedLimit(location, reportedSpeedLimit, actualSpeedLimit, confidence = 0.8) {
    try {
      const report = {
        id: Date.now(),
        location,
        reportedSpeedLimit,
        actualSpeedLimit,
        confidence,
        timestamp: Date.now(),
        votes: 1,
        verified: false,
      };

      // Store locally
      await this.storeCrowdsourcedReport(report);

      // Submit to server if available
      // await this.submitSpeedLimitReport(report);

      this.notifyListeners('speedLimitReported', { report });
      
      return report;
    } catch (error) {
      console.error('Error reporting speed limit:', error);
      throw error;
    }
  }

  async getCrowdsourcedReports(location, radius = 200) {
    try {
      const allReports = await AsyncStorage.getItem('speedLimitReports');
      if (!allReports) return [];

      const reports = JSON.parse(allReports);
      
      return reports.filter(report => {
        const distance = this.calculateDistance(location, report.location);
        return distance <= radius;
      });
    } catch (error) {
      console.error('Error getting crowdsourced reports:', error);
      return [];
    }
  }

  async storeCrowdsourcedReport(report) {
    try {
      const existingReports = await this.getCrowdsourcedReports({ latitude: 0, longitude: 0 }, Infinity);
      existingReports.push(report);
      
      // Keep only recent reports (last 90 days)
      const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
      const recentReports = existingReports.filter(r => r.timestamp > ninetyDaysAgo);
      
      await AsyncStorage.setItem('speedLimitReports', JSON.stringify(recentReports));
    } catch (error) {
      console.error('Error storing crowdsourced report:', error);
    }
  }

  // Utility methods
  generateCacheKey(location) {
    // Round to ~100m precision for caching
    const lat = Math.round(location.latitude * 1000) / 1000;
    const lng = Math.round(location.longitude * 1000) / 1000;
    return `${lat}_${lng}`;
  }

  getDistanceToRoad(location, roadGeometry) {
    let minDistance = Infinity;
    
    roadGeometry.forEach(point => {
      const distance = this.calculateDistance(location, { 
        latitude: point.lat, 
        longitude: point.lon 
      });
      minDistance = Math.min(minDistance, distance);
    });
    
    return minDistance;
  }

  calculateDistance(coord1, coord2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = coord1.latitude * Math.PI/180;
    const φ2 = coord2.latitude * Math.PI/180;
    const Δφ = (coord2.latitude-coord1.latitude) * Math.PI/180;
    const Δλ = (coord2.longitude-coord1.longitude) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  // Settings and persistence
  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
    this.notifyListeners('settingsUpdated', { settings: this.settings });
  }

  async saveSettings() {
    try {
      await AsyncStorage.setItem('speedLimitSettings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving speed limit settings:', error);
    }
  }

  async loadSettings() {
    try {
      const stored = await AsyncStorage.getItem('speedLimitSettings');
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading speed limit settings:', error);
    }
  }

  async saveSpeedLimitCache() {
    try {
      const cacheArray = Array.from(this.speedLimitCache.entries());
      await AsyncStorage.setItem('speedLimitCache', JSON.stringify(cacheArray));
    } catch (error) {
      console.error('Error saving speed limit cache:', error);
    }
  }

  async loadSpeedLimitCache() {
    try {
      const stored = await AsyncStorage.getItem('speedLimitCache');
      if (stored) {
        const cacheArray = JSON.parse(stored);
        this.speedLimitCache = new Map(cacheArray);
        
        // Clean expired entries
        const now = Date.now();
        for (const [key, value] of this.speedLimitCache.entries()) {
          if (now - value.timestamp > this.cacheDuration) {
            this.speedLimitCache.delete(key);
          }
        }
      }
    } catch (error) {
      console.error('Error loading speed limit cache:', error);
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
        console.error('SpeedLimitService listener error:', error);
      }
    });
  }

  destroy() {
    this.listeners = [];
    this.speedLimitCache.clear();
    this.isInitialized = false;
  }
}

export default new SpeedLimitService();
