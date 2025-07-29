// Enhanced Traffic Camera and Road Obstacle Detection Service
// Browser-compatible service for web applications

console.log('🔄 TrafficCameraService-Clean.js loading...');

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

console.log('🔄 Defining RoadObstacleService class...');

class RoadObstacleService {
  constructor() {
    this.isInitialized = false;
    this.obstacleDatabase = new Map();
    this.userReportedObstacles = [];
    this.listeners = new Map();
    
    // Default avoidance settings
    this.avoidanceSettings = {
      // Traffic Cameras
      avoidSpeedCameras: true,
      avoidRedLightCameras: true,
      avoidTrafficEnforcement: true,

      // Road Infrastructure
      avoidRailwayCrossings: true,
      avoidDifficultJunctions: false,
      avoidMotorways: false,
      avoidTollRoads: true,

      // Law Enforcement
      avoidPoliceCheckpoints: true,
      avoidPoliceStations: false,

      // Timing & Distance
      maxExtraTime: 20, // minutes
      railwayCrossingDelay: 180, // 3 minutes typical crossing delay
      maxDetourTime: 1200, // 20 minutes max detour for entire journey
      alertDistance: 500, // meters
      routeAvoidanceRadius: 200, // meters around obstacle
      railwayCrossingRadius: 300, // moderate radius for railway crossings

      // User Preferences
      enableVoiceAlerts: true,
      enableVisualAlerts: true,
      enableHapticFeedback: false
    };

    console.log('✅ RoadObstacleService constructor completed');
  }

  // Initialize the service
  async initialize() {
    if (this.isInitialized) {
      console.log('🔄 RoadObstacleService already initialized');
      return;
    }

    try {
      console.log('🔄 Initializing RoadObstacleService...');
      
      // Load settings and data
      await this.loadSettings();
      await this.loadUserReportedObstacles();
      
      this.isInitialized = true;
      console.log('✅ RoadObstacleService initialized successfully');
      
      this.notifyListeners('initialized', { service: this });
    } catch (error) {
      console.error('❌ Error initializing RoadObstacleService:', error);
      throw error;
    }
  }

  // Update settings
  async updateSettings(newSettings) {
    this.avoidanceSettings = { ...this.avoidanceSettings, ...newSettings };
    await BrowserStorage.setItem('roadObstacleSettings', JSON.stringify(this.avoidanceSettings));
    this.notifyListeners('settingsUpdated', { settings: this.avoidanceSettings });
    console.log('✅ Settings updated:', newSettings);
  }

  // Load settings from storage
  async loadSettings() {
    try {
      const stored = await BrowserStorage.getItem('roadObstacleSettings');
      if (stored) {
        this.avoidanceSettings = { ...this.avoidanceSettings, ...JSON.parse(stored) };
        console.log('✅ Settings loaded from storage');
      }
    } catch (error) {
      console.error('❌ Error loading settings:', error);
    }
  }

  // Load user reported obstacles
  async loadUserReportedObstacles() {
    try {
      const stored = await BrowserStorage.getItem('userReportedObstacles');
      if (stored) {
        this.userReportedObstacles = JSON.parse(stored);
        console.log('✅ User reported obstacles loaded');
      }
    } catch (error) {
      console.error('❌ Error loading user reported obstacles:', error);
    }
  }

  // Save user reported obstacles
  async saveUserReportedObstacles() {
    try {
      await BrowserStorage.setItem('userReportedObstacles', JSON.stringify(this.userReportedObstacles));
    } catch (error) {
      console.error('❌ Error saving user reported obstacles:', error);
    }
  }

  // Add event listener
  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // Remove event listener
  removeEventListener(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Notify listeners
  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('❌ Error in event listener:', error);
        }
      });
    }
  }

  // Get current settings
  getSettings() {
    return { ...this.avoidanceSettings };
  }

  // Check if should avoid obstacle
  shouldAvoidObstacle(obstacle) {
    const settings = this.avoidanceSettings;
    
    switch (obstacle.type) {
      case 'speed_camera':
        return settings.avoidSpeedCameras;
      case 'red_light_camera':
        return settings.avoidRedLightCameras;
      case 'railway_crossing':
        return settings.avoidRailwayCrossings;
      case 'police_checkpoint':
        return settings.avoidPoliceCheckpoints;
      case 'toll_booth':
        return settings.avoidTollRoads;
      default:
        return false;
    }
  }

  // Get avoidance radius for obstacle type
  getAvoidanceRadius(obstacleType) {
    switch (obstacleType) {
      case 'speed_camera':
        return 200;
      case 'red_light_camera':
        return 150;
      case 'railway_crossing':
        return this.avoidanceSettings.railwayCrossingRadius;
      case 'police_checkpoint':
        return 300;
      case 'toll_booth':
        return 100;
      default:
        return this.avoidanceSettings.routeAvoidanceRadius;
    }
  }

  // Clear all data
  clearData() {
    this.obstacleDatabase.clear();
    this.userReportedObstacles = [];
    this.isInitialized = false;
    console.log('✅ All data cleared');
  }
}

// Immediately expose to global scope - no conditions
try {
  console.log('🔄 Creating TrafficCameraService instance...');
  
  // Create instance immediately
  const trafficCameraServiceInstance = new RoadObstacleService();
  
  // Force global exposure
  window.TrafficCameraService = RoadObstacleService;
  window.RoadObstacleService = RoadObstacleService;
  window.trafficCameraService = trafficCameraServiceInstance;
  
  console.log('✅ TrafficCameraService class and instance available globally');
  console.log('✅ TrafficCameraService type:', typeof window.TrafficCameraService);
  console.log('✅ Instance created:', !!window.trafficCameraService);
} catch (error) {
  console.error('❌ Error creating TrafficCameraService:', error);
  
  // Fallback - create minimal service
  window.TrafficCameraService = class MinimalTrafficCameraService {
    constructor() {
      this.settings = {};
    }
    updateSettings(settings) {
      this.settings = settings;
      console.log('⚠️ Minimal service - settings updated:', settings);
    }
  };
  console.log('⚠️ Created fallback TrafficCameraService');
}

console.log('🎉 TrafficCameraService-Clean.js loaded successfully!');
