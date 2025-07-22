import { Platform, NativeModules, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import CarPlay module for iOS (would need to be implemented natively)
const { CarPlayModule } = NativeModules;

// Import Android Auto module for Android (would need to be implemented natively)
const { AndroidAutoModule } = NativeModules;

class CarIntegrationService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.isCarPlayConnected = false;
    this.isAndroidAutoConnected = false;
    this.carDisplayMode = false;
    this.currentTemplate = null;
    this.settings = {
      enableCarPlay: true,
      enableAndroidAuto: true,
      autoLaunchNavigation: true,
      simplifiedInterface: true,
      voiceControlEnabled: true,
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadSettings();
      
      if (Platform.OS === 'ios') {
        await this.initializeCarPlay();
      } else if (Platform.OS === 'android') {
        await this.initializeAndroidAuto();
      }

      this.setupEventListeners();
      this.isInitialized = true;
      console.log('CarIntegrationService initialized successfully');
    } catch (error) {
      console.error('CarIntegrationService initialization failed:', error);
      throw error;
    }
  }

  async initializeCarPlay() {
    if (!this.settings.enableCarPlay || !CarPlayModule) return;

    try {
      // Initialize CarPlay templates and interface
      await CarPlayModule.initialize({
        appName: 'VibeVoyage',
        shortAppName: 'VibeVoyage',
        bundleIdentifier: 'com.vibevoyage.app',
      });

      // Set up CarPlay templates
      await this.setupCarPlayTemplates();

      console.log('CarPlay initialized successfully');
    } catch (error) {
      console.error('CarPlay initialization error:', error);
    }
  }

  async initializeAndroidAuto() {
    if (!this.settings.enableAndroidAuto || !AndroidAutoModule) return;

    try {
      // Initialize Android Auto interface
      await AndroidAutoModule.initialize({
        appName: 'VibeVoyage',
        packageName: 'com.vibevoyage.app',
      });

      // Set up Android Auto screens
      await this.setupAndroidAutoScreens();

      console.log('Android Auto initialized successfully');
    } catch (error) {
      console.error('Android Auto initialization error:', error);
    }
  }

  async setupCarPlayTemplates() {
    if (!CarPlayModule) return;

    try {
      // Main navigation template
      const navigationTemplate = {
        type: 'navigation',
        title: 'VibeVoyage Navigation',
        leadingNavigationBarButtons: [
          {
            id: 'search',
            title: 'Search',
            image: 'search_icon',
          }
        ],
        trailingNavigationBarButtons: [
          {
            id: 'settings',
            title: 'Settings',
            image: 'settings_icon',
          }
        ],
        mapButtons: [
          {
            id: 'center',
            title: 'Center',
            image: 'center_icon',
          },
          {
            id: 'zoom_in',
            title: 'Zoom In',
            image: 'zoom_in_icon',
          },
          {
            id: 'zoom_out',
            title: 'Zoom Out',
            image: 'zoom_out_icon',
          }
        ]
      };

      await CarPlayModule.setRootTemplate(navigationTemplate);

      // Search template
      const searchTemplate = {
        type: 'search',
        title: 'Search Destinations',
        searchHint: 'Enter destination...',
        searchResultsLimit: 10,
      };

      await CarPlayModule.registerTemplate('search', searchTemplate);

      // Settings template
      const settingsTemplate = {
        type: 'list',
        title: 'Settings',
        sections: [
          {
            header: 'Navigation',
            items: [
              {
                id: 'voice_guidance',
                title: 'Voice Guidance',
                subtitle: 'Enable turn-by-turn directions',
                accessoryType: 'switch',
                value: true,
              },
              {
                id: 'avoid_tolls',
                title: 'Avoid Tolls',
                subtitle: 'Route around toll roads',
                accessoryType: 'switch',
                value: false,
              },
              {
                id: 'avoid_highways',
                title: 'Avoid Highways',
                subtitle: 'Use local roads when possible',
                accessoryType: 'switch',
                value: false,
              }
            ]
          },
          {
            header: 'Display',
            items: [
              {
                id: 'night_mode',
                title: 'Night Mode',
                subtitle: 'Automatic dark theme',
                accessoryType: 'switch',
                value: true,
              }
            ]
          }
        ]
      };

      await CarPlayModule.registerTemplate('settings', settingsTemplate);

    } catch (error) {
      console.error('Error setting up CarPlay templates:', error);
    }
  }

  async setupAndroidAutoScreens() {
    if (!AndroidAutoModule) return;

    try {
      // Main navigation screen
      const navigationScreen = {
        type: 'navigation',
        title: 'VibeVoyage',
        actions: [
          {
            id: 'search',
            title: 'Search',
            icon: 'ic_search',
          },
          {
            id: 'settings',
            title: 'Settings',
            icon: 'ic_settings',
          }
        ],
        mapActions: [
          {
            id: 'center',
            title: 'Center',
            icon: 'ic_my_location',
          },
          {
            id: 'report',
            title: 'Report',
            icon: 'ic_report',
          }
        ]
      };

      await AndroidAutoModule.setMainScreen(navigationScreen);

      // Search screen
      const searchScreen = {
        type: 'search',
        title: 'Search Destinations',
        hint: 'Where to?',
        maxResults: 10,
      };

      await AndroidAutoModule.registerScreen('search', searchScreen);

      // Settings screen
      const settingsScreen = {
        type: 'settings',
        title: 'VibeVoyage Settings',
        categories: [
          {
            title: 'Navigation',
            settings: [
              {
                id: 'voice_guidance',
                title: 'Voice Guidance',
                type: 'toggle',
                value: true,
              },
              {
                id: 'avoid_tolls',
                title: 'Avoid Tolls',
                type: 'toggle',
                value: false,
              }
            ]
          }
        ]
      };

      await AndroidAutoModule.registerScreen('settings', settingsScreen);

    } catch (error) {
      console.error('Error setting up Android Auto screens:', error);
    }
  }

  setupEventListeners() {
    // CarPlay event listeners
    if (Platform.OS === 'ios' && CarPlayModule) {
      DeviceEventEmitter.addListener('CarPlay.connected', this.handleCarPlayConnected.bind(this));
      DeviceEventEmitter.addListener('CarPlay.disconnected', this.handleCarPlayDisconnected.bind(this));
      DeviceEventEmitter.addListener('CarPlay.buttonPressed', this.handleCarPlayButtonPress.bind(this));
      DeviceEventEmitter.addListener('CarPlay.searchUpdated', this.handleCarPlaySearch.bind(this));
    }

    // Android Auto event listeners
    if (Platform.OS === 'android' && AndroidAutoModule) {
      DeviceEventEmitter.addListener('AndroidAuto.connected', this.handleAndroidAutoConnected.bind(this));
      DeviceEventEmitter.addListener('AndroidAuto.disconnected', this.handleAndroidAutoDisconnected.bind(this));
      DeviceEventEmitter.addListener('AndroidAuto.actionPressed', this.handleAndroidAutoAction.bind(this));
      DeviceEventEmitter.addListener('AndroidAuto.searchUpdated', this.handleAndroidAutoSearch.bind(this));
    }
  }

  // CarPlay event handlers
  handleCarPlayConnected() {
    this.isCarPlayConnected = true;
    this.carDisplayMode = true;
    console.log('CarPlay connected');
    
    this.notifyListeners('carPlayConnected', {});
    
    if (this.settings.autoLaunchNavigation) {
      this.launchNavigationMode();
    }
  }

  handleCarPlayDisconnected() {
    this.isCarPlayConnected = false;
    this.carDisplayMode = false;
    console.log('CarPlay disconnected');
    
    this.notifyListeners('carPlayDisconnected', {});
  }

  async handleCarPlayButtonPress(event) {
    const { buttonId, templateId } = event;
    console.log('CarPlay button pressed:', buttonId, templateId);

    switch (buttonId) {
      case 'search':
        await this.showSearchInterface();
        break;
      case 'settings':
        await this.showSettingsInterface();
        break;
      case 'center':
        this.notifyListeners('centerMap', {});
        break;
      case 'zoom_in':
        this.notifyListeners('zoomIn', {});
        break;
      case 'zoom_out':
        this.notifyListeners('zoomOut', {});
        break;
    }
  }

  async handleCarPlaySearch(event) {
    const { searchText } = event;
    console.log('CarPlay search:', searchText);
    
    this.notifyListeners('searchRequested', { query: searchText, platform: 'carplay' });
  }

  // Android Auto event handlers
  handleAndroidAutoConnected() {
    this.isAndroidAutoConnected = true;
    this.carDisplayMode = true;
    console.log('Android Auto connected');
    
    this.notifyListeners('androidAutoConnected', {});
    
    if (this.settings.autoLaunchNavigation) {
      this.launchNavigationMode();
    }
  }

  handleAndroidAutoDisconnected() {
    this.isAndroidAutoConnected = false;
    this.carDisplayMode = false;
    console.log('Android Auto disconnected');
    
    this.notifyListeners('androidAutoDisconnected', {});
  }

  async handleAndroidAutoAction(event) {
    const { actionId, screenId } = event;
    console.log('Android Auto action:', actionId, screenId);

    switch (actionId) {
      case 'search':
        await this.showSearchInterface();
        break;
      case 'settings':
        await this.showSettingsInterface();
        break;
      case 'center':
        this.notifyListeners('centerMap', {});
        break;
      case 'report':
        this.notifyListeners('showReportInterface', {});
        break;
    }
  }

  async handleAndroidAutoSearch(event) {
    const { searchText } = event;
    console.log('Android Auto search:', searchText);
    
    this.notifyListeners('searchRequested', { query: searchText, platform: 'androidauto' });
  }

  // Interface methods
  async showSearchInterface() {
    try {
      if (Platform.OS === 'ios' && CarPlayModule) {
        await CarPlayModule.presentTemplate('search');
      } else if (Platform.OS === 'android' && AndroidAutoModule) {
        await AndroidAutoModule.showScreen('search');
      }
    } catch (error) {
      console.error('Error showing search interface:', error);
    }
  }

  async showSettingsInterface() {
    try {
      if (Platform.OS === 'ios' && CarPlayModule) {
        await CarPlayModule.presentTemplate('settings');
      } else if (Platform.OS === 'android' && AndroidAutoModule) {
        await AndroidAutoModule.showScreen('settings');
      }
    } catch (error) {
      console.error('Error showing settings interface:', error);
    }
  }

  async updateNavigationInfo(navigationData) {
    if (!this.carDisplayMode) return;

    try {
      const carNavigationData = {
        currentInstruction: navigationData.currentInstruction,
        nextInstruction: navigationData.nextInstruction,
        distanceToNextTurn: navigationData.distanceToNextTurn,
        estimatedTimeRemaining: navigationData.estimatedTimeRemaining,
        currentSpeed: navigationData.currentSpeed,
        speedLimit: navigationData.speedLimit,
      };

      if (Platform.OS === 'ios' && CarPlayModule) {
        await CarPlayModule.updateNavigationInfo(carNavigationData);
      } else if (Platform.OS === 'android' && AndroidAutoModule) {
        await AndroidAutoModule.updateNavigationInfo(carNavigationData);
      }
    } catch (error) {
      console.error('Error updating navigation info:', error);
    }
  }

  async updateSearchResults(results) {
    if (!this.carDisplayMode) return;

    try {
      const carResults = results.map(result => ({
        id: result.id,
        title: result.name,
        subtitle: result.address,
        distance: result.distance,
      }));

      if (Platform.OS === 'ios' && CarPlayModule) {
        await CarPlayModule.updateSearchResults(carResults);
      } else if (Platform.OS === 'android' && AndroidAutoModule) {
        await AndroidAutoModule.updateSearchResults(carResults);
      }
    } catch (error) {
      console.error('Error updating search results:', error);
    }
  }

  launchNavigationMode() {
    this.notifyListeners('launchNavigationMode', { 
      platform: Platform.OS === 'ios' ? 'carplay' : 'androidauto' 
    });
  }

  // Getters
  isConnectedToCar() {
    return this.isCarPlayConnected || this.isAndroidAutoConnected;
  }

  isInCarDisplayMode() {
    return this.carDisplayMode;
  }

  getConnectedPlatform() {
    if (this.isCarPlayConnected) return 'carplay';
    if (this.isAndroidAutoConnected) return 'androidauto';
    return null;
  }

  // Settings management
  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
    this.notifyListeners('settingsUpdated', { settings: this.settings });
  }

  async saveSettings() {
    try {
      await AsyncStorage.setItem('carIntegrationSettings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving car integration settings:', error);
    }
  }

  async loadSettings() {
    try {
      const stored = await AsyncStorage.getItem('carIntegrationSettings');
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading car integration settings:', error);
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
        console.error('CarIntegrationService listener error:', error);
      }
    });
  }

  destroy() {
    // Remove event listeners
    DeviceEventEmitter.removeAllListeners('CarPlay.connected');
    DeviceEventEmitter.removeAllListeners('CarPlay.disconnected');
    DeviceEventEmitter.removeAllListeners('CarPlay.buttonPressed');
    DeviceEventEmitter.removeAllListeners('CarPlay.searchUpdated');
    DeviceEventEmitter.removeAllListeners('AndroidAuto.connected');
    DeviceEventEmitter.removeAllListeners('AndroidAuto.disconnected');
    DeviceEventEmitter.removeAllListeners('AndroidAuto.actionPressed');
    DeviceEventEmitter.removeAllListeners('AndroidAuto.searchUpdated');

    this.listeners = [];
    this.isInitialized = false;
  }
}

export default new CarIntegrationService();
