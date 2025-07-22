import Geolocation from 'react-native-geolocation-service';
import { Alert, AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundTimer from 'react-native-background-timer';

class SafetyService {
  constructor() {
    this.isInitialized = false;
    this.currentSpeed = 0;
    this.isDriving = false;
    this.speedThreshold = 5; // mph/kmh threshold for driving detection
    this.locationWatchId = null;
    this.speedCheckInterval = null;
    this.listeners = [];
    this.lastKnownLocation = null;
    this.speedHistory = [];
    this.maxSpeedHistoryLength = 10;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Start location monitoring
      await this.startLocationMonitoring();
      
      // Start speed checking interval
      this.startSpeedMonitoring();
      
      // Listen for app state changes
      AppState.addEventListener('change', this.handleAppStateChange);
      
      this.isInitialized = true;
      console.log('SafetyService initialized successfully');
    } catch (error) {
      console.error('SafetyService initialization failed:', error);
      throw error;
    }
  }

  startLocationMonitoring() {
    return new Promise((resolve, reject) => {
      this.locationWatchId = Geolocation.watchPosition(
        (position) => {
          this.updateLocation(position);
          resolve();
        },
        (error) => {
          console.error('Location monitoring error:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 1, // Update every meter
          interval: 1000, // Update every second
          fastestInterval: 500,
          forceRequestLocation: true,
          showLocationDialog: true,
        }
      );
    });
  }

  updateLocation(position) {
    const { latitude, longitude, speed, accuracy } = position.coords;
    
    // Convert speed from m/s to mph (or keep as m/s and convert as needed)
    const speedMph = speed ? (speed * 2.237) : 0; // m/s to mph
    const speedKmh = speed ? (speed * 3.6) : 0; // m/s to km/h
    
    this.currentSpeed = speedMph;
    this.lastKnownLocation = { latitude, longitude, accuracy };
    
    // Add to speed history for smoothing
    this.speedHistory.push(speedMph);
    if (this.speedHistory.length > this.maxSpeedHistoryLength) {
      this.speedHistory.shift();
    }
    
    // Calculate average speed for more stable detection
    const avgSpeed = this.speedHistory.reduce((sum, s) => sum + s, 0) / this.speedHistory.length;
    
    // Update driving status
    const wasDriving = this.isDriving;
    this.isDriving = avgSpeed > this.speedThreshold;
    
    // Notify listeners if driving status changed
    if (wasDriving !== this.isDriving) {
      this.notifyListeners('drivingStatusChanged', {
        isDriving: this.isDriving,
        speed: avgSpeed,
        location: this.lastKnownLocation
      });
      
      // Store driving status
      AsyncStorage.setItem('isDriving', JSON.stringify(this.isDriving));
    }
    
    // Always notify speed update
    this.notifyListeners('speedUpdate', {
      speed: avgSpeed,
      isDriving: this.isDriving,
      location: this.lastKnownLocation
    });
  }

  startSpeedMonitoring() {
    // Check speed every 2 seconds
    this.speedCheckInterval = BackgroundTimer.setInterval(() => {
      this.checkDrivingStatus();
    }, 2000);
  }

  checkDrivingStatus() {
    if (this.isDriving) {
      // Log safe driving behavior for gamification
      this.logSafeDrivingBehavior();
    }
  }

  logSafeDrivingBehavior() {
    // This will be used by GameService for safe driving rewards
    this.notifyListeners('safeDrivingDetected', {
      timestamp: Date.now(),
      speed: this.currentSpeed,
      location: this.lastKnownLocation
    });
  }

  // Check if manual interaction should be blocked
  shouldBlockManualInteraction() {
    return this.isDriving;
  }

  // Show safety warning when user tries to interact while driving
  showSafetyWarning(action = 'interact') {
    if (!this.isDriving) return false;

    Alert.alert(
      'Safety First',
      `Cannot ${action} while driving (${this.currentSpeed.toFixed(1)} mph detected).\n\nPlease:\n• Use voice commands\n• Pull over safely to interact`,
      [
        {
          text: 'Use Voice',
          onPress: () => this.notifyListeners('voiceCommandRequested', { action })
        },
        {
          text: 'OK',
          style: 'cancel'
        }
      ]
    );
    return true;
  }

  // Validate if action is safe to perform
  validateSafeAction(action, callback) {
    if (this.shouldBlockManualInteraction()) {
      this.showSafetyWarning(action);
      return false;
    }
    
    if (callback) callback();
    return true;
  }

  // Get current safety status
  getSafetyStatus() {
    return {
      isDriving: this.isDriving,
      currentSpeed: this.currentSpeed,
      speedThreshold: this.speedThreshold,
      canInteract: !this.shouldBlockManualInteraction(),
      location: this.lastKnownLocation,
      lastUpdate: Date.now()
    };
  }

  // Add listener for safety events
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify all listeners
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('SafetyService listener error:', error);
      }
    });
  }

  // Handle app state changes
  handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'active') {
      // App came to foreground, resume monitoring
      if (!this.locationWatchId) {
        this.startLocationMonitoring();
      }
    } else if (nextAppState === 'background') {
      // App went to background, continue monitoring for safety
      console.log('App backgrounded, continuing safety monitoring');
    }
  };

  // Emergency stop - for testing or emergency situations
  emergencyStop() {
    this.isDriving = false;
    this.currentSpeed = 0;
    this.notifyListeners('emergencyStop', {});
    Alert.alert('Emergency Stop', 'Safety monitoring temporarily disabled');
  }

  // Update speed threshold (for different regions/preferences)
  setSpeedThreshold(threshold) {
    this.speedThreshold = threshold;
    AsyncStorage.setItem('speedThreshold', threshold.toString());
  }

  // Cleanup
  destroy() {
    if (this.locationWatchId) {
      Geolocation.clearWatch(this.locationWatchId);
      this.locationWatchId = null;
    }
    
    if (this.speedCheckInterval) {
      BackgroundTimer.clearInterval(this.speedCheckInterval);
      this.speedCheckInterval = null;
    }
    
    AppState.removeEventListener('change', this.handleAppStateChange);
    this.listeners = [];
    this.isInitialized = false;
  }
}

// Export singleton instance
export default new SafetyService();
