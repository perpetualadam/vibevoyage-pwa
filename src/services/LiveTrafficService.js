import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

class LiveTrafficService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.trafficData = new Map();
    this.incidentData = new Map();
    this.updateInterval = null;
    this.settings = {
      updateFrequency: 60000, // 1 minute
      maxRerouteTime: 20, // minutes
      trafficThreshold: 'moderate', // 'light', 'moderate', 'heavy'
      autoReroute: true,
      showTrafficLayer: true,
    };
    this.lastUpdate = 0;
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadSettings();
      this.startPeriodicUpdates();
      this.isInitialized = true;
      console.log('LiveTrafficService initialized successfully');
    } catch (error) {
      console.error('LiveTrafficService initialization failed:', error);
      throw error;
    }
  }

  async getTrafficData(bounds) {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(bounds);
      const cached = this.trafficData.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
        return cached.data;
      }

      // Fetch from multiple sources
      const trafficSources = await Promise.allSettled([
        this.fetchFromOpenStreetMap(bounds),
        this.fetchFromCommunityReports(bounds),
        this.fetchFromTomTom(bounds), // If API key available
      ]);

      const trafficData = this.mergeTrafficData(trafficSources);
      
      // Cache the result
      this.trafficData.set(cacheKey, {
        data: trafficData,
        timestamp: Date.now(),
      });

      this.notifyListeners('trafficDataUpdated', { bounds, data: trafficData });
      return trafficData;

    } catch (error) {
      console.error('Error fetching traffic data:', error);
      return this.getDefaultTrafficData();
    }
  }

  async fetchFromOpenStreetMap(bounds) {
    // OSM doesn't provide real-time traffic, but we can get road types and restrictions
    const query = `
      [out:json][timeout:15];
      (
        way["highway"]["maxspeed"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        way["highway"]["lanes"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        way["highway"]["surface"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      );
      out geom;
    `;

    try {
      const response = await axios.post('https://overpass-api.de/api/interpreter', query, {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 10000,
      });

      return this.parseOSMTrafficData(response.data);
    } catch (error) {
      console.error('OSM traffic fetch error:', error);
      return [];
    }
  }

  async fetchFromCommunityReports(bounds) {
    // Get community-reported traffic incidents
    const incidents = [];
    
    for (const [id, incident] of this.incidentData) {
      if (this.isWithinBounds(incident.location, bounds)) {
        incidents.push(incident);
      }
    }

    return incidents;
  }

  async fetchFromTomTom(bounds) {
    // TomTom Traffic API integration (requires API key)
    const apiKey = process.env.TOMTOM_API_KEY;
    if (!apiKey) return [];

    try {
      const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json`;
      const params = {
        key: apiKey,
        point: `${(bounds.north + bounds.south) / 2},${(bounds.east + bounds.west) / 2}`,
        unit: 'KMPH',
      };

      const response = await axios.get(url, { params, timeout: 5000 });
      return this.parseTomTomTrafficData(response.data);
    } catch (error) {
      console.error('TomTom traffic fetch error:', error);
      return [];
    }
  }

  parseOSMTrafficData(data) {
    const trafficSegments = [];
    
    if (!data.elements) return trafficSegments;

    data.elements.forEach(element => {
      if (element.type === 'way' && element.geometry) {
        const segment = {
          id: `osm_${element.id}`,
          coordinates: element.geometry.map(point => ({
            latitude: point.lat,
            longitude: point.lon,
          })),
          roadType: element.tags.highway,
          speedLimit: element.tags.maxspeed ? parseInt(element.tags.maxspeed) : null,
          lanes: element.tags.lanes ? parseInt(element.tags.lanes) : 1,
          surface: element.tags.surface || 'paved',
          trafficLevel: this.estimateTrafficLevel(element.tags),
          source: 'openstreetmap',
        };

        trafficSegments.push(segment);
      }
    });

    return trafficSegments;
  }

  estimateTrafficLevel(tags) {
    // Estimate traffic level based on road characteristics
    const roadType = tags.highway;
    const lanes = parseInt(tags.lanes) || 1;
    
    if (['motorway', 'trunk'].includes(roadType)) {
      return lanes > 3 ? 'moderate' : 'heavy';
    } else if (['primary', 'secondary'].includes(roadType)) {
      return 'moderate';
    } else {
      return 'light';
    }
  }

  parseTomTomTrafficData(data) {
    if (!data.flowSegmentData) return [];

    return [{
      id: `tomtom_${Date.now()}`,
      currentSpeed: data.flowSegmentData.currentSpeed,
      freeFlowSpeed: data.flowSegmentData.freeFlowSpeed,
      confidence: data.flowSegmentData.confidence,
      trafficLevel: this.calculateTrafficLevel(
        data.flowSegmentData.currentSpeed,
        data.flowSegmentData.freeFlowSpeed
      ),
      source: 'tomtom',
    }];
  }

  calculateTrafficLevel(currentSpeed, freeFlowSpeed) {
    const ratio = currentSpeed / freeFlowSpeed;
    
    if (ratio > 0.8) return 'light';
    if (ratio > 0.5) return 'moderate';
    return 'heavy';
  }

  mergeTrafficData(sources) {
    const mergedData = [];
    
    sources.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        mergedData.push(...result.value);
      }
    });

    return mergedData;
  }

  async reportTrafficIncident(location, type, severity, description = '') {
    const incident = {
      id: `incident_${Date.now()}`,
      location,
      type, // 'accident', 'construction', 'congestion', 'closure'
      severity, // 'low', 'medium', 'high'
      description,
      reportedAt: Date.now(),
      reportedBy: 'current_user',
      verified: false,
      votes: { up: 0, down: 0 },
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    };

    this.incidentData.set(incident.id, incident);
    await this.saveIncidentData();
    
    this.notifyListeners('incidentReported', { incident });
    return incident;
  }

  async checkForRerouting(currentRoute, currentLocation) {
    if (!this.settings.autoReroute) return null;

    try {
      // Get traffic data for current route
      const routeBounds = this.calculateRouteBounds(currentRoute.coordinates);
      const trafficData = await this.getTrafficData(routeBounds);
      
      // Analyze traffic conditions
      const trafficAnalysis = this.analyzeRouteTraffic(currentRoute, trafficData);
      
      if (this.shouldReroute(trafficAnalysis)) {
        const alternativeRoute = await this.findAlternativeRoute(
          currentLocation,
          currentRoute.destination,
          trafficAnalysis
        );

        if (alternativeRoute && this.isRerouteWorthwhile(currentRoute, alternativeRoute)) {
          return {
            reason: trafficAnalysis.reason,
            timeSaved: currentRoute.duration - alternativeRoute.duration,
            newRoute: alternativeRoute,
            trafficLevel: trafficAnalysis.overallLevel,
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error checking for rerouting:', error);
      return null;
    }
  }

  analyzeRouteTraffic(route, trafficData) {
    let heavySegments = 0;
    let moderateSegments = 0;
    let totalSegments = 0;
    let estimatedDelay = 0;

    trafficData.forEach(segment => {
      if (this.isSegmentOnRoute(segment, route.coordinates)) {
        totalSegments++;
        
        switch (segment.trafficLevel) {
          case 'heavy':
            heavySegments++;
            estimatedDelay += 300; // 5 minutes per heavy segment
            break;
          case 'moderate':
            moderateSegments++;
            estimatedDelay += 120; // 2 minutes per moderate segment
            break;
        }
      }
    });

    const heavyRatio = heavySegments / Math.max(totalSegments, 1);
    const moderateRatio = moderateSegments / Math.max(totalSegments, 1);

    let overallLevel = 'light';
    let reason = '';

    if (heavyRatio > 0.3) {
      overallLevel = 'heavy';
      reason = 'Heavy traffic detected on route';
    } else if (moderateRatio > 0.5) {
      overallLevel = 'moderate';
      reason = 'Moderate traffic conditions';
    }

    return {
      overallLevel,
      heavySegments,
      moderateSegments,
      totalSegments,
      estimatedDelay,
      reason,
    };
  }

  shouldReroute(trafficAnalysis) {
    const thresholds = {
      light: { delay: 600, heavyRatio: 0.1 }, // 10 minutes, 10% heavy
      moderate: { delay: 300, heavyRatio: 0.2 }, // 5 minutes, 20% heavy
      heavy: { delay: 120, heavyRatio: 0.3 }, // 2 minutes, 30% heavy
    };

    const threshold = thresholds[this.settings.trafficThreshold];
    
    return trafficAnalysis.estimatedDelay > threshold.delay ||
           (trafficAnalysis.heavySegments / Math.max(trafficAnalysis.totalSegments, 1)) > threshold.heavyRatio;
  }

  isRerouteWorthwhile(currentRoute, alternativeRoute) {
    const timeDifference = alternativeRoute.duration - currentRoute.duration;
    const maxExtraTime = this.settings.maxRerouteTime * 60; // Convert to seconds
    
    return timeDifference <= maxExtraTime;
  }

  async findAlternativeRoute(origin, destination, trafficAnalysis) {
    // This would integrate with the RoutingService to find alternatives
    // For now, return a placeholder
    return null;
  }

  // Utility methods
  generateCacheKey(bounds) {
    return `${bounds.north}_${bounds.south}_${bounds.east}_${bounds.west}`;
  }

  calculateRouteBounds(coordinates) {
    let north = -90, south = 90, east = -180, west = 180;
    
    coordinates.forEach(coord => {
      north = Math.max(north, coord.latitude);
      south = Math.min(south, coord.latitude);
      east = Math.max(east, coord.longitude);
      west = Math.min(west, coord.longitude);
    });

    // Add padding
    const padding = 0.01; // ~1km
    return {
      north: north + padding,
      south: south - padding,
      east: east + padding,
      west: west - padding,
    };
  }

  isWithinBounds(location, bounds) {
    return location.latitude >= bounds.south &&
           location.latitude <= bounds.north &&
           location.longitude >= bounds.west &&
           location.longitude <= bounds.east;
  }

  isSegmentOnRoute(segment, routeCoordinates) {
    // Simplified check - in reality would use more sophisticated geometry
    return segment.coordinates && segment.coordinates.some(coord =>
      routeCoordinates.some(routeCoord =>
        this.calculateDistance(coord, routeCoord) < 100 // 100m tolerance
      )
    );
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

  getDefaultTrafficData() {
    return [];
  }

  // Settings management
  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
    
    // Restart updates if frequency changed
    if (newSettings.updateFrequency) {
      this.stopPeriodicUpdates();
      this.startPeriodicUpdates();
    }
    
    this.notifyListeners('settingsUpdated', { settings: this.settings });
  }

  startPeriodicUpdates() {
    if (this.updateInterval) return;
    
    this.updateInterval = setInterval(() => {
      this.notifyListeners('periodicUpdate', { timestamp: Date.now() });
    }, this.settings.updateFrequency);
  }

  stopPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Persistence
  async saveSettings() {
    try {
      await AsyncStorage.setItem('liveTrafficSettings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving traffic settings:', error);
    }
  }

  async loadSettings() {
    try {
      const stored = await AsyncStorage.getItem('liveTrafficSettings');
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading traffic settings:', error);
    }
  }

  async saveIncidentData() {
    try {
      const incidents = Array.from(this.incidentData.values());
      await AsyncStorage.setItem('trafficIncidents', JSON.stringify(incidents));
    } catch (error) {
      console.error('Error saving incident data:', error);
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
        console.error('LiveTrafficService listener error:', error);
      }
    });
  }

  destroy() {
    this.stopPeriodicUpdates();
    this.listeners = [];
    this.trafficData.clear();
    this.incidentData.clear();
    this.isInitialized = false;
  }
}

export default new LiveTrafficService();
