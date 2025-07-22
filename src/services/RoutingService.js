import axios from 'axios';
import RoadObstacleService from './RoadObstacleService';
import CompassNavigationService from './CompassNavigationService';

class RoutingService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.currentRoute = null;
    this.routeHistory = [];
    this.carbonFootprintData = {
      vehicleTypes: {
        car: { co2PerKm: 0.12 }, // kg CO2 per km
        suv: { co2PerKm: 0.18 },
        truck: { co2PerKm: 0.25 },
        motorcycle: { co2PerKm: 0.08 },
        electric: { co2PerKm: 0.05 },
        bicycle: { co2PerKm: 0.0 },
        pedestrian: { co2PerKm: 0.0 },
      },
      defaultVehicle: 'car',
    };
    this.currentVehicleType = 'car';
    this.maxRerouteTime = 20 * 60; // 20 minutes in seconds
    this.routingProfiles = {
      car: 'driving',
      suv: 'driving',
      truck: 'driving',
      motorcycle: 'driving',
      electric: 'driving',
      bicycle: 'cycling',
      pedestrian: 'walking',
    };
    this.vehicleRestrictions = {
      car: [],
      suv: [],
      truck: ['weight_limits', 'height_limits', 'narrow_roads'],
      motorcycle: ['highway_restrictions'],
      electric: ['range_limitations'],
      bicycle: ['motorways', 'highways'],
      pedestrian: ['vehicle_roads'],
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize OSRM connection (using public demo server for now)
      this.osrmBaseUrl = 'https://router.project-osrm.org';
      this.isInitialized = true;
      console.log('RoutingService initialized successfully');
    } catch (error) {
      console.error('RoutingService initialization failed:', error);
      throw error;
    }
  }

  async getRoute(origin, destination, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const {
        profile = 'driving',
        alternatives = true,
        steps = true,
        geometries = 'geojson',
        overview = 'full',
        ecoMode = false,
        avoidTolls = false,
        avoidCameras = true,
        vehicleType = this.carbonFootprintData.defaultVehicle,
      } = options;

      // Build OSRM request URL
      const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
      const url = `${this.osrmBaseUrl}/route/v1/${profile}/${coordinates}`;
      
      const params = {
        alternatives: alternatives ? 'true' : 'false',
        steps: steps ? 'true' : 'false',
        geometries,
        overview,
        annotations: 'true', // Get additional data for eco calculations
      };

      const response = await axios.get(url, { params });
      
      if (response.data.code !== 'Ok') {
        throw new Error(`Routing failed: ${response.data.message}`);
      }

      // Process routes
      const routes = response.data.routes.map((route, index) => {
        const processedRoute = this.processRoute(route, {
          ecoMode,
          vehicleType,
          isAlternative: index > 0,
          avoidCameras,
        });

        return processedRoute;
      });

      // Apply obstacle avoidance if enabled
      if (avoidCameras) {
        await this.applyObstacleAvoidance(routes);
      }

      // Sort routes based on preferences
      const sortedRoutes = this.sortRoutes(routes, { ecoMode, avoidTolls });
      
      // Set current route
      this.currentRoute = sortedRoutes[0];
      this.addToHistory(this.currentRoute);
      
      // Notify listeners
      this.notifyListeners('routeCalculated', {
        routes: sortedRoutes,
        primary: this.currentRoute,
        options,
      });

      return sortedRoutes;
      
    } catch (error) {
      console.error('Route calculation error:', error);
      this.notifyListeners('routeError', { error: error.message });
      throw error;
    }
  }

  processRoute(route, options = {}) {
    const { ecoMode, vehicleType, isAlternative } = options;
    
    // Calculate basic metrics
    const distance = route.distance / 1000; // Convert to km
    const duration = route.duration / 60; // Convert to minutes
    
    // Calculate carbon footprint
    const carbonFootprint = this.calculateCarbonFootprint(distance, vehicleType);
    
    // Calculate eco score (0-100, higher is better)
    const ecoScore = this.calculateEcoScore(route, distance, duration);
    
    // Process geometry for map display
    const coordinates = route.geometry.coordinates.map(coord => ({
      latitude: coord[1],
      longitude: coord[0],
    }));

    // Process turn-by-turn instructions
    const instructions = route.legs[0]?.steps?.map((step, index) => ({
      id: index,
      instruction: this.formatInstruction(step),
      distance: step.distance,
      duration: step.duration,
      location: {
        latitude: step.maneuver.location[1],
        longitude: step.maneuver.location[0],
      },
      maneuver: step.maneuver.type,
      modifier: step.maneuver.modifier,
    })) || [];

    return {
      id: Date.now() + Math.random(),
      distance,
      duration,
      carbonFootprint,
      ecoScore,
      coordinates,
      instructions,
      isEcoFriendly: ecoScore > 70,
      isAlternative,
      routeType: ecoMode ? 'eco' : 'fastest',
      summary: {
        distance: `${distance.toFixed(1)} km`,
        duration: `${Math.round(duration)} min`,
        carbonSaved: ecoMode ? this.calculateCarbonSavings(distance, vehicleType) : 0,
        fuelSaved: ecoMode ? this.calculateFuelSavings(distance, vehicleType) : 0,
      },
      rawData: route, // Keep original data for debugging
    };
  }

  calculateCarbonFootprint(distanceKm, vehicleType) {
    const vehicleData = this.carbonFootprintData.vehicleTypes[vehicleType] || 
                       this.carbonFootprintData.vehicleTypes[this.carbonFootprintData.defaultVehicle];
    
    return distanceKm * vehicleData.co2PerKm;
  }

  calculateEcoScore(route, distance, duration) {
    // Base score
    let score = 50;
    
    // Favor shorter distances
    if (distance < 10) score += 20;
    else if (distance < 25) score += 10;
    else if (distance > 50) score -= 10;
    
    // Favor reasonable duration (not too slow, not too fast)
    const avgSpeed = distance / (duration / 60); // km/h
    if (avgSpeed >= 30 && avgSpeed <= 60) score += 15;
    else if (avgSpeed < 20 || avgSpeed > 80) score -= 15;
    
    // Analyze route annotations for traffic, road types, etc.
    // This would require more detailed OSRM data
    
    return Math.max(0, Math.min(100, score));
  }

  calculateCarbonSavings(distanceKm, vehicleType) {
    // Compare eco route with typical fastest route (estimated 15% savings)
    const normalFootprint = this.calculateCarbonFootprint(distanceKm, vehicleType);
    return normalFootprint * 0.15;
  }

  calculateFuelSavings(distanceKm, vehicleType) {
    // Estimate fuel savings (rough calculation)
    const fuelConsumptionPer100km = {
      car: 8, // liters per 100km
      suv: 12,
      truck: 20,
      motorcycle: 4,
      electric: 0,
    };
    
    const consumption = fuelConsumptionPer100km[vehicleType] || fuelConsumptionPer100km.car;
    const normalFuel = (distanceKm / 100) * consumption;
    return normalFuel * 0.15; // 15% savings
  }

  sortRoutes(routes, options = {}) {
    const { ecoMode, avoidTolls } = options;
    
    return routes.sort((a, b) => {
      if (ecoMode) {
        // Prioritize eco score, then duration
        if (a.ecoScore !== b.ecoScore) {
          return b.ecoScore - a.ecoScore;
        }
        return a.duration - b.duration;
      } else {
        // Prioritize duration, then distance
        if (Math.abs(a.duration - b.duration) > 5) {
          return a.duration - b.duration;
        }
        return a.distance - b.distance;
      }
    });
  }

  formatInstruction(step) {
    const { maneuver, name, distance } = step;
    const distanceText = distance > 1000 ?
      `${(distance / 1000).toFixed(1)} km` :
      `${Math.round(distance)} m`;

    const roadName = name || 'the road';
    let instruction;

    switch (maneuver.type) {
      case 'depart':
        instruction = `Head ${maneuver.modifier || 'straight'} on ${roadName}`;
        break;
      case 'turn':
        instruction = `Turn ${maneuver.modifier} onto ${roadName}`;
        break;
      case 'merge':
        instruction = `Merge ${maneuver.modifier} onto ${roadName}`;
        break;
      case 'ramp':
        instruction = `Take the ramp ${maneuver.modifier} onto ${roadName}`;
        break;
      case 'roundabout':
        instruction = `Enter roundabout and take exit onto ${roadName}`;
        break;
      case 'arrive':
        instruction = `Arrive at destination`;
        break;
      default:
        instruction = `Continue on ${roadName} for ${distanceText}`;
    }

    // Add compass direction if enabled
    if (CompassNavigationService.isVisualDirectionsEnabled()) {
      const bearing = this.calculateInstructionBearing(step);
      instruction = CompassNavigationService.formatNavigationWithCompass(
        instruction,
        bearing,
        roadName
      );
    }

    return instruction;
  }

  calculateInstructionBearing(step) {
    // Calculate bearing based on maneuver location and next point
    if (step.maneuver && step.maneuver.location) {
      const [lon, lat] = step.maneuver.location;

      // Use current heading or calculate from geometry
      const currentHeading = CompassNavigationService.getCurrentHeading();

      // Adjust bearing based on maneuver type
      switch (step.maneuver.type) {
        case 'turn':
          if (step.maneuver.modifier === 'left') {
            return (currentHeading - 90 + 360) % 360;
          } else if (step.maneuver.modifier === 'right') {
            return (currentHeading + 90) % 360;
          }
          break;
        case 'depart':
        case 'continue':
        default:
          return currentHeading;
      }
    }

    return CompassNavigationService.getCurrentHeading();
  }

  addToHistory(route) {
    this.routeHistory.unshift({
      ...route,
      timestamp: Date.now(),
    });
    
    // Keep only last 50 routes
    if (this.routeHistory.length > 50) {
      this.routeHistory = this.routeHistory.slice(0, 50);
    }
  }

  getCurrentRoute() {
    return this.currentRoute;
  }

  getRouteHistory() {
    return [...this.routeHistory];
  }

  getEcoStats() {
    const totalRoutes = this.routeHistory.length;
    const ecoRoutes = this.routeHistory.filter(route => route.isEcoFriendly).length;
    const totalCarbonSaved = this.routeHistory.reduce((sum, route) => 
      sum + (route.summary.carbonSaved || 0), 0);
    const totalFuelSaved = this.routeHistory.reduce((sum, route) => 
      sum + (route.summary.fuelSaved || 0), 0);
    
    return {
      totalRoutes,
      ecoRoutes,
      ecoPercentage: totalRoutes > 0 ? (ecoRoutes / totalRoutes) * 100 : 0,
      totalCarbonSaved,
      totalFuelSaved,
      averageEcoScore: totalRoutes > 0 ? 
        this.routeHistory.reduce((sum, route) => sum + route.ecoScore, 0) / totalRoutes : 0,
    };
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
        console.error('RoutingService listener error:', error);
      }
    });
  }

  async applyObstacleAvoidance(routes) {
    try {
      await RoadObstacleService.initialize();

      routes.forEach(route => {
        // Get obstacles near this route
        const nearbyObstacles = RoadObstacleService.getObstaclesNearRoute(route.coordinates);

        // Filter obstacles that should be avoided
        const avoidableObstacles = nearbyObstacles.filter(obstacle =>
          RoadObstacleService.shouldAvoidObstacle(obstacle)
        );

        // Calculate avoidance impact
        const avoidanceImpact = RoadObstacleService.calculateRouteAvoidanceImpact(route.coordinates);

        // Add obstacle information to route
        route.obstacleInfo = {
          totalObstacles: nearbyObstacles.length,
          avoidableObstacles: avoidableObstacles.length,
          obstacles: nearbyObstacles,
          obstacleAlerts: this.generateObstacleAlerts(nearbyObstacles),
          avoidanceImpact,
        };

        // Adjust route score and timing based on obstacles
        if (avoidableObstacles.length > 0) {
          route.ecoScore = Math.max(0, route.ecoScore - (avoidableObstacles.length * 3));
          route.duration += avoidanceImpact.estimatedExtraTime; // Add extra time in seconds
          route.obstacleFriendly = false;
          route.avoidanceApplied = true;
        } else {
          route.obstacleFriendly = true;
          route.avoidanceApplied = false;
        }

        // Add specific obstacle type penalties
        const obstacleTypes = avoidanceImpact.obstacleTypes;
        if (obstacleTypes.toll_road || obstacleTypes.toll_booth) {
          route.tollFree = false;
          route.estimatedTollCost = this.estimateTollCost(obstacleTypes);
        } else {
          route.tollFree = true;
          route.estimatedTollCost = 0;
        }
      });

    } catch (error) {
      console.error('Error applying obstacle avoidance:', error);
    }
  }

  generateObstacleAlerts(obstacles) {
    return obstacles.map(obstacle => ({
      id: obstacle.id,
      type: obstacle.type,
      subtype: obstacle.subtype,
      location: obstacle.location,
      distance: obstacle.distanceFromRoute,
      alertMessage: this.getObstacleAlertMessage(obstacle),
      severity: obstacle.severity,
      timeImpact: obstacle.timeImpact,
      avoidanceRadius: obstacle.avoidanceRadius,
    }));
  }

  getObstacleAlertMessage(obstacle) {
    switch (obstacle.type) {
      case 'speed_camera':
        return obstacle.tags?.maxspeed
          ? `Speed camera ahead - Limit: ${obstacle.tags.maxspeed} km/h`
          : 'Speed camera ahead';
      case 'red_light_camera':
        return 'Red light camera ahead';
      case 'traffic_camera':
        return 'Traffic enforcement camera ahead';
      case 'railway_crossing':
        return 'Railway crossing ahead - Prepare to stop';
      case 'toll_booth':
        return 'Toll booth ahead - Have payment ready';
      case 'toll_road':
        return 'Toll road ahead';
      case 'motorway_junction':
        return 'Complex junction ahead - Stay alert';
      case 'roundabout':
        return 'Roundabout ahead';
      case 'construction_zone':
        return 'Construction zone ahead - Reduce speed';
      case 'school_zone':
        return 'School zone ahead - Reduce speed';
      case 'ferry_terminal':
        return 'Ferry terminal ahead';
      case 'ferry_route':
        return 'Ferry crossing ahead';
      case 'narrow_road':
        return 'Narrow road ahead - Drive carefully';
      case 'steep_grade':
        return 'Steep grade ahead';
      case 'unpaved_road':
        return 'Unpaved road ahead';
      default:
        return `${obstacle.type.replace('_', ' ')} ahead`;
    }
  }

  estimateTollCost(obstacleTypes) {
    // Rough toll cost estimation based on obstacle types
    let cost = 0;
    if (obstacleTypes.toll_booth) cost += obstacleTypes.toll_booth * 2.50; // $2.50 per toll booth
    if (obstacleTypes.toll_road) cost += obstacleTypes.toll_road * 0.15; // $0.15 per km estimate
    return Math.round(cost * 100) / 100; // Round to 2 decimal places
  }

  async getAlternativeRouteAvoidingObstacles(origin, destination, options = {}) {
    try {
      await RoadObstacleService.initialize();

      // Get initial route
      const initialRoutes = await this.getRoute(origin, destination, {
        ...options,
        avoidCameras: false, // Don't apply avoidance yet
      });

      if (!initialRoutes || initialRoutes.length === 0) {
        return [];
      }

      // Find obstacles on the primary route
      const primaryRoute = initialRoutes[0];
      const routeObstacles = RoadObstacleService.getObstaclesNearRoute(primaryRoute.coordinates);
      const avoidableObstacles = routeObstacles.filter(obstacle =>
        RoadObstacleService.shouldAvoidObstacle(obstacle)
      );

      if (avoidableObstacles.length === 0) {
        return initialRoutes; // No obstacles to avoid
      }

      // Calculate avoidance impact
      const avoidanceImpact = RoadObstacleService.calculateRouteAvoidanceImpact(primaryRoute.coordinates);

      // Check if avoidance is worth it (don't exceed max extra time)
      const maxExtraTimeSeconds = RoadObstacleService.getSettings().maxExtraTime * 60;
      if (avoidanceImpact.estimatedExtraTime > maxExtraTimeSeconds) {
        // Mark route but don't apply avoidance
        primaryRoute.obstacleAvoidanceSkipped = true;
        primaryRoute.avoidanceReason = 'Exceeds maximum extra time limit';
        return initialRoutes;
      }

      // Generate avoidance points
      const avoidancePoints = RoadObstacleService.generateRouteAvoidancePoints(primaryRoute.coordinates);

      // Request alternative route with avoidance (this would require OSRM with custom profiles)
      // For now, we'll mark the route with obstacle information and adjust timing
      primaryRoute.obstacleAvoidanceApplied = true;
      primaryRoute.avoidedObstacles = avoidableObstacles.length;
      primaryRoute.avoidancePoints = avoidancePoints;
      primaryRoute.originalDuration = primaryRoute.duration;
      primaryRoute.duration += avoidanceImpact.estimatedExtraTime;

      return initialRoutes;

    } catch (error) {
      console.error('Error getting obstacle-avoiding route:', error);
      return await this.getRoute(origin, destination, options);
    }
  }

  // Enhanced route sorting to consider obstacle avoidance
  sortRoutes(routes, options = {}) {
    const { ecoMode, avoidTolls, avoidCameras } = options;

    return routes.sort((a, b) => {
      // Toll avoidance priority (if specifically requested)
      if (avoidTolls && a.tollFree !== b.tollFree) {
        return a.tollFree ? -1 : 1;
      }

      // Obstacle avoidance priority
      if (avoidCameras && a.obstacleFriendly !== b.obstacleFriendly) {
        return a.obstacleFriendly ? -1 : 1;
      }

      if (ecoMode) {
        // Prioritize eco score, then obstacle-friendly, then duration
        if (Math.abs(a.ecoScore - b.ecoScore) > 5) {
          return b.ecoScore - a.ecoScore;
        }
        if (avoidCameras && a.obstacleInfo && b.obstacleInfo) {
          const aObstacles = a.obstacleInfo.avoidableObstacles;
          const bObstacles = b.obstacleInfo.avoidableObstacles;
          if (aObstacles !== bObstacles) {
            return aObstacles - bObstacles;
          }
        }
        return a.duration - b.duration;
      } else {
        // Prioritize duration, then obstacle avoidance, then distance
        if (Math.abs(a.duration - b.duration) > 300) { // 5 minutes difference
          return a.duration - b.duration;
        }
        if (avoidCameras && a.obstacleInfo && b.obstacleInfo) {
          const aObstacles = a.obstacleInfo.avoidableObstacles;
          const bObstacles = b.obstacleInfo.avoidableObstacles;
          if (aObstacles !== bObstacles) {
            return aObstacles - bObstacles;
          }

          // Consider severity of obstacles
          const aSeverity = a.obstacleInfo.avoidanceImpact?.severity || 'none';
          const bSeverity = b.obstacleInfo.avoidanceImpact?.severity || 'none';
          const severityOrder = { none: 0, low: 1, medium: 2, high: 3 };
          if (severityOrder[aSeverity] !== severityOrder[bSeverity]) {
            return severityOrder[aSeverity] - severityOrder[bSeverity];
          }
        }
        return a.distance - b.distance;
      }
    });
  }

  // Vehicle type management
  async updateVehicleType(vehicleType) {
    if (!this.carbonFootprintData.vehicleTypes[vehicleType]) {
      throw new Error(`Unsupported vehicle type: ${vehicleType}`);
    }

    this.currentVehicleType = vehicleType;
    this.notifyListeners('vehicleTypeUpdated', { vehicleType });
  }

  getCurrentVehicleType() {
    return this.currentVehicleType;
  }

  getVehicleProfile(vehicleType = this.currentVehicleType) {
    return this.routingProfiles[vehicleType] || 'driving';
  }

  getVehicleRestrictions(vehicleType = this.currentVehicleType) {
    return this.vehicleRestrictions[vehicleType] || [];
  }

  // Enhanced rerouting with time limits
  async findAlternativeRouteWithTimeLimit(origin, destination, options = {}) {
    const routes = await this.getRoute(origin, destination, {
      ...options,
      alternatives: true,
      maxExtraTime: this.maxRerouteTime,
    });

    if (!routes || routes.length === 0) return null;

    // Filter routes that don't exceed time limit
    const viableRoutes = routes.filter(route => {
      const extraTime = route.duration - routes[0].duration;
      return extraTime <= this.maxRerouteTime;
    });

    return viableRoutes.length > 1 ? viableRoutes[1] : null; // Return second best route
  }

  updateMaxRerouteTime(minutes) {
    this.maxRerouteTime = minutes * 60; // Convert to seconds
    this.notifyListeners('maxRerouteTimeUpdated', { minutes });
  }

  destroy() {
    this.listeners = [];
    this.currentRoute = null;
    this.isInitialized = false;
  }
}

export default new RoutingService();
