import { Platform, NativeModules, DeviceEventEmitter, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Native modules for overlay functionality
const { OverlayModule } = NativeModules;

class DisplayOverAppsService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.overlayActive = false;
    this.overlayPermissionGranted = false;
    this.overlaySettings = {
      enabled: false,
      autoShowDuringNavigation: true,
      showSpeedometer: true,
      showNextTurn: true,
      showETA: true,
      showObstacleAlerts: true,
      minimizeWhenNotNavigating: true,
      overlaySize: 'medium', // 'small', 'medium', 'large'
      overlayPosition: 'top-right', // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
      overlayOpacity: 0.9,
      autoHideDelay: 10000, // 10 seconds
    };
    
    // Overlay content state
    this.overlayData = {
      currentSpeed: 0,
      speedLimit: null,
      nextTurn: null,
      eta: null,
      currentInstruction: null,
      obstacleAlert: null,
      isNavigating: false,
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadSettings();
      await this.checkOverlayPermission();
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('DisplayOverAppsService initialized successfully');
    } catch (error) {
      console.error('DisplayOverAppsService initialization failed:', error);
      throw error;
    }
  }

  async checkOverlayPermission() {
    if (Platform.OS === 'android') {
      try {
        if (OverlayModule) {
          const hasPermission = await OverlayModule.checkOverlayPermission();
          this.overlayPermissionGranted = hasPermission;
          
          if (!hasPermission && this.overlaySettings.enabled) {
            this.showPermissionPrompt();
          }
        }
      } catch (error) {
        console.error('Error checking overlay permission:', error);
        this.overlayPermissionGranted = false;
      }
    } else if (Platform.OS === 'ios') {
      // iOS uses Picture-in-Picture mode
      this.overlayPermissionGranted = true; // PiP doesn't require special permission
    }
  }

  async requestOverlayPermission() {
    if (Platform.OS === 'android') {
      try {
        if (OverlayModule) {
          const granted = await OverlayModule.requestOverlayPermission();
          this.overlayPermissionGranted = granted;
          
          if (granted) {
            this.notifyListeners('permissionGranted', { platform: 'android' });
          } else {
            this.showPermissionDeniedAlert();
          }
          
          return granted;
        }
      } catch (error) {
        console.error('Error requesting overlay permission:', error);
        return false;
      }
    } else if (Platform.OS === 'ios') {
      // iOS automatically handles PiP permission
      this.overlayPermissionGranted = true;
      this.notifyListeners('permissionGranted', { platform: 'ios' });
      return true;
    }
    
    return false;
  }

  showPermissionPrompt() {
    Alert.alert(
      'Display Over Other Apps',
      'VibeVoyage can show navigation information over other apps for safer driving. This requires special permission.',
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: () => this.updateSettings({ enabled: false }),
        },
        {
          text: 'Grant Permission',
          onPress: () => this.requestOverlayPermission(),
        },
      ]
    );
  }

  showPermissionDeniedAlert() {
    Alert.alert(
      'Permission Required',
      'To display navigation over other apps, please enable "Display over other apps" permission in your device settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => this.openOverlaySettings(),
        },
      ]
    );
  }

  async openOverlaySettings() {
    if (Platform.OS === 'android') {
      try {
        if (OverlayModule) {
          await OverlayModule.openOverlaySettings();
        } else {
          // Fallback to general app settings
          await Linking.openSettings();
        }
      } catch (error) {
        console.error('Error opening overlay settings:', error);
        await Linking.openSettings();
      }
    } else {
      await Linking.openSettings();
    }
  }

  async showOverlay(data = {}) {
    if (!this.overlayPermissionGranted || !this.overlaySettings.enabled) {
      console.warn('Overlay permission not granted or overlay disabled');
      return false;
    }

    try {
      this.overlayData = { ...this.overlayData, ...data };
      
      if (Platform.OS === 'android') {
        if (OverlayModule) {
          const overlayConfig = {
            ...this.overlaySettings,
            data: this.overlayData,
          };
          
          const success = await OverlayModule.showOverlay(overlayConfig);
          this.overlayActive = success;
          
          if (success) {
            this.notifyListeners('overlayShown', { data: this.overlayData });
          }
          
          return success;
        }
      } else if (Platform.OS === 'ios') {
        // iOS Picture-in-Picture implementation
        return await this.showPictureInPicture(data);
      }
    } catch (error) {
      console.error('Error showing overlay:', error);
      return false;
    }
    
    return false;
  }

  async showPictureInPicture(data) {
    try {
      // iOS PiP implementation would go here
      // This would require native iOS module implementation
      console.log('Picture-in-Picture mode activated with data:', data);
      this.overlayActive = true;
      this.notifyListeners('overlayShown', { data, mode: 'pip' });
      return true;
    } catch (error) {
      console.error('Error showing Picture-in-Picture:', error);
      return false;
    }
  }

  async hideOverlay() {
    if (!this.overlayActive) return true;

    try {
      if (Platform.OS === 'android') {
        if (OverlayModule) {
          const success = await OverlayModule.hideOverlay();
          this.overlayActive = !success;
          
          if (success) {
            this.notifyListeners('overlayHidden', {});
          }
          
          return success;
        }
      } else if (Platform.OS === 'ios') {
        // Hide iOS Picture-in-Picture
        this.overlayActive = false;
        this.notifyListeners('overlayHidden', { mode: 'pip' });
        return true;
      }
    } catch (error) {
      console.error('Error hiding overlay:', error);
      return false;
    }
    
    return false;
  }

  async updateOverlayData(data) {
    if (!this.overlayActive) return;

    try {
      this.overlayData = { ...this.overlayData, ...data };
      
      if (Platform.OS === 'android') {
        if (OverlayModule) {
          await OverlayModule.updateOverlayData(this.overlayData);
        }
      } else if (Platform.OS === 'ios') {
        // Update iOS PiP content
        this.notifyListeners('overlayDataUpdated', { data: this.overlayData });
      }
    } catch (error) {
      console.error('Error updating overlay data:', error);
    }
  }

  // Navigation integration methods
  async startNavigationOverlay(navigationData) {
    if (!this.overlaySettings.autoShowDuringNavigation) return;

    const overlayData = {
      isNavigating: true,
      currentInstruction: navigationData.currentInstruction,
      nextTurn: navigationData.nextTurn,
      eta: navigationData.eta,
      currentSpeed: navigationData.currentSpeed,
      speedLimit: navigationData.speedLimit,
    };

    return await this.showOverlay(overlayData);
  }

  async stopNavigationOverlay() {
    if (this.overlaySettings.minimizeWhenNotNavigating) {
      await this.updateOverlayData({ isNavigating: false });
      
      // Auto-hide after delay
      setTimeout(async () => {
        if (!this.overlayData.isNavigating) {
          await this.hideOverlay();
        }
      }, this.overlaySettings.autoHideDelay);
    } else {
      await this.hideOverlay();
    }
  }

  async updateNavigationData(data) {
    if (this.overlayActive) {
      await this.updateOverlayData(data);
    }
  }

  async showObstacleAlert(obstacleData) {
    if (this.overlaySettings.showObstacleAlerts) {
      await this.updateOverlayData({
        obstacleAlert: {
          type: obstacleData.type,
          distance: obstacleData.distance,
          severity: obstacleData.severity,
          timestamp: Date.now(),
        },
      });

      // Auto-clear alert after 10 seconds
      setTimeout(async () => {
        await this.updateOverlayData({ obstacleAlert: null });
      }, 10000);
    }
  }

  setupEventListeners() {
    // Listen for app state changes
    DeviceEventEmitter.addListener('appStateChange', (state) => {
      if (state === 'background' && this.overlayActive) {
        // App went to background, overlay should remain visible
        this.notifyListeners('appBackgrounded', { overlayActive: this.overlayActive });
      } else if (state === 'active' && this.overlayActive) {
        // App came to foreground, optionally hide overlay
        if (!this.overlayData.isNavigating) {
          this.hideOverlay();
        }
      }
    });

    // Listen for overlay events from native modules
    if (Platform.OS === 'android' && OverlayModule) {
      DeviceEventEmitter.addListener('overlayClicked', (data) => {
        this.notifyListeners('overlayInteraction', { type: 'click', data });
      });

      DeviceEventEmitter.addListener('overlayDismissed', (data) => {
        this.overlayActive = false;
        this.notifyListeners('overlayHidden', { reason: 'user_dismissed' });
      });
    }
  }

  // Settings management
  async updateSettings(newSettings) {
    this.overlaySettings = { ...this.overlaySettings, ...newSettings };
    await this.saveSettings();
    
    // If overlay was disabled, hide it
    if (!newSettings.enabled && this.overlayActive) {
      await this.hideOverlay();
    }
    
    this.notifyListeners('settingsUpdated', { settings: this.overlaySettings });
  }

  async saveSettings() {
    try {
      await AsyncStorage.setItem('displayOverAppsSettings', JSON.stringify(this.overlaySettings));
    } catch (error) {
      console.error('Error saving display over apps settings:', error);
    }
  }

  async loadSettings() {
    try {
      const stored = await AsyncStorage.getItem('displayOverAppsSettings');
      if (stored) {
        this.overlaySettings = { ...this.overlaySettings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading display over apps settings:', error);
    }
  }

  // Getters
  isOverlayActive() {
    return this.overlayActive;
  }

  hasOverlayPermission() {
    return this.overlayPermissionGranted;
  }

  getOverlaySettings() {
    return { ...this.overlaySettings };
  }

  getOverlayData() {
    return { ...this.overlayData };
  }

  isOverlayEnabled() {
    return this.overlaySettings.enabled && this.overlayPermissionGranted;
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
        console.error('DisplayOverAppsService listener error:', error);
      }
    });
  }

  destroy() {
    this.hideOverlay();
    this.listeners = [];
    this.isInitialized = false;
  }
}

export default new DisplayOverAppsService();
