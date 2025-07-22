import { Platform, Dimensions, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class PlatformUIService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.platformConfig = {
      ios: {
        statusBarStyle: 'light-content',
        navigationBarStyle: 'large',
        hapticFeedback: true,
        safeAreaInsets: true,
        blurEffects: true,
        shadowStyle: 'ios',
      },
      android: {
        statusBarStyle: 'light-content',
        navigationBarStyle: 'material',
        hapticFeedback: true,
        safeAreaInsets: false,
        blurEffects: false,
        shadowStyle: 'android',
      },
      web: {
        statusBarStyle: 'default',
        navigationBarStyle: 'web',
        hapticFeedback: false,
        safeAreaInsets: false,
        blurEffects: true,
        shadowStyle: 'web',
      },
    };
    this.currentPlatform = Platform.OS;
    this.screenDimensions = Dimensions.get('window');
    this.isTablet = this.detectTablet();
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadPlatformSettings();
      this.setupPlatformSpecificUI();
      this.setupDimensionListeners();
      this.isInitialized = true;
      console.log('PlatformUIService initialized successfully');
    } catch (error) {
      console.error('PlatformUIService initialization failed:', error);
      throw error;
    }
  }

  detectTablet() {
    const { width, height } = this.screenDimensions;
    const aspectRatio = width / height;
    const minDimension = Math.min(width, height);
    
    // Tablet detection logic
    if (Platform.OS === 'ios') {
      return minDimension >= 768; // iPad detection
    } else if (Platform.OS === 'android') {
      return minDimension >= 600 && aspectRatio > 1.2;
    }
    
    return minDimension >= 768;
  }

  setupPlatformSpecificUI() {
    const config = this.platformConfig[this.currentPlatform];
    
    if (Platform.OS === 'ios') {
      this.setupiOSUI(config);
    } else if (Platform.OS === 'android') {
      this.setupAndroidUI(config);
    } else if (Platform.OS === 'web') {
      this.setupWebUI(config);
    }
  }

  setupiOSUI(config) {
    // iOS-specific UI setup
    if (StatusBar) {
      StatusBar.setBarStyle(config.statusBarStyle, true);
      StatusBar.setHidden(false, 'fade');
    }
    
    // Configure iOS-specific styling
    this.iOSConfig = {
      borderRadius: 12,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      buttonHeight: 44,
      navigationBarHeight: 44,
      tabBarHeight: 83,
      cornerRadius: 'rounded',
      fontFamily: 'SF Pro Display',
      hapticStyle: 'medium',
    };
  }

  setupAndroidUI(config) {
    // Android-specific UI setup
    if (StatusBar) {
      StatusBar.setBarStyle(config.statusBarStyle, true);
      StatusBar.setBackgroundColor('#000000', true);
    }
    
    // Configure Material Design styling
    this.androidConfig = {
      borderRadius: 8,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      buttonHeight: 48,
      navigationBarHeight: 56,
      tabBarHeight: 56,
      cornerRadius: 'rounded',
      fontFamily: 'Roboto',
      hapticStyle: 'heavy',
    };
  }

  setupWebUI(config) {
    // Web-specific UI setup
    this.webConfig = {
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      buttonHeight: 40,
      navigationBarHeight: 60,
      tabBarHeight: 60,
      cornerRadius: 'rounded',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
      cursor: 'pointer',
    };
  }

  setupDimensionListeners() {
    const subscription = Dimensions.addEventListener('change', ({ window, screen }) => {
      this.screenDimensions = window;
      this.isTablet = this.detectTablet();
      
      this.notifyListeners('dimensionsChanged', {
        window,
        screen,
        isTablet: this.isTablet,
      });
    });

    // Store subscription for cleanup
    this.dimensionSubscription = subscription;
  }

  // Platform-specific styling methods
  getButtonStyle(variant = 'primary') {
    const baseStyle = {
      height: this.getPlatformValue('buttonHeight'),
      borderRadius: this.getPlatformValue('borderRadius'),
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    };

    const platformStyle = this.getPlatformSpecificStyle('button');
    
    const variantStyles = {
      primary: {
        backgroundColor: '#00FF88',
        ...platformStyle.primary,
      },
      secondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#00FF88',
        ...platformStyle.secondary,
      },
      danger: {
        backgroundColor: '#FF6B6B',
        ...platformStyle.danger,
      },
    };

    return {
      ...baseStyle,
      ...variantStyles[variant],
      ...this.getShadowStyle(),
    };
  }

  getCardStyle() {
    return {
      backgroundColor: '#1a1a1a',
      borderRadius: this.getPlatformValue('borderRadius'),
      padding: 16,
      marginVertical: 8,
      ...this.getShadowStyle(),
      ...this.getPlatformSpecificStyle('card'),
    };
  }

  getNavigationBarStyle() {
    return {
      height: this.getPlatformValue('navigationBarHeight'),
      backgroundColor: '#000',
      borderBottomWidth: Platform.OS === 'ios' ? 0.5 : 1,
      borderBottomColor: '#333',
      ...this.getPlatformSpecificStyle('navigationBar'),
    };
  }

  getTabBarStyle() {
    return {
      height: this.getPlatformValue('tabBarHeight'),
      backgroundColor: '#000',
      borderTopWidth: Platform.OS === 'ios' ? 0.5 : 1,
      borderTopColor: '#333',
      ...this.getPlatformSpecificStyle('tabBar'),
    };
  }

  getShadowStyle() {
    if (Platform.OS === 'ios') {
      return {
        shadowColor: '#000',
        shadowOffset: this.iOSConfig?.shadowOffset || { width: 0, height: 2 },
        shadowOpacity: this.iOSConfig?.shadowOpacity || 0.1,
        shadowRadius: this.iOSConfig?.shadowRadius || 4,
      };
    } else if (Platform.OS === 'android') {
      return {
        elevation: this.androidConfig?.elevation || 4,
        shadowColor: this.androidConfig?.shadowColor || '#000',
        shadowOffset: this.androidConfig?.shadowOffset || { width: 0, height: 2 },
        shadowOpacity: this.androidConfig?.shadowOpacity || 0.25,
        shadowRadius: this.androidConfig?.shadowRadius || 3.84,
      };
    } else {
      return {
        boxShadow: this.webConfig?.boxShadow || '0 2px 8px rgba(0, 0, 0, 0.1)',
      };
    }
  }

  getPlatformValue(key) {
    const config = this.getCurrentPlatformConfig();
    return config?.[key] || this.platformConfig[this.currentPlatform]?.[key];
  }

  getPlatformSpecificStyle(component) {
    const platformStyles = {
      ios: {
        button: {
          primary: { fontWeight: '600' },
          secondary: { fontWeight: '500' },
          danger: { fontWeight: '600' },
        },
        card: {
          backgroundColor: '#1c1c1e',
        },
        navigationBar: {
          backgroundColor: '#000',
        },
        tabBar: {
          backgroundColor: '#000',
        },
      },
      android: {
        button: {
          primary: { fontWeight: '500', textTransform: 'uppercase' },
          secondary: { fontWeight: '500', textTransform: 'uppercase' },
          danger: { fontWeight: '500', textTransform: 'uppercase' },
        },
        card: {
          backgroundColor: '#1e1e1e',
        },
        navigationBar: {
          backgroundColor: '#121212',
        },
        tabBar: {
          backgroundColor: '#121212',
        },
      },
      web: {
        button: {
          primary: { fontWeight: '500', cursor: 'pointer' },
          secondary: { fontWeight: '500', cursor: 'pointer' },
          danger: { fontWeight: '500', cursor: 'pointer' },
        },
        card: {
          backgroundColor: '#1a1a1a',
        },
        navigationBar: {
          backgroundColor: '#000',
        },
        tabBar: {
          backgroundColor: '#000',
        },
      },
    };

    return platformStyles[this.currentPlatform]?.[component] || {};
  }

  getCurrentPlatformConfig() {
    if (Platform.OS === 'ios') return this.iOSConfig;
    if (Platform.OS === 'android') return this.androidConfig;
    if (Platform.OS === 'web') return this.webConfig;
    return {};
  }

  // Responsive design helpers
  getResponsiveValue(values) {
    if (typeof values === 'object' && !Array.isArray(values)) {
      if (this.isTablet && values.tablet) return values.tablet;
      if (values[this.currentPlatform]) return values[this.currentPlatform];
      return values.default || values;
    }
    return values;
  }

  getScreenSize() {
    const { width } = this.screenDimensions;
    
    if (width < 480) return 'small';
    if (width < 768) return 'medium';
    if (width < 1024) return 'large';
    return 'xlarge';
  }

  isLandscape() {
    const { width, height } = this.screenDimensions;
    return width > height;
  }

  // Haptic feedback
  triggerHapticFeedback(type = 'medium') {
    if (!this.platformConfig[this.currentPlatform].hapticFeedback) return;

    if (Platform.OS === 'ios') {
      const { HapticFeedback } = require('react-native');
      if (HapticFeedback) {
        HapticFeedback.trigger(type);
      }
    } else if (Platform.OS === 'android') {
      const { Vibration } = require('react-native');
      if (Vibration) {
        const patterns = {
          light: 10,
          medium: 20,
          heavy: 30,
        };
        Vibration.vibrate(patterns[type] || patterns.medium);
      }
    }
  }

  // Settings management
  async updatePlatformSettings(newSettings) {
    const currentConfig = this.platformConfig[this.currentPlatform];
    this.platformConfig[this.currentPlatform] = { ...currentConfig, ...newSettings };
    
    await this.savePlatformSettings();
    this.setupPlatformSpecificUI();
    
    this.notifyListeners('platformSettingsUpdated', {
      platform: this.currentPlatform,
      settings: this.platformConfig[this.currentPlatform],
    });
  }

  async savePlatformSettings() {
    try {
      await AsyncStorage.setItem('platformUISettings', JSON.stringify(this.platformConfig));
    } catch (error) {
      console.error('Error saving platform UI settings:', error);
    }
  }

  async loadPlatformSettings() {
    try {
      const stored = await AsyncStorage.getItem('platformUISettings');
      if (stored) {
        const settings = JSON.parse(stored);
        this.platformConfig = { ...this.platformConfig, ...settings };
      }
    } catch (error) {
      console.error('Error loading platform UI settings:', error);
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
        console.error('PlatformUIService listener error:', error);
      }
    });
  }

  destroy() {
    if (this.dimensionSubscription) {
      this.dimensionSubscription?.remove();
    }
    this.listeners = [];
    this.isInitialized = false;
  }
}

export default new PlatformUIService();
