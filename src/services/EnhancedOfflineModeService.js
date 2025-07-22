import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

class EnhancedOfflineModeService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.isOffline = false;
    this.offlineQueue = [];
    this.cachedData = new Map();
    this.offlineSettings = {
      enableOfflineMode: true,
      autoSyncWhenOnline: true,
      maxCacheSize: 100 * 1024 * 1024, // 100MB
      cacheExpiryTime: 7 * 24 * 60 * 60 * 1000, // 7 days
      priorityDataTypes: ['routes', 'pois', 'traffic', 'maps'],
      offlineFeatures: {
        navigation: true,
        speedometer: true,
        voiceGuidance: true,
        basicPOIs: true,
        savedRoutes: true,
        userReports: false, // Requires internet
        liveTraffic: false, // Requires internet
      },
    };
    this.syncStatus = {
      lastSync: null,
      pendingOperations: 0,
      failedOperations: 0,
      syncInProgress: false,
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadOfflineSettings();
      await this.loadCachedData();
      this.setupNetworkMonitoring();
      await this.checkInitialNetworkStatus();
      
      this.isInitialized = true;
      console.log('EnhancedOfflineModeService initialized successfully');
    } catch (error) {
      console.error('EnhancedOfflineModeService initialization failed:', error);
      throw error;
    }
  }

  setupNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      const wasOffline = this.isOffline;
      this.isOffline = !state.isConnected;
      
      if (wasOffline && !this.isOffline) {
        // Just came back online
        this.handleBackOnline();
      } else if (!wasOffline && this.isOffline) {
        // Just went offline
        this.handleGoOffline();
      }
      
      this.notifyListeners('networkStatusChanged', {
        isOffline: this.isOffline,
        connectionType: state.type,
        isInternetReachable: state.isInternetReachable,
      });
    });
  }

  async checkInitialNetworkStatus() {
    const state = await NetInfo.fetch();
    this.isOffline = !state.isConnected;
    
    if (this.isOffline) {
      this.handleGoOffline();
    }
  }

  handleGoOffline() {
    console.log('App went offline - enabling offline mode');
    
    this.notifyListeners('offlineModeEnabled', {
      availableFeatures: this.getAvailableOfflineFeatures(),
      cachedDataSize: this.getCachedDataSize(),
      lastSync: this.syncStatus.lastSync,
    });
    
    // Show user-friendly offline prompt
    this.showOfflinePrompt();
  }

  handleBackOnline() {
    console.log('App back online - syncing data');
    
    this.notifyListeners('onlineModeEnabled', {
      pendingOperations: this.offlineQueue.length,
      syncRequired: this.offlineQueue.length > 0,
    });
    
    if (this.offlineSettings.autoSyncWhenOnline) {
      this.syncOfflineData();
    }
  }

  showOfflinePrompt() {
    const availableFeatures = this.getAvailableOfflineFeatures();
    const unavailableFeatures = this.getUnavailableOfflineFeatures();
    
    this.notifyListeners('showOfflinePrompt', {
      type: 'offline_mode',
      title: 'App is Offline',
      message: 'The app is currently offline. Using cached data for navigation. Some features may be unavailable.',
      availableFeatures,
      unavailableFeatures,
      actions: [
        {
          title: 'Continue Offline',
          action: 'continue_offline',
          primary: true,
        },
        {
          title: 'Check Connection',
          action: 'check_connection',
          primary: false,
        },
      ],
    });
  }

  getAvailableOfflineFeatures() {
    return Object.entries(this.offlineSettings.offlineFeatures)
      .filter(([feature, enabled]) => enabled)
      .map(([feature]) => feature);
  }

  getUnavailableOfflineFeatures() {
    return Object.entries(this.offlineSettings.offlineFeatures)
      .filter(([feature, enabled]) => !enabled)
      .map(([feature]) => feature);
  }

  // Cache management
  async cacheData(key, data, priority = 'normal') {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        priority,
        size: JSON.stringify(data).length,
      };
      
      this.cachedData.set(key, cacheEntry);
      await this.saveCachedData();
      
      // Check cache size and cleanup if needed
      await this.cleanupCache();
      
      console.log(`Cached data for key: ${key}`);
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  getCachedData(key) {
    const cacheEntry = this.cachedData.get(key);
    
    if (!cacheEntry) return null;
    
    // Check if cache entry has expired
    const isExpired = Date.now() - cacheEntry.timestamp > this.offlineSettings.cacheExpiryTime;
    
    if (isExpired) {
      this.cachedData.delete(key);
      return null;
    }
    
    return cacheEntry.data;
  }

  async cleanupCache() {
    const currentSize = this.getCachedDataSize();
    
    if (currentSize <= this.offlineSettings.maxCacheSize) return;
    
    // Sort cache entries by priority and age
    const entries = Array.from(this.cachedData.entries());
    const priorityOrder = { high: 3, normal: 2, low: 1 };
    
    entries.sort((a, b) => {
      const [keyA, entryA] = a;
      const [keyB, entryB] = b;
      
      // First sort by priority
      const priorityDiff = priorityOrder[entryB.priority] - priorityOrder[entryA.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by age (older first for removal)
      return entryA.timestamp - entryB.timestamp;
    });
    
    // Remove oldest, lowest priority entries until under size limit
    let removedSize = 0;
    const targetSize = this.offlineSettings.maxCacheSize * 0.8; // Remove to 80% of limit
    
    for (const [key, entry] of entries) {
      if (currentSize - removedSize <= targetSize) break;
      
      this.cachedData.delete(key);
      removedSize += entry.size;
    }
    
    await this.saveCachedData();
    
    console.log(`Cache cleanup: removed ${removedSize} bytes`);
  }

  getCachedDataSize() {
    let totalSize = 0;
    for (const [key, entry] of this.cachedData) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  // Offline queue management
  queueOfflineOperation(operation) {
    const queuedOperation = {
      id: Date.now() + Math.random(),
      ...operation,
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    this.offlineQueue.push(queuedOperation);
    this.syncStatus.pendingOperations++;
    
    this.notifyListeners('operationQueued', { operation: queuedOperation });
    
    console.log(`Queued offline operation: ${operation.type}`);
  }

  async syncOfflineData() {
    if (this.syncStatus.syncInProgress || this.isOffline) return;
    
    this.syncStatus.syncInProgress = true;
    
    this.notifyListeners('syncStarted', {
      operationsCount: this.offlineQueue.length,
    });
    
    const failedOperations = [];
    
    for (const operation of this.offlineQueue) {
      try {
        await this.executeOperation(operation);
        this.syncStatus.pendingOperations--;
      } catch (error) {
        console.error('Failed to sync operation:', error);
        operation.retryCount++;
        
        if (operation.retryCount < 3) {
          failedOperations.push(operation);
        } else {
          this.syncStatus.failedOperations++;
          this.syncStatus.pendingOperations--;
        }
      }
    }
    
    // Update queue with failed operations for retry
    this.offlineQueue = failedOperations;
    this.syncStatus.lastSync = Date.now();
    this.syncStatus.syncInProgress = false;
    
    this.notifyListeners('syncCompleted', {
      successCount: this.offlineQueue.length - failedOperations.length,
      failedCount: failedOperations.length,
      lastSync: this.syncStatus.lastSync,
    });
    
    console.log(`Sync completed: ${failedOperations.length} operations failed`);
  }

  async executeOperation(operation) {
    switch (operation.type) {
      case 'user_report':
        return await this.syncUserReport(operation.data);
      case 'route_request':
        return await this.syncRouteRequest(operation.data);
      case 'poi_update':
        return await this.syncPOIUpdate(operation.data);
      case 'user_preference':
        return await this.syncUserPreference(operation.data);
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  async syncUserReport(reportData) {
    // Implement user report sync
    console.log('Syncing user report:', reportData);
    // Would make API call to submit report
  }

  async syncRouteRequest(routeData) {
    // Implement route request sync
    console.log('Syncing route request:', routeData);
    // Would make API call to get updated route
  }

  async syncPOIUpdate(poiData) {
    // Implement POI update sync
    console.log('Syncing POI update:', poiData);
    // Would make API call to update POI data
  }

  async syncUserPreference(preferenceData) {
    // Implement user preference sync
    console.log('Syncing user preference:', preferenceData);
    // Would make API call to save preferences
  }

  // Offline-specific features
  getOfflineRoute(start, end, options = {}) {
    const cacheKey = `route_${start}_${end}_${JSON.stringify(options)}`;
    const cachedRoute = this.getCachedData(cacheKey);
    
    if (cachedRoute) {
      return cachedRoute;
    }
    
    // Generate basic route using cached map data
    // This would use offline routing algorithms
    const basicRoute = this.generateBasicRoute(start, end, options);
    
    if (basicRoute) {
      this.cacheData(cacheKey, basicRoute, 'high');
    }
    
    return basicRoute;
  }

  generateBasicRoute(start, end, options) {
    // Simplified offline routing
    // In a real implementation, this would use cached map data
    // and offline routing algorithms
    
    return {
      coordinates: [start, end], // Simplified
      distance: this.calculateDistance(start, end),
      duration: this.estimateDuration(start, end),
      instructions: ['Head towards destination'],
      offline: true,
    };
  }

  calculateDistance(start, end) {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = (end.latitude - start.latitude) * Math.PI / 180;
    const dLon = (end.longitude - start.longitude) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(start.latitude * Math.PI / 180) * Math.cos(end.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  estimateDuration(start, end) {
    const distance = this.calculateDistance(start, end);
    const averageSpeed = 50; // km/h
    return (distance / averageSpeed) * 60; // minutes
  }

  // Settings management
  async updateOfflineSettings(newSettings) {
    this.offlineSettings = { ...this.offlineSettings, ...newSettings };
    await this.saveOfflineSettings();
    
    this.notifyListeners('offlineSettingsUpdated', { 
      settings: this.offlineSettings 
    });
  }

  async saveOfflineSettings() {
    try {
      await AsyncStorage.setItem('offlineSettings', JSON.stringify(this.offlineSettings));
    } catch (error) {
      console.error('Error saving offline settings:', error);
    }
  }

  async loadOfflineSettings() {
    try {
      const stored = await AsyncStorage.getItem('offlineSettings');
      if (stored) {
        this.offlineSettings = { ...this.offlineSettings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading offline settings:', error);
    }
  }

  async saveCachedData() {
    try {
      const cacheArray = Array.from(this.cachedData.entries());
      await AsyncStorage.setItem('cachedData', JSON.stringify(cacheArray));
    } catch (error) {
      console.error('Error saving cached data:', error);
    }
  }

  async loadCachedData() {
    try {
      const stored = await AsyncStorage.getItem('cachedData');
      if (stored) {
        const cacheArray = JSON.parse(stored);
        this.cachedData = new Map(cacheArray);
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
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
        console.error('EnhancedOfflineModeService listener error:', error);
      }
    });
  }

  destroy() {
    this.listeners = [];
    this.isInitialized = false;
  }
}

export default new EnhancedOfflineModeService();
