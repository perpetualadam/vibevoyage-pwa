import { Platform, AccessibilityInfo, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AccessibilityService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.accessibilitySettings = {
      screenReaderEnabled: false,
      highContrastEnabled: false,
      largeTextEnabled: false,
      reduceMotionEnabled: false,
      voiceOverEnabled: false,
      talkBackEnabled: false,
      colorScheme: 'auto', // 'light', 'dark', 'auto'
      fontSize: 'normal', // 'small', 'normal', 'large', 'xlarge'
      announceNavigationChanges: true,
      announceSystemAlerts: true,
      hapticFeedbackEnabled: true,
    };
    this.systemAccessibility = {
      isScreenReaderEnabled: false,
      isReduceMotionEnabled: false,
      isHighContrastEnabled: false,
      preferredColorScheme: 'light',
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadAccessibilitySettings();
      await this.detectSystemAccessibilitySettings();
      this.setupAccessibilityListeners();
      this.applyAccessibilitySettings();
      
      this.isInitialized = true;
      console.log('AccessibilityService initialized successfully');
    } catch (error) {
      console.error('AccessibilityService initialization failed:', error);
      throw error;
    }
  }

  async detectSystemAccessibilitySettings() {
    try {
      // Check screen reader status
      const isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      this.systemAccessibility.isScreenReaderEnabled = isScreenReaderEnabled;
      this.accessibilitySettings.screenReaderEnabled = isScreenReaderEnabled;

      // Check reduce motion (iOS only)
      if (Platform.OS === 'ios') {
        const isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
        this.systemAccessibility.isReduceMotionEnabled = isReduceMotionEnabled;
        this.accessibilitySettings.reduceMotionEnabled = isReduceMotionEnabled;
      }

      // Check color scheme preference
      const colorScheme = Appearance.getColorScheme();
      this.systemAccessibility.preferredColorScheme = colorScheme || 'light';

      // Platform-specific accessibility detection
      if (Platform.OS === 'ios') {
        this.accessibilitySettings.voiceOverEnabled = isScreenReaderEnabled;
      } else if (Platform.OS === 'android') {
        this.accessibilitySettings.talkBackEnabled = isScreenReaderEnabled;
      }

      console.log('System accessibility settings detected:', this.systemAccessibility);
    } catch (error) {
      console.error('Error detecting system accessibility settings:', error);
    }
  }

  setupAccessibilityListeners() {
    // Listen for screen reader changes
    AccessibilityInfo.addEventListener('screenReaderChanged', (isEnabled) => {
      this.systemAccessibility.isScreenReaderEnabled = isEnabled;
      this.accessibilitySettings.screenReaderEnabled = isEnabled;
      
      if (Platform.OS === 'ios') {
        this.accessibilitySettings.voiceOverEnabled = isEnabled;
      } else {
        this.accessibilitySettings.talkBackEnabled = isEnabled;
      }
      
      this.notifyListeners('screenReaderChanged', { enabled: isEnabled });
      this.applyAccessibilitySettings();
    });

    // Listen for reduce motion changes (iOS only)
    if (Platform.OS === 'ios') {
      AccessibilityInfo.addEventListener('reduceMotionChanged', (isEnabled) => {
        this.systemAccessibility.isReduceMotionEnabled = isEnabled;
        this.accessibilitySettings.reduceMotionEnabled = isEnabled;
        
        this.notifyListeners('reduceMotionChanged', { enabled: isEnabled });
        this.applyAccessibilitySettings();
      });
    }

    // Listen for color scheme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      this.systemAccessibility.preferredColorScheme = colorScheme || 'light';
      
      if (this.accessibilitySettings.colorScheme === 'auto') {
        this.notifyListeners('colorSchemeChanged', { colorScheme });
        this.applyAccessibilitySettings();
      }
    });

    this.appearanceSubscription = subscription;
  }

  applyAccessibilitySettings() {
    const settings = this.getEffectiveSettings();
    
    // Apply high contrast if needed
    if (settings.highContrastEnabled) {
      this.applyHighContrastTheme();
    }
    
    // Apply large text if needed
    if (settings.largeTextEnabled) {
      this.applyLargeTextSizes();
    }
    
    // Configure animations based on reduce motion
    if (settings.reduceMotionEnabled) {
      this.disableAnimations();
    }
    
    // Apply color scheme
    this.applyColorScheme(settings.colorScheme);
    
    // Notify listeners of changes
    this.notifyListeners('accessibilitySettingsApplied', { settings });
  }

  getEffectiveSettings() {
    const settings = { ...this.accessibilitySettings };
    
    // Auto-detect color scheme if set to auto
    if (settings.colorScheme === 'auto') {
      settings.colorScheme = this.systemAccessibility.preferredColorScheme;
    }
    
    return settings;
  }

  applyHighContrastTheme() {
    const highContrastColors = {
      background: '#000000',
      surface: '#1a1a1a',
      primary: '#FFFFFF',
      secondary: '#CCCCCC',
      accent: '#00FF00',
      error: '#FF0000',
      warning: '#FFFF00',
      success: '#00FF00',
      text: '#FFFFFF',
      textSecondary: '#CCCCCC',
      border: '#FFFFFF',
    };
    
    this.notifyListeners('themeChanged', { 
      theme: 'high-contrast',
      colors: highContrastColors,
    });
  }

  applyLargeTextSizes() {
    const textSizes = {
      small: 16,
      normal: 20,
      large: 24,
      xlarge: 28,
      heading: 32,
      title: 36,
    };
    
    this.notifyListeners('textSizesChanged', { sizes: textSizes });
  }

  disableAnimations() {
    this.notifyListeners('animationsChanged', { 
      enabled: false,
      duration: 0,
      useNativeDriver: false,
    });
  }

  applyColorScheme(scheme) {
    this.notifyListeners('colorSchemeChanged', { colorScheme: scheme });
  }

  // Screen reader announcements
  async announceForScreenReader(message, priority = 'polite') {
    if (!this.accessibilitySettings.screenReaderEnabled) return;

    try {
      if (Platform.OS === 'ios') {
        // iOS VoiceOver announcement
        AccessibilityInfo.announceForAccessibility(message);
      } else if (Platform.OS === 'android') {
        // Android TalkBack announcement
        AccessibilityInfo.announceForAccessibility(message);
      }
      
      console.log('Screen reader announcement:', message);
    } catch (error) {
      console.error('Error making screen reader announcement:', error);
    }
  }

  // Navigation announcements
  announceNavigationChange(screenName, description) {
    if (!this.accessibilitySettings.announceNavigationChanges) return;
    
    const message = `Navigated to ${screenName}. ${description || ''}`;
    this.announceForScreenReader(message);
  }

  // System alert announcements
  announceSystemAlert(type, message) {
    if (!this.accessibilitySettings.announceSystemAlerts) return;
    
    const alertMessage = `${type} alert: ${message}`;
    this.announceForScreenReader(alertMessage, 'assertive');
  }

  // Error announcements
  announceError(error, context) {
    const message = `Error in ${context}: ${error}`;
    this.announceForScreenReader(message, 'assertive');
  }

  // Success announcements
  announceSuccess(message) {
    this.announceForScreenReader(`Success: ${message}`);
  }

  // Focus management
  setAccessibilityFocus(ref) {
    if (!this.accessibilitySettings.screenReaderEnabled) return;
    
    try {
      if (ref && ref.current) {
        AccessibilityInfo.setAccessibilityFocus(ref.current);
      }
    } catch (error) {
      console.error('Error setting accessibility focus:', error);
    }
  }

  // Accessibility helpers
  getAccessibilityProps(element) {
    const props = {};
    
    // Add accessibility role if not present
    if (!element.accessibilityRole) {
      if (element.onPress) {
        props.accessibilityRole = 'button';
      } else if (element.children && typeof element.children === 'string') {
        props.accessibilityRole = 'text';
      }
    }
    
    // Add accessibility label if not present
    if (!element.accessibilityLabel && element.title) {
      props.accessibilityLabel = element.title;
    }
    
    // Add accessibility hint for interactive elements
    if (element.onPress && !element.accessibilityHint) {
      props.accessibilityHint = 'Double tap to activate';
    }
    
    return props;
  }

  // Text scaling
  getScaledFontSize(baseSize) {
    const multipliers = {
      small: 0.8,
      normal: 1.0,
      large: 1.2,
      xlarge: 1.4,
    };
    
    const multiplier = multipliers[this.accessibilitySettings.fontSize] || 1.0;
    return Math.round(baseSize * multiplier);
  }

  // Color contrast helpers
  getContrastRatio(color1, color2) {
    // Simplified contrast ratio calculation
    // In a real implementation, you'd use a proper color contrast library
    const luminance1 = this.getLuminance(color1);
    const luminance2 = this.getLuminance(color2);
    
    const lighter = Math.max(luminance1, luminance2);
    const darker = Math.min(luminance1, luminance2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  getLuminance(color) {
    // Simplified luminance calculation
    // Convert hex to RGB and calculate relative luminance
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  // Settings management
  async updateAccessibilitySettings(newSettings) {
    this.accessibilitySettings = { ...this.accessibilitySettings, ...newSettings };
    await this.saveAccessibilitySettings();
    this.applyAccessibilitySettings();
    
    this.notifyListeners('accessibilitySettingsUpdated', { 
      settings: this.accessibilitySettings 
    });
  }

  async saveAccessibilitySettings() {
    try {
      await AsyncStorage.setItem('accessibilitySettings', JSON.stringify(this.accessibilitySettings));
    } catch (error) {
      console.error('Error saving accessibility settings:', error);
    }
  }

  async loadAccessibilitySettings() {
    try {
      const stored = await AsyncStorage.getItem('accessibilitySettings');
      if (stored) {
        this.accessibilitySettings = { ...this.accessibilitySettings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading accessibility settings:', error);
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
        console.error('AccessibilityService listener error:', error);
      }
    });
  }

  destroy() {
    if (this.appearanceSubscription) {
      this.appearanceSubscription.remove();
    }
    
    // Remove accessibility listeners
    AccessibilityInfo.removeEventListener('screenReaderChanged');
    if (Platform.OS === 'ios') {
      AccessibilityInfo.removeEventListener('reduceMotionChanged');
    }
    
    this.listeners = [];
    this.isInitialized = false;
  }
}

export default new AccessibilityService();
