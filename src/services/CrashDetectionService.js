import { DeviceEventEmitter, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundTimer from 'react-native-background-timer';

class CrashDetectionService {
  constructor() {
    this.isInitialized = false;
    this.isMonitoring = false;
    this.listeners = [];
    this.emergencyContacts = [];
    this.accelerometerData = [];
    this.maxDataPoints = 50;
    this.crashThreshold = 3.0; // G-force threshold for crash detection
    this.suddenStopThreshold = 2.5; // G-force threshold for sudden stop
    this.crashDetectionTimeout = 10000; // 10 seconds to respond to crash alert
    this.lastCrashTime = 0;
    this.crashCooldown = 30000; // 30 seconds between crash detections
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadEmergencyContacts();
      await this.loadSettings();
      this.setupAccelerometer();
      this.isInitialized = true;
      console.log('CrashDetectionService initialized successfully');
    } catch (error) {
      console.error('CrashDetectionService initialization failed:', error);
      throw error;
    }
  }

  setupAccelerometer() {
    // Listen for accelerometer data
    this.accelerometerSubscription = DeviceEventEmitter.addListener(
      'accelerometerData',
      this.handleAccelerometerData.bind(this)
    );

    // Start accelerometer monitoring if available
    if (NativeModules.AccelerometerModule) {
      NativeModules.AccelerometerModule.startAccelerometer(100); // 100ms interval
    }
  }

  startMonitoring() {
    if (!this.isInitialized || this.isMonitoring) return;

    this.isMonitoring = true;
    this.notifyListeners('monitoringStarted', {});
    console.log('Crash detection monitoring started');
  }

  stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    this.accelerometerData = [];
    this.notifyListeners('monitoringStopped', {});
    console.log('Crash detection monitoring stopped');
  }

  handleAccelerometerData(data) {
    if (!this.isMonitoring) return;

    const { x, y, z, timestamp } = data;
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    // Add to data buffer
    this.accelerometerData.push({
      x, y, z, magnitude, timestamp
    });

    // Keep only recent data points
    if (this.accelerometerData.length > this.maxDataPoints) {
      this.accelerometerData.shift();
    }

    // Check for crash patterns
    this.analyzeCrashPatterns(magnitude, timestamp);
  }

  analyzeCrashPatterns(magnitude, timestamp) {
    // Avoid multiple detections in short time
    if (timestamp - this.lastCrashTime < this.crashCooldown) return;

    // High impact detection
    if (magnitude > this.crashThreshold) {
      this.detectHighImpactCrash(magnitude, timestamp);
      return;
    }

    // Sudden stop detection (requires recent data)
    if (this.accelerometerData.length >= 10) {
      this.detectSuddenStop(timestamp);
    }

    // Rollover detection
    this.detectRollover(timestamp);
  }

  detectHighImpactCrash(magnitude, timestamp) {
    const crashData = {
      type: 'high_impact',
      magnitude,
      timestamp,
      confidence: this.calculateConfidence(magnitude, 'high_impact'),
      location: null, // Will be filled by location service
    };

    this.triggerCrashAlert(crashData);
  }

  detectSuddenStop(timestamp) {
    const recentData = this.accelerometerData.slice(-10);
    const avgMagnitude = recentData.reduce((sum, data) => sum + data.magnitude, 0) / recentData.length;
    const maxMagnitude = Math.max(...recentData.map(data => data.magnitude));

    if (maxMagnitude > this.suddenStopThreshold && avgMagnitude > 1.5) {
      const crashData = {
        type: 'sudden_stop',
        magnitude: maxMagnitude,
        avgMagnitude,
        timestamp,
        confidence: this.calculateConfidence(maxMagnitude, 'sudden_stop'),
        location: null,
      };

      this.triggerCrashAlert(crashData);
    }
  }

  detectRollover(timestamp) {
    if (this.accelerometerData.length < 20) return;

    const recentData = this.accelerometerData.slice(-20);
    let rotationCount = 0;
    let lastOrientation = null;

    recentData.forEach(data => {
      const orientation = this.calculateOrientation(data.x, data.y, data.z);
      if (lastOrientation && orientation !== lastOrientation) {
        rotationCount++;
      }
      lastOrientation = orientation;
    });

    // Multiple orientation changes suggest rollover
    if (rotationCount > 6) {
      const crashData = {
        type: 'rollover',
        rotationCount,
        timestamp,
        confidence: this.calculateConfidence(rotationCount, 'rollover'),
        location: null,
      };

      this.triggerCrashAlert(crashData);
    }
  }

  calculateOrientation(x, y, z) {
    const absX = Math.abs(x);
    const absY = Math.abs(y);
    const absZ = Math.abs(z);

    if (absZ > absX && absZ > absY) {
      return z > 0 ? 'face_up' : 'face_down';
    } else if (absY > absX) {
      return y > 0 ? 'top_up' : 'top_down';
    } else {
      return x > 0 ? 'right_up' : 'left_up';
    }
  }

  calculateConfidence(value, type) {
    switch (type) {
      case 'high_impact':
        return Math.min(100, (value / this.crashThreshold) * 60);
      case 'sudden_stop':
        return Math.min(100, (value / this.suddenStopThreshold) * 50);
      case 'rollover':
        return Math.min(100, (value / 8) * 70);
      default:
        return 50;
    }
  }

  async triggerCrashAlert(crashData) {
    this.lastCrashTime = crashData.timestamp;

    // Get current location
    try {
      const LocationService = require('./LocationService').default;
      const location = await LocationService.getCurrentLocation();
      crashData.location = location;
    } catch (error) {
      console.error('Failed to get location for crash alert:', error);
    }

    // Notify listeners
    this.notifyListeners('crashDetected', crashData);

    // Start countdown for emergency response
    this.startEmergencyCountdown(crashData);
  }

  startEmergencyCountdown(crashData) {
    let countdown = this.crashDetectionTimeout / 1000; // Convert to seconds
    
    const countdownInterval = BackgroundTimer.setInterval(() => {
      countdown--;
      
      this.notifyListeners('emergencyCountdown', {
        countdown,
        crashData,
      });

      if (countdown <= 0) {
        BackgroundTimer.clearInterval(countdownInterval);
        this.executeEmergencyResponse(crashData);
      }
    }, 1000);

    // Store interval ID for potential cancellation
    this.currentCountdownInterval = countdownInterval;
  }

  cancelEmergencyResponse() {
    if (this.currentCountdownInterval) {
      BackgroundTimer.clearInterval(this.currentCountdownInterval);
      this.currentCountdownInterval = null;
      this.notifyListeners('emergencyResponseCancelled', {});
    }
  }

  async executeEmergencyResponse(crashData) {
    try {
      // Send emergency alerts
      await this.sendEmergencyAlerts(crashData);
      
      // Log crash event
      await this.logCrashEvent(crashData);
      
      this.notifyListeners('emergencyResponseExecuted', { crashData });
      
    } catch (error) {
      console.error('Emergency response execution failed:', error);
      this.notifyListeners('emergencyResponseFailed', { error: error.message });
    }
  }

  async sendEmergencyAlerts(crashData) {
    const alerts = [];

    // Send to emergency contacts
    for (const contact of this.emergencyContacts) {
      try {
        await this.sendEmergencyMessage(contact, crashData);
        alerts.push({ contact: contact.name, status: 'sent' });
      } catch (error) {
        alerts.push({ contact: contact.name, status: 'failed', error: error.message });
      }
    }

    // Send to emergency services (if enabled)
    if (this.settings?.autoCallEmergencyServices) {
      try {
        await this.callEmergencyServices(crashData);
        alerts.push({ service: 'emergency_services', status: 'called' });
      } catch (error) {
        alerts.push({ service: 'emergency_services', status: 'failed', error: error.message });
      }
    }

    return alerts;
  }

  async sendEmergencyMessage(contact, crashData) {
    const message = this.formatEmergencyMessage(crashData);
    
    // This would integrate with SMS/messaging service
    console.log(`Sending emergency message to ${contact.name}: ${message}`);
    
    // Placeholder for actual SMS implementation
    // await SMSService.send(contact.phone, message);
  }

  async callEmergencyServices(crashData) {
    // This would integrate with emergency calling service
    console.log('Calling emergency services for crash:', crashData);
    
    // Placeholder for actual emergency calling
    // await EmergencyCallService.call('911', crashData);
  }

  formatEmergencyMessage(crashData) {
    const locationText = crashData.location 
      ? `Location: ${crashData.location.latitude}, ${crashData.location.longitude}`
      : 'Location: Unknown';

    return `EMERGENCY: Possible car crash detected via VibeVoyage app.
Type: ${crashData.type}
Time: ${new Date(crashData.timestamp).toLocaleString()}
${locationText}
Confidence: ${Math.round(crashData.confidence)}%

This is an automated message. Please check on the user immediately.`;
  }

  async logCrashEvent(crashData) {
    try {
      const crashLog = {
        ...crashData,
        id: Date.now(),
        deviceInfo: await this.getDeviceInfo(),
        appVersion: '1.0.0', // Get from app config
      };

      // Store locally
      const existingLogs = await this.getCrashLogs();
      existingLogs.push(crashLog);
      await AsyncStorage.setItem('crashLogs', JSON.stringify(existingLogs));

      // Send to analytics (if enabled)
      if (this.settings?.shareAnalytics) {
        // await AnalyticsService.logCrashEvent(crashLog);
      }

    } catch (error) {
      console.error('Failed to log crash event:', error);
    }
  }

  async getDeviceInfo() {
    // Get device information for crash analysis
    return {
      platform: 'react-native',
      timestamp: Date.now(),
    };
  }

  // Emergency contacts management
  async addEmergencyContact(contact) {
    const newContact = {
      id: Date.now(),
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship || 'Emergency Contact',
      priority: contact.priority || 1,
      addedAt: Date.now(),
    };

    this.emergencyContacts.push(newContact);
    await this.saveEmergencyContacts();
    this.notifyListeners('emergencyContactAdded', { contact: newContact });
    return newContact;
  }

  async removeEmergencyContact(contactId) {
    this.emergencyContacts = this.emergencyContacts.filter(contact => contact.id !== contactId);
    await this.saveEmergencyContacts();
    this.notifyListeners('emergencyContactRemoved', { contactId });
  }

  // Storage methods
  async loadEmergencyContacts() {
    try {
      const stored = await AsyncStorage.getItem('emergencyContacts');
      if (stored) {
        this.emergencyContacts = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading emergency contacts:', error);
    }
  }

  async saveEmergencyContacts() {
    try {
      await AsyncStorage.setItem('emergencyContacts', JSON.stringify(this.emergencyContacts));
    } catch (error) {
      console.error('Error saving emergency contacts:', error);
    }
  }

  async loadSettings() {
    try {
      const stored = await AsyncStorage.getItem('crashDetectionSettings');
      if (stored) {
        this.settings = JSON.parse(stored);
        this.crashThreshold = this.settings.crashThreshold || this.crashThreshold;
        this.suddenStopThreshold = this.settings.suddenStopThreshold || this.suddenStopThreshold;
      }
    } catch (error) {
      console.error('Error loading crash detection settings:', error);
    }
  }

  async saveSettings(settings) {
    try {
      this.settings = { ...this.settings, ...settings };
      await AsyncStorage.setItem('crashDetectionSettings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving crash detection settings:', error);
    }
  }

  async getCrashLogs() {
    try {
      const stored = await AsyncStorage.getItem('crashLogs');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading crash logs:', error);
      return [];
    }
  }

  // Getters
  getEmergencyContacts() {
    return [...this.emergencyContacts];
  }

  getSettings() {
    return { ...this.settings };
  }

  isMonitoringActive() {
    return this.isMonitoring;
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
        console.error('CrashDetectionService listener error:', error);
      }
    });
  }

  destroy() {
    this.stopMonitoring();
    if (this.accelerometerSubscription) {
      this.accelerometerSubscription.remove();
    }
    if (NativeModules.AccelerometerModule) {
      NativeModules.AccelerometerModule.stopAccelerometer();
    }
    this.listeners = [];
    this.isInitialized = false;
  }
}

export default new CrashDetectionService();
