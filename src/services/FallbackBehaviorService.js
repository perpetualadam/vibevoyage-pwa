import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';

class FallbackBehaviorService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.fallbackModes = {
      offline: false,
      lowPower: false,
      emergency: false,
      degraded: false,
    };
    
    this.fallbackStrategies = {
      navigation: {
        primary: 'online_routing',
        fallbacks: ['cached_routes', 'offline_maps', 'basic_directions'],
        current: 'online_routing',
      },
      location: {
        primary: 'gps_high_accuracy',
        fallbacks: ['gps_balanced', 'network_location', 'last_known_location'],
        current: 'gps_high_accuracy',
      },
      maps: {
        primary: 'online_tiles',
        fallbacks: ['cached_tiles', 'offline_maps', 'basic_map'],
        current: 'online_tiles',
      },
      voice: {
        primary: 'online_tts',
        fallbacks: ['offline_tts', 'system_tts', 'text_only'],
        current: 'online_tts',
      },
      traffic: {
        primary: 'live_traffic',
        fallbacks: ['historical_data', 'estimated_traffic', 'no_traffic'],
        current: 'live_traffic',
      },
      pois: {
        primary: 'online_search',
        fallbacks: ['cached_pois', 'offline_database', 'basic_categories'],
        current: 'online_search',
      },
    };
    
    this.degradationLevels = {
      level0: { // Normal operation
        features: ['all'],
        performance: 'high',
        description: 'All features available',
      },
      level1: { // Minor degradation
        features: ['navigation', 'voice', 'basic_pois'],
        performance: 'medium',
        description: 'Non-essential features disabled',
      },
      level2: { // Significant degradation
        features: ['navigation', 'basic_voice'],
        performance: 'low',
        description: 'Only core navigation features',
      },
      level3: { // Emergency mode
        features: ['basic_navigation'],
        performance: 'minimal',
        description: 'Emergency navigation only',
      },
    };
    
    this.currentDegradationLevel = 'level0';
    this.fallbackHistory = [];
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadSettings();
      this.setupFallbackMonitoring();
      
      this.isInitialized = true;
      console.log('FallbackBehaviorService initialized successfully');
    } catch (error) {
      console.error('FallbackBehaviorService initialization failed:', error);
      throw error;
    }
  }

  setupFallbackMonitoring() {
    // Monitor system conditions that trigger fallbacks
    this.monitorNetworkConditions();
    this.monitorPerformanceConditions();
    this.monitorBatteryConditions();
  }

  monitorNetworkConditions() {
    // Would integrate with NetInfo to monitor connection quality
    setInterval(() => {
      this.checkNetworkFallbacks();
    }, 10000); // Check every 10 seconds
  }

  monitorPerformanceConditions() {
    // Monitor app performance and trigger fallbacks if needed
    setInterval(() => {
      this.checkPerformanceFallbacks();
    }, 30000); // Check every 30 seconds
  }

  monitorBatteryConditions() {
    // Monitor battery level and trigger power-saving fallbacks
    setInterval(() => {
      this.checkBatteryFallbacks();
    }, 60000); // Check every minute
  }

  async checkNetworkFallbacks() {
    // Simulate network quality check
    const networkQuality = Math.random(); // 0-1, where 1 is best
    
    if (networkQuality < 0.3 && !this.fallbackModes.offline) {
      await this.activateOfflineMode('poor_network');
    } else if (networkQuality > 0.7 && this.fallbackModes.offline) {
      await this.deactivateOfflineMode('network_restored');
    }
  }

  async checkPerformanceFallbacks() {
    // Simulate performance check
    const performance = Math.random(); // 0-1, where 1 is best performance
    
    if (performance < 0.4 && !this.fallbackModes.degraded) {
      await this.activateDegradedMode('poor_performance');
    } else if (performance > 0.7 && this.fallbackModes.degraded) {
      await this.deactivateDegradedMode('performance_restored');
    }
  }

  async checkBatteryFallbacks() {
    // Simulate battery check
    const batteryLevel = Math.random() * 100;
    
    if (batteryLevel < 20 && !this.fallbackModes.lowPower) {
      await this.activateLowPowerMode('low_battery');
    } else if (batteryLevel > 50 && this.fallbackModes.lowPower) {
      await this.deactivateLowPowerMode('battery_restored');
    }
  }

  async activateOfflineMode(reason) {
    this.fallbackModes.offline = true;
    
    // Switch to offline fallbacks
    await this.switchToFallback('navigation', 'cached_routes');
    await this.switchToFallback('maps', 'cached_tiles');
    await this.switchToFallback('voice', 'offline_tts');
    await this.switchToFallback('traffic', 'historical_data');
    await this.switchToFallback('pois', 'cached_pois');
    
    this.logFallback('offline_mode_activated', reason);
    this.notifyListeners('offlineModeActivated', { reason, timestamp: Date.now() });
  }

  async deactivateOfflineMode(reason) {
    this.fallbackModes.offline = false;
    
    // Switch back to primary services
    await this.switchToPrimary('navigation');
    await this.switchToPrimary('maps');
    await this.switchToPrimary('voice');
    await this.switchToPrimary('traffic');
    await this.switchToPrimary('pois');
    
    this.logFallback('offline_mode_deactivated', reason);
    this.notifyListeners('offlineModeDeactivated', { reason, timestamp: Date.now() });
  }

  async activateLowPowerMode(reason) {
    this.fallbackModes.lowPower = true;
    
    // Reduce power consumption
    await this.switchToFallback('location', 'gps_balanced');
    await this.switchToFallback('maps', 'cached_tiles');
    await this.degradeToLevel('level1');
    
    this.logFallback('low_power_mode_activated', reason);
    this.notifyListeners('lowPowerModeActivated', { reason, timestamp: Date.now() });
  }

  async deactivateLowPowerMode(reason) {
    this.fallbackModes.lowPower = false;
    
    // Restore full functionality
    await this.switchToPrimary('location');
    await this.switchToPrimary('maps');
    await this.degradeToLevel('level0');
    
    this.logFallback('low_power_mode_deactivated', reason);
    this.notifyListeners('lowPowerModeDeactivated', { reason, timestamp: Date.now() });
  }

  async activateDegradedMode(reason) {
    this.fallbackModes.degraded = true;
    
    // Reduce feature set for better performance
    await this.degradeToLevel('level2');
    
    this.logFallback('degraded_mode_activated', reason);
    this.notifyListeners('degradedModeActivated', { reason, timestamp: Date.now() });
  }

  async deactivateDegradedMode(reason) {
    this.fallbackModes.degraded = false;
    
    // Restore full feature set
    await this.degradeToLevel('level0');
    
    this.logFallback('degraded_mode_deactivated', reason);
    this.notifyListeners('degradedModeDeactivated', { reason, timestamp: Date.now() });
  }

  async activateEmergencyMode(reason) {
    this.fallbackModes.emergency = true;
    
    // Minimal functionality for emergency situations
    await this.degradeToLevel('level3');
    await this.switchToFallback('navigation', 'basic_directions');
    await this.switchToFallback('voice', 'text_only');
    await this.switchToFallback('maps', 'basic_map');
    
    this.logFallback('emergency_mode_activated', reason);
    this.notifyListeners('emergencyModeActivated', { reason, timestamp: Date.now() });
    
    // Show emergency mode alert
    Alert.alert(
      'Emergency Mode',
      'VibeVoyage is now in emergency mode with minimal features to conserve resources.',
      [{ text: 'OK' }]
    );
  }

  async deactivateEmergencyMode(reason) {
    this.fallbackModes.emergency = false;
    
    // Restore normal operation
    await this.degradeToLevel('level0');
    await this.switchToPrimary('navigation');
    await this.switchToPrimary('voice');
    await this.switchToPrimary('maps');
    
    this.logFallback('emergency_mode_deactivated', reason);
    this.notifyListeners('emergencyModeDeactivated', { reason, timestamp: Date.now() });
  }

  async switchToFallback(service, fallbackType) {
    const strategy = this.fallbackStrategies[service];
    if (!strategy) return false;

    const fallbackIndex = strategy.fallbacks.indexOf(fallbackType);
    if (fallbackIndex === -1) return false;

    strategy.current = fallbackType;
    
    this.notifyListeners('serviceFallback', {
      service,
      from: strategy.primary,
      to: fallbackType,
      timestamp: Date.now(),
    });

    return true;
  }

  async switchToPrimary(service) {
    const strategy = this.fallbackStrategies[service];
    if (!strategy) return false;

    strategy.current = strategy.primary;
    
    this.notifyListeners('serviceRestored', {
      service,
      to: strategy.primary,
      timestamp: Date.now(),
    });

    return true;
  }

  async degradeToLevel(level) {
    if (!this.degradationLevels[level]) return false;

    const previousLevel = this.currentDegradationLevel;
    this.currentDegradationLevel = level;
    
    const degradationConfig = this.degradationLevels[level];
    
    this.notifyListeners('degradationLevelChanged', {
      from: previousLevel,
      to: level,
      config: degradationConfig,
      timestamp: Date.now(),
    });

    return true;
  }

  // Intelligent fallback selection
  async selectBestFallback(service, criteria = {}) {
    const strategy = this.fallbackStrategies[service];
    if (!strategy) return null;

    // Consider current conditions
    const conditions = {
      networkQuality: criteria.networkQuality || 0.5,
      batteryLevel: criteria.batteryLevel || 50,
      performance: criteria.performance || 0.5,
      ...criteria,
    };

    // Score each fallback option
    const scoredFallbacks = strategy.fallbacks.map(fallback => ({
      fallback,
      score: this.scoreFallbackOption(service, fallback, conditions),
    }));

    // Sort by score and return best option
    scoredFallbacks.sort((a, b) => b.score - a.score);
    return scoredFallbacks[0]?.fallback || strategy.fallbacks[0];
  }

  scoreFallbackOption(service, fallback, conditions) {
    let score = 50; // Base score

    // Adjust score based on conditions
    switch (fallback) {
      case 'cached_routes':
      case 'cached_tiles':
      case 'cached_pois':
        score += (1 - conditions.networkQuality) * 30; // Better when network is poor
        break;
        
      case 'gps_balanced':
      case 'network_location':
        score += (1 - conditions.batteryLevel / 100) * 25; // Better when battery is low
        break;
        
      case 'offline_tts':
      case 'system_tts':
        score += (1 - conditions.performance) * 20; // Better when performance is poor
        break;
        
      case 'basic_directions':
      case 'basic_map':
      case 'text_only':
        score += (1 - conditions.performance) * 40; // Much better when performance is very poor
        break;
    }

    return Math.max(0, Math.min(100, score));
  }

  // Automatic recovery
  async attemptServiceRecovery(service) {
    const strategy = this.fallbackStrategies[service];
    if (!strategy || strategy.current === strategy.primary) return false;

    // Test if primary service is available again
    const primaryAvailable = await this.testServiceAvailability(service, strategy.primary);
    
    if (primaryAvailable) {
      await this.switchToPrimary(service);
      this.logFallback('service_recovered', `${service} primary service restored`);
      return true;
    }

    // Try next best fallback
    const currentIndex = strategy.fallbacks.indexOf(strategy.current);
    if (currentIndex > 0) {
      const betterFallback = strategy.fallbacks[currentIndex - 1];
      const fallbackAvailable = await this.testServiceAvailability(service, betterFallback);
      
      if (fallbackAvailable) {
        await this.switchToFallback(service, betterFallback);
        this.logFallback('fallback_improved', `${service} upgraded to ${betterFallback}`);
        return true;
      }
    }

    return false;
  }

  async testServiceAvailability(service, serviceType) {
    // Simulate service availability test
    switch (serviceType) {
      case 'online_routing':
      case 'online_tiles':
      case 'live_traffic':
      case 'online_search':
        return Math.random() > 0.3; // 70% chance online services are available
        
      case 'gps_high_accuracy':
        return Math.random() > 0.2; // 80% chance GPS is available
        
      case 'online_tts':
        return Math.random() > 0.4; // 60% chance online TTS is available
        
      default:
        return true; // Fallback services are usually available
    }
  }

  // Recovery scheduling
  scheduleRecoveryAttempts() {
    // Attempt recovery every 2 minutes
    setInterval(async () => {
      for (const service of Object.keys(this.fallbackStrategies)) {
        await this.attemptServiceRecovery(service);
      }
    }, 120000);
  }

  logFallback(type, reason) {
    const fallbackLog = {
      id: Date.now() + Math.random(),
      type,
      reason,
      timestamp: Date.now(),
      modes: { ...this.fallbackModes },
      degradationLevel: this.currentDegradationLevel,
      services: Object.fromEntries(
        Object.entries(this.fallbackStrategies).map(([key, strategy]) => [
          key,
          strategy.current,
        ])
      ),
    };

    this.fallbackHistory.unshift(fallbackLog);
    
    // Limit history size
    if (this.fallbackHistory.length > 50) {
      this.fallbackHistory = this.fallbackHistory.slice(0, 50);
    }

    this.saveFallbackHistory();
  }

  // Public API
  getCurrentFallbackModes() {
    return { ...this.fallbackModes };
  }

  getCurrentDegradationLevel() {
    return this.currentDegradationLevel;
  }

  getCurrentServiceStates() {
    return Object.fromEntries(
      Object.entries(this.fallbackStrategies).map(([key, strategy]) => [
        key,
        {
          current: strategy.current,
          primary: strategy.primary,
          isFallback: strategy.current !== strategy.primary,
        },
      ])
    );
  }

  getFallbackHistory() {
    return [...this.fallbackHistory];
  }

  isServiceDegraded(service) {
    const strategy = this.fallbackStrategies[service];
    return strategy && strategy.current !== strategy.primary;
  }

  getAvailableFeatures() {
    const level = this.degradationLevels[this.currentDegradationLevel];
    return level ? level.features : [];
  }

  // Storage
  async saveFallbackHistory() {
    try {
      await AsyncStorage.setItem('fallbackHistory', JSON.stringify(this.fallbackHistory));
    } catch (error) {
      console.error('Failed to save fallback history:', error);
    }
  }

  async loadSettings() {
    try {
      const history = await AsyncStorage.getItem('fallbackHistory');
      if (history) {
        this.fallbackHistory = JSON.parse(history);
      }
    } catch (error) {
      console.error('Failed to load fallback settings:', error);
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
        console.error('FallbackBehaviorService listener error:', error);
      }
    });
  }

  destroy() {
    this.listeners = [];
    this.isInitialized = false;
  }
}

export default new FallbackBehaviorService();
