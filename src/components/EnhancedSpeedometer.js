import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import Sound from 'react-native-sound';

// Import services
import UnitsService from '../services/UnitsService';
import NotificationSoundsService from '../services/NotificationSoundsService';

const { width } = Dimensions.get('window');

const EnhancedSpeedometer = ({ 
  currentSpeed = 0, 
  speedLimit = null, 
  isDriving = false,
  location = null,
  onSpeedExceedance = null 
}) => {
  const [displaySpeed, setDisplaySpeed] = useState(0);
  const [displaySpeedLimit, setDisplaySpeedLimit] = useState(null);
  const [isExceeding, setIsExceeding] = useState(false);
  const [exceedanceLevel, setExceedanceLevel] = useState(0); // 0: normal, 1: warning, 2: danger
  const [units, setUnits] = useState({ distance: 'metric', speed: 'metric' });
  
  const speedAnimation = useRef(new Animated.Value(0)).current;
  const exceedanceAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const lastExceedanceAlert = useRef(0);

  useEffect(() => {
    loadUnits();
    
    // Listen for units changes
    const unsubscribe = UnitsService.addListener((event, data) => {
      if (event === 'unitsUpdated') {
        setUnits(data.currentUnits);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    updateSpeedDisplay();
    checkSpeedExceedance();
  }, [currentSpeed, speedLimit, units]);

  const loadUnits = async () => {
    try {
      await UnitsService.initialize();
      const currentUnits = UnitsService.getCurrentUnits();
      setUnits(currentUnits);
    } catch (error) {
      console.error('Error loading units:', error);
    }
  };

  const updateSpeedDisplay = () => {
    // Convert speed to display units
    const speedInDisplayUnits = units.speed === 'imperial' 
      ? currentSpeed * 0.621371 // km/h to mph
      : currentSpeed; // already in km/h

    const speedLimitInDisplayUnits = speedLimit && units.speed === 'imperial'
      ? speedLimit * 0.621371
      : speedLimit;

    setDisplaySpeed(Math.round(speedInDisplayUnits));
    setDisplaySpeedLimit(speedLimitInDisplayUnits ? Math.round(speedLimitInDisplayUnits) : null);

    // Animate speed change
    Animated.spring(speedAnimation, {
      toValue: speedInDisplayUnits,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  const checkSpeedExceedance = () => {
    if (!speedLimit || !isDriving || currentSpeed < 5) {
      setIsExceeding(false);
      setExceedanceLevel(0);
      return;
    }

    const speedDifference = currentSpeed - speedLimit;
    const exceedanceThreshold = 5; // 5 km/h tolerance
    const dangerThreshold = 15; // 15 km/h for danger level

    if (speedDifference > exceedanceThreshold) {
      setIsExceeding(true);
      
      const newLevel = speedDifference > dangerThreshold ? 2 : 1;
      setExceedanceLevel(newLevel);

      // Trigger alert if enough time has passed since last alert
      const now = Date.now();
      const alertInterval = newLevel === 2 ? 5000 : 10000; // 5s for danger, 10s for warning
      
      if (now - lastExceedanceAlert.current > alertInterval) {
        triggerSpeedExceedanceAlert(newLevel, speedDifference);
        lastExceedanceAlert.current = now;
      }

      // Start pulsing animation
      startPulseAnimation();
    } else {
      setIsExceeding(false);
      setExceedanceLevel(0);
      stopPulseAnimation();
    }
  };

  const triggerSpeedExceedanceAlert = async (level, exceedance) => {
    try {
      // Play appropriate sound
      const soundType = level === 2 ? 'speed_danger' : 'speed_warning';
      await NotificationSoundsService.playNotificationSound(soundType);

      // Trigger callback if provided
      if (onSpeedExceedance) {
        onSpeedExceedance({
          level,
          exceedance,
          currentSpeed,
          speedLimit,
          location,
        });
      }

      // Animate exceedance indicator
      Animated.sequence([
        Animated.timing(exceedanceAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(exceedanceAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();

    } catch (error) {
      console.error('Error triggering speed exceedance alert:', error);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnimation.stopAnimation();
    pulseAnimation.setValue(1);
  };

  const getSpeedColor = () => {
    if (!isDriving) return '#666';
    if (isExceeding) {
      return exceedanceLevel === 2 ? '#FF0000' : '#FF6B6B';
    }
    if (displaySpeed < 25) return '#00FF88';
    if (displaySpeed < 45) return '#FFA500';
    if (displaySpeed < 65) return '#FF6B6B';
    return '#FF0000';
  };

  const getSpeedLimitColor = () => {
    if (!speedLimit) return '#666';
    if (isExceeding) {
      return exceedanceLevel === 2 ? '#FF0000' : '#FF6B6B';
    }
    return '#FFF';
  };

  const getSpeedUnit = () => {
    return units.speed === 'imperial' ? 'mph' : 'km/h';
  };

  const speedColor = getSpeedColor();
  const speedLimitColor = getSpeedLimitColor();

  return (
    <View style={styles.container}>
      {/* Main Speedometer */}
      <Animated.View 
        style={[
          styles.speedometerContainer,
          { transform: [{ scale: pulseAnimation }] }
        ]}
      >
        <LinearGradient
          colors={[`${speedColor}30`, `${speedColor}10`]}
          style={styles.speedometerGradient}
        >
          {/* Speed Display */}
          <View style={styles.speedDisplay}>
            <Text style={[styles.speedValue, { color: speedColor }]}>
              {displaySpeed}
            </Text>
            <Text style={[styles.speedUnit, { color: speedColor }]}>
              {getSpeedUnit()}
            </Text>
          </View>

          {/* Status Indicator */}
          <View style={styles.statusContainer}>
            <Icon 
              name={isDriving ? "speed" : "pause"} 
              size={16} 
              color={speedColor} 
            />
            <Text style={[styles.statusText, { color: speedColor }]}>
              {isDriving ? 'Driving' : 'Stopped'}
            </Text>
          </View>

          {/* Exceedance Warning */}
          {isExceeding && (
            <Animated.View 
              style={[
                styles.warningContainer,
                {
                  opacity: exceedanceAnimation,
                  backgroundColor: exceedanceLevel === 2 ? '#FF000020' : '#FF6B6B20'
                }
              ]}
            >
              <Icon 
                name="warning" 
                size={20} 
                color={exceedanceLevel === 2 ? '#FF0000' : '#FF6B6B'} 
              />
              <Text style={[
                styles.warningText, 
                { color: exceedanceLevel === 2 ? '#FF0000' : '#FF6B6B' }
              ]}>
                {exceedanceLevel === 2 ? 'SLOW DOWN!' : 'Speed Limit'}
              </Text>
            </Animated.View>
          )}
        </LinearGradient>
      </Animated.View>

      {/* Speed Limit Display */}
      {displaySpeedLimit && (
        <View style={styles.speedLimitContainer}>
          <LinearGradient
            colors={[`${speedLimitColor}20`, `${speedLimitColor}10`]}
            style={styles.speedLimitGradient}
          >
            <View style={styles.speedLimitSign}>
              <Text style={styles.speedLimitLabel}>LIMIT</Text>
              <Text style={[styles.speedLimitValue, { color: speedLimitColor }]}>
                {displaySpeedLimit}
              </Text>
              <Text style={[styles.speedLimitUnit, { color: speedLimitColor }]}>
                {getSpeedUnit()}
              </Text>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Speed Difference Indicator */}
      {speedLimit && isDriving && (
        <View style={styles.differenceContainer}>
          <Text style={[
            styles.differenceText,
            { 
              color: isExceeding ? '#FF6B6B' : '#00FF88',
            }
          ]}>
            {isExceeding ? '+' : ''}{Math.round(currentSpeed - speedLimit)} {getSpeedUnit()}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedometerContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 10,
  },
  speedometerGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 60,
  },
  speedDisplay: {
    alignItems: 'center',
    marginBottom: 8,
  },
  speedValue: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  speedUnit: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: -4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  warningContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 60,
  },
  warningText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  speedLimitContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  speedLimitGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    borderRadius: 8,
    backgroundColor: '#000',
  },
  speedLimitSign: {
    alignItems: 'center',
  },
  speedLimitLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  speedLimitValue: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  speedLimitUnit: {
    fontSize: 8,
    fontWeight: '600',
    marginTop: -2,
  },
  differenceContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  differenceText: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
});

export default EnhancedSpeedometer;
