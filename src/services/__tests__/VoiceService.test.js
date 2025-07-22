import VoiceService from '../VoiceService';
import Voice from 'react-native-voice';
import Tts from 'react-native-tts';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('react-native-voice');
jest.mock('react-native-tts');
jest.mock('@react-native-async-storage/async-storage');

describe('VoiceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    VoiceService.destroy();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await VoiceService.initialize();
      expect(VoiceService.isInitialized).toBe(true);
    });

    it('should set up voice recognition listeners', async () => {
      await VoiceService.initialize();
      
      expect(Voice.onSpeechStart).toBeDefined();
      expect(Voice.onSpeechRecognized).toBeDefined();
      expect(Voice.onSpeechEnd).toBeDefined();
      expect(Voice.onSpeechError).toBeDefined();
      expect(Voice.onSpeechResults).toBeDefined();
      expect(Voice.onSpeechPartialResults).toBeDefined();
    });

    it('should initialize TTS with default settings', async () => {
      await VoiceService.initialize();
      
      expect(Tts.setDefaultLanguage).toHaveBeenCalledWith('en-US');
      expect(Tts.setDefaultRate).toHaveBeenCalledWith(0.8);
      expect(Tts.setDefaultPitch).toHaveBeenCalledWith(1.0);
    });
  });

  describe('voice recognition', () => {
    beforeEach(async () => {
      await VoiceService.initialize();
    });

    it('should start listening', async () => {
      Voice.start.mockResolvedValue();
      
      await VoiceService.startListening();
      
      expect(Voice.start).toHaveBeenCalledWith('en-US');
      expect(VoiceService.isListening).toBe(true);
    });

    it('should stop listening', async () => {
      Voice.stop.mockResolvedValue();
      VoiceService.isListening = true;
      
      await VoiceService.stopListening();
      
      expect(Voice.stop).toHaveBeenCalled();
      expect(VoiceService.isListening).toBe(false);
    });

    it('should handle voice recognition errors', async () => {
      const mockListener = jest.fn();
      VoiceService.addListener(mockListener);
      
      const error = { error: { message: 'Recognition failed' } };
      VoiceService.onSpeechError(error);
      
      expect(VoiceService.isListening).toBe(false);
      expect(mockListener).toHaveBeenCalledWith('listeningError', error);
    });
  });

  describe('text-to-speech', () => {
    beforeEach(async () => {
      await VoiceService.initialize();
    });

    it('should speak text', async () => {
      Tts.speak.mockResolvedValue();
      
      await VoiceService.speak('Hello world');
      
      expect(Tts.speak).toHaveBeenCalledWith('Hello world');
    });

    it('should stop current speech for high priority', async () => {
      Tts.stop.mockResolvedValue();
      Tts.speak.mockResolvedValue();
      VoiceService.isSpeaking = true;
      
      await VoiceService.speak('Urgent message', 'high');
      
      expect(Tts.stop).toHaveBeenCalled();
      expect(Tts.speak).toHaveBeenCalledWith('Urgent message');
    });

    it('should not speak when voice is disabled', async () => {
      VoiceService.voiceEnabled = false;
      
      await VoiceService.speak('Test message');
      
      expect(Tts.speak).not.toHaveBeenCalled();
    });
  });

  describe('command processing', () => {
    beforeEach(async () => {
      await VoiceService.initialize();
    });

    it('should process navigation commands', () => {
      const mockListener = jest.fn();
      VoiceService.addListener(mockListener);
      
      VoiceService.processCommand('vibevoyage navigate to starbucks');
      
      expect(mockListener).toHaveBeenCalledWith('navigationRequested', {
        destination: 'starbucks'
      });
    });

    it('should process report commands', () => {
      const mockListener = jest.fn();
      VoiceService.addListener(mockListener);
      
      VoiceService.processCommand('vibevoyage report police');
      
      expect(mockListener).toHaveBeenCalledWith('reportRequested', {
        type: 'police'
      });
    });

    it('should process eco route commands', () => {
      const mockListener = jest.fn();
      VoiceService.addListener(mockListener);
      
      VoiceService.processCommand('vibevoyage eco route');
      
      expect(mockListener).toHaveBeenCalledWith('routeTypeRequested', {
        type: 'eco'
      });
    });

    it('should ignore commands without wake word', () => {
      const mockListener = jest.fn();
      VoiceService.addListener(mockListener);
      
      VoiceService.processCommand('navigate to starbucks');
      
      expect(mockListener).not.toHaveBeenCalled();
    });

    it('should handle unrecognized commands', () => {
      const mockListener = jest.fn();
      VoiceService.addListener(mockListener);
      
      VoiceService.processCommand('vibevoyage unknown command');
      
      expect(mockListener).toHaveBeenCalledWith('commandNotRecognized', {
        text: 'unknown command'
      });
    });
  });

  describe('command handlers', () => {
    beforeEach(async () => {
      await VoiceService.initialize();
    });

    it('should handle navigation command', () => {
      const mockListener = jest.fn();
      VoiceService.addListener(mockListener);
      
      VoiceService.handleNavigateCommand('navigate to coffee shop');
      
      expect(Tts.speak).toHaveBeenCalledWith('Searching for coffee shop');
      expect(mockListener).toHaveBeenCalledWith('navigationRequested', {
        destination: 'coffee shop'
      });
    });

    it('should handle search command', () => {
      const mockListener = jest.fn();
      VoiceService.addListener(mockListener);
      
      VoiceService.handleSearchCommand('find gas station');
      
      expect(Tts.speak).toHaveBeenCalledWith('Searching for gas station');
      expect(mockListener).toHaveBeenCalledWith('searchRequested', {
        query: 'gas station'
      });
    });

    it('should handle mute command', () => {
      const mockListener = jest.fn();
      VoiceService.addListener(mockListener);
      
      VoiceService.handleMute();
      
      expect(VoiceService.voiceEnabled).toBe(false);
      expect(mockListener).toHaveBeenCalledWith('voiceToggled', {
        enabled: false
      });
    });

    it('should handle unmute command', () => {
      const mockListener = jest.fn();
      VoiceService.addListener(mockListener);
      VoiceService.voiceEnabled = false;
      
      VoiceService.handleUnmute();
      
      expect(VoiceService.voiceEnabled).toBe(true);
      expect(Tts.speak).toHaveBeenCalledWith('Voice enabled');
      expect(mockListener).toHaveBeenCalledWith('voiceToggled', {
        enabled: true
      });
    });
  });

  describe('preferences', () => {
    beforeEach(async () => {
      await VoiceService.initialize();
    });

    it('should load preferences from storage', async () => {
      AsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'voiceEnabled') return Promise.resolve('false');
        if (key === 'voiceLanguage') return Promise.resolve('es-ES');
        return Promise.resolve(null);
      });
      
      await VoiceService.loadPreferences();
      
      expect(VoiceService.voiceEnabled).toBe(false);
      expect(VoiceService.currentLanguage).toBe('es-ES');
    });

    it('should save preferences to storage', async () => {
      VoiceService.voiceEnabled = false;
      VoiceService.currentLanguage = 'fr-FR';
      
      await VoiceService.savePreferences();
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('voiceEnabled', 'false');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('voiceLanguage', 'fr-FR');
    });

    it('should set language', () => {
      VoiceService.setLanguage('de-DE');
      
      expect(VoiceService.currentLanguage).toBe('de-DE');
      expect(Tts.setDefaultLanguage).toHaveBeenCalledWith('de-DE');
    });

    it('should toggle voice', () => {
      const initialState = VoiceService.voiceEnabled;
      const result = VoiceService.toggleVoice();
      
      expect(result).toBe(!initialState);
      expect(VoiceService.voiceEnabled).toBe(!initialState);
    });
  });

  describe('command history', () => {
    beforeEach(async () => {
      await VoiceService.initialize();
    });

    it('should store command history', () => {
      VoiceService.processCommand('vibevoyage navigate to home');
      
      expect(VoiceService.lastCommand).toBeDefined();
      expect(VoiceService.lastCommand.command).toBe('navigate to');
      expect(VoiceService.commandHistory).toHaveLength(1);
    });

    it('should limit command history length', () => {
      // Add more than 10 commands
      for (let i = 0; i < 15; i++) {
        VoiceService.processCommand(`vibevoyage navigate to location ${i}`);
      }
      
      expect(VoiceService.commandHistory).toHaveLength(10);
    });

    it('should handle repeat command', () => {
      VoiceService.lastCommand = {
        command: 'navigate to',
        text: 'navigate to starbucks',
        timestamp: Date.now()
      };
      
      VoiceService.handleRepeat();
      
      expect(Tts.speak).toHaveBeenCalledWith('Last command was: navigate to');
    });

    it('should handle repeat when no previous command', () => {
      VoiceService.lastCommand = null;
      
      VoiceService.handleRepeat();
      
      expect(Tts.speak).toHaveBeenCalledWith('No previous command to repeat');
    });
  });

  describe('listeners', () => {
    beforeEach(async () => {
      await VoiceService.initialize();
    });

    it('should add and remove listeners', () => {
      const mockListener = jest.fn();
      const unsubscribe = VoiceService.addListener(mockListener);
      
      expect(VoiceService.listeners).toContain(mockListener);
      
      unsubscribe();
      expect(VoiceService.listeners).not.toContain(mockListener);
    });

    it('should notify listeners of events', () => {
      const mockListener = jest.fn();
      VoiceService.addListener(mockListener);
      
      VoiceService.notifyListeners('testEvent', { data: 'test' });
      
      expect(mockListener).toHaveBeenCalledWith('testEvent', { data: 'test' });
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = jest.fn();
      
      VoiceService.addListener(errorListener);
      VoiceService.addListener(normalListener);
      
      VoiceService.notifyListeners('testEvent', {});
      
      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', async () => {
      await VoiceService.initialize();
      const mockListener = jest.fn();
      VoiceService.addListener(mockListener);
      
      VoiceService.destroy();
      
      expect(Voice.destroy).toHaveBeenCalled();
      expect(Voice.removeAllListeners).toHaveBeenCalled();
      expect(VoiceService.listeners).toHaveLength(0);
      expect(VoiceService.isInitialized).toBe(false);
    });
  });
});
