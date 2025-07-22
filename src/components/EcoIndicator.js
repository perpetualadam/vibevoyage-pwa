import React, { useState, useEffect } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  View,
  Animated 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

const EcoIndicator = ({ isActive, onToggle, carbonSaved = 0, disabled = false }) => {
  const [pulseAnim] = useState(new Animated.Value(1));
  const [leafAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (isActive) {
      // Start leaf animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(leafAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(leafAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Pulse animation for active state
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      leafAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [isActive, leafAnim, pulseAnim]);

  const getEcoStatus = () => {
    if (disabled) {
      return {
        colors: ['#333', '#222'],
        iconColor: '#666',
        textColor: '#666',
        text: 'Eco Disabled'
      };
    }

    if (isActive) {
      return {
        colors: ['#00FF88', '#00CC6A'],
        iconColor: '#000',
        textColor: '#000',
        text: 'Eco Route'
      };
    }

    return {
      colors: ['rgba(0,255,136,0.2)', 'rgba(0,255,136,0.1)'],
      iconColor: '#00FF88',
      textColor: '#00FF88',
      text: 'Standard'
    };
  };

  const ecoStatus = getEcoStatus();

  return (
    <TouchableOpacity
      onPress={onToggle}
      disabled={disabled}
      activeOpacity={0.8}
      style={styles.container}
    >
      <LinearGradient
        colors={ecoStatus.colors}
        style={styles.gradient}
      >
        <Animated.View
          style={[
            styles.content,
            {
              transform: [{ scale: pulseAnim }]
            }
          ]}
        >
          <View style={styles.iconContainer}>
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: leafAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              }}
            >
              <Icon
                name="eco"
                size={20}
                color={ecoStatus.iconColor}
              />
            </Animated.View>
            
            {/* Floating leaves animation */}
            {isActive && (
              <Animated.View
                style={[
                  styles.floatingLeaf,
                  {
                    opacity: leafAnim,
                    transform: [
                      {
                        translateY: leafAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -10],
                        }),
                      },
                      {
                        translateX: leafAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0, 5, -5],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Icon name="eco" size={12} color="#00FF88" />
              </Animated.View>
            )}
          </View>

          <View style={styles.textContainer}>
            <Text style={[styles.statusText, { color: ecoStatus.textColor }]}>
              {ecoStatus.text}
            </Text>
            
            {carbonSaved > 0 && (
              <Text style={styles.carbonText}>
                -{carbonSaved.toFixed(1)}kg CO₂
              </Text>
            )}
          </View>
        </Animated.View>

        {/* Eco mode indicator ring */}
        {isActive && (
          <View style={styles.activeRing} />
        )}
      </LinearGradient>

      {/* Eco benefits tooltip */}
      {isActive && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>
            🌱 Saving fuel & emissions
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  gradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginRight: 8,
  },
  floatingLeaf: {
    position: 'absolute',
    top: -5,
    left: 2,
  },
  textContainer: {
    alignItems: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  carbonText: {
    fontSize: 9,
    color: '#00FF88',
    fontWeight: '500',
    marginTop: 1,
  },
  activeRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#00FF88',
    opacity: 0.6,
  },
  tooltip: {
    position: 'absolute',
    top: -30,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 1000,
  },
  tooltipText: {
    color: '#00FF88',
    fontSize: 10,
    fontWeight: '500',
  },
});

export default EcoIndicator;
