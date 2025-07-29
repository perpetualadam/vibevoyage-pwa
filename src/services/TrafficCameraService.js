// Enhanced Traffic Camera and Road Obstacle Detection Service
// Browser-compatible service for web applications

// Browser-compatible storage helper
const BrowserStorage = {
  async getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('localStorage not available:', error);
      return null;
    }
  },

  async setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('localStorage not available:', error);
    }
  }
};

class RoadObstacleService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.obstacleDatabase = new Map();
    this.userReportedObstacles = [];
    this.avoidanceSettings = {
      // Traffic Cameras
      avoidSpeedCameras: true,
      avoidRedLightCameras: true,
      avoidTrafficEnforcement: true,

      // Law Enforcement
      avoidPoliceCheckpoints: false,
      avoidPoliceStations: false,

      // Road Infrastructure
      avoidRailwayCrossings: true, // Enable by default due to 20min delays
      avoidDifficultJunctions: false,
      avoidMotorways: false,
      avoidTollRoads: true,

      // Road Conditions
      avoidUnpavedRoads: false,
      avoidNarrowRoads: false,
      avoidSteepGrades: false,
      avoidFerries: false,

      // Timing & Distance
      maxExtraTime: 20, // minutes - maximum extra time for ENTIRE journey
      railwayCrossingDelay: 180, // 3 minutes typical crossing delay
      maxDetourTime: 1200, // 20 minutes max detour for entire journey
      alertDistance: 500, // meters
      routeAvoidanceRadius: 200, // meters around obstacle
      railwayCrossingRadius: 300, // moderate radius for railway crossings

      // Advanced Options
      avoidSchoolZones: false,
      avoidConstructionZones: true,
      avoidFloodProneAreas: false,
      prioritizeMainRoads: false,
    };
    this.cacheDuration = 24 * 60 * 60 * 1000; // 24 hours
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadSettings();
      await this.loadUserReportedObstacles();
      await this.loadObstacleDatabase();
      this.isInitialized = true;
      console.log('RoadObstacleService initialized successfully');
    } catch (error) {
      console.error('TrafficCameraService initialization failed:', error);
      throw error;
    }
  }

  async loadObstacleDatabase() {
    try {
      // Load from local storage first
      const stored = await BrowserStorage.getItem('roadObstacleDatabase');
      if (stored) {
        const data = JSON.parse(stored);
        if (Date.now() - data.timestamp < this.cacheDuration) {
          data.obstacles.forEach(obstacle => {
            this.obstacleDatabase.set(obstacle.id, obstacle);
          });
          return;
        }
      }

      // Fetch from community sources and OpenStreetMap
      await this.fetchObstacleData();

    } catch (error) {
      console.error('Error loading obstacle database:', error);
    }
  }

  async fetchObstacleData() {
    try {
      // Fetch from multiple sources
      const sources = [
        this.fetchFromOpenStreetMap(),
        this.fetchFromCommunityReports(),
        this.fetchFromGovernmentData(),
      ];

      const results = await Promise.allSettled(sources);
      const allObstacles = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allObstacles.push(...result.value);
        } else {
          console.warn(`Obstacle data source ${index} failed:`, result.reason);
        }
      });

      // Deduplicate and store
      const uniqueObstacles = this.deduplicateObstacles(allObstacles);
      uniqueObstacles.forEach(obstacle => {
        this.obstacleDatabase.set(obstacle.id, obstacle);
      });

      // Cache to storage
      await BrowserStorage.setItem('roadObstacleDatabase', JSON.stringify({
        obstacles: uniqueObstacles,
        timestamp: Date.now(),
      }));

      this.notifyListeners('obstacleDataUpdated', { count: uniqueObstacles.length });

    } catch (error) {
      console.error('Error fetching obstacle data:', error);
    }
  }

  async fetchFromOpenStreetMap() {
    // Query OpenStreetMap for all road obstacles using Overpass API
    const query = `
      [out:json][timeout:30];
      (
        // Traffic Cameras
        node["highway"="speed_camera"];
        node["man_made"="surveillance"]["surveillance:type"="camera"]["surveillance"="traffic"];
        node["highway"="traffic_signals"]["camera"="yes"];

        // Police/Law Enforcement
        node["amenity"="police"];
        node["highway"="checkpoint"];

        // Railway Crossings
        node["railway"="level_crossing"];
        node["railway"="crossing"];

        // Difficult Junctions
        node["highway"="motorway_junction"];
        node["junction"="roundabout"];
        way["junction"="roundabout"];

        // Toll Roads
        way["toll"="yes"];
        node["barrier"="toll_booth"];

        // Road Conditions
        way["surface"~"unpaved|gravel|dirt|sand|grass"];
        way["highway"]["width"<"3"];
        way["highway"]["incline">="10%"];

        // Ferries
        way["route"="ferry"];
        node["amenity"="ferry_terminal"];

        // School Zones
        way["highway"]["zone:traffic"="school"];
        node["amenity"="school"];

        // Construction
        way["highway"]["construction"];
        node["highway"="construction"];
      );
      out center meta;
    `;

    try {
      const response = await axios.post('https://overpass-api.de/api/interpreter', query, {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 20000,
      });

      return this.parseOSMObstacleData(response.data);
    } catch (error) {
      console.error('OSM obstacle fetch error:', error);
      return [];
    }
  }

  parseOSMObstacleData(data) {
    const obstacles = [];

    if (!data.elements) return obstacles;

    data.elements.forEach(element => {
      const location = this.getElementLocation(element);
      if (!location) return;

      const obstacle = {
        id: `osm_${element.id}`,
        type: this.determineObstacleType(element.tags, element.type),
        subtype: this.determineObstacleSubtype(element.tags),
        location,
        source: 'openstreetmap',
        verified: true,
        tags: element.tags,
        geometry: element.type === 'way' ? this.extractWayGeometry(element) : null,
        lastUpdated: Date.now(),
        confidence: 0.9, // High confidence for OSM data
        avoidanceRadius: this.getAvoidanceRadius(element.tags),
        severity: this.getObstacleSeverity(element.tags),
        timeImpact: this.getTimeImpact(element.tags),
      };

      obstacles.push(obstacle);
    });

    return obstacles;
  }

  getElementLocation(element) {
    if (element.lat && element.lon) {
      return { latitude: element.lat, longitude: element.lon };
    }
    if (element.center && element.center.lat && element.center.lon) {
      return { latitude: element.center.lat, longitude: element.center.lon };
    }
    return null;
  }

  extractWayGeometry(element) {
    if (element.geometry) {
      return element.geometry.map(point => ({
        latitude: point.lat,
        longitude: point.lon,
      }));
    }
    return null;
  }

  determineObstacleType(tags, elementType) {
    // Traffic Cameras
    if (tags.highway === 'speed_camera') return 'speed_camera';
    if (tags.highway === 'traffic_signals' && tags.camera === 'yes') return 'red_light_camera';
    if (tags['surveillance:type'] === 'camera' && tags.surveillance === 'traffic') return 'traffic_camera';

    // Police/Law Enforcement
    if (tags.amenity === 'police') return 'police_station';
    if (tags.highway === 'checkpoint') return 'police_checkpoint';

    // Railway Crossings
    if (tags.railway === 'level_crossing' || tags.railway === 'crossing') return 'railway_crossing';

    // Junctions
    if (tags.highway === 'motorway_junction') return 'motorway_junction';
    if (tags.junction === 'roundabout') return 'roundabout';

    // Toll Infrastructure
    if (tags.toll === 'yes' && elementType === 'way') return 'toll_road';
    if (tags.barrier === 'toll_booth') return 'toll_booth';

    // Road Conditions
    if (tags.surface && ['unpaved', 'gravel', 'dirt', 'sand', 'grass'].includes(tags.surface)) return 'unpaved_road';
    if (tags.width && parseFloat(tags.width) < 3) return 'narrow_road';
    if (tags.incline && parseFloat(tags.incline.replace('%', '')) >= 10) return 'steep_grade';

    // Ferries
    if (tags.route === 'ferry') return 'ferry_route';
    if (tags.amenity === 'ferry_terminal') return 'ferry_terminal';

    // School Zones
    if (tags['zone:traffic'] === 'school') return 'school_zone';
    if (tags.amenity === 'school') return 'school_area';

    // Construction
    if (tags.construction || tags.highway === 'construction') return 'construction_zone';

    // Motorways
    if (tags.highway === 'motorway' || tags.highway === 'motorway_link') return 'motorway';

    return 'unknown_obstacle';
  }

  determineObstacleSubtype(tags) {
    if (tags.enforcement) return tags.enforcement;
    if (tags.construction) return tags.construction;
    if (tags.surface) return tags.surface;
    if (tags.barrier) return tags.barrier;
    return null;
  }

  getAvoidanceRadius(tags) {
    const type = this.determineObstacleType(tags);

    switch (type) {
      case 'speed_camera':
      case 'red_light_camera':
      case 'traffic_camera':
        return 100; // 100m radius
      case 'railway_crossing':
        return 1000; // Large radius for absolute railway crossing avoidance
      case 'motorway_junction':
      case 'roundabout':
        return 200;
      case 'toll_road':
      case 'toll_booth':
        return 500; // Larger radius for toll roads
      case 'construction_zone':
        return 300;
      case 'school_zone':
        return 150;
      case 'ferry_route':
      case 'ferry_terminal':
        return 1000; // Large radius for ferries
      default:
        return 100;
    }
  }

  getObstacleSeverity(tags) {
    const type = this.determineObstacleType(tags);

    switch (type) {
      case 'speed_camera':
      case 'red_light_camera':
        return 'high';
      case 'police_checkpoint':
        return 'medium';
      case 'police_station':
        return 'low';
      case 'railway_crossing':
      case 'toll_road':
      case 'ferry_route':
        return 'high';
      case 'motorway_junction':
      case 'construction_zone':
        return 'medium';
      case 'roundabout':
      case 'narrow_road':
      case 'steep_grade':
        return 'medium';
      case 'school_zone':
      case 'unpaved_road':
        return 'low';
      default:
        return 'low';
    }
  }

  getTimeImpact(tags) {
    const type = this.determineObstacleType(tags);

    // Time impact in seconds
    switch (type) {
      case 'police_checkpoint':
        return 90; // 1.5 minutes for checkpoint
      case 'police_station':
        return 15; // 15 seconds for police area
      case 'railway_crossing':
        return 180; // 3 minutes typical wait (realistic UK level crossing delay)
      case 'toll_booth':
        return 60; // 1 minute for toll payment
      case 'ferry_route':
        return 900; // 15 minutes ferry crossing
      case 'construction_zone':
        return 180; // 3 minutes delay
      case 'motorway_junction':
        return 30; // 30 seconds for complex junction
      case 'roundabout':
        return 15; // 15 seconds for roundabout
      case 'school_zone':
        return 45; // 45 seconds for reduced speed
      case 'steep_grade':
        return 60; // 1 minute for steep climb
      default:
        return 10; // 10 seconds general delay
    }
  }

  async fetchFromCommunityReports() {
    // Get community-reported obstacles
    return [...this.userReportedObstacles];
  }

  async fetchFromGovernmentData() {
    // This would integrate with government traffic and road infrastructure APIs
    // For now, return empty array as most require API keys
    return [];
  }

  // Enhanced railway crossing detection and avoidance
  async fetchRailwayCrossingData() {
    try {
      const railwayCrossings = [];

      // Fetch from Network Rail API (UK specific)
      if (this.isUKLocation()) {
        const networkRailData = await this.fetchNetworkRailCrossings();
        railwayCrossings.push(...networkRailData);
      }

      // Fetch from OpenStreetMap with enhanced railway queries
      const osmRailwayData = await this.fetchOSMRailwayCrossings();
      railwayCrossings.push(...osmRailwayData);

      return railwayCrossings;
    } catch (error) {
      console.error('Error fetching railway crossing data:', error);
      return [];
    }
  }

  async fetchNetworkRailCrossings() {
    // Network Rail API integration for real-time crossing status
    // This would require API key and proper authentication
    try {
      // Example API call (would need actual Network Rail API)
      // const response = await fetch('https://api.networkrail.co.uk/level-crossings');
      // return this.processNetworkRailData(response.data);

      console.log('🚂 Network Rail API integration would go here');
      return [];
    } catch (error) {
      console.warn('Network Rail API unavailable:', error);
      return [];
    }
  }

  async fetchOSMRailwayCrossings() {
    // Enhanced OSM query specifically for railway crossings
    const query = `
      [out:json][timeout:25];
      (
        node["railway"="level_crossing"];
        node["railway"="crossing"];
        way["railway"]["highway"];
        relation["railway"]["highway"];
      );
      out geom;
    `;

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
        headers: { 'Content-Type': 'text/plain' }
      });

      const data = await response.json();
      return this.processOSMRailwayData(data);
    } catch (error) {
      console.error('Error fetching OSM railway data:', error);
      return [];
    }
  }

  processOSMRailwayData(data) {
    const railwayCrossings = [];

    data.elements.forEach(element => {
      const location = this.getElementLocation(element);
      if (!location) return;

      const crossing = {
        id: `railway_${element.id}`,
        type: 'railway_crossing',
        subtype: this.getRailwayCrossingType(element.tags),
        location,
        source: 'openstreetmap',
        verified: true,
        tags: element.tags,
        lastUpdated: Date.now(),
        confidence: 0.95,
        avoidanceRadius: 800, // Large radius for railway crossings
        severity: 'critical', // Highest severity for absolute avoidance
        timeImpact: 180, // 3 minutes realistic delay
        routingPenalty: 99999, // Extremely high penalty to force avoidance
        crossingDetails: {
          hasBarriers: element.tags.barrier === 'yes',
          isAutomatic: element.tags.crossing === 'automatic',
          railwayType: element.tags.railway,
          usage: element.tags.usage || 'unknown',
          maxspeed: element.tags.maxspeed,
          operator: element.tags.operator
        },
        routingStrategy: 'avoid_if_reasonable' // Only avoid if detour is reasonable
      };

      railwayCrossings.push(crossing);
    });

    return railwayCrossings;
  }

  getRailwayCrossingType(tags) {
    if (tags.crossing === 'automatic') return 'automatic_crossing';
    if (tags.crossing === 'manual') return 'manual_crossing';
    if (tags.barrier === 'yes') return 'barrier_crossing';
    if (tags.railway === 'level_crossing') return 'level_crossing';
    return 'railway_crossing';
  }

  isUKLocation() {
    // Simple check - in a real app, this would check current location
    return true; // Assume UK for now
  }

  // Absolute railway crossing avoidance
  shouldAvoidRailwayCrossing(crossing, routeInfo) {
    const settings = this.settings;

    // If railway crossing avoidance is enabled, ALWAYS avoid regardless of detour time
    if (settings.avoidRailwayCrossings) {
      console.log(`🚂 Railway crossing avoidance: ENABLED - avoiding crossing regardless of detour time`);
      return true;
    }

    console.log(`🚂 Railway crossing avoidance: DISABLED - allowing crossings`);
    return false;
  }

  estimateDetourTime(crossing, routeInfo) {
    // Simple estimation based on distance from main route
    // In a real implementation, this would use actual routing calculations

    if (!routeInfo || !routeInfo.distance) {
      return 300; // 5 minutes default estimate
    }

    // Estimate based on crossing position relative to route
    const routeLength = routeInfo.distance; // in meters
    const detourFactor = crossing.avoidanceRadius / 1000; // convert to km

    // Rough calculation: detour adds ~10% to journey time per km of avoidance
    const estimatedDetourTime = (detourFactor * 0.1 * routeLength / 1000) * 60; // in seconds

    // Cap at maximum detour time
    return Math.min(estimatedDetourTime, this.settings.maxDetourTime);
  }

  // Get routing preferences for railway crossings
  getRailwayCrossingRoutingPreferences() {
    return {
      avoidanceEnabled: this.settings.avoidRailwayCrossings,
      crossingDelay: this.settings.railwayCrossingDelay,
      avoidanceRadius: this.settings.railwayCrossingRadius,
      strategy: 'absolute_avoidance', // Avoid at all costs when enabled
      priority: 'high', // High priority - avoid regardless of detour time
      allowDetours: true, // Allow any length detour to avoid crossings
      maxDetourTime: null // No limit when avoidance is enabled
    };
  }

  // Apply absolute avoidance penalties for routing algorithms
  applyRailwayCrossingPenalties(routeSegments) {
    if (!this.settings.avoidRailwayCrossings) {
      return routeSegments; // No penalties if avoidance is disabled
    }

    return routeSegments.map(segment => {
      // Check if this segment contains or passes near railway crossings
      const hasRailwayCrossing = this.segmentContainsRailwayCrossing(segment);

      if (hasRailwayCrossing) {
        // Apply massive penalty to make this route extremely undesirable
        segment.penalty = (segment.penalty || 0) + 99999;
        segment.avoidanceReason = 'railway_crossing_absolute_avoidance';
        console.log(`🚂 Applied absolute avoidance penalty to route segment`);
      }

      return segment;
    });
  }

  segmentContainsRailwayCrossing(segment) {
    // Check if route segment passes through or near railway crossings
    // This would integrate with the actual routing algorithm
    // For now, return false as this is a framework function
    return false;
  }

  // Get absolute avoidance instructions for routing engines
  getRailwayCrossingAvoidanceInstructions() {
    if (!this.settings.avoidRailwayCrossings) {
      return null;
    }

    return {
      type: 'absolute_avoidance',
      feature: 'railway_crossings',
      penalty: 99999,
      radius: 1000,
      instructions: [
        'Avoid all railway level crossings',
        'Prefer bridges and underpasses',
        'Accept longer routes to avoid crossings',
        'No time limit on detours for avoidance'
      ],
      osmTags: [
        'railway=level_crossing',
        'railway=crossing',
        'highway+railway intersection'
      ]
    };
  }

  deduplicateObstacles(obstacles) {
    const unique = new Map();
    const proximityThreshold = 50; // meters

    obstacles.forEach(obstacle => {
      let isDuplicate = false;

      for (const [id, existingObstacle] of unique) {
        const distance = this.calculateDistance(
          obstacle.location.latitude,
          obstacle.location.longitude,
          existingObstacle.location.latitude,
          existingObstacle.location.longitude
        );

        if (distance < proximityThreshold && obstacle.type === existingObstacle.type) {
          // Keep the one with higher confidence
          if (obstacle.confidence > existingObstacle.confidence) {
            unique.set(id, obstacle);
          }
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        unique.set(obstacle.id, obstacle);
      }
    });

    return Array.from(unique.values());
  }

  getObstaclesNearRoute(routeCoordinates, avoidanceRadius = null) {
    const radius = avoidanceRadius || this.avoidanceSettings.routeAvoidanceRadius;
    const nearbyObstacles = [];

    routeCoordinates.forEach((coord, index) => {
      for (const [id, obstacle] of this.obstacleDatabase) {
        const distance = this.calculateDistance(
          coord.latitude,
          coord.longitude,
          obstacle.location.latitude,
          obstacle.location.longitude
        );

        if (distance <= (obstacle.avoidanceRadius || radius)) {
          nearbyObstacles.push({
            ...obstacle,
            routeIndex: index,
            distanceFromRoute: distance,
          });
        }
      }
    });

    return nearbyObstacles;
  }

  getObstaclesNearLocation(location, radius = 2000) {
    const nearbyObstacles = [];

    for (const [id, obstacle] of this.obstacleDatabase) {
      const distance = this.calculateDistance(
        location.latitude,
        location.longitude,
        obstacle.location.latitude,
        obstacle.location.longitude
      );

      if (distance <= radius) {
        nearbyObstacles.push({
          ...obstacle,
          distance,
        });
      }
    }

    return nearbyObstacles.sort((a, b) => a.distance - b.distance);
  }

  shouldAvoidObstacle(obstacle) {
    const settings = this.avoidanceSettings;

    switch (obstacle.type) {
      // Traffic Cameras
      case 'speed_camera':
        return settings.avoidSpeedCameras;
      case 'red_light_camera':
        return settings.avoidRedLightCameras;
      case 'traffic_camera':
        return settings.avoidTrafficEnforcement;

      // Law Enforcement
      case 'police_checkpoint':
        return settings.avoidPoliceCheckpoints;
      case 'police_station':
        return settings.avoidPoliceStations;

      // Road Infrastructure
      case 'railway_crossing':
        return settings.avoidRailwayCrossings;
      case 'motorway_junction':
      case 'roundabout':
        return settings.avoidDifficultJunctions;
      case 'motorway':
        return settings.avoidMotorways;
      case 'toll_road':
      case 'toll_booth':
        return settings.avoidTollRoads;

      // Road Conditions
      case 'unpaved_road':
        return settings.avoidUnpavedRoads;
      case 'narrow_road':
        return settings.avoidNarrowRoads;
      case 'steep_grade':
        return settings.avoidSteepGrades;
      case 'ferry_route':
      case 'ferry_terminal':
        return settings.avoidFerries;

      // Special Zones
      case 'school_zone':
      case 'school_area':
        return settings.avoidSchoolZones;
      case 'construction_zone':
        return settings.avoidConstructionZones;

      default:
        return false;
    }
  }

  generateRouteAvoidancePoints(routeCoordinates) {
    const avoidancePoints = [];
    const obstacles = this.getObstaclesNearRoute(routeCoordinates);

    obstacles.forEach(obstacle => {
      if (this.shouldAvoidObstacle(obstacle)) {
        // Create avoidance polygon around obstacle
        const avoidancePolygon = this.createAvoidancePolygon(
          obstacle.location,
          obstacle.avoidanceRadius || this.avoidanceSettings.routeAvoidanceRadius
        );

        avoidancePoints.push({
          type: 'avoid',
          geometry: avoidancePolygon,
          reason: `Avoid ${obstacle.type.replace('_', ' ')}`,
          obstacle: obstacle,
          timeImpact: obstacle.timeImpact,
          severity: obstacle.severity,
        });
      }
    });

    return avoidancePoints;
  }

  calculateRouteAvoidanceImpact(routeCoordinates) {
    const obstacles = this.getObstaclesNearRoute(routeCoordinates);
    const avoidableObstacles = obstacles.filter(obstacle => this.shouldAvoidObstacle(obstacle));

    let totalTimeImpact = 0;
    let totalAvoidanceDistance = 0;
    const obstacleTypes = {};

    avoidableObstacles.forEach(obstacle => {
      totalTimeImpact += obstacle.timeImpact || 0;
      totalAvoidanceDistance += obstacle.avoidanceRadius || 200;

      const type = obstacle.type;
      obstacleTypes[type] = (obstacleTypes[type] || 0) + 1;
    });

    // Calculate estimated extra time for route avoidance
    const baseAvoidanceTime = Math.min(totalTimeImpact, this.avoidanceSettings.maxExtraTime * 60); // Convert minutes to seconds
    const complexityMultiplier = Math.min(1 + (avoidableObstacles.length * 0.1), 2); // Max 2x multiplier

    return {
      totalObstacles: avoidableObstacles.length,
      estimatedExtraTime: Math.round(baseAvoidanceTime * complexityMultiplier), // seconds
      obstacleTypes,
      avoidanceRecommended: avoidableObstacles.length > 0,
      severity: this.calculateOverallSeverity(avoidableObstacles),
    };
  }

  calculateOverallSeverity(obstacles) {
    if (obstacles.length === 0) return 'none';

    const severityCounts = { high: 0, medium: 0, low: 0 };
    obstacles.forEach(obstacle => {
      severityCounts[obstacle.severity] = (severityCounts[obstacle.severity] || 0) + 1;
    });

    if (severityCounts.high > 0) return 'high';
    if (severityCounts.medium > 0) return 'medium';
    return 'low';
  }

  createAvoidancePolygon(center, radius) {
    const points = [];
    const numPoints = 8; // Octagon for performance

    for (let i = 0; i < numPoints; i++) {
      const angle = (i * 2 * Math.PI) / numPoints;
      const lat = center.latitude + (radius / 111320) * Math.cos(angle);
      const lon = center.longitude + (radius / (111320 * Math.cos(center.latitude * Math.PI / 180))) * Math.sin(angle);
      
      points.push([lon, lat]);
    }

    // Close the polygon
    points.push(points[0]);

    return {
      type: 'Polygon',
      coordinates: [points],
    };
  }

  async reportObstacle(location, type, additionalInfo = {}) {
    const obstacle = {
      id: `user_${Date.now()}`,
      type,
      subtype: additionalInfo.subtype || null,
      location,
      source: 'user_report',
      verified: false,
      reportedBy: 'current_user',
      reportedAt: Date.now(),
      confidence: 0.6, // Lower confidence for user reports
      votes: { up: 0, down: 0 },
      avoidanceRadius: this.getAvoidanceRadius({ [type]: true }),
      severity: this.getObstacleSeverity({ [type]: true }),
      timeImpact: this.getTimeImpact({ [type]: true }),
      ...additionalInfo,
    };

    this.userReportedObstacles.push(obstacle);
    this.obstacleDatabase.set(obstacle.id, obstacle);

    await this.saveUserReportedObstacles();
    this.notifyListeners('obstacleReported', { obstacle });

    return obstacle;
  }

  async voteOnObstacle(obstacleId, voteType) {
    const obstacle = this.obstacleDatabase.get(obstacleId);
    if (!obstacle || obstacle.source !== 'user_report') return;

    if (voteType === 'up') {
      obstacle.votes.up++;
    } else if (voteType === 'down') {
      obstacle.votes.down++;
    }

    // Update confidence based on votes
    const totalVotes = obstacle.votes.up + obstacle.votes.down;
    if (totalVotes > 0) {
      obstacle.confidence = Math.min(0.9, 0.3 + (obstacle.votes.up / totalVotes) * 0.6);
    }

    // Mark as verified if enough positive votes
    if (obstacle.votes.up >= 3 && obstacle.votes.up > obstacle.votes.down * 2) {
      obstacle.verified = true;
    }

    this.obstacleDatabase.set(obstacleId, obstacle);
    await this.saveUserReportedObstacles();
    this.notifyListeners('obstacleVoteUpdated', { obstacle });
  }

  getUpcomingObstacleAlerts(currentLocation, heading, speed) {
    const alerts = [];
    const alertDistance = this.avoidanceSettings.alertDistance;

    for (const [id, obstacle] of this.obstacleDatabase) {
      const distance = this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        obstacle.location.latitude,
        obstacle.location.longitude
      );

      if (distance <= alertDistance) {
        // Check if obstacle is ahead based on heading
        const bearing = this.calculateBearing(
          currentLocation.latitude,
          currentLocation.longitude,
          obstacle.location.latitude,
          obstacle.location.longitude
        );

        const headingDiff = Math.abs(bearing - heading);
        const isAhead = headingDiff < 45 || headingDiff > 315;

        if (isAhead) {
          alerts.push({
            obstacle,
            distance,
            timeToObstacle: distance / (speed * 0.277778), // Convert mph to m/s
            alertType: this.getAlertType(obstacle, speed),
            message: this.getObstacleAlertMessage(obstacle),
            priority: this.getAlertPriority(obstacle),
          });
        }
      }
    }

    return alerts.sort((a, b) => {
      // Sort by priority first, then distance
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.distance - b.distance;
    });
  }

  getAlertType(obstacle, currentSpeed) {
    if (obstacle.type === 'speed_camera' && obstacle.tags && obstacle.tags.maxspeed) {
      const speedLimitMph = parseInt(obstacle.tags.maxspeed) * 0.621371; // Convert km/h to mph
      if (currentSpeed > speedLimitMph + 5) {
        return 'speed_warning';
      }
    }

    switch (obstacle.type) {
      case 'speed_camera':
      case 'red_light_camera':
        return 'camera_ahead';
      case 'railway_crossing':
        return 'railway_crossing_ahead';
      case 'toll_booth':
      case 'toll_road':
        return 'toll_ahead';
      case 'construction_zone':
        return 'construction_ahead';
      case 'school_zone':
        return 'school_zone_ahead';
      case 'ferry_terminal':
      case 'ferry_route':
        return 'ferry_ahead';
      default:
        return 'obstacle_ahead';
    }
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
      case 'police_checkpoint':
        return 'Police checkpoint ahead';
      case 'police_station':
        return 'Police station area ahead';
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

  getAlertPriority(obstacle) {
    switch (obstacle.severity) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 1;
    }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = this.deg2rad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(this.deg2rad(lat2));
    const x =
      Math.cos(this.deg2rad(lat1)) * Math.sin(this.deg2rad(lat2)) -
      Math.sin(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.cos(dLon);
    const bearing = Math.atan2(y, x);
    return (this.rad2deg(bearing) + 360) % 360;
  }

  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  rad2deg(rad) {
    return rad * (180 / Math.PI);
  }

  // Settings management
  async updateSettings(newSettings) {
    this.avoidanceSettings = { ...this.avoidanceSettings, ...newSettings };
    await BrowserStorage.setItem('roadObstacleSettings', JSON.stringify(this.avoidanceSettings));
    this.notifyListeners('settingsUpdated', { settings: this.avoidanceSettings });
  }

  async loadSettings() {
    try {
      const stored = await BrowserStorage.getItem('roadObstacleSettings');
      if (stored) {
        this.avoidanceSettings = { ...this.avoidanceSettings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading obstacle settings:', error);
    }
  }

  async loadUserReportedObstacles() {
    try {
      const stored = await BrowserStorage.getItem('userReportedObstacles');
      if (stored) {
        this.userReportedObstacles = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading user reported obstacles:', error);
    }
  }

  async saveUserReportedObstacles() {
    try {
      await BrowserStorage.setItem('userReportedObstacles', JSON.stringify(this.userReportedObstacles));
    } catch (error) {
      console.error('Error saving user reported obstacles:', error);
    }
  }

  // Getters
  getSettings() {
    return { ...this.avoidanceSettings };
  }

  getObstacleCount() {
    return this.obstacleDatabase.size;
  }

  getObstaclesByType() {
    const counts = {};
    for (const [id, obstacle] of this.obstacleDatabase) {
      counts[obstacle.type] = (counts[obstacle.type] || 0) + 1;
    }
    return counts;
  }

  getAvoidanceStatistics() {
    const stats = {
      totalObstacles: this.obstacleDatabase.size,
      userReported: this.userReportedObstacles.length,
      byType: this.getObstaclesByType(),
      bySeverity: { high: 0, medium: 0, low: 0 },
      enabledAvoidance: {},
    };

    // Count by severity
    for (const [id, obstacle] of this.obstacleDatabase) {
      stats.bySeverity[obstacle.severity] = (stats.bySeverity[obstacle.severity] || 0) + 1;
    }

    // Count enabled avoidance settings
    Object.keys(this.avoidanceSettings).forEach(key => {
      if (key.startsWith('avoid') && this.avoidanceSettings[key]) {
        stats.enabledAvoidance[key] = true;
      }
    });

    return stats;
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
        console.error('TrafficCameraService listener error:', error);
      }
    });
  }

  destroy() {
    this.listeners = [];
    this.obstacleDatabase.clear();
    this.userReportedObstacles = [];
    this.isInitialized = false;
  }
}

// Create instance and expose globally for browser compatibility
if (typeof window !== 'undefined') {
    // Create a single instance
    const trafficCameraServiceInstance = new RoadObstacleService();

    // Expose both class and instance globally
    window.TrafficCameraService = RoadObstacleService;
    window.RoadObstacleService = RoadObstacleService;
    window.trafficCameraService = trafficCameraServiceInstance;

    console.log('✅ TrafficCameraService class and instance available globally');
} else {
    // Node.js environment
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = RoadObstacleService;
    }
}
