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
import { useLocation } from '../context/LocationContext';

const { width } = Dimensions.get('window');

const DigitalCompass = ({ size = 120, showCardinals = true, showBearing = false, destination = null }) => {
  const { getCurrentHeading, currentLocation, calculateBearing } = useLocation();
  const [heading, setHeading] = useState(0);
  const [bearingToDestination, setBearingToDestination] = useState(null);
  const [calibrationAccuracy, setCalibrationAccuracy] = useState('high');
  
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const updateHeading = () => {
      const currentHeading = getCurrentHeading();
      if (currentHeading !== null) {
        setHeading(currentHeading);
        
        // Animate compass rotation
        Animated.timing(rotateAnim, {
          toValue: -currentHeading,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
      
      // Calculate bearing to destination if provided
      if (destination && currentLocation) {
        const bearing = calculateBearing(
          currentLocation.latitude,
          currentLocation.longitude,
          destination.latitude,
          destination.longitude
        );
        setBearingToDestination(bearing);
      }
    };

    // Update heading every second
    const headingInterval = setInterval(updateHeading, 1000);
    updateHeading(); // Initial update

    // Pulse animation for calibration indicator
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    if (calibrationAccuracy === 'low') {
      pulseAnimation.start();
    }

    return () => {
      clearInterval(headingInterval);
      pulseAnimation.stop();
    };
  }, [currentLocation, destination, calibrationAccuracy]);

  const getCardinalDirection = (degrees) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  const formatHeading = (degrees) => {
    return `${Math.round(degrees)}°`;
  };

  const getCalibrationColor = () => {
    switch (calibrationAccuracy) {
      case 'high': return '#00FF88';
      case 'medium': return '#FFA500';
      case 'low': return '#FF6B6B';
      default: return '#666';
    }
  };

  const renderCardinalMarkers = () => {
    const cardinals = [
      { label: 'N', angle: 0, color: '#FF6B6B' },
      { label: 'E', angle: 90, color: '#FFA500' },
      { label: 'S', angle: 180, color: '#007AFF' },
      { label: 'W', angle: 270, color: '#9C27B0' },
    ];

    return cardinals.map((cardinal, index) => {
      const radian = (cardinal.angle * Math.PI) / 180;
      const radius = (size / 2) - 20;
      const x = Math.sin(radian) * radius;
      const y = -Math.cos(radian) * radius;

      return (
        <View
          key={index}
          style={[
            styles.cardinalMarker,
            {
              left: (size / 2) + x - 10,
              top: (size / 2) + y - 10,
            },
          ]}
        >
          <Text style={[styles.cardinalText, { color: cardinal.color }]}>
            {cardinal.label}
          </Text>
        </View>
      );
    });
  };

  const renderDestinationBearing = () => {
    if (!bearingToDestination || !destination) return null;

    const radian = (bearingToDestination * Math.PI) / 180;
    const radius = (size / 2) - 30;
    const x = Math.sin(radian) * radius;
    const y = -Math.cos(radian) * radius;

    return (
      <View
        style={[
          styles.destinationMarker,
          {
            left: (size / 2) + x - 8,
            top: (size / 2) + y - 8,
          },
        ]}
      >
        <Icon name="place" size={16} color="#00FF88" />
      </View>
    );
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)']}
        style={[styles.compassBackground, { width: size, height: size, borderRadius: size / 2 }]}
      >
        {/* Compass Rose */}
        <Animated.View
          style={[
            styles.compassRose,
            {
              width: size - 20,
              height: size - 20,
              borderRadius: (size - 20) / 2,
              transform: [{ rotate: rotateAnim.interpolate({
                inputRange: [0, 360],
                outputRange: ['0deg', '360deg'],
              }) }],
            },
          ]}
        >
          {/* Degree markers */}
          {Array.from({ length: 36 }, (_, i) => {
            const angle = i * 10;
            const isMainDirection = angle % 90 === 0;
            const isSubDirection = angle % 30 === 0;
            
            return (
              <View
                key={i}
                style={[
                  styles.degreeMarker,
                  {
                    transform: [
                      { rotate: `${angle}deg` },
                      { translateY: -(size / 2 - 25) },
                    ],
                  },
                ]}
              >
                <View
                  style={[
                    styles.markerLine,
                    {
                      height: isMainDirection ? 12 : isSubDirection ? 8 : 4,
                      backgroundColor: isMainDirection ? '#00FF88' : '#666',
                    },
                  ]}
                />
              </View>
            );
          })}
        </Animated.View>

        {/* Cardinal direction markers */}
        {showCardinals && renderCardinalMarkers()}

        {/* Destination bearing marker */}
        {showBearing && renderDestinationBearing()}

        {/* Center indicator */}
        <View style={styles.centerIndicator}>
          <Animated.View
            style={[
              styles.centerDot,
              {
                transform: [{ scale: pulseAnim }],
                backgroundColor: getCalibrationColor(),
              },
            ]}
          />
          <View style={styles.northArrow}>
            <Icon name="navigation" size={16} color="#FF6B6B" />
          </View>
        </View>

        {/* Heading display */}
        <View style={styles.headingDisplay}>
          <Text style={styles.headingText}>{formatHeading(heading)}</Text>
          <Text style={styles.cardinalDirection}>
            {getCardinalDirection(heading)}
          </Text>
        </View>

        {/* Calibration indicator */}
        <View style={[styles.calibrationIndicator, { borderColor: getCalibrationColor() }]}>
          <Text style={[styles.calibrationText, { color: getCalibrationColor() }]}>
            {calibrationAccuracy.toUpperCase()}
          </Text>
        </View>

        {/* Bearing to destination display */}
        {showBearing && bearingToDestination !== null && (
          <View style={styles.bearingDisplay}>
            <Text style={styles.bearingText}>
              Bearing: {formatHeading(bearingToDestination)}
            </Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassBackground: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 136, 0.3)',
    position: 'relative',
  },
  compassRose: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  degreeMarker: {
    position: 'absolute',
    alignItems: 'center',
  },
  markerLine: {
    width: 1,
  },
  cardinalMarker: {
    position: 'absolute',
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
  },
  cardinalText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  destinationMarker: {
    position: 'absolute',
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    borderRadius: 8,
  },
  centerIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  northArrow: {
    position: 'absolute',
    top: -20,
  },
  headingDisplay: {
    position: 'absolute',
    bottom: 15,
    alignItems: 'center',
  },
  headingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00FF88',
  },
  cardinalDirection: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  calibrationIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  calibrationText: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  bearingDisplay: {
    position: 'absolute',
    top: 15,
    alignItems: 'center',
  },
  bearingText: {
    fontSize: 10,
    color: '#00FF88',
    fontWeight: '500',
  },
});

export default DigitalCompass;
