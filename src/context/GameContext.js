import React, { createContext, useContext, useReducer, useEffect } from 'react';
import GameService from '../services/GameService';

// Initial state
const initialState = {
  userStats: {
    level: 1,
    xp: 0,
    badges: [],
    achievements: [],
    streaks: {
      safeDriving: 0,
      ecoRoutes: 0,
      communityReports: 0,
    },
  },
  challenges: {
    daily: [],
    weekly: [],
  },
  leaderboard: {
    rank: 0,
    score: 0,
    topPlayers: [],
  },
  notifications: [],
  isLoading: false,
  lastUpdate: null,
};

// Action types
const GAME_ACTIONS = {
  SET_USER_STATS: 'SET_USER_STATS',
  UPDATE_XP: 'UPDATE_XP',
  LEVEL_UP: 'LEVEL_UP',
  AWARD_BADGE: 'AWARD_BADGE',
  UPDATE_CHALLENGES: 'UPDATE_CHALLENGES',
  COMPLETE_CHALLENGE: 'COMPLETE_CHALLENGE',
  UPDATE_STREAKS: 'UPDATE_STREAKS',
  UPDATE_LEADERBOARD: 'UPDATE_LEADERBOARD',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  SET_LOADING: 'SET_LOADING',
  RESET_GAME_DATA: 'RESET_GAME_DATA',
};

// Reducer
const gameReducer = (state, action) => {
  switch (action.type) {
    case GAME_ACTIONS.SET_USER_STATS:
      return {
        ...state,
        userStats: action.payload.stats,
        lastUpdate: Date.now(),
      };

    case GAME_ACTIONS.UPDATE_XP:
      return {
        ...state,
        userStats: {
          ...state.userStats,
          xp: action.payload.totalXP,
        },
        lastUpdate: Date.now(),
      };

    case GAME_ACTIONS.LEVEL_UP:
      return {
        ...state,
        userStats: {
          ...state.userStats,
          level: action.payload.newLevel,
          xp: action.payload.totalXP,
        },
        notifications: [
          ...state.notifications,
          {
            id: Date.now(),
            type: 'levelUp',
            title: 'Level Up!',
            message: `Congratulations! You reached level ${action.payload.newLevel}`,
            timestamp: Date.now(),
          }
        ],
        lastUpdate: Date.now(),
      };

    case GAME_ACTIONS.AWARD_BADGE:
      return {
        ...state,
        userStats: {
          ...state.userStats,
          badges: [...state.userStats.badges, action.payload.badgeId],
        },
        notifications: [
          ...state.notifications,
          {
            id: Date.now(),
            type: 'badge',
            title: 'Badge Earned!',
            message: `You earned the "${action.payload.badge.name}" badge`,
            badge: action.payload.badge,
            timestamp: Date.now(),
          }
        ],
        lastUpdate: Date.now(),
      };

    case GAME_ACTIONS.UPDATE_CHALLENGES:
      return {
        ...state,
        challenges: action.payload.challenges,
        lastUpdate: Date.now(),
      };

    case GAME_ACTIONS.COMPLETE_CHALLENGE:
      return {
        ...state,
        notifications: [
          ...state.notifications,
          {
            id: Date.now(),
            type: 'challenge',
            title: 'Challenge Complete!',
            message: `You completed "${action.payload.challenge.title}"`,
            reward: action.payload.reward,
            timestamp: Date.now(),
          }
        ],
        lastUpdate: Date.now(),
      };

    case GAME_ACTIONS.UPDATE_STREAKS:
      return {
        ...state,
        userStats: {
          ...state.userStats,
          streaks: action.payload.streaks,
        },
        lastUpdate: Date.now(),
      };

    case GAME_ACTIONS.UPDATE_LEADERBOARD:
      return {
        ...state,
        leaderboard: action.payload.leaderboard,
        lastUpdate: Date.now(),
      };

    case GAME_ACTIONS.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [
          ...state.notifications,
          {
            ...action.payload.notification,
            id: Date.now(),
            timestamp: Date.now(),
          }
        ],
      };

    case GAME_ACTIONS.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(
          notification => notification.id !== action.payload.notificationId
        ),
      };

    case GAME_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload.loading,
      };

    case GAME_ACTIONS.RESET_GAME_DATA:
      return {
        ...initialState,
      };

    default:
      return state;
  }
};

// Context
const GameContext = createContext();

// Provider component
export const GameProvider = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  useEffect(() => {
    initializeGameService();
    setupGameServiceListeners();
    
    return () => {
      cleanupListeners();
    };
  }, []);

  const initializeGameService = async () => {
    dispatch({ type: GAME_ACTIONS.SET_LOADING, payload: { loading: true } });
    
    try {
      await GameService.initialize();
      const userStats = GameService.getUserStats();
      const dailyChallenges = GameService.getDailyChallenges();
      const weeklyChallenges = GameService.getWeeklyChallenges();
      
      dispatch({
        type: GAME_ACTIONS.SET_USER_STATS,
        payload: { stats: userStats }
      });
      
      dispatch({
        type: GAME_ACTIONS.UPDATE_CHALLENGES,
        payload: {
          challenges: {
            daily: dailyChallenges,
            weekly: weeklyChallenges,
          }
        }
      });
      
    } catch (error) {
      console.error('Game service initialization error:', error);
    } finally {
      dispatch({ type: GAME_ACTIONS.SET_LOADING, payload: { loading: false } });
    }
  };

  const setupGameServiceListeners = () => {
    const unsubscribe = GameService.addListener((event, data) => {
      switch (event) {
        case 'xpGained':
          dispatch({
            type: GAME_ACTIONS.UPDATE_XP,
            payload: { totalXP: data.totalXP }
          });
          break;

        case 'levelUp':
          dispatch({
            type: GAME_ACTIONS.LEVEL_UP,
            payload: {
              newLevel: data.newLevel,
              totalXP: data.totalXP,
            }
          });
          break;

        case 'badgeAwarded':
          dispatch({
            type: GAME_ACTIONS.AWARD_BADGE,
            payload: {
              badgeId: data.badgeId,
              badge: data.badge,
            }
          });
          break;

        case 'challengeCompleted':
          dispatch({
            type: GAME_ACTIONS.COMPLETE_CHALLENGE,
            payload: {
              challenge: data.challenge,
              reward: data.reward,
            }
          });
          break;
      }
    });

    this.gameServiceUnsubscribe = unsubscribe;
  };

  const cleanupListeners = () => {
    if (this.gameServiceUnsubscribe) {
      this.gameServiceUnsubscribe();
    }
  };

  // Action creators
  const actions = {
    // Progress tracking
    trackSafeDriving: (distance) => {
      GameService.trackSafeDriving(distance);
    },

    trackEcoRoute: () => {
      GameService.trackEcoRoute();
    },

    trackVoiceCommand: () => {
      GameService.trackVoiceCommand();
    },

    trackCommunityModeration: () => {
      GameService.trackCommunityModeration();
    },

    trackCarbonSaved: (amount) => {
      GameService.trackCarbonSaved(amount);
    },

    // Notifications
    addNotification: (notification) => {
      dispatch({
        type: GAME_ACTIONS.ADD_NOTIFICATION,
        payload: { notification }
      });
    },

    removeNotification: (notificationId) => {
      dispatch({
        type: GAME_ACTIONS.REMOVE_NOTIFICATION,
        payload: { notificationId }
      });
    },

    clearAllNotifications: () => {
      state.notifications.forEach(notification => {
        dispatch({
          type: GAME_ACTIONS.REMOVE_NOTIFICATION,
          payload: { notificationId: notification.id }
        });
      });
    },

    // Data management
    refreshGameData: async () => {
      dispatch({ type: GAME_ACTIONS.SET_LOADING, payload: { loading: true } });
      
      try {
        const userStats = GameService.getUserStats();
        const dailyChallenges = GameService.getDailyChallenges();
        const weeklyChallenges = GameService.getWeeklyChallenges();
        
        dispatch({
          type: GAME_ACTIONS.SET_USER_STATS,
          payload: { stats: userStats }
        });
        
        dispatch({
          type: GAME_ACTIONS.UPDATE_CHALLENGES,
          payload: {
            challenges: {
              daily: dailyChallenges,
              weekly: weeklyChallenges,
            }
          }
        });
        
      } catch (error) {
        console.error('Error refreshing game data:', error);
      } finally {
        dispatch({ type: GAME_ACTIONS.SET_LOADING, payload: { loading: false } });
      }
    },

    resetGameData: () => {
      dispatch({ type: GAME_ACTIONS.RESET_GAME_DATA });
    },

    // Getters
    getUserLevel: () => state.userStats.level,
    getUserXP: () => state.userStats.xp,
    getUserBadges: () => GameService.getBadges(),
    getDailyChallenges: () => state.challenges.daily,
    getWeeklyChallenges: () => state.challenges.weekly,
    getNotifications: () => state.notifications,
    
    // Calculations
    getXPToNextLevel: () => {
      const currentLevel = state.userStats.level;
      const nextLevelXP = Math.pow(currentLevel, 2) * 100;
      return nextLevelXP - state.userStats.xp;
    },

    getLevelProgress: () => {
      const currentLevel = state.userStats.level;
      const currentLevelXP = Math.pow(currentLevel - 1, 2) * 100;
      const nextLevelXP = Math.pow(currentLevel, 2) * 100;
      const progress = (state.userStats.xp - currentLevelXP) / (nextLevelXP - currentLevelXP);
      return Math.max(0, Math.min(1, progress));
    },

    getChallengeProgress: (challengeId) => {
      const allChallenges = [...state.challenges.daily, ...state.challenges.weekly];
      const challenge = allChallenges.find(c => c.id === challengeId);
      return challenge ? challenge.current / challenge.target : 0;
    },
  };

  const value = {
    ...state,
    ...actions,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

// Hook to use game context
export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

// Export action types for external use
export { GAME_ACTIONS };
