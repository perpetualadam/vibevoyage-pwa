import Voice from 'react-native-voice';
import Tts from 'react-native-tts';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NLPVoiceService from './NLPVoiceService';

class VoiceService {
  constructor() {
    this.isInitialized = false;
    this.isListening = false;
    this.isSpeaking = false;
    this.listeners = [];
    this.commands = new Map();
    this.currentLanguage = 'en-US';
    this.voiceEnabled = true;
    this.wakeWord = 'vibevoyage';
    this.lastCommand = null;
    this.commandHistory = [];
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize Voice Recognition
      Voice.onSpeechStart = this.onSpeechStart;
      Voice.onSpeechRecognized = this.onSpeechRecognized;
      Voice.onSpeechEnd = this.onSpeechEnd;
      Voice.onSpeechError = this.onSpeechError;
      Voice.onSpeechResults = this.onSpeechResults;
      Voice.onSpeechPartialResults = this.onSpeechPartialResults;

      // Initialize Text-to-Speech
      await this.initializeTts();

      // Register default commands
      this.registerDefaultCommands();

      // Load user preferences
      await this.loadPreferences();

      this.isInitialized = true;
      console.log('VoiceService initialized successfully');
    } catch (error) {
      console.error('VoiceService initialization failed:', error);
      throw error;
    }
  }

  async initializeTts() {
    try {
      // Set TTS language
      await Tts.setDefaultLanguage(this.currentLanguage);
      
      // Set speech rate (0.5 = slow, 1.0 = normal, 2.0 = fast)
      await Tts.setDefaultRate(0.8);
      
      // Set pitch (0.5 = low, 1.0 = normal, 2.0 = high)
      await Tts.setDefaultPitch(1.0);

      // TTS event listeners
      Tts.addEventListener('tts-start', () => {
        this.isSpeaking = true;
        this.notifyListeners('ttsStart', {});
      });

      Tts.addEventListener('tts-finish', () => {
        this.isSpeaking = false;
        this.notifyListeners('ttsFinish', {});
      });

      Tts.addEventListener('tts-cancel', () => {
        this.isSpeaking = false;
        this.notifyListeners('ttsCancel', {});
      });

    } catch (error) {
      console.error('TTS initialization error:', error);
    }
  }

  registerDefaultCommands() {
    // Navigation commands
    this.registerCommand(['navigate to', 'go to', 'drive to'], this.handleNavigateCommand);
    this.registerCommand(['find', 'search for', 'locate'], this.handleSearchCommand);
    this.registerCommand(['add stop', 'add waypoint', 'stop at'], this.handleAddStopCommand);
    
    // Reporting commands
    this.registerCommand(['report police', 'police ahead', 'cop ahead'], this.handleReportPolice);
    this.registerCommand(['report accident', 'accident ahead', 'crash ahead'], this.handleReportAccident);
    this.registerCommand(['report hazard', 'hazard ahead', 'danger ahead'], this.handleReportHazard);
    this.registerCommand(['report traffic', 'traffic jam', 'heavy traffic'], this.handleReportTraffic);
    
    // Route commands
    this.registerCommand(['eco route', 'green route', 'fuel efficient'], this.handleEcoRoute);
    this.registerCommand(['fastest route', 'quick route', 'fast route'], this.handleFastestRoute);
    this.registerCommand(['avoid tolls', 'no tolls', 'toll free'], this.handleAvoidTolls);
    
    // App control commands
    this.registerCommand(['start ar', 'ar mode', 'augmented reality'], this.handleStartAR);
    this.registerCommand(['stop ar', 'exit ar', 'disable ar'], this.handleStopAR);
    this.registerCommand(['mute', 'silence', 'quiet'], this.handleMute);
    this.registerCommand(['unmute', 'sound on', 'speak'], this.handleUnmute);
    
    // Social commands
    this.registerCommand(['share trip', 'share route', 'post trip'], this.handleShareTrip);
    
    // Help commands
    this.registerCommand(['help', 'what can you do', 'commands'], this.handleHelp);
    this.registerCommand(['repeat', 'say again', 'what'], this.handleRepeat);
  }

  registerCommand(phrases, handler) {
    phrases.forEach(phrase => {
      this.commands.set(phrase.toLowerCase(), handler);
    });
  }

  async startListening() {
    if (this.isListening || !this.voiceEnabled) return;

    try {
      await Voice.start(this.currentLanguage);
      this.isListening = true;
      this.notifyListeners('listeningStart', {});
    } catch (error) {
      console.error('Voice listening start error:', error);
      this.notifyListeners('listeningError', { error });
    }
  }

  async stopListening() {
    if (!this.isListening) return;

    try {
      await Voice.stop();
      this.isListening = false;
      this.notifyListeners('listeningStop', {});
    } catch (error) {
      console.error('Voice listening stop error:', error);
    }
  }

  async speak(text, priority = 'normal') {
    if (!this.voiceEnabled) return;

    try {
      // Use NLP service for enhanced announcements if available
      if (this.shouldUseNLPService(text)) {
        await NLPVoiceService.speak(text, priority);
        return;
      }

      // Stop current speech if high priority
      if (priority === 'high' && this.isSpeaking) {
        await Tts.stop();
      }

      await Tts.speak(text);
      this.notifyListeners('speaking', { text, priority });
    } catch (error) {
      console.error('TTS speak error:', error);
    }
  }

  shouldUseNLPService(text) {
    // Use NLP service for obstacle announcements and navigation directions
    const nlpKeywords = [
      'camera', 'police', 'crossing', 'toll', 'construction',
      'turn left', 'turn right', 'continue', 'ahead', 'meters', 'kilometers'
    ];

    return nlpKeywords.some(keyword =>
      text.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  // Voice recognition event handlers
  onSpeechStart = () => {
    console.log('Speech recognition started');
  };

  onSpeechRecognized = () => {
    console.log('Speech recognized');
  };

  onSpeechEnd = () => {
    this.isListening = false;
    this.notifyListeners('listeningStop', {});
  };

  onSpeechError = (error) => {
    console.error('Speech recognition error:', error);
    this.isListening = false;
    this.notifyListeners('listeningError', { error });
  };

  onSpeechResults = (event) => {
    const results = event.value;
    if (results && results.length > 0) {
      const command = results[0].toLowerCase();
      this.processCommand(command);
    }
  };

  onSpeechPartialResults = (event) => {
    const partialResults = event.value;
    if (partialResults && partialResults.length > 0) {
      this.notifyListeners('partialResults', { text: partialResults[0] });
    }
  };

  processCommand(spokenText) {
    console.log('Processing command:', spokenText);
    
    // Check for wake word
    if (!spokenText.includes(this.wakeWord) && this.commandHistory.length === 0) {
      return; // Ignore commands without wake word initially
    }

    // Remove wake word from command
    const cleanCommand = spokenText.replace(this.wakeWord, '').trim();
    
    // Find matching command
    let matchedCommand = null;
    let matchedHandler = null;

    for (const [phrase, handler] of this.commands) {
      if (cleanCommand.includes(phrase)) {
        matchedCommand = phrase;
        matchedHandler = handler;
        break;
      }
    }

    if (matchedHandler) {
      this.lastCommand = { command: matchedCommand, text: cleanCommand, timestamp: Date.now() };
      this.commandHistory.push(this.lastCommand);
      
      // Keep only last 10 commands
      if (this.commandHistory.length > 10) {
        this.commandHistory.shift();
      }

      // Execute command
      matchedHandler.call(this, cleanCommand);
      this.notifyListeners('commandExecuted', this.lastCommand);
    } else {
      this.speak("Sorry, I didn't understand that command. Say 'VibeVoyage help' for available commands.");
      this.notifyListeners('commandNotRecognized', { text: cleanCommand });
    }
  }

  // Command handlers
  handleNavigateCommand = (command) => {
    const destination = command.replace(/navigate to|go to|drive to/g, '').trim();
    this.speak(`Searching for ${destination}`);
    this.notifyListeners('navigationRequested', { destination });
  };

  handleSearchCommand = (command) => {
    const query = command.replace(/find|search for|locate/g, '').trim();
    this.speak(`Searching for ${query}`);
    this.notifyListeners('searchRequested', { query });
  };

  handleAddStopCommand = (command) => {
    const stop = command.replace(/add stop|add waypoint|stop at/g, '').trim();
    this.speak(`Adding stop at ${stop}`);
    this.notifyListeners('stopRequested', { stop });
  };

  handleReportPolice = () => {
    this.speak('Reporting police ahead');
    this.notifyListeners('reportRequested', { type: 'police' });
  };

  handleReportAccident = () => {
    this.speak('Reporting accident ahead');
    this.notifyListeners('reportRequested', { type: 'accident' });
  };

  handleReportHazard = () => {
    this.speak('Reporting hazard ahead');
    this.notifyListeners('reportRequested', { type: 'hazard' });
  };

  handleReportTraffic = () => {
    this.speak('Reporting traffic jam');
    this.notifyListeners('reportRequested', { type: 'traffic' });
  };

  handleEcoRoute = () => {
    this.speak('Switching to eco-friendly route');
    this.notifyListeners('routeTypeRequested', { type: 'eco' });
  };

  handleFastestRoute = () => {
    this.speak('Switching to fastest route');
    this.notifyListeners('routeTypeRequested', { type: 'fastest' });
  };

  handleAvoidTolls = () => {
    this.speak('Avoiding toll roads');
    this.notifyListeners('routeOptionRequested', { option: 'avoidTolls' });
  };

  handleStartAR = () => {
    this.speak('Starting AR navigation mode');
    this.notifyListeners('arRequested', { action: 'start' });
  };

  handleStopAR = () => {
    this.speak('Stopping AR navigation mode');
    this.notifyListeners('arRequested', { action: 'stop' });
  };

  handleMute = () => {
    this.voiceEnabled = false;
    this.notifyListeners('voiceToggled', { enabled: false });
  };

  handleUnmute = () => {
    this.voiceEnabled = true;
    this.speak('Voice enabled');
    this.notifyListeners('voiceToggled', { enabled: true });
  };

  handleShareTrip = () => {
    this.speak('Trip sharing will be available when you stop');
    this.notifyListeners('shareRequested', {});
  };

  handleHelp = () => {
    const helpText = "Available commands: Navigate to, Find, Report police, Report accident, Eco route, Start AR, Share trip. Say VibeVoyage followed by your command.";
    this.speak(helpText);
    this.notifyListeners('helpRequested', {});
  };

  handleRepeat = () => {
    if (this.lastCommand) {
      this.speak(`Last command was: ${this.lastCommand.command}`);
    } else {
      this.speak('No previous command to repeat');
    }
  };

  // Utility methods
  async loadPreferences() {
    try {
      const voiceEnabled = await AsyncStorage.getItem('voiceEnabled');
      const language = await AsyncStorage.getItem('voiceLanguage');
      
      if (voiceEnabled !== null) {
        this.voiceEnabled = JSON.parse(voiceEnabled);
      }
      
      if (language) {
        this.currentLanguage = language;
        await Tts.setDefaultLanguage(language);
      }
    } catch (error) {
      console.error('Error loading voice preferences:', error);
    }
  }

  async savePreferences() {
    try {
      await AsyncStorage.setItem('voiceEnabled', JSON.stringify(this.voiceEnabled));
      await AsyncStorage.setItem('voiceLanguage', this.currentLanguage);
    } catch (error) {
      console.error('Error saving voice preferences:', error);
    }
  }

  setLanguage(language) {
    this.currentLanguage = language;
    Tts.setDefaultLanguage(language);
    this.savePreferences();
  }

  toggleVoice() {
    this.voiceEnabled = !this.voiceEnabled;
    this.savePreferences();
    return this.voiceEnabled;
  }

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
        console.error('VoiceService listener error:', error);
      }
    });
  }

  destroy() {
    Voice.destroy().then(Voice.removeAllListeners);
    Tts.removeAllListeners('tts-start');
    Tts.removeAllListeners('tts-finish');
    Tts.removeAllListeners('tts-cancel');
    this.listeners = [];
    this.isInitialized = false;
  }
}

export default new VoiceService();
