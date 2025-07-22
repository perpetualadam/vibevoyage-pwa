import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-netinfo/netinfo';
import { Platform, Alert, DeviceEventEmitter } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

class ErrorMonitoringService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.errorHistory = [];
    this.systemHealth = {
      internet: { status: 'unknown', lastCheck: null, failures: 0 },
      location: { status: 'unknown', lastCheck: null, failures: 0 },
      gps: { status: 'unknown', lastCheck: null, accuracy: 0 },
      compass: { status: 'unknown', lastCheck: null, accuracy: 0 },
      storage: { status: 'unknown', available: 0, used: 0 },
      battery: { status: 'unknown', level: 100, charging: false },
      permissions: { location: 'unknown', overlay: 'unknown' },
    };
    
    this.monitoringSettings = {
      enabled: true,
      proactiveDetection: true,
      autoRecovery: true,
      errorReporting: true,
      healthCheckInterval: 30000, // 30 seconds
      errorRetentionDays: 7,
      maxErrorHistory: 100,
      criticalErrorThreshold: 3, // 3 critical errors trigger emergency mode
    };
    
    this.recoveryStrategies = {
      internet_disabled: ['retry_connection', 'enable_offline_mode', 'show_prompt'],
      location_disabled: ['request_permission', 'show_settings_prompt', 'use_manual_location'],
      gps_weak: ['retry_location', 'increase_timeout', 'use_network_location'],
      compass_weak: ['calibration_prompt', 'disable_compass', 'use_gps_heading'],
      storage_full: ['clear_cache', 'compress_data', 'show_storage_prompt'],
      battery_low: ['enable_power_save', 'reduce_features', 'show_battery_prompt'],
      service_unavailable: ['retry_service', 'use_fallback', 'enable_offline'],
    };
    
    this.emergencyMode = false;
    this.lastHealthCheck = null;
    this.healthCheckInterval = null;
    this.errorQueue = [];
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadSettings();
      await this.loadErrorHistory();
      this.startSystemHealthMonitoring();
      this.setupErrorHandlers();
      
      this.isInitialized = true;
      console.log('ErrorMonitoringService initialized successfully');
    } catch (error) {
      console.error('ErrorMonitoringService initialization failed:', error);
      throw error;
    }
  }

  startSystemHealthMonitoring() {
    if (!this.monitoringSettings.enabled) return;

    // Initial health check
    this.performHealthCheck();

    // Periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.monitoringSettings.healthCheckInterval);

    // Real-time monitoring
    this.setupRealTimeMonitoring();
  }

  async performHealthCheck() {
    this.lastHealthCheck = Date.now();
    
    try {
      // Check internet connectivity
      await this.checkInternetHealth();
      
      // Check location services
      await this.checkLocationHealth();
      
      // Check GPS accuracy
      await this.checkGPSHealth();
      
      // Check compass functionality
      await this.checkCompassHealth();
      
      // Check storage availability
      await this.checkStorageHealth();
      
      // Check battery status
      await this.checkBatteryHealth();
      
      // Check permissions
      await this.checkPermissionsHealth();
      
      // Analyze overall system health
      this.analyzeSystemHealth();
      
    } catch (error) {
      this.logError('health_check_failed', error, 'high');
    }
  }

  async checkInternetHealth() {
    try {
      const state = await NetInfo.fetch();
      const isConnected = state.isConnected && state.isInternetReachable;
      
      this.systemHealth.internet = {
        status: isConnected ? 'good' : 'poor',
        lastCheck: Date.now(),
        failures: isConnected ? 0 : this.systemHealth.internet.failures + 1,
        type: state.type,
        strength: state.details?.strength || 0,
      };

      if (!isConnected && this.monitoringSettings.proactiveDetection) {
        this.handleError('internet_disabled', 'No internet connection detected');
      }
    } catch (error) {
      this.systemHealth.internet.status = 'error';
      this.systemHealth.internet.failures++;
      this.logError('internet_check_failed', error, 'medium');
    }
  }

  async checkLocationHealth() {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE 
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
      
      const result = await check(permission);
      const hasPermission = result === RESULTS.GRANTED;
      
      this.systemHealth.location = {
        status: hasPermission ? 'good' : 'poor',
        lastCheck: Date.now(),
        failures: hasPermission ? 0 : this.systemHealth.location.failures + 1,
        permission: result,
      };

      if (!hasPermission && this.monitoringSettings.proactiveDetection) {
        this.handleError('location_disabled', 'Location permission not granted');
      }
    } catch (error) {
      this.systemHealth.location.status = 'error';
      this.systemHealth.location.failures++;
      this.logError('location_check_failed', error, 'medium');
    }
  }

  async checkGPSHealth() {
    try {
      // Simulate GPS accuracy check
      const accuracy = Math.random() * 100; // 0-100 meters
      
      this.systemHealth.gps = {
        status: accuracy < 20 ? 'good' : accuracy < 50 ? 'fair' : 'poor',
        lastCheck: Date.now(),
        accuracy,
        failures: accuracy > 50 ? this.systemHealth.gps.failures + 1 : 0,
      };

      if (accuracy > 50 && this.monitoringSettings.proactiveDetection) {
        this.handleError('gps_weak', `GPS accuracy is ${accuracy.toFixed(1)}m`);
      }
    } catch (error) {
      this.systemHealth.gps.status = 'error';
      this.systemHealth.gps.failures++;
      this.logError('gps_check_failed', error, 'medium');
    }
  }

  async checkCompassHealth() {
    try {
      // Simulate compass accuracy check
      const accuracy = Math.random() * 45; // 0-45 degrees
      
      this.systemHealth.compass = {
        status: accuracy < 15 ? 'good' : accuracy < 30 ? 'fair' : 'poor',
        lastCheck: Date.now(),
        accuracy,
        failures: accuracy > 30 ? this.systemHealth.compass.failures + 1 : 0,
      };

      if (accuracy > 30 && this.monitoringSettings.proactiveDetection) {
        this.handleError('compass_weak', `Compass accuracy is ${accuracy.toFixed(1)}°`);
      }
    } catch (error) {
      this.systemHealth.compass.status = 'error';
      this.systemHealth.compass.failures++;
      this.logError('compass_check_failed', error, 'low');
    }
  }

  async checkStorageHealth() {
    try {
      // Simulate storage check
      const totalStorage = 1000; // MB
      const usedStorage = Math.random() * totalStorage;
      const availableStorage = totalStorage - usedStorage;
      const usagePercentage = (usedStorage / totalStorage) * 100;
      
      this.systemHealth.storage = {
        status: usagePercentage < 80 ? 'good' : usagePercentage < 95 ? 'fair' : 'poor',
        lastCheck: Date.now(),
        available: availableStorage,
        used: usedStorage,
        usagePercentage,
      };

      if (usagePercentage > 95 && this.monitoringSettings.proactiveDetection) {
        this.handleError('storage_full', `Storage is ${usagePercentage.toFixed(1)}% full`);
      }
    } catch (error) {
      this.systemHealth.storage.status = 'error';
      this.logError('storage_check_failed', error, 'medium');
    }
  }

  async checkBatteryHealth() {
    try {
      // Simulate battery check
      const batteryLevel = Math.random() * 100;
      const isCharging = Math.random() > 0.7;
      
      this.systemHealth.battery = {
        status: batteryLevel > 20 ? 'good' : batteryLevel > 10 ? 'fair' : 'poor',
        lastCheck: Date.now(),
        level: batteryLevel,
        charging: isCharging,
      };

      if (batteryLevel < 15 && !isCharging && this.monitoringSettings.proactiveDetection) {
        this.handleError('battery_low', `Battery level is ${batteryLevel.toFixed(1)}%`);
      }
    } catch (error) {
      this.systemHealth.battery.status = 'error';
      this.logError('battery_check_failed', error, 'low');
    }
  }

  async checkPermissionsHealth() {
    try {
      const locationPermission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE 
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
      
      const locationResult = await check(locationPermission);
      
      this.systemHealth.permissions = {
        location: locationResult,
        overlay: 'unknown', // Would check overlay permission on Android
        lastCheck: Date.now(),
      };
    } catch (error) {
      this.logError('permissions_check_failed', error, 'medium');
    }
  }

  setupRealTimeMonitoring() {
    // Monitor network changes
    NetInfo.addEventListener(state => {
      if (!state.isConnected && this.systemHealth.internet.status === 'good') {
        this.handleError('internet_disabled', 'Internet connection lost');
      }
    });

    // Monitor app state changes
    DeviceEventEmitter.addListener('appStateChange', (state) => {
      if (state === 'active') {
        // Perform quick health check when app becomes active
        setTimeout(() => this.performHealthCheck(), 1000);
      }
    });
  }

  setupErrorHandlers() {
    // Global error handler
    const originalConsoleError = console.error;
    console.error = (...args) => {
      this.logError('console_error', new Error(args.join(' ')), 'medium');
      originalConsoleError.apply(console, args);
    };

    // Unhandled promise rejection handler
    if (typeof global !== 'undefined' && global.process) {
      global.process.on('unhandledRejection', (reason, promise) => {
        this.logError('unhandled_rejection', reason, 'high');
      });
    }
  }

  async handleError(errorType, message, severity = 'medium') {
    const error = {
      type: errorType,
      message,
      severity,
      timestamp: Date.now(),
      systemHealth: { ...this.systemHealth },
      recovered: false,
    };

    this.logError(errorType, new Error(message), severity);

    // Attempt automatic recovery
    if (this.monitoringSettings.autoRecovery) {
      const recovered = await this.attemptRecovery(errorType, error);
      error.recovered = recovered;
    }

    // Show error prompt if not recovered
    if (!error.recovered) {
      this.showErrorPrompt(errorType, message);
    }

    // Check if emergency mode should be activated
    this.checkEmergencyMode();
  }

  async attemptRecovery(errorType, error) {
    const strategies = this.recoveryStrategies[errorType] || [];
    
    for (const strategy of strategies) {
      try {
        const recovered = await this.executeRecoveryStrategy(strategy, error);
        if (recovered) {
          this.notifyListeners('errorRecovered', { 
            errorType, 
            strategy, 
            error 
          });
          return true;
        }
      } catch (recoveryError) {
        console.error(`Recovery strategy ${strategy} failed:`, recoveryError);
      }
    }
    
    return false;
  }

  async executeRecoveryStrategy(strategy, error) {
    switch (strategy) {
      case 'retry_connection':
        const state = await NetInfo.fetch();
        return state.isConnected;
        
      case 'enable_offline_mode':
        this.notifyListeners('enableOfflineMode', { reason: error.type });
        return true;
        
      case 'request_permission':
        // Would implement permission request
        return false;
        
      case 'retry_location':
        // Would implement location retry
        return false;
        
      case 'calibration_prompt':
        this.notifyListeners('showCalibrationPrompt', { reason: error.type });
        return true;
        
      case 'clear_cache':
        // Would implement cache clearing
        return true;
        
      case 'enable_power_save':
        this.notifyListeners('enablePowerSaveMode', { reason: error.type });
        return true;
        
      default:
        return false;
    }
  }

  showErrorPrompt(errorType, message) {
    this.notifyListeners('showErrorPrompt', {
      errorType,
      message,
      timestamp: Date.now(),
      systemHealth: this.systemHealth,
    });
  }

  logError(type, error, severity = 'medium') {
    const errorLog = {
      id: Date.now() + Math.random(),
      type,
      message: error.message || error.toString(),
      severity,
      timestamp: Date.now(),
      stack: error.stack,
      systemHealth: { ...this.systemHealth },
      platform: Platform.OS,
      version: '1.0.0', // App version
    };

    this.errorHistory.unshift(errorLog);
    
    // Limit error history size
    if (this.errorHistory.length > this.monitoringSettings.maxErrorHistory) {
      this.errorHistory = this.errorHistory.slice(0, this.monitoringSettings.maxErrorHistory);
    }

    // Save to storage
    this.saveErrorHistory();

    // Notify listeners
    this.notifyListeners('errorLogged', errorLog);

    // Send to analytics if enabled
    if (this.monitoringSettings.errorReporting) {
      this.reportError(errorLog);
    }
  }

  analyzeSystemHealth() {
    const healthScores = Object.values(this.systemHealth).map(component => {
      switch (component.status) {
        case 'good': return 100;
        case 'fair': return 60;
        case 'poor': return 30;
        case 'error': return 0;
        default: return 50;
      }
    });

    const overallScore = healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length;
    
    this.notifyListeners('systemHealthUpdate', {
      overallScore,
      systemHealth: this.systemHealth,
      timestamp: Date.now(),
    });

    // Trigger warnings for poor health
    if (overallScore < 50) {
      this.notifyListeners('systemHealthWarning', {
        score: overallScore,
        issues: this.getHealthIssues(),
      });
    }
  }

  getHealthIssues() {
    return Object.entries(this.systemHealth)
      .filter(([key, health]) => health.status === 'poor' || health.status === 'error')
      .map(([key, health]) => ({ component: key, status: health.status }));
  }

  checkEmergencyMode() {
    const criticalErrors = this.errorHistory
      .filter(error => error.severity === 'high' && Date.now() - error.timestamp < 300000) // Last 5 minutes
      .length;

    if (criticalErrors >= this.monitoringSettings.criticalErrorThreshold && !this.emergencyMode) {
      this.activateEmergencyMode();
    } else if (criticalErrors < this.monitoringSettings.criticalErrorThreshold && this.emergencyMode) {
      this.deactivateEmergencyMode();
    }
  }

  activateEmergencyMode() {
    this.emergencyMode = true;
    this.notifyListeners('emergencyModeActivated', {
      reason: 'critical_errors',
      errorCount: this.errorHistory.filter(e => e.severity === 'high').length,
    });
  }

  deactivateEmergencyMode() {
    this.emergencyMode = false;
    this.notifyListeners('emergencyModeDeactivated', {
      reason: 'errors_resolved',
    });
  }

  async reportError(errorLog) {
    try {
      // Would send to analytics service
      console.log('Reporting error to analytics:', errorLog.type);
    } catch (error) {
      console.error('Failed to report error:', error);
    }
  }

  // Settings and storage
  async saveErrorHistory() {
    try {
      await AsyncStorage.setItem('errorHistory', JSON.stringify(this.errorHistory));
    } catch (error) {
      console.error('Failed to save error history:', error);
    }
  }

  async loadErrorHistory() {
    try {
      const stored = await AsyncStorage.getItem('errorHistory');
      if (stored) {
        this.errorHistory = JSON.parse(stored);
        
        // Clean old errors
        const cutoff = Date.now() - (this.monitoringSettings.errorRetentionDays * 24 * 60 * 60 * 1000);
        this.errorHistory = this.errorHistory.filter(error => error.timestamp > cutoff);
      }
    } catch (error) {
      console.error('Failed to load error history:', error);
    }
  }

  async loadSettings() {
    try {
      const stored = await AsyncStorage.getItem('errorMonitoringSettings');
      if (stored) {
        this.monitoringSettings = { ...this.monitoringSettings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load monitoring settings:', error);
    }
  }

  async saveSettings() {
    try {
      await AsyncStorage.setItem('errorMonitoringSettings', JSON.stringify(this.monitoringSettings));
    } catch (error) {
      console.error('Failed to save monitoring settings:', error);
    }
  }

  // Public API
  getSystemHealth() {
    return { ...this.systemHealth };
  }

  getErrorHistory() {
    return [...this.errorHistory];
  }

  isEmergencyMode() {
    return this.emergencyMode;
  }

  async updateSettings(newSettings) {
    this.monitoringSettings = { ...this.monitoringSettings, ...newSettings };
    await this.saveSettings();
    
    // Restart monitoring if interval changed
    if (newSettings.healthCheckInterval && this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.startSystemHealthMonitoring();
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
        console.error('ErrorMonitoringService listener error:', error);
      }
    });
  }

  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.listeners = [];
    this.isInitialized = false;
  }
}

export default new ErrorMonitoringService();
