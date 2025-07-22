import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import contexts
import { useSafety } from '../context/SafetyContext';
import { useVoice } from '../context/VoiceContext';
import { useLocation } from '../context/LocationContext';

const { width, height } = Dimensions.get('window');

const ARNavigationScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isDriving, currentSpeed } = useSafety();
  const { speak } = useVoice();
  const { currentLocation, getCurrentHeading } = useLocation();

  const [isARActive, setIsARActive] = useState(false);
  const [cameraPermission, setCameraPermission] = useState(false);
  const [heading, setHeading] = useState(0);
  const [nextTurn, setNextTurn] = useState({
    direction: 'straight',
    distance: 500,
    instruction: 'Continue straight for 500m',
  });

  useEffect(() => {
    initializeAR();
    return () => {
      cleanup();
    };
  }, []);

  const initializeAR = async () => {
    try {
      // Check camera permission (placeholder)
      setCameraPermission(true);
      
      // Start AR mode
      setIsARActive(true);
      speak('AR navigation mode activated');
      
      // Update heading periodically
      const headingInterval = setInterval(() => {
        const currentHeading = getCurrentHeading();
        setHeading(currentHeading);
      }, 1000);

      this.headingInterval = headingInterval;
      
    } catch (error) {
      console.error('AR initialization error:', error);
      Alert.alert('AR Error', 'Unable to start AR navigation');
      navigation.goBack();
    }
  };

  const cleanup = () => {
    if (this.headingInterval) {
      clearInterval(this.headingInterval);
    }
    setIsARActive(false);
  };

  const handleExitAR = () => {
    speak('Exiting AR navigation mode');
    cleanup();
    navigation.goBack();
  };

  const getDirectionIcon = (direction) => {
    switch (direction) {
      case 'left': return 'turn-left';
      case 'right': return 'turn-right';
      case 'straight': return 'straight';
      case 'u-turn': return 'u-turn-left';
      default: return 'navigation';
    }
  };

  const getDirectionColor = (direction) => {
    switch (direction) {
      case 'left': return '#007AFF';
      case 'right': return '#007AFF';
      case 'straight': return '#00FF88';
      case 'u-turn': return '#FF6B6B';
      default: return '#FFA500';
    }
  };

  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  if (!cameraPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Icon name="camera-alt" size={80} color="#666" />
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionText}>
          VibeVoyage needs camera access to provide AR navigation
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => {
            Alert.alert('Permission', 'Please enable camera permission in settings');
            navigation.goBack();
          }}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Camera View Placeholder */}
      <View style={styles.cameraView}>
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.3)']}
          style={styles.cameraOverlay}
        >
          {/* AR Direction Arrow */}
          <View style={styles.arArrow}>
            <LinearGradient
              colors={[getDirectionColor(nextTurn.direction), `${getDirectionColor(nextTurn.direction)}80`]}
              style={styles.arrowGradient}
            >
              <Icon
                name={getDirectionIcon(nextTurn.direction)}
                size={60}
                color="#FFF"
              />
            </LinearGradient>
            
            {/* Glowing effect */}
            <View style={[styles.arrowGlow, { backgroundColor: getDirectionColor(nextTurn.direction) }]} />
          </View>

          {/* Distance indicator */}
          <View style={styles.distanceIndicator}>
            <Text style={styles.distanceText}>
              {formatDistance(nextTurn.distance)}
            </Text>
          </View>

          {/* AR Grid Lines */}
          <View style={styles.gridLines}>
            {[...Array(5)].map((_, i) => (
              <View key={i} style={[styles.gridLine, { top: `${20 + i * 15}%` }]} />
            ))}
          </View>
        </LinearGradient>
      </View>

      {/* Top UI */}
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        style={[styles.topUI, { paddingTop: insets.top }]}
      >
        <TouchableOpacity
          style={styles.exitButton}
          onPress={handleExitAR}
        >
          <Icon name="close" size={24} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.arStatus}>
          <View style={styles.arIndicator}>
            <Icon name="view-in-ar" size={20} color="#00FF88" />
            <Text style={styles.arText}>AR Navigation</Text>
          </View>
          
          {isDriving && (
            <View style={styles.speedIndicator}>
              <Text style={styles.speedText}>{Math.round(currentSpeed)} mph</Text>
            </View>
          )}
        </View>

        <View style={styles.headerSpacer} />
      </LinearGradient>

      {/* Bottom UI */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={[styles.bottomUI, { paddingBottom: insets.bottom }]}
      >
        {/* Navigation Instruction */}
        <View style={styles.instructionCard}>
          <LinearGradient
            colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.7)']}
            style={styles.instructionGradient}
          >
            <View style={styles.instructionContent}>
              <Icon
                name={getDirectionIcon(nextTurn.direction)}
                size={30}
                color={getDirectionColor(nextTurn.direction)}
              />
              <View style={styles.instructionText}>
                <Text style={styles.instructionTitle}>
                  {nextTurn.instruction}
                </Text>
                <Text style={styles.instructionDistance}>
                  in {formatDistance(nextTurn.distance)}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* AR Controls */}
        <View style={styles.arControls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => speak('AR navigation active')}
          >
            <Icon name="volume-up" size={24} color="#00FF88" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              Alert.alert('AR Settings', 'Feature coming soon!');
            }}
          >
            <Icon name="tune" size={24} color="#00FF88" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              Alert.alert('Switch View', 'Switching to map view');
              navigation.goBack();
            }}
          >
            <Icon name="map" size={24} color="#00FF88" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Compass */}
      <View style={styles.compass}>
        <View style={[styles.compassRing, { transform: [{ rotate: `${-heading}deg` }] }]}>
          <View style={styles.compassNorth}>
            <Text style={styles.compassText}>N</Text>
          </View>
        </View>
        <View style={styles.compassCenter} />
      </View>

      {/* Beta Badge */}
      <View style={styles.betaBadge}>
        <Text style={styles.betaText}>BETA</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 15,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#00FF88',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  cameraView: {
    flex: 1,
    backgroundColor: '#1a1a1a', // Placeholder for camera view
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arArrow: {
    position: 'relative',
    marginBottom: 50,
  },
  arrowGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  arrowGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.3,
    top: -10,
    left: -10,
  },
  distanceIndicator: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#00FF88',
  },
  distanceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00FF88',
  },
  gridLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
  },
  topUI: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  exitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arStatus: {
    flex: 1,
    alignItems: 'center',
  },
  arIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 5,
  },
  arText: {
    color: '#00FF88',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  speedIndicator: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
  },
  speedText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  headerSpacer: {
    width: 40,
  },
  bottomUI: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  instructionCard: {
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  instructionGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
    borderRadius: 15,
  },
  instructionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructionText: {
    marginLeft: 15,
    flex: 1,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  instructionDistance: {
    fontSize: 14,
    color: '#00FF88',
  },
  arControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  compass: {
    position: 'absolute',
    top: 100,
    right: 20,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compassRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compassNorth: {
    position: 'absolute',
    top: 5,
  },
  compassText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  compassCenter: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FF88',
  },
  betaBadge: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  betaText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default ARNavigationScreen;
