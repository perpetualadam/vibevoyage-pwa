import React, { createContext, useContext, useReducer, useEffect } from 'react';
import VoiceService from '../services/VoiceService';

// Initial state
const initialState = {
  isListening: false,
  isSpeaking: false,
  isVoiceEnabled: true,
  currentLanguage: 'en-US',
  lastCommand: null,
  commandHistory: [],
  partialResults: '',
  error: null,
  isInitialized: false,
  supportedCommands: [],
};

// Action types
const VOICE_ACTIONS = {
  SET_LISTENING: 'SET_LISTENING',
  SET_SPEAKING: 'SET_SPEAKING',
  SET_VOICE_ENABLED: 'SET_VOICE_ENABLED',
  SET_LANGUAGE: 'SET_LANGUAGE',
  SET_LAST_COMMAND: 'SET_LAST_COMMAND',
  UPDATE_COMMAND_HISTORY: 'UPDATE_COMMAND_HISTORY',
  SET_PARTIAL_RESULTS: 'SET_PARTIAL_RESULTS',
  SET_ERROR: 'SET_ERROR',
  SET_INITIALIZED: 'SET_INITIALIZED',
  SET_SUPPORTED_COMMANDS: 'SET_SUPPORTED_COMMANDS',
  CLEAR_ERROR: 'CLEAR_ERROR',
  RESET_VOICE_DATA: 'RESET_VOICE_DATA',
};

// Reducer
const voiceReducer = (state, action) => {
  switch (action.type) {
    case VOICE_ACTIONS.SET_LISTENING:
      return {
        ...state,
        isListening: action.payload.listening,
        error: action.payload.listening ? null : state.error,
      };

    case VOICE_ACTIONS.SET_SPEAKING:
      return {
        ...state,
        isSpeaking: action.payload.speaking,
      };

    case VOICE_ACTIONS.SET_VOICE_ENABLED:
      return {
        ...state,
        isVoiceEnabled: action.payload.enabled,
      };

    case VOICE_ACTIONS.SET_LANGUAGE:
      return {
        ...state,
        currentLanguage: action.payload.language,
      };

    case VOICE_ACTIONS.SET_LAST_COMMAND:
      return {
        ...state,
        lastCommand: action.payload.command,
      };

    case VOICE_ACTIONS.UPDATE_COMMAND_HISTORY:
      return {
        ...state,
        commandHistory: action.payload.history,
      };

    case VOICE_ACTIONS.SET_PARTIAL_RESULTS:
      return {
        ...state,
        partialResults: action.payload.results,
      };

    case VOICE_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload.error,
        isListening: false,
      };

    case VOICE_ACTIONS.SET_INITIALIZED:
      return {
        ...state,
        isInitialized: action.payload.initialized,
      };

    case VOICE_ACTIONS.SET_SUPPORTED_COMMANDS:
      return {
        ...state,
        supportedCommands: action.payload.commands,
      };

    case VOICE_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case VOICE_ACTIONS.RESET_VOICE_DATA:
      return {
        ...initialState,
        isVoiceEnabled: state.isVoiceEnabled,
        currentLanguage: state.currentLanguage,
      };

    default:
      return state;
  }
};

// Context
const VoiceContext = createContext();

// Provider component
export const VoiceProvider = ({ children }) => {
  const [state, dispatch] = useReducer(voiceReducer, initialState);

  useEffect(() => {
    initializeVoiceService();
    setupVoiceServiceListeners();
    
    return () => {
      cleanupListeners();
    };
  }, []);

  const initializeVoiceService = async () => {
    try {
      await VoiceService.initialize();
      dispatch({ type: VOICE_ACTIONS.SET_INITIALIZED, payload: { initialized: true } });
      
      // Set supported commands
      const commands = getSupportedCommands();
      dispatch({ type: VOICE_ACTIONS.SET_SUPPORTED_COMMANDS, payload: { commands } });
      
    } catch (error) {
      console.error('Voice service initialization error:', error);
      dispatch({
        type: VOICE_ACTIONS.SET_ERROR,
        payload: { error: error.message }
      });
    }
  };

  const setupVoiceServiceListeners = () => {
    const unsubscribe = VoiceService.addListener((event, data) => {
      switch (event) {
        case 'listeningStart':
          dispatch({ type: VOICE_ACTIONS.SET_LISTENING, payload: { listening: true } });
          break;

        case 'listeningStop':
          dispatch({ type: VOICE_ACTIONS.SET_LISTENING, payload: { listening: false } });
          break;

        case 'listeningError':
          dispatch({
            type: VOICE_ACTIONS.SET_ERROR,
            payload: { error: data.error.message || 'Voice recognition error' }
          });
          break;

        case 'ttsStart':
          dispatch({ type: VOICE_ACTIONS.SET_SPEAKING, payload: { speaking: true } });
          break;

        case 'ttsFinish':
        case 'ttsCancel':
          dispatch({ type: VOICE_ACTIONS.SET_SPEAKING, payload: { speaking: false } });
          break;

        case 'partialResults':
          dispatch({
            type: VOICE_ACTIONS.SET_PARTIAL_RESULTS,
            payload: { results: data.text }
          });
          break;

        case 'commandExecuted':
          dispatch({
            type: VOICE_ACTIONS.SET_LAST_COMMAND,
            payload: { command: data }
          });
          
          // Update command history
          const newHistory = [data, ...state.commandHistory].slice(0, 10);
          dispatch({
            type: VOICE_ACTIONS.UPDATE_COMMAND_HISTORY,
            payload: { history: newHistory }
          });
          break;

        case 'voiceToggled':
          dispatch({
            type: VOICE_ACTIONS.SET_VOICE_ENABLED,
            payload: { enabled: data.enabled }
          });
          break;
      }
    });

    this.voiceServiceUnsubscribe = unsubscribe;
  };

  const cleanupListeners = () => {
    if (this.voiceServiceUnsubscribe) {
      this.voiceServiceUnsubscribe();
    }
  };

  const getSupportedCommands = () => {
    return [
      {
        category: 'Navigation',
        commands: [
          { phrase: 'navigate to [destination]', description: 'Start navigation to a destination' },
          { phrase: 'find [place]', description: 'Search for a place or POI' },
          { phrase: 'add stop [location]', description: 'Add a waypoint to current route' },
        ]
      },
      {
        category: 'Reporting',
        commands: [
          { phrase: 'report police', description: 'Report police ahead' },
          { phrase: 'report accident', description: 'Report accident ahead' },
          { phrase: 'report hazard', description: 'Report road hazard' },
          { phrase: 'report traffic', description: 'Report traffic jam' },
        ]
      },
      {
        category: 'Route Options',
        commands: [
          { phrase: 'eco route', description: 'Switch to eco-friendly route' },
          { phrase: 'fastest route', description: 'Switch to fastest route' },
          { phrase: 'avoid tolls', description: 'Avoid toll roads' },
        ]
      },
      {
        category: 'App Control',
        commands: [
          { phrase: 'start ar', description: 'Start AR navigation mode' },
          { phrase: 'stop ar', description: 'Stop AR navigation mode' },
          { phrase: 'mute', description: 'Mute voice feedback' },
          { phrase: 'unmute', description: 'Enable voice feedback' },
        ]
      },
      {
        category: 'Help',
        commands: [
          { phrase: 'help', description: 'Show available commands' },
          { phrase: 'repeat', description: 'Repeat last command' },
        ]
      }
    ];
  };

  // Action creators
  const actions = {
    // Voice control
    startListening: async () => {
      try {
        await VoiceService.startListening();
      } catch (error) {
        dispatch({
          type: VOICE_ACTIONS.SET_ERROR,
          payload: { error: error.message }
        });
      }
    },

    stopListening: async () => {
      try {
        await VoiceService.stopListening();
      } catch (error) {
        dispatch({
          type: VOICE_ACTIONS.SET_ERROR,
          payload: { error: error.message }
        });
      }
    },

    speak: async (text, priority = 'normal') => {
      try {
        await VoiceService.speak(text, priority);
      } catch (error) {
        dispatch({
          type: VOICE_ACTIONS.SET_ERROR,
          payload: { error: error.message }
        });
      }
    },

    // Settings
    toggleVoice: () => {
      const newState = VoiceService.toggleVoice();
      dispatch({
        type: VOICE_ACTIONS.SET_VOICE_ENABLED,
        payload: { enabled: newState }
      });
    },

    setLanguage: (language) => {
      VoiceService.setLanguage(language);
      dispatch({
        type: VOICE_ACTIONS.SET_LANGUAGE,
        payload: { language }
      });
    },

    // Error handling
    clearError: () => {
      dispatch({ type: VOICE_ACTIONS.CLEAR_ERROR });
    },

    // Data management
    resetVoiceData: () => {
      dispatch({ type: VOICE_ACTIONS.RESET_VOICE_DATA });
    },

    // Getters
    getCommandHistory: () => state.commandHistory,
    
    getLastCommand: () => state.lastCommand,
    
    getSupportedCommands: () => state.supportedCommands,
    
    getVoiceStatus: () => ({
      enabled: state.isVoiceEnabled,
      listening: state.isListening,
      speaking: state.isSpeaking,
      initialized: state.isInitialized,
      language: state.currentLanguage,
      error: state.error,
    }),

    // Command utilities
    isCommandSupported: (command) => {
      return state.supportedCommands.some(category =>
        category.commands.some(cmd =>
          cmd.phrase.toLowerCase().includes(command.toLowerCase())
        )
      );
    },

    getCommandSuggestions: (partialCommand) => {
      const suggestions = [];
      state.supportedCommands.forEach(category => {
        category.commands.forEach(cmd => {
          if (cmd.phrase.toLowerCase().includes(partialCommand.toLowerCase())) {
            suggestions.push({
              ...cmd,
              category: category.category,
            });
          }
        });
      });
      return suggestions;
    },

    // Voice feedback helpers
    announceNavigation: (instruction) => {
      actions.speak(instruction, 'high');
    },

    announceAlert: (alert) => {
      actions.speak(alert, 'high');
    },

    announceConfirmation: (action) => {
      actions.speak(`${action} confirmed`, 'normal');
    },

    // Quick commands
    quickReport: (type) => {
      actions.speak(`Reporting ${type} ahead`);
    },

    quickNavigation: (destination) => {
      actions.speak(`Navigating to ${destination}`);
    },
  };

  const value = {
    ...state,
    ...actions,
  };

  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
};

// Hook to use voice context
export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};

// Export action types for external use
export { VOICE_ACTIONS };
