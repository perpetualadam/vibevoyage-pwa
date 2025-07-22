import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class FreeTTSService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.ttsEngines = {
      web: {
        speechSynthesis: null,
        voices: [],
        currentVoice: null,
      },
      espeak: {
        available: false,
        voices: [],
        currentVoice: null,
      },
      mozilla: {
        available: false,
        model: null,
        currentVoice: null,
      },
    };
    this.settings = {
      preferredEngine: 'auto', // auto, web, espeak, mozilla
      rate: 0.8,
      pitch: 1.0,
      volume: 1.0,
      language: 'en-US',
      voice: null,
      enableOfflineCache: true,
    };
    this.audioCache = new Map();
    this.isPlaying = false;
    this.currentAudio = null;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadSettings();
      await this.initializeEngines();
      await this.selectBestEngine();
      
      this.isInitialized = true;
      console.log('FreeTTSService initialized successfully');
    } catch (error) {
      console.error('FreeTTSService initialization failed:', error);
      throw error;
    }
  }

  async initializeEngines() {
    // Initialize Web Speech API (available in browsers)
    if (Platform.OS === 'web' && 'speechSynthesis' in window) {
      await this.initializeWebSpeechAPI();
    }

    // Initialize eSpeak (would require native module or web assembly)
    await this.initializeESpeak();

    // Initialize Mozilla TTS (would require API integration or local model)
    await this.initializeMozillaTTS();
  }

  async initializeWebSpeechAPI() {
    try {
      this.ttsEngines.web.speechSynthesis = window.speechSynthesis;
      
      // Wait for voices to load
      return new Promise((resolve) => {
        const loadVoices = () => {
          const voices = this.ttsEngines.web.speechSynthesis.getVoices();
          if (voices.length > 0) {
            this.ttsEngines.web.voices = voices;
            this.ttsEngines.web.currentVoice = this.findBestVoice(voices, this.settings.language);
            console.log('Web Speech API initialized with', voices.length, 'voices');
            resolve();
          } else {
            setTimeout(loadVoices, 100);
          }
        };
        
        if (this.ttsEngines.web.speechSynthesis.onvoiceschanged !== undefined) {
          this.ttsEngines.web.speechSynthesis.onvoiceschanged = loadVoices;
        }
        
        loadVoices();
      });
    } catch (error) {
      console.error('Web Speech API initialization error:', error);
    }
  }

  async initializeESpeak() {
    try {
      // Check if eSpeak is available (would need native implementation)
      // For web, we could use eSpeak compiled to WebAssembly
      if (Platform.OS === 'web') {
        // Try to load eSpeak WebAssembly module
        const eSpeakWasm = await this.loadESpeakWasm();
        if (eSpeakWasm) {
          this.ttsEngines.espeak.available = true;
          this.ttsEngines.espeak.voices = this.getESpeakVoices();
          console.log('eSpeak WebAssembly initialized');
        }
      } else {
        // For React Native, would need native module
        // const { ESpeakModule } = require('react-native-espeak');
        // if (ESpeakModule) {
        //   this.ttsEngines.espeak.available = true;
        //   this.ttsEngines.espeak.voices = await ESpeakModule.getVoices();
        // }
      }
    } catch (error) {
      console.error('eSpeak initialization error:', error);
    }
  }

  async loadESpeakWasm() {
    try {
      // This would load eSpeak compiled to WebAssembly
      // For now, we'll simulate the availability check
      if (typeof WebAssembly !== 'undefined') {
        // In a real implementation, you would:
        // const eSpeakModule = await import('espeak-wasm');
        // return eSpeakModule;
        return null; // Simulated - not available
      }
      return null;
    } catch (error) {
      console.error('eSpeak WebAssembly load error:', error);
      return null;
    }
  }

  getESpeakVoices() {
    // eSpeak supports many languages and variants
    return [
      { id: 'en', name: 'English', language: 'en-US' },
      { id: 'en-gb', name: 'English (British)', language: 'en-GB' },
      { id: 'es', name: 'Spanish', language: 'es-ES' },
      { id: 'fr', name: 'French', language: 'fr-FR' },
      { id: 'de', name: 'German', language: 'de-DE' },
      { id: 'it', name: 'Italian', language: 'it-IT' },
      { id: 'pt', name: 'Portuguese', language: 'pt-PT' },
      { id: 'ru', name: 'Russian', language: 'ru-RU' },
      { id: 'zh', name: 'Chinese', language: 'zh-CN' },
      { id: 'ja', name: 'Japanese', language: 'ja-JP' },
    ];
  }

  async initializeMozillaTTS() {
    try {
      // Mozilla TTS would require either:
      // 1. Local model running on device
      // 2. API integration with Mozilla TTS server
      // 3. Pre-generated audio files
      
      // For now, we'll check if a local Mozilla TTS server is available
      const mozillaTTSAvailable = await this.checkMozillaTTSServer();
      if (mozillaTTSAvailable) {
        this.ttsEngines.mozilla.available = true;
        console.log('Mozilla TTS server available');
      }
    } catch (error) {
      console.error('Mozilla TTS initialization error:', error);
    }
  }

  async checkMozillaTTSServer() {
    try {
      // Check if local Mozilla TTS server is running
      const response = await fetch('http://localhost:5002/api/tts', {
        method: 'HEAD',
        timeout: 1000,
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async selectBestEngine() {
    if (this.settings.preferredEngine !== 'auto') {
      this.currentEngine = this.settings.preferredEngine;
      return;
    }

    // Auto-select best available engine
    if (this.ttsEngines.mozilla.available) {
      this.currentEngine = 'mozilla';
    } else if (this.ttsEngines.espeak.available) {
      this.currentEngine = 'espeak';
    } else if (this.ttsEngines.web.speechSynthesis) {
      this.currentEngine = 'web';
    } else {
      throw new Error('No TTS engine available');
    }

    console.log('Selected TTS engine:', this.currentEngine);
  }

  findBestVoice(voices, language) {
    // Find voice that matches the language
    const exactMatch = voices.find(voice => voice.lang === language);
    if (exactMatch) return exactMatch;

    // Find voice that matches the language code (e.g., 'en' for 'en-US')
    const langCode = language.split('-')[0];
    const langMatch = voices.find(voice => voice.lang.startsWith(langCode));
    if (langMatch) return langMatch;

    // Return first available voice
    return voices[0] || null;
  }

  async speak(text, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const speakOptions = {
      rate: options.rate || this.settings.rate,
      pitch: options.pitch || this.settings.pitch,
      volume: options.volume || this.settings.volume,
      language: options.language || this.settings.language,
      priority: options.priority || 'normal',
    };

    try {
      // Check cache first
      if (this.settings.enableOfflineCache) {
        const cachedAudio = this.audioCache.get(text);
        if (cachedAudio) {
          return await this.playAudioBuffer(cachedAudio);
        }
      }

      // Use selected engine
      switch (this.currentEngine) {
        case 'web':
          return await this.speakWithWebAPI(text, speakOptions);
        case 'espeak':
          return await this.speakWithESpeak(text, speakOptions);
        case 'mozilla':
          return await this.speakWithMozillaTTS(text, speakOptions);
        default:
          throw new Error('No TTS engine available');
      }
    } catch (error) {
      console.error('TTS speak error:', error);
      // Fallback to web API if available
      if (this.currentEngine !== 'web' && this.ttsEngines.web.speechSynthesis) {
        return await this.speakWithWebAPI(text, speakOptions);
      }
      throw error;
    }
  }

  async speakWithWebAPI(text, options) {
    return new Promise((resolve, reject) => {
      if (!this.ttsEngines.web.speechSynthesis) {
        reject(new Error('Web Speech API not available'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate;
      utterance.pitch = options.pitch;
      utterance.volume = options.volume;
      utterance.lang = options.language;
      
      if (this.ttsEngines.web.currentVoice) {
        utterance.voice = this.ttsEngines.web.currentVoice;
      }

      utterance.onend = () => {
        this.isPlaying = false;
        resolve();
      };

      utterance.onerror = (error) => {
        this.isPlaying = false;
        reject(error);
      };

      // Stop current speech if high priority
      if (options.priority === 'high') {
        this.ttsEngines.web.speechSynthesis.cancel();
      }

      this.isPlaying = true;
      this.ttsEngines.web.speechSynthesis.speak(utterance);
    });
  }

  async speakWithESpeak(text, options) {
    try {
      // Generate audio with eSpeak
      const audioBuffer = await this.generateESpeakAudio(text, options);
      
      // Cache the audio
      if (this.settings.enableOfflineCache) {
        this.audioCache.set(text, audioBuffer);
      }
      
      // Play the audio
      return await this.playAudioBuffer(audioBuffer);
    } catch (error) {
      console.error('eSpeak TTS error:', error);
      throw error;
    }
  }

  async generateESpeakAudio(text, options) {
    // This would interface with eSpeak to generate audio
    // For WebAssembly version:
    // const eSpeakWasm = await import('espeak-wasm');
    // const audioBuffer = eSpeakWasm.synthesize(text, {
    //   voice: options.language,
    //   speed: Math.round(options.rate * 175), // eSpeak speed range
    //   pitch: Math.round(options.pitch * 50),
    // });
    // return audioBuffer;
    
    // For now, return null (not implemented)
    return null;
  }

  async speakWithMozillaTTS(text, options) {
    try {
      // Generate audio with Mozilla TTS
      const audioBuffer = await this.generateMozillaTTSAudio(text, options);
      
      // Cache the audio
      if (this.settings.enableOfflineCache) {
        this.audioCache.set(text, audioBuffer);
      }
      
      // Play the audio
      return await this.playAudioBuffer(audioBuffer);
    } catch (error) {
      console.error('Mozilla TTS error:', error);
      throw error;
    }
  }

  async generateMozillaTTSAudio(text, options) {
    try {
      const response = await fetch('http://localhost:5002/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          speaker_id: 0,
          language_id: options.language,
          speed: options.rate,
        }),
      });

      if (!response.ok) {
        throw new Error('Mozilla TTS server error');
      }

      const audioBuffer = await response.arrayBuffer();
      return audioBuffer;
    } catch (error) {
      console.error('Mozilla TTS generation error:', error);
      throw error;
    }
  }

  async playAudioBuffer(audioBuffer) {
    return new Promise((resolve, reject) => {
      try {
        if (Platform.OS === 'web') {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          audioContext.decodeAudioData(audioBuffer, (decodedData) => {
            const source = audioContext.createBufferSource();
            source.buffer = decodedData;
            source.connect(audioContext.destination);
            
            source.onended = () => {
              this.isPlaying = false;
              resolve();
            };
            
            this.isPlaying = true;
            this.currentAudio = source;
            source.start();
          }, reject);
        } else {
          // For React Native, would use audio player
          // const { Audio } = require('expo-av');
          // const sound = new Audio.Sound();
          // await sound.loadAsync({ uri: audioBuffer });
          // await sound.playAsync();
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop() {
    try {
      if (this.currentEngine === 'web' && this.ttsEngines.web.speechSynthesis) {
        this.ttsEngines.web.speechSynthesis.cancel();
      }
      
      if (this.currentAudio) {
        this.currentAudio.stop();
        this.currentAudio = null;
      }
      
      this.isPlaying = false;
    } catch (error) {
      console.error('TTS stop error:', error);
    }
  }

  getAvailableVoices() {
    const voices = [];
    
    if (this.ttsEngines.web.voices.length > 0) {
      voices.push(...this.ttsEngines.web.voices.map(voice => ({
        ...voice,
        engine: 'web',
      })));
    }
    
    if (this.ttsEngines.espeak.available) {
      voices.push(...this.ttsEngines.espeak.voices.map(voice => ({
        ...voice,
        engine: 'espeak',
      })));
    }
    
    return voices;
  }

  // Settings management
  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
    
    // Reinitialize if engine changed
    if (newSettings.preferredEngine) {
      await this.selectBestEngine();
    }
    
    this.notifyListeners('settingsUpdated', { settings: this.settings });
  }

  async saveSettings() {
    try {
      await AsyncStorage.setItem('freeTTSSettings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving free TTS settings:', error);
    }
  }

  async loadSettings() {
    try {
      const stored = await AsyncStorage.getItem('freeTTSSettings');
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading free TTS settings:', error);
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
        console.error('FreeTTSService listener error:', error);
      }
    });
  }

  destroy() {
    this.stop();
    this.audioCache.clear();
    this.listeners = [];
    this.isInitialized = false;
  }
}

export default new FreeTTSService();
