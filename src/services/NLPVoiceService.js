import Tts from 'react-native-tts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CompassNavigationService from './CompassNavigationService';
import { Platform } from 'react-native';

class NLPVoiceService {
  constructor() {
    this.isInitialized = false;
    this.currentLanguage = 'en-US';
    this.voiceSettings = {
      rate: 0.5,
      pitch: 1.0,
      volume: 1.0,
      voice: null,
    };
    this.announcementDistances = [1000, 500, 200]; // meters
    this.lastAnnouncements = new Map(); // Track to avoid repetition
    this.phraseVariations = new Map();
    this.offlineCache = new Map();
    this.listeners = [];
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.initializeTts();
      await this.loadSettings();
      this.initializePhraseVariations();
      await this.loadOfflineCache();
      
      this.isInitialized = true;
      console.log('NLPVoiceService initialized successfully');
    } catch (error) {
      console.error('NLPVoiceService initialization failed:', error);
      throw error;
    }
  }

  async initializeTts() {
    // Initialize TTS with enhanced settings
    Tts.addEventListener('tts-start', this.onTtsStart);
    Tts.addEventListener('tts-finish', this.onTtsFinish);
    Tts.addEventListener('tts-cancel', this.onTtsCancel);

    // Set default voice settings
    await Tts.setDefaultRate(this.voiceSettings.rate);
    await Tts.setDefaultPitch(this.voiceSettings.pitch);
    
    // Get available voices
    const voices = await Tts.voices();
    this.availableVoices = voices;
    
    // Set preferred voice for current language
    await this.setPreferredVoice();
  }

  async setPreferredVoice() {
    const preferredVoice = this.availableVoices.find(voice => 
      voice.language.startsWith(this.currentLanguage.split('-')[0]) &&
      (voice.quality === 'Enhanced' || voice.quality === 'Premium')
    );

    if (preferredVoice) {
      await Tts.setDefaultVoice(preferredVoice.id);
      this.voiceSettings.voice = preferredVoice;
    }
  }

  initializePhraseVariations() {
    // Speed camera variations
    this.phraseVariations.set('speed_camera', [
      'Speed camera ahead in {distance}',
      'Watch out for a speed camera in {distance}',
      'Speed camera coming up in {distance}',
      'Approaching speed camera in {distance}',
      'Speed enforcement ahead in {distance}',
      'Camera ahead in {distance}',
    ]);

    // Police variations
    this.phraseVariations.set('police_checkpoint', [
      'Police reported {distance} ahead',
      'Police checkpoint in {distance}',
      'Law enforcement ahead in {distance}',
      'Police presence reported in {distance}',
      'Checkpoint coming up in {distance}',
    ]);

    // Railway crossing variations
    this.phraseVariations.set('railway_crossing', [
      'Railway crossing ahead in {distance}',
      'Train crossing in {distance}',
      'Approaching railway crossing in {distance}',
      'Railroad crossing ahead in {distance}',
      'Level crossing in {distance}',
    ]);

    // Traffic light camera variations
    this.phraseVariations.set('red_light_camera', [
      'Red light camera ahead in {distance}',
      'Traffic light camera in {distance}',
      'Light enforcement ahead in {distance}',
      'Intersection camera in {distance}',
    ]);

    // Toll variations
    this.phraseVariations.set('toll_booth', [
      'Toll booth ahead in {distance}',
      'Toll plaza in {distance}',
      'Toll collection ahead in {distance}',
      'Prepare for toll in {distance}',
    ]);

    // Construction variations
    this.phraseVariations.set('construction_zone', [
      'Construction zone ahead in {distance}',
      'Roadwork in {distance}',
      'Construction ahead in {distance}',
      'Work zone in {distance}',
    ]);

    // Navigation direction variations
    this.phraseVariations.set('turn_left', [
      'In {distance}, turn left onto {street}',
      'Turn left in {distance} onto {street}',
      'Left turn ahead in {distance} onto {street}',
      'Make a left in {distance} onto {street}',
    ]);

    this.phraseVariations.set('turn_right', [
      'In {distance}, turn right onto {street}',
      'Turn right in {distance} onto {street}',
      'Right turn ahead in {distance} onto {street}',
      'Make a right in {distance} onto {street}',
    ]);

    this.phraseVariations.set('continue_straight', [
      'Continue straight for {distance}',
      'Keep going straight for {distance}',
      'Stay on current road for {distance}',
      'Continue ahead for {distance}',
    ]);
  }

  async announceObstacle(obstacleType, distance, additionalInfo = {}) {
    const distanceText = this.formatDistance(distance);
    const cacheKey = `${obstacleType}_${Math.round(distance / 100) * 100}`;

    // Check if we recently announced this obstacle at this distance
    const lastAnnouncement = this.lastAnnouncements.get(cacheKey);
    if (lastAnnouncement && Date.now() - lastAnnouncement < 30000) { // 30 seconds
      return;
    }

    // Get varied phrase
    let phrase = this.getVariedPhrase(obstacleType, { distance: distanceText, ...additionalInfo });

    // Add compass direction if enabled
    if (CompassNavigationService.isObstacleDirectionsEnabled() && additionalInfo.bearing) {
      phrase = CompassNavigationService.formatObstacleAnnouncementWithCompass(
        obstacleType,
        distanceText,
        additionalInfo.bearing
      );
    }

    // Announce with appropriate priority
    const priority = this.getAnnouncementPriority(obstacleType, distance);
    await this.speak(phrase, priority);

    // Track announcement
    this.lastAnnouncements.set(cacheKey, Date.now());
  }

  async announceNavigation(instruction, distance, streetName = '', bearing = null) {
    const distanceText = this.formatDistance(distance);
    let phrase = this.getVariedPhrase(instruction, {
      distance: distanceText,
      street: streetName
    });

    // Add compass direction if enabled
    if (CompassNavigationService.isVoiceDirectionsEnabled()) {
      phrase = CompassNavigationService.formatVoiceAnnouncementWithCompass(
        phrase,
        bearing,
        { isNavigation: true }
      );
    }

    await this.speak(phrase, 'high');
  }

  async announcePOI(poiName, distance, bearing = null, category = '') {
    if (!CompassNavigationService.isPOIDirectionsEnabled()) {
      const phrase = `${poiName} ${this.formatDistance(distance)} ahead`;
      await this.speak(phrase, 'low');
      return;
    }

    const phrase = CompassNavigationService.formatPOIAnnouncementWithCompass(
      poiName,
      this.formatDistance(distance),
      bearing,
      category
    );

    await this.speak(phrase, 'low');
  }

  getVariedPhrase(type, replacements = {}) {
    const variations = this.phraseVariations.get(type) || [`${type} in {distance}`];
    
    // Select variation based on recent usage to avoid repetition
    const recentKey = `recent_${type}`;
    const recentIndex = this.lastAnnouncements.get(recentKey) || 0;
    const selectedIndex = recentIndex % variations.length;
    
    let phrase = variations[selectedIndex];
    
    // Replace placeholders
    Object.entries(replacements).forEach(([key, value]) => {
      phrase = phrase.replace(new RegExp(`{${key}}`, 'g'), value);
    });
    
    // Update recent usage
    this.lastAnnouncements.set(recentKey, selectedIndex + 1);
    
    return phrase;
  }

  formatDistance(meters) {
    if (meters < 100) {
      return `${Math.round(meters / 10) * 10} meters`;
    } else if (meters < 1000) {
      return `${Math.round(meters / 50) * 50} meters`;
    } else {
      const km = meters / 1000;
      if (km < 2) {
        return `${km.toFixed(1)} kilometer${km !== 1 ? 's' : ''}`;
      } else {
        return `${Math.round(km)} kilometer${Math.round(km) !== 1 ? 's' : ''}`;
      }
    }
  }

  getAnnouncementPriority(obstacleType, distance) {
    // High priority for close, dangerous obstacles
    if (distance < 200 && ['speed_camera', 'red_light_camera', 'police_checkpoint'].includes(obstacleType)) {
      return 'high';
    }
    
    // Medium priority for moderate distance warnings
    if (distance < 500) {
      return 'medium';
    }
    
    return 'normal';
  }

  async speak(text, priority = 'normal') {
    try {
      // Check if we should use cached audio
      const cachedAudio = this.offlineCache.get(text);
      if (cachedAudio) {
        // Would play cached audio file here
        console.log('Using cached audio for:', text);
      }

      // Stop current speech if high priority
      if (priority === 'high') {
        await Tts.stop();
      }

      // Adjust speech rate based on priority
      const rate = priority === 'high' ? 0.4 : this.voiceSettings.rate;
      await Tts.setDefaultRate(rate);

      await Tts.speak(text);
      
      // Cache common phrases for offline use
      if (this.shouldCache(text)) {
        await this.cachePhrase(text);
      }

      this.notifyListeners('speaking', { text, priority });
    } catch (error) {
      console.error('NLP TTS speak error:', error);
    }
  }

  shouldCache(text) {
    // Cache short, common phrases
    return text.length < 50 && (
      text.includes('ahead') || 
      text.includes('turn') || 
      text.includes('continue') ||
      text.includes('camera') ||
      text.includes('police')
    );
  }

  async cachePhrase(text) {
    try {
      // In a real implementation, this would generate and store audio files
      this.offlineCache.set(text, { 
        cached: true, 
        timestamp: Date.now(),
        language: this.currentLanguage 
      });
      
      await this.saveOfflineCache();
    } catch (error) {
      console.error('Error caching phrase:', error);
    }
  }

  async updateAnnouncementDistances(distances) {
    this.announcementDistances = distances.sort((a, b) => b - a); // Sort descending
    await this.saveSettings();
    this.notifyListeners('distancesUpdated', { distances: this.announcementDistances });
  }

  async updateLanguage(language) {
    if (this.currentLanguage === language) return;

    this.currentLanguage = language;
    await this.setPreferredVoice();
    await this.saveSettings();
    
    // Clear cache for old language
    this.offlineCache.clear();
    
    this.notifyListeners('languageChanged', { language });
  }

  async updateVoiceSettings(settings) {
    this.voiceSettings = { ...this.voiceSettings, ...settings };
    
    if (settings.rate) await Tts.setDefaultRate(settings.rate);
    if (settings.pitch) await Tts.setDefaultPitch(settings.pitch);
    
    await this.saveSettings();
    this.notifyListeners('settingsUpdated', { settings: this.voiceSettings });
  }

  shouldAnnounceAtDistance(distance) {
    return this.announcementDistances.some(threshold => 
      Math.abs(distance - threshold) < 50 // 50m tolerance
    );
  }

  getAvailableLanguages() {
    const languages = new Set();
    this.availableVoices.forEach(voice => {
      languages.add(voice.language);
    });
    return Array.from(languages).sort();
  }

  getAvailableVoices() {
    return this.availableVoices.filter(voice => 
      voice.language.startsWith(this.currentLanguage.split('-')[0])
    );
  }

  // Settings persistence
  async saveSettings() {
    try {
      const settings = {
        language: this.currentLanguage,
        voiceSettings: this.voiceSettings,
        announcementDistances: this.announcementDistances,
      };
      await AsyncStorage.setItem('nlpVoiceSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving NLP voice settings:', error);
    }
  }

  async loadSettings() {
    try {
      const stored = await AsyncStorage.getItem('nlpVoiceSettings');
      if (stored) {
        const settings = JSON.parse(stored);
        this.currentLanguage = settings.language || 'en-US';
        this.voiceSettings = { ...this.voiceSettings, ...settings.voiceSettings };
        this.announcementDistances = settings.announcementDistances || [1000, 500, 200];
      }
    } catch (error) {
      console.error('Error loading NLP voice settings:', error);
    }
  }

  async saveOfflineCache() {
    try {
      const cacheData = Array.from(this.offlineCache.entries());
      await AsyncStorage.setItem('nlpVoiceCache', JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error saving offline cache:', error);
    }
  }

  async loadOfflineCache() {
    try {
      const stored = await AsyncStorage.getItem('nlpVoiceCache');
      if (stored) {
        const cacheData = JSON.parse(stored);
        this.offlineCache = new Map(cacheData);
        
        // Clean old cache entries (older than 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        for (const [key, value] of this.offlineCache.entries()) {
          if (value.timestamp < thirtyDaysAgo) {
            this.offlineCache.delete(key);
          }
        }
      }
    } catch (error) {
      console.error('Error loading offline cache:', error);
    }
  }

  // Event handlers
  onTtsStart = () => {
    this.notifyListeners('ttsStart', {});
  };

  onTtsFinish = () => {
    this.notifyListeners('ttsFinish', {});
  };

  onTtsCancel = () => {
    this.notifyListeners('ttsCancel', {});
  };

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
        console.error('NLP Voice Service listener error:', error);
      }
    });
  }

  destroy() {
    Tts.removeAllListeners();
    this.listeners = [];
    this.offlineCache.clear();
    this.lastAnnouncements.clear();
    this.isInitialized = false;
  }
}

export default new NLPVoiceService();
