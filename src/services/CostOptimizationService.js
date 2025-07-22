import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class CostOptimizationService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.costSettings = {
      // Data usage optimization
      enableDataSaving: true,
      useCompressedTiles: true,
      limitBackgroundSync: true,
      cacheAggressively: true,
      
      // API usage optimization
      batchAPIRequests: true,
      useFreeTierAPIs: true,
      fallbackToFreeServices: true,
      limitAPICallFrequency: true,
      
      // Resource optimization
      useWebPImages: true,
      compressAudio: true,
      minifyAssets: true,
      lazyLoadComponents: true,
      
      // Hosting optimization
      useCDN: false, // Free tier usually doesn't include CDN
      enableGzipCompression: true,
      optimizeForVercel: true,
      enableEdgeCaching: false,
      
      // Monetization settings
      enableAds: false,
      adFrequency: 'low',
      enableDonations: true,
      enablePremiumFeatures: false,
    };
    
    this.freeServiceLimits = {
      // OpenStreetMap Overpass API
      overpassAPI: {
        requestsPerMinute: 10,
        requestsPerHour: 100,
        maxQuerySize: 1000000, // 1MB
      },
      
      // Free geocoding services
      nominatim: {
        requestsPerSecond: 1,
        requestsPerDay: 2500,
      },
      
      // Free routing services
      osrm: {
        requestsPerMinute: 60,
        maxWaypoints: 25,
      },
      
      // Free hosting limits
      vercel: {
        bandwidth: 100 * 1024 * 1024 * 1024, // 100GB
        builds: 6000, // per month
        serverlessFunctions: 12,
      },
      
      netlify: {
        bandwidth: 100 * 1024 * 1024 * 1024, // 100GB
        builds: 300, // per month
        functions: 125000, // invocations
      },
    };
    
    this.usageTracking = {
      apiCalls: new Map(),
      dataTransfer: 0,
      storageUsed: 0,
      lastReset: Date.now(),
    };
    
    this.costSavingStrategies = {
      // Use free alternatives
      freeAlternatives: {
        'google-maps': 'openstreetmap',
        'google-tts': 'espeak',
        'aws-polly': 'mozilla-tts',
        'mapbox': 'leaflet',
        'firebase': 'supabase',
      },
      
      // Optimization techniques
      optimizations: [
        'compress-images',
        'minify-js-css',
        'tree-shake-unused-code',
        'lazy-load-routes',
        'cache-api-responses',
        'batch-network-requests',
        'use-service-workers',
        'optimize-bundle-size',
      ],
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadCostSettings();
      this.setupUsageTracking();
      this.implementCostOptimizations();
      
      this.isInitialized = true;
      console.log('CostOptimizationService initialized successfully');
    } catch (error) {
      console.error('CostOptimizationService initialization failed:', error);
      throw error;
    }
  }

  setupUsageTracking() {
    // Track API usage
    this.trackAPIUsage();
    
    // Track data transfer
    this.trackDataTransfer();
    
    // Reset usage tracking monthly
    setInterval(() => {
      this.resetUsageTracking();
    }, 30 * 24 * 60 * 60 * 1000); // 30 days
  }

  trackAPIUsage() {
    // Intercept API calls to track usage
    const originalFetch = global.fetch;
    
    global.fetch = async (url, options = {}) => {
      const startTime = Date.now();
      
      try {
        const response = await originalFetch(url, options);
        
        // Track successful API call
        this.recordAPICall(url, {
          method: options.method || 'GET',
          status: response.status,
          duration: Date.now() - startTime,
          size: this.getResponseSize(response),
        });
        
        return response;
      } catch (error) {
        // Track failed API call
        this.recordAPICall(url, {
          method: options.method || 'GET',
          status: 'error',
          duration: Date.now() - startTime,
          error: error.message,
        });
        
        throw error;
      }
    };
  }

  recordAPICall(url, metadata) {
    const service = this.identifyService(url);
    
    if (!this.usageTracking.apiCalls.has(service)) {
      this.usageTracking.apiCalls.set(service, {
        count: 0,
        totalSize: 0,
        errors: 0,
        lastCall: null,
      });
    }
    
    const serviceStats = this.usageTracking.apiCalls.get(service);
    serviceStats.count++;
    serviceStats.totalSize += metadata.size || 0;
    serviceStats.lastCall = Date.now();
    
    if (metadata.status === 'error' || metadata.status >= 400) {
      serviceStats.errors++;
    }
    
    // Check if approaching limits
    this.checkServiceLimits(service, serviceStats);
  }

  identifyService(url) {
    if (url.includes('overpass-api.de')) return 'overpassAPI';
    if (url.includes('nominatim.openstreetmap.org')) return 'nominatim';
    if (url.includes('router.project-osrm.org')) return 'osrm';
    if (url.includes('api.tomtom.com')) return 'tomtom';
    if (url.includes('maps.googleapis.com')) return 'google-maps';
    return 'unknown';
  }

  checkServiceLimits(service, stats) {
    const limits = this.freeServiceLimits[service];
    if (!limits) return;
    
    // Check rate limits
    if (limits.requestsPerMinute) {
      const recentCalls = this.getRecentCalls(service, 60 * 1000); // 1 minute
      if (recentCalls >= limits.requestsPerMinute) {
        this.notifyListeners('rateLimitApproaching', {
          service,
          limit: limits.requestsPerMinute,
          current: recentCalls,
          timeWindow: '1 minute',
        });
      }
    }
    
    // Check daily limits
    if (limits.requestsPerDay) {
      const dailyCalls = this.getRecentCalls(service, 24 * 60 * 60 * 1000); // 24 hours
      if (dailyCalls >= limits.requestsPerDay * 0.8) { // 80% threshold
        this.notifyListeners('dailyLimitApproaching', {
          service,
          limit: limits.requestsPerDay,
          current: dailyCalls,
          percentage: (dailyCalls / limits.requestsPerDay) * 100,
        });
      }
    }
  }

  getRecentCalls(service, timeWindow) {
    const serviceStats = this.usageTracking.apiCalls.get(service);
    if (!serviceStats) return 0;
    
    // This is a simplified implementation
    // In practice, you'd need to track individual call timestamps
    const now = Date.now();
    const windowStart = now - timeWindow;
    
    if (serviceStats.lastCall && serviceStats.lastCall > windowStart) {
      return serviceStats.count;
    }
    
    return 0;
  }

  trackDataTransfer() {
    // Track data usage for mobile users
    if (Platform.OS !== 'web') {
      // Would integrate with native data usage APIs
      // For now, estimate based on API responses
      setInterval(() => {
        this.estimateDataUsage();
      }, 60000); // Every minute
    }
  }

  estimateDataUsage() {
    let totalSize = 0;
    
    for (const [service, stats] of this.usageTracking.apiCalls) {
      totalSize += stats.totalSize;
    }
    
    this.usageTracking.dataTransfer = totalSize;
    
    // Notify if data usage is high
    const dailyLimit = 50 * 1024 * 1024; // 50MB daily limit
    if (totalSize > dailyLimit * 0.8) {
      this.notifyListeners('dataUsageHigh', {
        current: totalSize,
        limit: dailyLimit,
        percentage: (totalSize / dailyLimit) * 100,
      });
    }
  }

  implementCostOptimizations() {
    if (this.costSettings.enableDataSaving) {
      this.enableDataSavingMode();
    }
    
    if (this.costSettings.batchAPIRequests) {
      this.enableAPIBatching();
    }
    
    if (this.costSettings.cacheAggressively) {
      this.enableAggressiveCaching();
    }
    
    if (this.costSettings.useFreeTierAPIs) {
      this.configureFreeTierAPIs();
    }
  }

  enableDataSavingMode() {
    this.notifyListeners('optimizationEnabled', {
      type: 'dataSaving',
      settings: {
        compressImages: true,
        reduceTileQuality: true,
        limitBackgroundSync: true,
        cacheMore: true,
      },
    });
  }

  enableAPIBatching() {
    // Implement request batching to reduce API calls
    this.requestQueue = [];
    this.batchTimer = null;
    
    this.notifyListeners('optimizationEnabled', {
      type: 'apiBatching',
      settings: {
        batchSize: 10,
        batchDelay: 1000, // 1 second
      },
    });
  }

  enableAggressiveCaching() {
    this.notifyListeners('optimizationEnabled', {
      type: 'aggressiveCaching',
      settings: {
        cacheMapTiles: true,
        cacheAPIResponses: true,
        cacheUserData: true,
        cacheDuration: 24 * 60 * 60 * 1000, // 24 hours
      },
    });
  }

  configureFreeTierAPIs() {
    const freeAPIConfig = {
      routing: 'osrm', // Free OSRM instead of paid services
      geocoding: 'nominatim', // Free Nominatim instead of paid services
      maps: 'openstreetmap', // Free OSM instead of paid services
      tts: 'espeak', // Free eSpeak instead of paid services
    };
    
    this.notifyListeners('freeAPIsConfigured', { config: freeAPIConfig });
  }

  // Cost monitoring
  async generateCostReport() {
    const report = {
      period: {
        start: this.usageTracking.lastReset,
        end: Date.now(),
      },
      apiUsage: Object.fromEntries(this.usageTracking.apiCalls),
      dataTransfer: this.usageTracking.dataTransfer,
      estimatedCosts: this.calculateEstimatedCosts(),
      savings: this.calculateSavings(),
      recommendations: this.generateRecommendations(),
    };
    
    return report;
  }

  calculateEstimatedCosts() {
    // Calculate what costs would be with paid services
    let estimatedCosts = 0;
    
    for (const [service, stats] of this.usageTracking.apiCalls) {
      switch (service) {
        case 'overpassAPI':
          // If using Google Maps API instead: $2 per 1000 requests
          estimatedCosts += (stats.count / 1000) * 2;
          break;
        case 'nominatim':
          // If using Google Geocoding API: $5 per 1000 requests
          estimatedCosts += (stats.count / 1000) * 5;
          break;
        case 'osrm':
          // If using Google Directions API: $5 per 1000 requests
          estimatedCosts += (stats.count / 1000) * 5;
          break;
      }
    }
    
    return estimatedCosts;
  }

  calculateSavings() {
    const estimatedCosts = this.calculateEstimatedCosts();
    const actualCosts = 0; // Using free services
    
    return {
      monthlySavings: estimatedCosts,
      annualSavings: estimatedCosts * 12,
      currency: 'USD',
    };
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Check API usage patterns
    for (const [service, stats] of this.usageTracking.apiCalls) {
      if (stats.errors > stats.count * 0.1) { // >10% error rate
        recommendations.push({
          type: 'reliability',
          service,
          message: `High error rate for ${service}. Consider implementing retry logic or fallback services.`,
        });
      }
    }
    
    // Check data usage
    if (this.usageTracking.dataTransfer > 100 * 1024 * 1024) { // >100MB
      recommendations.push({
        type: 'dataUsage',
        message: 'High data usage detected. Consider enabling more aggressive compression.',
      });
    }
    
    return recommendations;
  }

  resetUsageTracking() {
    this.usageTracking.apiCalls.clear();
    this.usageTracking.dataTransfer = 0;
    this.usageTracking.lastReset = Date.now();
    
    this.notifyListeners('usageTrackingReset', {
      resetTime: Date.now(),
    });
  }

  getResponseSize(response) {
    // Estimate response size
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      return parseInt(contentLength);
    }
    
    // Fallback estimation
    return 1024; // 1KB default estimate
  }

  // Settings management
  async updateCostSettings(newSettings) {
    this.costSettings = { ...this.costSettings, ...newSettings };
    await this.saveCostSettings();
    
    // Re-implement optimizations with new settings
    this.implementCostOptimizations();
    
    this.notifyListeners('costSettingsUpdated', { settings: this.costSettings });
  }

  async saveCostSettings() {
    try {
      await AsyncStorage.setItem('costOptimizationSettings', JSON.stringify(this.costSettings));
    } catch (error) {
      console.error('Error saving cost optimization settings:', error);
    }
  }

  async loadCostSettings() {
    try {
      const stored = await AsyncStorage.getItem('costOptimizationSettings');
      if (stored) {
        this.costSettings = { ...this.costSettings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading cost optimization settings:', error);
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
        console.error('CostOptimizationService listener error:', error);
      }
    });
  }

  destroy() {
    // Restore original fetch
    if (this.originalFetch) {
      global.fetch = this.originalFetch;
    }
    
    this.listeners = [];
    this.isInitialized = false;
  }
}

export default new CostOptimizationService();
