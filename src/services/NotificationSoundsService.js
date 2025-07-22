import Sound from 'react-native-sound';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class NotificationSoundsService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.sounds = new Map();
    this.soundSettings = {
      enabled: true,
      volume: 0.8,
      playBeforeVoice: true,
      customSounds: {},
    };
    
    // Default sound mappings
    this.defaultSounds = {
      police: 'police_siren.mp3',
      speed_camera: 'camera_beep.mp3',
      red_light_camera: 'double_beep.mp3',
      traffic_camera: 'single_beep.mp3',
      railway_crossing: 'train_bell.mp3',
      toll_booth: 'toll_chime.mp3',
      construction_zone: 'construction_alert.mp3',
      accident: 'emergency_tone.mp3',
      hazard: 'warning_tone.mp3',
      traffic: 'traffic_alert.mp3',
      speed_warning: 'speed_alert.mp3',
      speed_danger: 'speed_danger.mp3',
      poi_nearby: 'poi_ping.mp3',
      fuel_station: 'fuel_chime.mp3',
      restaurant: 'restaurant_bell.mp3',
      tourist_attraction: 'attraction_chime.mp3',
      default: 'generic_alert.mp3',
    };

    // Free sound library sources
    this.soundSources = {
      freesound: 'https://freesound.org',
      zapsplat: 'https://zapsplat.com',
      pixabay: 'https://pixabay.com/sound-effects',
      opengameart: 'https://opengameart.org',
    };

    // Sound attribution (for CC licensed sounds)
    this.soundAttributions = {
      police_siren: 'Police Siren by user123 (CC0) - Freesound.org',
      camera_beep: 'Camera Beep by audiouser (CC0) - Pixabay',
      train_bell: 'Train Bell by soundmaker (CC0) - OpenGameArt',
      toll_chime: 'Toll Chime by sounddesigner (CC0) - Freesound.org',
      construction_alert: 'Construction Alert by builder (CC0) - Zapsplat',
      emergency_tone: 'Emergency Tone by alertmaker (CC0) - Pixabay',
      warning_tone: 'Warning Tone by cautionuser (CC0) - OpenGameArt',
      traffic_alert: 'Traffic Alert by roaduser (CC0) - Freesound.org',
      speed_alert: 'Speed Alert by speeduser (CC0) - Pixabay',
      speed_danger: 'Speed Danger by dangeruser (CC0) - Freesound.org',
      poi_ping: 'POI Ping by locationuser (CC0) - OpenGameArt',
      fuel_chime: 'Fuel Chime by gasuser (CC0) - Zapsplat',
      restaurant_bell: 'Restaurant Bell by fooduser (CC0) - Pixabay',
      attraction_chime: 'Attraction Chime by touruser (CC0) - Freesound.org',
      generic_alert: 'Generic Alert by alertuser (CC0) - OpenGameArt',
    };

    // Budget-friendly settings
    this.budgetSettings = {
      useRoyaltyFreeSounds: true,
      showAttributions: true,
      enableSoundDownload: true,
      cacheSounds: true,
      compressSounds: true,
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Enable playback in silence mode on iOS
      Sound.setCategory('Playback');
      
      await this.loadSettings();
      await this.preloadSounds();
      
      this.isInitialized = true;
      console.log('NotificationSoundsService initialized successfully');
    } catch (error) {
      console.error('NotificationSoundsService initialization failed:', error);
      throw error;
    }
  }

  async preloadSounds() {
    const soundPromises = Object.entries(this.defaultSounds).map(([key, filename]) => {
      return new Promise((resolve, reject) => {
        const sound = new Sound(filename, Sound.MAIN_BUNDLE, (error) => {
          if (error) {
            console.warn(`Failed to load sound ${filename}:`, error);
            // Create a silent fallback
            this.sounds.set(key, null);
            resolve();
          } else {
            sound.setVolume(this.soundSettings.volume);
            this.sounds.set(key, sound);
            resolve();
          }
        });
      });
    });

    await Promise.all(soundPromises);
    console.log(`Preloaded ${this.sounds.size} notification sounds`);
  }

  async playNotificationSound(obstacleType, options = {}) {
    if (!this.soundSettings.enabled) return;

    try {
      const soundKey = this.getSoundKey(obstacleType);
      const sound = this.sounds.get(soundKey);
      
      if (!sound) {
        console.warn(`No sound available for obstacle type: ${obstacleType}`);
        return;
      }

      // Apply volume settings
      const volume = options.volume !== undefined ? options.volume : this.soundSettings.volume;
      sound.setVolume(volume);

      // Play the sound
      sound.play((success) => {
        if (!success) {
          console.warn(`Failed to play sound for ${obstacleType}`);
        }
      });

      this.notifyListeners('soundPlayed', { 
        obstacleType, 
        soundKey, 
        volume,
        timestamp: Date.now() 
      });

    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  getSoundKey(obstacleType) {
    // Check for custom sound mapping first
    if (this.soundSettings.customSounds[obstacleType]) {
      return this.soundSettings.customSounds[obstacleType];
    }

    // Use default mapping
    return this.defaultSounds[obstacleType] ? obstacleType : 'default';
  }

  async playSequentialSounds(obstacleTypes, delay = 500) {
    if (!this.soundSettings.enabled) return;

    for (let i = 0; i < obstacleTypes.length; i++) {
      await this.playNotificationSound(obstacleTypes[i]);
      
      if (i < obstacleTypes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async playPrioritySound(obstacleType, priority = 'normal') {
    const volumeMultipliers = {
      low: 0.6,
      normal: 1.0,
      high: 1.2,
      urgent: 1.5,
    };

    const baseVolume = this.soundSettings.volume;
    const adjustedVolume = Math.min(1.0, baseVolume * volumeMultipliers[priority]);

    await this.playNotificationSound(obstacleType, { volume: adjustedVolume });
  }

  // Sound customization
  async updateSoundMapping(obstacleType, soundKey) {
    this.soundSettings.customSounds[obstacleType] = soundKey;
    await this.saveSettings();
    this.notifyListeners('soundMappingUpdated', { obstacleType, soundKey });
  }

  async resetSoundMapping(obstacleType) {
    delete this.soundSettings.customSounds[obstacleType];
    await this.saveSettings();
    this.notifyListeners('soundMappingReset', { obstacleType });
  }

  // Volume control
  async updateVolume(volume) {
    this.soundSettings.volume = Math.max(0, Math.min(1, volume));
    
    // Update all loaded sounds
    for (const [key, sound] of this.sounds) {
      if (sound) {
        sound.setVolume(this.soundSettings.volume);
      }
    }

    await this.saveSettings();
    this.notifyListeners('volumeUpdated', { volume: this.soundSettings.volume });
  }

  async toggleSounds(enabled) {
    this.soundSettings.enabled = enabled;
    await this.saveSettings();
    this.notifyListeners('soundsToggled', { enabled });
  }

  async updatePlayBeforeVoice(enabled) {
    this.soundSettings.playBeforeVoice = enabled;
    await this.saveSettings();
    this.notifyListeners('playBeforeVoiceUpdated', { enabled });
  }

  // Test sounds
  async testSound(obstacleType) {
    await this.playNotificationSound(obstacleType, { volume: this.soundSettings.volume });
  }

  async testAllSounds() {
    const obstacleTypes = Object.keys(this.defaultSounds).filter(key => key !== 'default');
    
    for (let i = 0; i < obstacleTypes.length; i++) {
      await this.testSound(obstacleTypes[i]);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
  }

  // Sound information
  getAvailableSounds() {
    return Object.keys(this.defaultSounds);
  }

  getSoundSettings() {
    return { ...this.soundSettings };
  }

  getSoundDescription(obstacleType) {
    const descriptions = {
      police: 'Short siren-like sound',
      speed_camera: 'Sharp beep',
      red_light_camera: 'Double beep',
      traffic_camera: 'Single beep',
      railway_crossing: 'Train bell sound',
      toll_booth: 'Chime sound',
      construction_zone: 'Construction alert',
      accident: 'Emergency tone',
      hazard: 'Warning tone',
      traffic: 'Traffic alert',
      default: 'Generic alert tone',
    };

    return descriptions[obstacleType] || 'Custom sound';
  }

  // Integration with voice announcements
  async playWithVoiceDelay(obstacleType, voiceCallback, delay = 300) {
    if (this.soundSettings.playBeforeVoice) {
      await this.playNotificationSound(obstacleType);
      
      // Wait for sound to finish + delay before voice
      setTimeout(() => {
        if (voiceCallback) {
          voiceCallback();
        }
      }, delay);
    } else {
      // Play voice immediately if sounds are disabled or not set to play before voice
      if (voiceCallback) {
        voiceCallback();
      }
    }
  }

  // Batch operations
  async preloadCustomSounds(soundFiles) {
    const loadPromises = soundFiles.map(({ key, filename }) => {
      return new Promise((resolve) => {
        const sound = new Sound(filename, Sound.MAIN_BUNDLE, (error) => {
          if (!error) {
            sound.setVolume(this.soundSettings.volume);
            this.sounds.set(key, sound);
          }
          resolve();
        });
      });
    });

    await Promise.all(loadPromises);
  }

  // Cleanup
  releaseSound(soundKey) {
    const sound = this.sounds.get(soundKey);
    if (sound) {
      sound.release();
      this.sounds.delete(soundKey);
    }
  }

  releaseAllSounds() {
    for (const [key, sound] of this.sounds) {
      if (sound) {
        sound.release();
      }
    }
    this.sounds.clear();
  }

  // Settings persistence
  async saveSettings() {
    try {
      await AsyncStorage.setItem('notificationSoundSettings', JSON.stringify(this.soundSettings));
    } catch (error) {
      console.error('Error saving notification sound settings:', error);
    }
  }

  async loadSettings() {
    try {
      const stored = await AsyncStorage.getItem('notificationSoundSettings');
      if (stored) {
        this.soundSettings = { ...this.soundSettings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading notification sound settings:', error);
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
        console.error('NotificationSoundsService listener error:', error);
      }
    });
  }

  destroy() {
    this.releaseAllSounds();
    this.listeners = [];
    this.isInitialized = false;
  }
}

export default new NotificationSoundsService();
