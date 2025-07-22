import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import AdMob modules (would need to be installed)
let AdMobBanner, AdMobInterstitial, AdMobRewarded;

try {
  const AdMob = require('react-native-google-mobile-ads');
  AdMobBanner = AdMob.BannerAd;
  AdMobInterstitial = AdMob.InterstitialAd;
  AdMobRewarded = AdMob.RewardedAd;
} catch (error) {
  console.log('AdMob not available in this environment');
}

class AdMobService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.adSettings = {
      enableAds: true,
      enableBannerAds: true,
      enableInterstitialAds: true,
      enableRewardedAds: true,
      adFrequency: 'low', // low, medium, high
      respectPremium: true,
      testMode: __DEV__,
    };
    this.adUnits = {
      ios: {
        banner: __DEV__ ? 'ca-app-pub-3940256099942544/2934735716' : 'ca-app-pub-YOUR_IOS_BANNER_ID',
        interstitial: __DEV__ ? 'ca-app-pub-3940256099942544/4411468910' : 'ca-app-pub-YOUR_IOS_INTERSTITIAL_ID',
        rewarded: __DEV__ ? 'ca-app-pub-3940256099942544/1712485313' : 'ca-app-pub-YOUR_IOS_REWARDED_ID',
      },
      android: {
        banner: __DEV__ ? 'ca-app-pub-3940256099942544/6300978111' : 'ca-app-pub-YOUR_ANDROID_BANNER_ID',
        interstitial: __DEV__ ? 'ca-app-pub-3940256099942544/1033173712' : 'ca-app-pub-YOUR_ANDROID_INTERSTITIAL_ID',
        rewarded: __DEV__ ? 'ca-app-pub-3940256099942544/5224354917' : 'ca-app-pub-YOUR_ANDROID_REWARDED_ID',
      },
    };
    this.adLoadedStates = {
      interstitial: false,
      rewarded: false,
    };
    this.lastAdShown = {
      interstitial: 0,
      rewarded: 0,
    };
    this.adFrequencyLimits = {
      low: 300000, // 5 minutes
      medium: 180000, // 3 minutes
      high: 120000, // 2 minutes
    };
    this.userInteractions = 0;
    this.isPremiumUser = false;
  }

  async initialize() {
    if (this.isInitialized || Platform.OS === 'web') return;

    try {
      await this.loadAdSettings();
      
      if (!this.adSettings.enableAds) {
        console.log('Ads disabled by user settings');
        return;
      }

      // Check premium status
      await this.checkPremiumStatus();
      
      if (this.isPremiumUser && this.adSettings.respectPremium) {
        console.log('Premium user - ads disabled');
        return;
      }

      // Initialize AdMob
      if (AdMobInterstitial && AdMobRewarded) {
        await this.initializeAdMob();
        await this.preloadAds();
      }

      this.isInitialized = true;
      console.log('AdMobService initialized successfully');
    } catch (error) {
      console.error('AdMobService initialization failed:', error);
    }
  }

  async initializeAdMob() {
    try {
      // Initialize Google Mobile Ads SDK
      const { GoogleMobileAds } = require('react-native-google-mobile-ads');
      await GoogleMobileAds().initialize();
      
      // Set request configuration
      await GoogleMobileAds().setRequestConfiguration({
        maxAdContentRating: 'G',
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
        testDeviceIdentifiers: this.adSettings.testMode ? ['EMULATOR'] : [],
      });

      console.log('AdMob SDK initialized');
    } catch (error) {
      console.error('AdMob initialization error:', error);
    }
  }

  async preloadAds() {
    if (this.adSettings.enableInterstitialAds) {
      await this.loadInterstitialAd();
    }
    
    if (this.adSettings.enableRewardedAds) {
      await this.loadRewardedAd();
    }
  }

  async loadInterstitialAd() {
    try {
      const adUnitId = this.getAdUnitId('interstitial');
      
      if (AdMobInterstitial) {
        const interstitial = AdMobInterstitial.createForAdRequest(adUnitId);
        
        interstitial.addAdEventListener('loaded', () => {
          this.adLoadedStates.interstitial = true;
          console.log('Interstitial ad loaded');
        });
        
        interstitial.addAdEventListener('error', (error) => {
          console.error('Interstitial ad error:', error);
          this.adLoadedStates.interstitial = false;
        });
        
        interstitial.addAdEventListener('closed', () => {
          this.lastAdShown.interstitial = Date.now();
          this.loadInterstitialAd(); // Preload next ad
        });
        
        await interstitial.load();
        this.interstitialAd = interstitial;
      }
    } catch (error) {
      console.error('Error loading interstitial ad:', error);
    }
  }

  async loadRewardedAd() {
    try {
      const adUnitId = this.getAdUnitId('rewarded');
      
      if (AdMobRewarded) {
        const rewarded = AdMobRewarded.createForAdRequest(adUnitId);
        
        rewarded.addAdEventListener('loaded', () => {
          this.adLoadedStates.rewarded = true;
          console.log('Rewarded ad loaded');
        });
        
        rewarded.addAdEventListener('error', (error) => {
          console.error('Rewarded ad error:', error);
          this.adLoadedStates.rewarded = false;
        });
        
        rewarded.addAdEventListener('earned_reward', (reward) => {
          this.handleRewardedAdReward(reward);
        });
        
        rewarded.addAdEventListener('closed', () => {
          this.lastAdShown.rewarded = Date.now();
          this.loadRewardedAd(); // Preload next ad
        });
        
        await rewarded.load();
        this.rewardedAd = rewarded;
      }
    } catch (error) {
      console.error('Error loading rewarded ad:', error);
    }
  }

  getAdUnitId(adType) {
    const platform = Platform.OS;
    return this.adUnits[platform]?.[adType] || this.adUnits.android[adType];
  }

  async showInterstitialAd(context = 'general') {
    if (!this.shouldShowAd('interstitial')) {
      return false;
    }

    try {
      if (this.interstitialAd && this.adLoadedStates.interstitial) {
        await this.interstitialAd.show();
        
        this.notifyListeners('adShown', {
          type: 'interstitial',
          context,
          timestamp: Date.now(),
        });
        
        return true;
      }
    } catch (error) {
      console.error('Error showing interstitial ad:', error);
    }
    
    return false;
  }

  async showRewardedAd(context = 'general') {
    if (!this.shouldShowAd('rewarded')) {
      return false;
    }

    try {
      if (this.rewardedAd && this.adLoadedStates.rewarded) {
        await this.rewardedAd.show();
        
        this.notifyListeners('adShown', {
          type: 'rewarded',
          context,
          timestamp: Date.now(),
        });
        
        return true;
      }
    } catch (error) {
      console.error('Error showing rewarded ad:', error);
    }
    
    return false;
  }

  shouldShowAd(adType) {
    // Don't show ads if disabled
    if (!this.adSettings.enableAds) return false;
    
    // Don't show ads to premium users
    if (this.isPremiumUser && this.adSettings.respectPremium) return false;
    
    // Check type-specific settings
    if (adType === 'interstitial' && !this.adSettings.enableInterstitialAds) return false;
    if (adType === 'rewarded' && !this.adSettings.enableRewardedAds) return false;
    
    // Check frequency limits
    const lastShown = this.lastAdShown[adType];
    const frequencyLimit = this.adFrequencyLimits[this.adSettings.adFrequency];
    
    if (Date.now() - lastShown < frequencyLimit) {
      return false;
    }
    
    // Check user interaction threshold
    if (this.userInteractions < 3) {
      return false;
    }
    
    return true;
  }

  handleRewardedAdReward(reward) {
    console.log('User earned reward:', reward);
    
    this.notifyListeners('rewardEarned', {
      type: reward.type,
      amount: reward.amount,
      timestamp: Date.now(),
    });
    
    // Grant reward to user (implement based on your reward system)
    this.grantReward(reward);
  }

  grantReward(reward) {
    // Example reward implementations
    switch (reward.type) {
      case 'premium_trial':
        this.grantPremiumTrial(reward.amount);
        break;
      case 'xp_boost':
        this.grantXPBoost(reward.amount);
        break;
      case 'remove_ads':
        this.grantAdFreeSession(reward.amount);
        break;
      default:
        console.log('Unknown reward type:', reward.type);
    }
  }

  grantPremiumTrial(days) {
    // Grant premium trial for specified days
    this.notifyListeners('premiumTrialGranted', { days });
  }

  grantXPBoost(multiplier) {
    // Grant XP boost multiplier
    this.notifyListeners('xpBoostGranted', { multiplier });
  }

  grantAdFreeSession(minutes) {
    // Grant ad-free session for specified minutes
    const endTime = Date.now() + (minutes * 60 * 1000);
    this.notifyListeners('adFreeSessionGranted', { endTime });
  }

  trackUserInteraction() {
    this.userInteractions++;
  }

  async checkPremiumStatus() {
    try {
      const premiumStatus = await AsyncStorage.getItem('premiumStatus');
      this.isPremiumUser = premiumStatus === 'active';
    } catch (error) {
      console.error('Error checking premium status:', error);
      this.isPremiumUser = false;
    }
  }

  // Banner Ad Component (for React Native)
  getBannerAdComponent() {
    if (!AdMobBanner || !this.adSettings.enableBannerAds || this.isPremiumUser) {
      return null;
    }

    const adUnitId = this.getAdUnitId('banner');
    
    return {
      component: AdMobBanner,
      props: {
        unitId: adUnitId,
        size: 'BANNER',
        requestOptions: {
          requestNonPersonalizedAdsOnly: false,
        },
        onAdLoaded: () => {
          console.log('Banner ad loaded');
        },
        onAdFailedToLoad: (error) => {
          console.error('Banner ad failed to load:', error);
        },
      },
    };
  }

  // Settings management
  async updateAdSettings(newSettings) {
    this.adSettings = { ...this.adSettings, ...newSettings };
    await this.saveAdSettings();
    
    // Reinitialize if ads were enabled/disabled
    if (newSettings.enableAds !== undefined) {
      if (newSettings.enableAds && !this.isInitialized) {
        await this.initialize();
      }
    }
    
    this.notifyListeners('adSettingsUpdated', { settings: this.adSettings });
  }

  async saveAdSettings() {
    try {
      await AsyncStorage.setItem('adMobSettings', JSON.stringify(this.adSettings));
    } catch (error) {
      console.error('Error saving ad settings:', error);
    }
  }

  async loadAdSettings() {
    try {
      const stored = await AsyncStorage.getItem('adMobSettings');
      if (stored) {
        this.adSettings = { ...this.adSettings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading ad settings:', error);
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
        console.error('AdMobService listener error:', error);
      }
    });
  }

  destroy() {
    this.listeners = [];
    this.isInitialized = false;
  }
}

export default new AdMobService();
