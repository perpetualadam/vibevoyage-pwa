import SafetyService from '../SafetyService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-geolocation-service');
jest.mock('react-native-background-timer');

describe('SafetyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SafetyService.destroy();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await SafetyService.initialize();
      expect(SafetyService.isInitialized).toBe(true);
    });

    it('should not initialize twice', async () => {
      await SafetyService.initialize();
      await SafetyService.initialize();
      expect(SafetyService.isInitialized).toBe(true);
    });
  });

  describe('speed detection', () => {
    beforeEach(async () => {
      await SafetyService.initialize();
    });

    it('should detect driving when speed exceeds threshold', () => {
      const mockPosition = {
        coords: {
          latitude: 37.78825,
          longitude: -122.4324,
          speed: 3, // m/s = ~6.7 mph
          accuracy: 10,
        },
      };

      SafetyService.updateLocation(mockPosition);
      expect(SafetyService.isDriving).toBe(true);
    });

    it('should not detect driving when speed is below threshold', () => {
      const mockPosition = {
        coords: {
          latitude: 37.78825,
          longitude: -122.4324,
          speed: 1, // m/s = ~2.2 mph
          accuracy: 10,
        },
      };

      SafetyService.updateLocation(mockPosition);
      expect(SafetyService.isDriving).toBe(false);
    });

    it('should handle null speed values', () => {
      const mockPosition = {
        coords: {
          latitude: 37.78825,
          longitude: -122.4324,
          speed: null,
          accuracy: 10,
        },
      };

      SafetyService.updateLocation(mockPosition);
      expect(SafetyService.currentSpeed).toBe(0);
      expect(SafetyService.isDriving).toBe(false);
    });
  });

  describe('interaction blocking', () => {
    beforeEach(async () => {
      await SafetyService.initialize();
    });

    it('should block manual interaction when driving', () => {
      SafetyService.isDriving = true;
      expect(SafetyService.shouldBlockManualInteraction()).toBe(true);
    });

    it('should allow manual interaction when not driving', () => {
      SafetyService.isDriving = false;
      expect(SafetyService.shouldBlockManualInteraction()).toBe(false);
    });

    it('should validate safe actions correctly', () => {
      const mockCallback = jest.fn();
      
      // When not driving, should execute callback
      SafetyService.isDriving = false;
      const result = SafetyService.validateSafeAction('test action', mockCallback);
      expect(result).toBe(true);
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should block unsafe actions when driving', () => {
      const mockCallback = jest.fn();
      
      // When driving, should not execute callback
      SafetyService.isDriving = true;
      const result = SafetyService.validateSafeAction('test action', mockCallback);
      expect(result).toBe(false);
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('safety status', () => {
    beforeEach(async () => {
      await SafetyService.initialize();
    });

    it('should return correct safety status', () => {
      SafetyService.isDriving = true;
      SafetyService.currentSpeed = 25;
      SafetyService.lastKnownLocation = { latitude: 37.78825, longitude: -122.4324 };

      const status = SafetyService.getSafetyStatus();
      
      expect(status.isDriving).toBe(true);
      expect(status.currentSpeed).toBe(25);
      expect(status.canInteract).toBe(false);
      expect(status.location).toEqual({ latitude: 37.78825, longitude: -122.4324 });
    });
  });

  describe('listeners', () => {
    beforeEach(async () => {
      await SafetyService.initialize();
    });

    it('should add and remove listeners correctly', () => {
      const mockListener = jest.fn();
      const unsubscribe = SafetyService.addListener(mockListener);
      
      expect(SafetyService.listeners).toContain(mockListener);
      
      unsubscribe();
      expect(SafetyService.listeners).not.toContain(mockListener);
    });

    it('should notify listeners of events', () => {
      const mockListener = jest.fn();
      SafetyService.addListener(mockListener);
      
      SafetyService.notifyListeners('testEvent', { data: 'test' });
      
      expect(mockListener).toHaveBeenCalledWith('testEvent', { data: 'test' });
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = jest.fn();
      
      SafetyService.addListener(errorListener);
      SafetyService.addListener(normalListener);
      
      SafetyService.notifyListeners('testEvent', {});
      
      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe('speed threshold', () => {
    beforeEach(async () => {
      await SafetyService.initialize();
    });

    it('should update speed threshold', () => {
      SafetyService.setSpeedThreshold(8);
      expect(SafetyService.speedThreshold).toBe(8);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('speedThreshold', '8');
    });

    it('should use custom threshold for driving detection', () => {
      SafetyService.setSpeedThreshold(10);
      
      const mockPosition = {
        coords: {
          latitude: 37.78825,
          longitude: -122.4324,
          speed: 3, // m/s = ~6.7 mph (below 10 mph threshold)
          accuracy: 10,
        },
      };

      SafetyService.updateLocation(mockPosition);
      expect(SafetyService.isDriving).toBe(false);
    });
  });

  describe('emergency stop', () => {
    beforeEach(async () => {
      await SafetyService.initialize();
    });

    it('should execute emergency stop', () => {
      const mockListener = jest.fn();
      SafetyService.addListener(mockListener);
      
      SafetyService.isDriving = true;
      SafetyService.currentSpeed = 25;
      
      SafetyService.emergencyStop();
      
      expect(SafetyService.isDriving).toBe(false);
      expect(SafetyService.currentSpeed).toBe(0);
      expect(mockListener).toHaveBeenCalledWith('emergencyStop', {});
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', async () => {
      await SafetyService.initialize();
      const mockListener = jest.fn();
      SafetyService.addListener(mockListener);
      
      SafetyService.destroy();
      
      expect(SafetyService.isInitialized).toBe(false);
      expect(SafetyService.listeners).toHaveLength(0);
    });
  });

  describe('speed history', () => {
    beforeEach(async () => {
      await SafetyService.initialize();
    });

    it('should maintain speed history for smoothing', () => {
      const speeds = [2, 4, 6, 8, 10]; // m/s
      
      speeds.forEach(speed => {
        const mockPosition = {
          coords: {
            latitude: 37.78825,
            longitude: -122.4324,
            speed,
            accuracy: 10,
          },
        };
        SafetyService.updateLocation(mockPosition);
      });
      
      expect(SafetyService.speedHistory).toHaveLength(5);
      expect(SafetyService.speedHistory[4]).toBeCloseTo(22.37, 1); // 10 m/s to mph
    });

    it('should limit speed history length', () => {
      // Add more than maxSpeedHistoryLength entries
      for (let i = 0; i < 15; i++) {
        const mockPosition = {
          coords: {
            latitude: 37.78825,
            longitude: -122.4324,
            speed: i,
            accuracy: 10,
          },
        };
        SafetyService.updateLocation(mockPosition);
      }
      
      expect(SafetyService.speedHistory.length).toBeLessThanOrEqual(SafetyService.maxSpeedHistoryLength);
    });
  });
});
