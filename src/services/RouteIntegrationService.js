import AsyncStorage from '@react-native-async-storage/async-storage';
import RoutingService from './RoutingService';
import POIService from './POIService';

class RouteIntegrationService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.currentRoute = null;
    this.waypoints = [];
    this.poiWaypoints = [];
    this.routeWithPOIs = null;
    this.settings = {
      autoSuggestPOIs: true,
      maxWaypoints: 8,
      maxDetourTime: 20, // minutes
      preferredPOICategories: ['fuel', 'food'],
      announceNearbyPOIs: true,
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadSettings();
      this.isInitialized = true;
      console.log('RouteIntegrationService initialized successfully');
    } catch (error) {
      console.error('RouteIntegrationService initialization failed:', error);
      throw error;
    }
  }

  async calculateRouteWithPOIs(origin, destination, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const {
        includePOIs = false,
        poiCategories = this.settings.preferredPOICategories,
        maxDetourTime = this.settings.maxDetourTime,
        waypoints = [],
      } = options;

      // Calculate base route
      const baseRoutes = await RoutingService.getRoute(origin, destination, options);
      if (!baseRoutes || baseRoutes.length === 0) {
        throw new Error('No routes found');
      }

      const primaryRoute = baseRoutes[0];
      this.currentRoute = primaryRoute;

      if (!includePOIs) {
        return baseRoutes;
      }

      // Find POIs along the route
      const routePOIs = await this.findPOIsAlongRoute(primaryRoute, poiCategories);
      
      // Filter POIs that don't add too much time
      const viablePOIs = await this.filterViablePOIs(routePOIs, primaryRoute, maxDetourTime);
      
      // Create route variants with POI waypoints
      const routeVariants = await this.createRouteVariantsWithPOIs(
        origin, 
        destination, 
        viablePOIs, 
        options
      );

      // Combine base routes with POI variants
      const allRoutes = [...baseRoutes, ...routeVariants];
      
      // Sort by preference (time, eco-friendliness, POI convenience)
      const sortedRoutes = this.sortRoutesByPreference(allRoutes, options);

      this.notifyListeners('routeWithPOIsCalculated', {
        routes: sortedRoutes,
        pois: viablePOIs,
        options,
      });

      return sortedRoutes;

    } catch (error) {
      console.error('Error calculating route with POIs:', error);
      throw error;
    }
  }

  async findPOIsAlongRoute(route, categories) {
    const routePOIs = [];
    const searchRadius = 2000; // 2km radius from route
    const routePoints = this.sampleRoutePoints(route.coordinates, 5000); // Every 5km

    for (const point of routePoints) {
      for (const category of categories) {
        try {
          const nearbyPOIs = await POIService.searchPOIsWithFilters(
            { latitude: point[1], longitude: point[0] },
            category,
            searchRadius,
            { openNow: true, minRating: 3.0 }
          );

          // Add distance from route and route progress
          const poisWithRouteInfo = nearbyPOIs.map(poi => ({
            ...poi,
            distanceFromRoute: this.calculateDistanceFromRoute(poi.location, route.coordinates),
            routeProgress: this.calculateRouteProgress(poi.location, route.coordinates),
          }));

          routePOIs.push(...poisWithRouteInfo);
        } catch (error) {
          console.error(`Error finding ${category} POIs:`, error);
        }
      }
    }

    // Remove duplicates and sort by route progress
    const uniquePOIs = this.removeDuplicatePOIs(routePOIs);
    return uniquePOIs.sort((a, b) => a.routeProgress - b.routeProgress);
  }

  sampleRoutePoints(coordinates, intervalMeters) {
    const points = [];
    let accumulatedDistance = 0;
    
    for (let i = 1; i < coordinates.length; i++) {
      const prev = coordinates[i - 1];
      const curr = coordinates[i];
      
      const segmentDistance = this.calculateDistance(
        prev[1], prev[0], curr[1], curr[0]
      );
      
      accumulatedDistance += segmentDistance;
      
      if (accumulatedDistance >= intervalMeters) {
        points.push(curr);
        accumulatedDistance = 0;
      }
    }
    
    return points;
  }

  calculateDistanceFromRoute(poiLocation, routeCoordinates) {
    let minDistance = Infinity;
    
    for (const coord of routeCoordinates) {
      const distance = this.calculateDistance(
        poiLocation.latitude,
        poiLocation.longitude,
        coord[1],
        coord[0]
      );
      minDistance = Math.min(minDistance, distance);
    }
    
    return minDistance;
  }

  calculateRouteProgress(poiLocation, routeCoordinates) {
    let minDistance = Infinity;
    let closestIndex = 0;
    
    routeCoordinates.forEach((coord, index) => {
      const distance = this.calculateDistance(
        poiLocation.latitude,
        poiLocation.longitude,
        coord[1],
        coord[0]
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
    
    return closestIndex / routeCoordinates.length;
  }

  async filterViablePOIs(pois, baseRoute, maxDetourTime) {
    const viablePOIs = [];
    
    for (const poi of pois) {
      // Skip POIs too far from route
      if (poi.distanceFromRoute > 1000) continue;
      
      // Calculate detour time
      const detourTime = await this.calculateDetourTime(poi, baseRoute);
      
      if (detourTime <= maxDetourTime * 60) { // Convert minutes to seconds
        viablePOIs.push({
          ...poi,
          detourTime,
          detourMinutes: Math.round(detourTime / 60),
        });
      }
    }
    
    return viablePOIs;
  }

  async calculateDetourTime(poi, baseRoute) {
    try {
      // Find insertion point in route
      const insertionIndex = this.findBestInsertionPoint(poi.location, baseRoute.coordinates);
      
      // Calculate route with POI as waypoint
      const routeStart = baseRoute.coordinates[0];
      const routeEnd = baseRoute.coordinates[baseRoute.coordinates.length - 1];
      
      const routeWithPOI = await RoutingService.getRoute(
        { latitude: routeStart[1], longitude: routeStart[0] },
        { latitude: routeEnd[1], longitude: routeEnd[0] },
        {
          waypoints: [{
            latitude: poi.location.latitude,
            longitude: poi.location.longitude,
          }],
        }
      );
      
      if (routeWithPOI && routeWithPOI.length > 0) {
        const detourTime = routeWithPOI[0].duration - baseRoute.duration;
        return Math.max(0, detourTime);
      }
      
      return Infinity;
    } catch (error) {
      console.error('Error calculating detour time:', error);
      return Infinity;
    }
  }

  findBestInsertionPoint(poiLocation, routeCoordinates) {
    let minDetourDistance = Infinity;
    let bestIndex = 0;
    
    for (let i = 0; i < routeCoordinates.length - 1; i++) {
      const segmentStart = routeCoordinates[i];
      const segmentEnd = routeCoordinates[i + 1];
      
      // Calculate detour distance for inserting POI between these points
      const detourDistance = 
        this.calculateDistance(segmentStart[1], segmentStart[0], poiLocation.latitude, poiLocation.longitude) +
        this.calculateDistance(poiLocation.latitude, poiLocation.longitude, segmentEnd[1], segmentEnd[0]) -
        this.calculateDistance(segmentStart[1], segmentStart[0], segmentEnd[1], segmentEnd[0]);
      
      if (detourDistance < minDetourDistance) {
        minDetourDistance = detourDistance;
        bestIndex = i + 1;
      }
    }
    
    return bestIndex;
  }

  async createRouteVariantsWithPOIs(origin, destination, pois, options) {
    const variants = [];
    const maxVariants = 3;
    
    // Group POIs by category and route progress
    const poiGroups = this.groupPOIsByCategory(pois);
    
    for (const [category, categoryPOIs] of Object.entries(poiGroups)) {
      if (variants.length >= maxVariants) break;
      
      // Select best POI from each category
      const bestPOI = categoryPOIs.sort((a, b) => {
        // Prefer closer POIs with better ratings
        const scoreA = (5 - a.detourMinutes / 5) + (a.rating || 3);
        const scoreB = (5 - b.detourMinutes / 5) + (b.rating || 3);
        return scoreB - scoreA;
      })[0];
      
      try {
        const routeWithPOI = await RoutingService.getRoute(origin, destination, {
          ...options,
          waypoints: [{
            latitude: bestPOI.location.latitude,
            longitude: bestPOI.location.longitude,
            name: bestPOI.name,
            category: bestPOI.category,
          }],
        });
        
        if (routeWithPOI && routeWithPOI.length > 0) {
          const enhancedRoute = {
            ...routeWithPOI[0],
            id: `poi_${bestPOI.id}_${routeWithPOI[0].id}`,
            routeType: `${category}_stop`,
            poiWaypoint: bestPOI,
            detourTime: bestPOI.detourMinutes,
            summary: {
              ...routeWithPOI[0].summary,
              poiStop: `${bestPOI.name} (+${bestPOI.detourMinutes} min)`,
            },
          };
          
          variants.push(enhancedRoute);
        }
      } catch (error) {
        console.error(`Error creating route variant with ${category} POI:`, error);
      }
    }
    
    return variants;
  }

  groupPOIsByCategory(pois) {
    const groups = {};
    
    pois.forEach(poi => {
      if (!groups[poi.category]) {
        groups[poi.category] = [];
      }
      groups[poi.category].push(poi);
    });
    
    return groups;
  }

  sortRoutesByPreference(routes, options) {
    return routes.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      
      // Base route gets bonus
      if (!a.poiWaypoint) scoreA += 10;
      if (!b.poiWaypoint) scoreB += 10;
      
      // Shorter time is better
      scoreA += (3600 - Math.min(a.duration, 3600)) / 60;
      scoreB += (3600 - Math.min(b.duration, 3600)) / 60;
      
      // Eco-friendly routes get bonus
      if (a.ecoScore) scoreA += a.ecoScore / 10;
      if (b.ecoScore) scoreB += b.ecoScore / 10;
      
      // POI convenience bonus
      if (a.poiWaypoint && a.detourTime <= 10) scoreA += 5;
      if (b.poiWaypoint && b.detourTime <= 10) scoreB += 5;
      
      return scoreB - scoreA;
    });
  }

  removeDuplicatePOIs(pois) {
    const unique = new Map();
    
    pois.forEach(poi => {
      const key = `${Math.round(poi.location.latitude * 1000)}_${Math.round(poi.location.longitude * 1000)}_${poi.name}`;
      if (!unique.has(key) || unique.get(key).rating < poi.rating) {
        unique.set(key, poi);
      }
    });
    
    return Array.from(unique.values());
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  // Settings management
  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
    this.notifyListeners('settingsUpdated', { settings: this.settings });
  }

  async saveSettings() {
    try {
      await AsyncStorage.setItem('routeIntegrationSettings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving route integration settings:', error);
    }
  }

  async loadSettings() {
    try {
      const stored = await AsyncStorage.getItem('routeIntegrationSettings');
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading route integration settings:', error);
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
        console.error('RouteIntegrationService listener error:', error);
      }
    });
  }

  destroy() {
    this.listeners = [];
    this.isInitialized = false;
  }
}

export default new RouteIntegrationService();
