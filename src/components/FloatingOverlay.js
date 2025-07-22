import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanGestureHandler,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafety } from '../context/SafetyContext';
import { useLocation } from '../context/LocationContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const FloatingOverlay = ({ 
  visible = true, 
  minimized = false, 
  onToggleMinimize,
  onClose,
  currentInstruction = null,
  nextTurn = null,
  eta = null,
}) => {
  const { currentSpeed, isDriving } = useSafety();
  const { currentLocation } = useLocation();
  
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isMinimized, setIsMinimized] = useState(minimized);
  const [isDragging, setIsDragging] = useState(false);
  
  const translateX = useRef(new Animated.Value(position.x)).current;
  const translateY = useRef(new Animated.Value(position.y)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacityAnim, {
        toValue: 0.9,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    setIsMinimized(minimized);
    Animated.timing(scaleAnim, {
      toValue: minimized ? 0.7 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [minimized]);

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: false }
  );

  const handleGestureStateChange = (event) => {
    const { state, translationX, translationY } = event.nativeEvent;
    
    if (state === 2) { // BEGAN
      setIsDragging(true);
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    } else if (state === 5) { // END
      setIsDragging(false);
      
      // Calculate new position
      let newX = position.x + translationX;
      let newY = position.y + translationY;
      
      // Keep within screen bounds
      const overlayWidth = isMinimized ? 80 : 160;
      const overlayHeight = isMinimized ? 80 : 120;
      
      newX = Math.max(0, Math.min(screenWidth - overlayWidth, newX));
      newY = Math.max(0, Math.min(screenHeight - overlayHeight, newY));
      
      // Snap to edges if close
      if (newX < 40) newX = 10;
      if (newX > screenWidth - overlayWidth - 40) newX = screenWidth - overlayWidth - 10;
      
      setPosition({ x: newX, y: newY });
      
      // Animate to final position
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: newX,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(translateY, {
          toValue: newY,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(scaleAnim, {
          toValue: isMinimized ? 0.7 : 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Reset translation values
      translateX.setOffset(newX);
      translateY.setOffset(newY);
      translateX.setValue(0);
      translateY.setValue(0);
    }
  };

  const handleToggleMinimize = () => {
    const newMinimized = !isMinimized;
    setIsMinimized(newMinimized);
    onToggleMinimize?.(newMinimized);
  };

  const formatSpeed = (speed) => {
    return `${Math.round(speed)} mph`;
  };

  const formatETA = (eta) => {
    if (!eta) return '--';
    const minutes = Math.round(eta / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getDirectionIcon = (direction) => {
    switch (direction?.toLowerCase()) {
      case 'left': return 'turn-left';
      case 'right': return 'turn-right';
      case 'straight': return 'straight';
      case 'u-turn': return 'u-turn-left';
      default: return 'navigation';
    }
  };

  const renderMinimizedView = () => (
    <View style={styles.minimizedContainer}>
      <View style={styles.speedIndicator}>
        <Text style={styles.speedText}>{formatSpeed(currentSpeed)}</Text>
      </View>
      
      {nextTurn && (
        <View style={styles.turnIndicator}>
          <Icon 
            name={getDirectionIcon(nextTurn.direction)} 
            size={16} 
            color="#00FF88" 
          />
          <Text style={styles.distanceText}>
            {nextTurn.distance < 1000 
              ? `${Math.round(nextTurn.distance)}m`
              : `${(nextTurn.distance / 1000).toFixed(1)}km`
            }
          </Text>
        </View>
      )}
      
      <View style={styles.statusIndicator}>
        <View style={[
          styles.statusDot, 
          { backgroundColor: isDriving ? '#FF6B6B' : '#00FF88' }
        ]} />
      </View>
    </View>
  );

  const renderExpandedView = () => (
    <View style={styles.expandedContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.speedContainer}>
          <Text style={styles.speedValue}>{formatSpeed(currentSpeed)}</Text>
          <Text style={styles.speedLabel}>Speed</Text>
        </View>
        
        <View style={styles.etaContainer}>
          <Text style={styles.etaValue}>{formatETA(eta)}</Text>
          <Text style={styles.etaLabel}>ETA</Text>
        </View>
      </View>

      {/* Navigation instruction */}
      {currentInstruction && (
        <View style={styles.instructionContainer}>
          <Icon 
            name={getDirectionIcon(nextTurn?.direction)} 
            size={20} 
            color="#00FF88" 
          />
          <Text style={styles.instructionText} numberOfLines={2}>
            {currentInstruction}
          </Text>
        </View>
      )}

      {/* Status indicator */}
      <View style={styles.statusBar}>
        <View style={[
          styles.statusIndicator,
          { backgroundColor: isDriving ? '#FF6B6B' : '#00FF88' }
        ]}>
          <Text style={styles.statusText}>
            {isDriving ? 'DRIVING' : 'SAFE'}
          </Text>
        </View>
      </View>
    </View>
  );

  if (!visible) return null;

  return (
    <PanGestureHandler
      onGestureEvent={handleGestureEvent}
      onHandlerStateChange={handleGestureStateChange}
      enabled={Platform.OS === 'android'} // Only enable on Android
    >
      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              { translateX: translateX },
              { translateY: translateY },
              { scale: scaleAnim },
            ],
            opacity: opacityAnim,
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.7)']}
          style={[
            styles.overlay,
            isMinimized ? styles.minimizedOverlay : styles.expandedOverlay,
          ]}
        >
          {isMinimized ? renderMinimizedView() : renderExpandedView()}
          
          {/* Control buttons */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleToggleMinimize}
            >
              <Icon 
                name={isMinimized ? 'expand-more' : 'expand-less'} 
                size={16} 
                color="#00FF88" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.controlButton}
              onPress={onClose}
            >
              <Icon name="close" size={16} color="#FF6B6B" />
            </TouchableOpacity>
          </View>

          {/* Drag indicator */}
          {isDragging && (
            <View style={styles.dragIndicator}>
              <Icon name="drag-indicator" size={20} color="#666" />
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
  },
  overlay: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
    overflow: 'hidden',
  },
  minimizedOverlay: {
    width: 80,
    height: 80,
    padding: 8,
  },
  expandedOverlay: {
    width: 160,
    minHeight: 120,
    padding: 12,
  },
  minimizedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  speedContainer: {
    alignItems: 'center',
  },
  speedValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00FF88',
  },
  speedLabel: {
    fontSize: 8,
    color: '#999',
  },
  etaContainer: {
    alignItems: 'center',
  },
  etaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFA500',
  },
  etaLabel: {
    fontSize: 8,
    color: '#999',
  },
  speedIndicator: {
    alignItems: 'center',
    marginBottom: 4,
  },
  speedText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#00FF88',
  },
  turnIndicator: {
    alignItems: 'center',
    marginBottom: 4,
  },
  distanceText: {
    fontSize: 8,
    color: '#00FF88',
    marginTop: 2,
  },
  instructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  instructionText: {
    fontSize: 10,
    color: '#FFF',
    marginLeft: 6,
    flex: 1,
  },
  statusBar: {
    alignItems: 'center',
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#000',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  controls: {
    position: 'absolute',
    top: -8,
    right: -8,
    flexDirection: 'row',
  },
  controlButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  dragIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -10 }, { translateY: -10 }],
    opacity: 0.5,
  },
});

export default FloatingOverlay;
