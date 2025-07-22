import { Platform, InteractionManager, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class PerformanceOptimizationService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.performanceMetrics = {
      memoryUsage: 0,
      cpuUsage: 0,
      batteryLevel: 100,
      networkLatency: 0,
      frameRate: 60,
      lastOptimization: Date.now(),
    };
    this.optimizationSettings = {
      enableMemoryOptimization: true,
      enableBatteryOptimization: true,
      enableNetworkOptimization: true,
      enableRenderOptimization: true,
      aggressiveOptimization: false,
      backgroundOptimization: true,
    };
    this.appState = AppState.currentState;
    this.isLowPowerMode = false;
    this.memoryWarningCount = 0;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadOptimizationSettings();
      this.setupPerformanceMonitoring();
      this.setupAppStateHandling();
      this.setupMemoryWarningHandling();
      this.startPerformanceOptimization();
      
      this.isInitialized = true;
      console.log('PerformanceOptimizationService initialized successfully');
    } catch (error) {
      console.error('PerformanceOptimizationService initialization failed:', error);
      throw error;
    }
  }

  setupPerformanceMonitoring() {
    // Monitor performance metrics every 30 seconds
    this.performanceInterval = setInterval(() => {
      this.collectPerformanceMetrics();
    }, 30000);

    // Monitor frame rate
    if (Platform.OS !== 'web') {
      this.setupFrameRateMonitoring();
    }
  }

  setupFrameRateMonitoring() {
    let frameCount = 0;
    let lastTime = Date.now();

    const measureFrameRate = () => {
      frameCount++;
      const currentTime = Date.now();
      
      if (currentTime - lastTime >= 1000) {
        this.performanceMetrics.frameRate = frameCount;
        frameCount = 0;
        lastTime = currentTime;
        
        // Trigger optimization if frame rate is low
        if (this.performanceMetrics.frameRate < 30) {
          this.triggerFrameRateOptimization();
        }
      }
      
      requestAnimationFrame(measureFrameRate);
    };

    requestAnimationFrame(measureFrameRate);
  }

  setupAppStateHandling() {
    AppState.addEventListener('change', (nextAppState) => {
      if (this.appState.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        this.onAppForeground();
      } else if (this.appState === 'active' && nextAppState.match(/inactive|background/)) {
        // App has gone to the background
        this.onAppBackground();
      }
      
      this.appState = nextAppState;
    });
  }

  setupMemoryWarningHandling() {
    if (Platform.OS === 'ios') {
      // iOS memory warning handling
      const { NativeModules } = require('react-native');
      if (NativeModules.DeviceEventEmitter) {
        NativeModules.DeviceEventEmitter.addListener('memoryWarning', () => {
          this.handleMemoryWarning();
        });
      }
    }
  }

  async collectPerformanceMetrics() {
    try {
      // Collect memory usage
      if (Platform.OS !== 'web' && global.performance && global.performance.memory) {
        this.performanceMetrics.memoryUsage = global.performance.memory.usedJSHeapSize;
      }

      // Collect battery level (if available)
      if (Platform.OS !== 'web') {
        try {
          const { getBatteryLevel } = require('@react-native-community/netinfo');
          if (getBatteryLevel) {
            this.performanceMetrics.batteryLevel = await getBatteryLevel();
          }
        } catch (error) {
          // Battery API not available
        }
      }

      // Collect network latency
      await this.measureNetworkLatency();

      // Analyze metrics and trigger optimizations
      this.analyzePerformanceMetrics();

    } catch (error) {
      console.error('Error collecting performance metrics:', error);
    }
  }

  async measureNetworkLatency() {
    const startTime = Date.now();
    
    try {
      await fetch('https://api.vibevoyage.app/ping', {
        method: 'HEAD',
        timeout: 5000,
      });
      
      this.performanceMetrics.networkLatency = Date.now() - startTime;
    } catch (error) {
      this.performanceMetrics.networkLatency = 5000; // Assume high latency on error
    }
  }

  analyzePerformanceMetrics() {
    const { memoryUsage, batteryLevel, networkLatency, frameRate } = this.performanceMetrics;
    
    // Determine if aggressive optimization is needed
    const needsOptimization = 
      memoryUsage > 100 * 1024 * 1024 || // > 100MB
      batteryLevel < 20 || // < 20% battery
      networkLatency > 2000 || // > 2s latency
      frameRate < 30; // < 30 FPS

    if (needsOptimization && !this.optimizationSettings.aggressiveOptimization) {
      this.enableAggressiveOptimization();
    } else if (!needsOptimization && this.optimizationSettings.aggressiveOptimization) {
      this.disableAggressiveOptimization();
    }
  }

  startPerformanceOptimization() {
    // Memory optimization
    if (this.optimizationSettings.enableMemoryOptimization) {
      this.optimizeMemoryUsage();
    }

    // Battery optimization
    if (this.optimizationSettings.enableBatteryOptimization) {
      this.optimizeBatteryUsage();
    }

    // Network optimization
    if (this.optimizationSettings.enableNetworkOptimization) {
      this.optimizeNetworkUsage();
    }

    // Render optimization
    if (this.optimizationSettings.enableRenderOptimization) {
      this.optimizeRenderPerformance();
    }
  }

  optimizeMemoryUsage() {
    // Clear unused caches periodically
    setInterval(() => {
      if (this.appState === 'background' || this.optimizationSettings.aggressiveOptimization) {
        this.clearUnusedCaches();
      }
    }, 60000); // Every minute

    // Garbage collection hints
    if (global.gc && this.optimizationSettings.aggressiveOptimization) {
      setInterval(() => {
        if (this.appState === 'background') {
          global.gc();
        }
      }, 120000); // Every 2 minutes
    }
  }

  optimizeBatteryUsage() {
    // Reduce background processing when battery is low
    if (this.performanceMetrics.batteryLevel < 20) {
      this.enableLowPowerMode();
    } else if (this.performanceMetrics.batteryLevel > 50 && this.isLowPowerMode) {
      this.disableLowPowerMode();
    }
  }

  optimizeNetworkUsage() {
    // Implement network request batching
    this.networkRequestQueue = [];
    this.networkBatchInterval = setInterval(() => {
      this.processBatchedNetworkRequests();
    }, 1000);

    // Reduce network polling frequency on slow connections
    if (this.performanceMetrics.networkLatency > 1000) {
      this.notifyListeners('networkOptimization', {
        action: 'reducePollingFrequency',
        latency: this.performanceMetrics.networkLatency,
      });
    }
  }

  optimizeRenderPerformance() {
    // Use InteractionManager for non-critical updates
    this.deferNonCriticalUpdates();

    // Implement frame rate throttling on low-end devices
    if (this.performanceMetrics.frameRate < 45) {
      this.notifyListeners('renderOptimization', {
        action: 'throttleFrameRate',
        currentFrameRate: this.performanceMetrics.frameRate,
      });
    }
  }

  enableAggressiveOptimization() {
    this.optimizationSettings.aggressiveOptimization = true;
    
    // Reduce animation durations
    this.notifyListeners('optimizationModeChanged', {
      mode: 'aggressive',
      settings: {
        reduceAnimations: true,
        disableNonEssentialFeatures: true,
        increasePollingIntervals: true,
      },
    });
  }

  disableAggressiveOptimization() {
    this.optimizationSettings.aggressiveOptimization = false;
    
    this.notifyListeners('optimizationModeChanged', {
      mode: 'normal',
      settings: {
        reduceAnimations: false,
        disableNonEssentialFeatures: false,
        increasePollingIntervals: false,
      },
    });
  }

  enableLowPowerMode() {
    this.isLowPowerMode = true;
    
    this.notifyListeners('lowPowerModeChanged', {
      enabled: true,
      batteryLevel: this.performanceMetrics.batteryLevel,
      optimizations: {
        reduceBackgroundProcessing: true,
        disableLocationUpdates: false, // Keep for navigation
        reduceMapUpdates: true,
        disableAnimations: true,
      },
    });
  }

  disableLowPowerMode() {
    this.isLowPowerMode = false;
    
    this.notifyListeners('lowPowerModeChanged', {
      enabled: false,
      batteryLevel: this.performanceMetrics.batteryLevel,
    });
  }

  handleMemoryWarning() {
    this.memoryWarningCount++;
    console.warn('Memory warning received, triggering cleanup');
    
    // Immediate memory cleanup
    this.clearUnusedCaches();
    
    // Enable aggressive optimization temporarily
    this.enableAggressiveOptimization();
    
    this.notifyListeners('memoryWarning', {
      count: this.memoryWarningCount,
      memoryUsage: this.performanceMetrics.memoryUsage,
    });
  }

  clearUnusedCaches() {
    // Clear image caches
    this.notifyListeners('clearCaches', {
      types: ['images', 'network', 'temporary'],
    });
  }

  deferNonCriticalUpdates() {
    // Use InteractionManager to defer updates
    InteractionManager.runAfterInteractions(() => {
      this.notifyListeners('deferredUpdatesReady', {});
    });
  }

  processBatchedNetworkRequests() {
    if (this.networkRequestQueue.length === 0) return;

    const requests = this.networkRequestQueue.splice(0, 5); // Process up to 5 requests
    
    this.notifyListeners('batchedNetworkRequests', {
      requests,
      queueLength: this.networkRequestQueue.length,
    });
  }

  triggerFrameRateOptimization() {
    this.notifyListeners('frameRateOptimization', {
      currentFrameRate: this.performanceMetrics.frameRate,
      optimizations: {
        reduceComplexAnimations: true,
        simplifyMapRendering: true,
        deferNonVisibleUpdates: true,
      },
    });
  }

  onAppForeground() {
    // Resume normal performance monitoring
    this.startPerformanceOptimization();
    
    this.notifyListeners('appStateChanged', {
      state: 'foreground',
      optimizations: {
        resumeNormalProcessing: true,
      },
    });
  }

  onAppBackground() {
    // Enable background optimizations
    if (this.optimizationSettings.backgroundOptimization) {
      this.clearUnusedCaches();
      
      this.notifyListeners('appStateChanged', {
        state: 'background',
        optimizations: {
          enableBackgroundOptimization: true,
          reduceProcessing: true,
        },
      });
    }
  }

  // Settings management
  async updateOptimizationSettings(newSettings) {
    this.optimizationSettings = { ...this.optimizationSettings, ...newSettings };
    await this.saveOptimizationSettings();
    
    // Restart optimization with new settings
    this.startPerformanceOptimization();
    
    this.notifyListeners('optimizationSettingsUpdated', {
      settings: this.optimizationSettings,
    });
  }

  async saveOptimizationSettings() {
    try {
      await AsyncStorage.setItem('performanceOptimizationSettings', JSON.stringify(this.optimizationSettings));
    } catch (error) {
      console.error('Error saving performance optimization settings:', error);
    }
  }

  async loadOptimizationSettings() {
    try {
      const stored = await AsyncStorage.getItem('performanceOptimizationSettings');
      if (stored) {
        this.optimizationSettings = { ...this.optimizationSettings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading performance optimization settings:', error);
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
        console.error('PerformanceOptimizationService listener error:', error);
      }
    });
  }

  destroy() {
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
    }
    if (this.networkBatchInterval) {
      clearInterval(this.networkBatchInterval);
    }
    
    this.listeners = [];
    this.isInitialized = false;
  }
}

export default new PerformanceOptimizationService();
