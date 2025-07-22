import React, { createContext, useContext, useReducer, useEffect } from 'react';
import SafetyService from '../services/SafetyService';

// Initial state
const initialState = {
  isDriving: false,
  currentSpeed: 0,
  speedThreshold: 5,
  canInteract: true,
  location: null,
  lastUpdate: null,
  safetyMode: 'auto', // 'auto', 'manual', 'disabled'
  drivingStartTime: null,
  totalDrivingTime: 0,
  safeDrivingStreak: 0,
  violations: [],
  emergencyMode: false,
};

// Action types
const SAFETY_ACTIONS = {
  UPDATE_DRIVING_STATUS: 'UPDATE_DRIVING_STATUS',
  UPDATE_SPEED: 'UPDATE_SPEED',
  UPDATE_LOCATION: 'UPDATE_LOCATION',
  SET_SAFETY_MODE: 'SET_SAFETY_MODE',
  SET_SPEED_THRESHOLD: 'SET_SPEED_THRESHOLD',
  START_DRIVING_SESSION: 'START_DRIVING_SESSION',
  END_DRIVING_SESSION: 'END_DRIVING_SESSION',
  ADD_VIOLATION: 'ADD_VIOLATION',
  UPDATE_SAFE_STREAK: 'UPDATE_SAFE_STREAK',
  TOGGLE_EMERGENCY_MODE: 'TOGGLE_EMERGENCY_MODE',
  RESET_SAFETY_DATA: 'RESET_SAFETY_DATA',
};

// Reducer
const safetyReducer = (state, action) => {
  switch (action.type) {
    case SAFETY_ACTIONS.UPDATE_DRIVING_STATUS:
      return {
        ...state,
        isDriving: action.payload.isDriving,
        canInteract: !action.payload.isDriving,
        lastUpdate: Date.now(),
      };

    case SAFETY_ACTIONS.UPDATE_SPEED:
      return {
        ...state,
        currentSpeed: action.payload.speed,
        location: action.payload.location,
        lastUpdate: Date.now(),
      };

    case SAFETY_ACTIONS.UPDATE_LOCATION:
      return {
        ...state,
        location: action.payload.location,
        lastUpdate: Date.now(),
      };

    case SAFETY_ACTIONS.SET_SAFETY_MODE:
      return {
        ...state,
        safetyMode: action.payload.mode,
      };

    case SAFETY_ACTIONS.SET_SPEED_THRESHOLD:
      return {
        ...state,
        speedThreshold: action.payload.threshold,
      };

    case SAFETY_ACTIONS.START_DRIVING_SESSION:
      return {
        ...state,
        drivingStartTime: Date.now(),
        isDriving: true,
        canInteract: false,
      };

    case SAFETY_ACTIONS.END_DRIVING_SESSION:
      const drivingDuration = state.drivingStartTime 
        ? Date.now() - state.drivingStartTime 
        : 0;
      
      return {
        ...state,
        drivingStartTime: null,
        isDriving: false,
        canInteract: true,
        totalDrivingTime: state.totalDrivingTime + drivingDuration,
      };

    case SAFETY_ACTIONS.ADD_VIOLATION:
      return {
        ...state,
        violations: [
          ...state.violations,
          {
            ...action.payload,
            timestamp: Date.now(),
          }
        ],
        safeDrivingStreak: 0, // Reset streak on violation
      };

    case SAFETY_ACTIONS.UPDATE_SAFE_STREAK:
      return {
        ...state,
        safeDrivingStreak: action.payload.streak,
      };

    case SAFETY_ACTIONS.TOGGLE_EMERGENCY_MODE:
      return {
        ...state,
        emergencyMode: !state.emergencyMode,
        canInteract: !state.emergencyMode, // Allow interaction in emergency
      };

    case SAFETY_ACTIONS.RESET_SAFETY_DATA:
      return {
        ...initialState,
        safetyMode: state.safetyMode,
        speedThreshold: state.speedThreshold,
      };

    default:
      return state;
  }
};

// Context
const SafetyContext = createContext();

// Provider component
export const SafetyProvider = ({ children }) => {
  const [state, dispatch] = useReducer(safetyReducer, initialState);

  useEffect(() => {
    // Set up SafetyService listeners
    const unsubscribe = SafetyService.addListener((event, data) => {
      switch (event) {
        case 'drivingStatusChanged':
          dispatch({
            type: SAFETY_ACTIONS.UPDATE_DRIVING_STATUS,
            payload: { isDriving: data.isDriving }
          });
          
          if (data.isDriving && !state.drivingStartTime) {
            dispatch({ type: SAFETY_ACTIONS.START_DRIVING_SESSION });
          } else if (!data.isDriving && state.drivingStartTime) {
            dispatch({ type: SAFETY_ACTIONS.END_DRIVING_SESSION });
          }
          break;

        case 'speedUpdate':
          dispatch({
            type: SAFETY_ACTIONS.UPDATE_SPEED,
            payload: { 
              speed: data.speed, 
              location: data.location 
            }
          });
          break;

        case 'safeDrivingDetected':
          // Update safe driving streak
          const newStreak = state.safeDrivingStreak + 1;
          dispatch({
            type: SAFETY_ACTIONS.UPDATE_SAFE_STREAK,
            payload: { streak: newStreak }
          });
          break;

        case 'emergencyStop':
          dispatch({ type: SAFETY_ACTIONS.TOGGLE_EMERGENCY_MODE });
          break;
      }
    });

    return unsubscribe;
  }, [state.drivingStartTime, state.safeDrivingStreak]);

  // Action creators
  const actions = {
    setSafetyMode: (mode) => {
      dispatch({
        type: SAFETY_ACTIONS.SET_SAFETY_MODE,
        payload: { mode }
      });
    },

    setSpeedThreshold: (threshold) => {
      dispatch({
        type: SAFETY_ACTIONS.SET_SPEED_THRESHOLD,
        payload: { threshold }
      });
      SafetyService.setSpeedThreshold(threshold);
    },

    addViolation: (violation) => {
      dispatch({
        type: SAFETY_ACTIONS.ADD_VIOLATION,
        payload: violation
      });
    },

    toggleEmergencyMode: () => {
      dispatch({ type: SAFETY_ACTIONS.TOGGLE_EMERGENCY_MODE });
      if (!state.emergencyMode) {
        SafetyService.emergencyStop();
      }
    },

    resetSafetyData: () => {
      dispatch({ type: SAFETY_ACTIONS.RESET_SAFETY_DATA });
    },

    // Validation helpers
    validateSafeAction: (action, callback) => {
      return SafetyService.validateSafeAction(action, callback);
    },

    shouldBlockInteraction: () => {
      return state.emergencyMode ? false : !state.canInteract;
    },

    getSafetyStatus: () => ({
      ...state,
      isEmergencyMode: state.emergencyMode,
      drivingDuration: state.drivingStartTime 
        ? Date.now() - state.drivingStartTime 
        : 0,
    }),

    // Safety metrics
    getSafetyMetrics: () => ({
      totalDrivingTime: state.totalDrivingTime,
      safeDrivingStreak: state.safeDrivingStreak,
      violationCount: state.violations.length,
      averageSpeed: state.currentSpeed,
      safetyScore: calculateSafetyScore(state),
    }),
  };

  const value = {
    ...state,
    ...actions,
  };

  return (
    <SafetyContext.Provider value={value}>
      {children}
    </SafetyContext.Provider>
  );
};

// Helper function to calculate safety score
const calculateSafetyScore = (state) => {
  const baseScore = 100;
  const violationPenalty = state.violations.length * 5;
  const streakBonus = Math.min(state.safeDrivingStreak * 0.5, 20);
  
  return Math.max(0, Math.min(100, baseScore - violationPenalty + streakBonus));
};

// Hook to use safety context
export const useSafety = () => {
  const context = useContext(SafetyContext);
  if (!context) {
    throw new Error('useSafety must be used within a SafetyProvider');
  }
  return context;
};

// Export action types for external use
export { SAFETY_ACTIONS };
