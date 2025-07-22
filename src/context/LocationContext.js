import React, { createContext, useContext, useReducer, useEffect } from 'react';
import LocationService from '../services/LocationService';

// Initial state
const initialState = {
  currentLocation: null,
  locationHistory: [],
  isLocationEnabled: false,
  accuracy: null,
  heading: null,
  speed: null,
  altitude: null,
  lastUpdate: null,
  error: null,
  isLoading: false,
  watchingLocation: false,
};

// Action types
const LOCATION_ACTIONS = {
  SET_CURRENT_LOCATION: 'SET_CURRENT_LOCATION',
  UPDATE_LOCATION_HISTORY: 'UPDATE_LOCATION_HISTORY',
  SET_LOCATION_ENABLED: 'SET_LOCATION_ENABLED',
  SET_LOCATION_ERROR: 'SET_LOCATION_ERROR',
  SET_LOADING: 'SET_LOADING',
  START_WATCHING: 'START_WATCHING',
  STOP_WATCHING: 'STOP_WATCHING',
  CLEAR_LOCATION_DATA: 'CLEAR_LOCATION_DATA',
};

// Reducer
const locationReducer = (state, action) => {
  switch (action.type) {
    case LOCATION_ACTIONS.SET_CURRENT_LOCATION:
      return {
        ...state,
        currentLocation: action.payload.location,
        accuracy: action.payload.location.accuracy,
        heading: action.payload.location.heading,
        speed: action.payload.location.speed,
        altitude: action.payload.location.altitude,
        lastUpdate: Date.now(),
        error: null,
        isLocationEnabled: true,
      };

    case LOCATION_ACTIONS.UPDATE_LOCATION_HISTORY:
      return {
        ...state,
        locationHistory: action.payload.history,
      };

    case LOCATION_ACTIONS.SET_LOCATION_ENABLED:
      return {
        ...state,
        isLocationEnabled: action.payload.enabled,
      };

    case LOCATION_ACTIONS.SET_LOCATION_ERROR:
      return {
        ...state,
        error: action.payload.error,
        isLocationEnabled: false,
        isLoading: false,
      };

    case LOCATION_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload.loading,
      };

    case LOCATION_ACTIONS.START_WATCHING:
      return {
        ...state,
        watchingLocation: true,
      };

    case LOCATION_ACTIONS.STOP_WATCHING:
      return {
        ...state,
        watchingLocation: false,
      };

    case LOCATION_ACTIONS.CLEAR_LOCATION_DATA:
      return {
        ...initialState,
      };

    default:
      return state;
  }
};

// Context
const LocationContext = createContext();

// Provider component
export const LocationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(locationReducer, initialState);

  useEffect(() => {
    initializeLocationService();
    setupLocationServiceListeners();
    
    return () => {
      cleanupListeners();
    };
  }, []);

  const initializeLocationService = async () => {
    dispatch({ type: LOCATION_ACTIONS.SET_LOADING, payload: { loading: true } });
    
    try {
      await LocationService.initialize();
      dispatch({ type: LOCATION_ACTIONS.SET_LOCATION_ENABLED, payload: { enabled: true } });
    } catch (error) {
      console.error('Location service initialization error:', error);
      dispatch({
        type: LOCATION_ACTIONS.SET_LOCATION_ERROR,
        payload: { error: error.message }
      });
    } finally {
      dispatch({ type: LOCATION_ACTIONS.SET_LOADING, payload: { loading: false } });
    }
  };

  const setupLocationServiceListeners = () => {
    const unsubscribe = LocationService.addListener((event, data) => {
      switch (event) {
        case 'locationUpdate':
          dispatch({
            type: LOCATION_ACTIONS.SET_CURRENT_LOCATION,
            payload: { location: data }
          });
          
          // Update history
          const history = LocationService.getLocationHistory();
          dispatch({
            type: LOCATION_ACTIONS.UPDATE_LOCATION_HISTORY,
            payload: { history }
          });
          break;

        case 'locationError':
          dispatch({
            type: LOCATION_ACTIONS.SET_LOCATION_ERROR,
            payload: { error: data.message || 'Location error occurred' }
          });
          break;
      }
    });

    this.locationServiceUnsubscribe = unsubscribe;
  };

  const cleanupListeners = () => {
    if (this.locationServiceUnsubscribe) {
      this.locationServiceUnsubscribe();
    }
  };

  // Action creators
  const actions = {
    // Location management
    getCurrentLocation: async () => {
      dispatch({ type: LOCATION_ACTIONS.SET_LOADING, payload: { loading: true } });
      
      try {
        const location = await LocationService.getCurrentLocation();
        dispatch({
          type: LOCATION_ACTIONS.SET_CURRENT_LOCATION,
          payload: { location }
        });
        return location;
      } catch (error) {
        dispatch({
          type: LOCATION_ACTIONS.SET_LOCATION_ERROR,
          payload: { error: error.message }
        });
        throw error;
      } finally {
        dispatch({ type: LOCATION_ACTIONS.SET_LOADING, payload: { loading: false } });
      }
    },

    startWatchingLocation: () => {
      LocationService.startWatching();
      dispatch({ type: LOCATION_ACTIONS.START_WATCHING });
    },

    stopWatchingLocation: () => {
      LocationService.stopWatching();
      dispatch({ type: LOCATION_ACTIONS.STOP_WATCHING });
    },

    clearLocationData: () => {
      dispatch({ type: LOCATION_ACTIONS.CLEAR_LOCATION_DATA });
    },

    // Utility functions
    calculateDistance: (lat1, lon1, lat2, lon2) => {
      return LocationService.calculateDistance(lat1, lon1, lat2, lon2);
    },

    calculateBearing: (lat1, lon1, lat2, lon2) => {
      return LocationService.calculateBearing(lat1, lon1, lat2, lon2);
    },

    isLocationAccurate: (minAccuracy = 50) => {
      return LocationService.isLocationAccurate(state.currentLocation, minAccuracy);
    },

    // Getters
    getLocationHistory: () => state.locationHistory,
    
    getCurrentPosition: () => state.currentLocation,
    
    getLocationAccuracy: () => state.accuracy,
    
    getLocationStatus: () => ({
      enabled: state.isLocationEnabled,
      watching: state.watchingLocation,
      hasLocation: !!state.currentLocation,
      accuracy: state.accuracy,
      lastUpdate: state.lastUpdate,
      error: state.error,
    }),

    // Distance calculations
    getDistanceFromPoint: (targetLat, targetLon) => {
      if (!state.currentLocation) return null;
      
      return LocationService.calculateDistance(
        state.currentLocation.latitude,
        state.currentLocation.longitude,
        targetLat,
        targetLon
      );
    },

    getBearingToPoint: (targetLat, targetLon) => {
      if (!state.currentLocation) return null;
      
      return LocationService.calculateBearing(
        state.currentLocation.latitude,
        state.currentLocation.longitude,
        targetLat,
        targetLon
      );
    },

    // Location validation
    isNearLocation: (targetLat, targetLon, radiusKm = 0.1) => {
      const distance = actions.getDistanceFromPoint(targetLat, targetLon);
      return distance !== null && distance <= radiusKm;
    },

    // Speed and movement
    getCurrentSpeed: () => state.speed || 0,
    
    getCurrentHeading: () => state.heading || 0,
    
    isMoving: (minSpeed = 1) => {
      return (state.speed || 0) > minSpeed;
    },

    // Location history analysis
    getTotalDistance: () => {
      if (state.locationHistory.length < 2) return 0;
      
      let totalDistance = 0;
      for (let i = 1; i < state.locationHistory.length; i++) {
        const prev = state.locationHistory[i - 1];
        const curr = state.locationHistory[i];
        totalDistance += LocationService.calculateDistance(
          prev.latitude,
          prev.longitude,
          curr.latitude,
          curr.longitude
        );
      }
      return totalDistance;
    },

    getAverageSpeed: () => {
      if (state.locationHistory.length < 2) return 0;
      
      const speeds = state.locationHistory
        .filter(location => location.speed !== null)
        .map(location => location.speed);
      
      if (speeds.length === 0) return 0;
      
      return speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
    },
  };

  const value = {
    ...state,
    ...actions,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

// Hook to use location context
export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

// Export action types for external use
export { LOCATION_ACTIONS };
