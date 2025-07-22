import React, { useEffect, useRef } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  Animated, 
  View 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

const VoiceButton = ({ isListening, onPress, disabled = false }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isListening) {
      // Start pulsing animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      return () => pulseAnimation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening, pulseAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const getButtonState = () => {
    if (disabled) {
      return {
        colors: ['#333', '#222'],
        iconColor: '#666',
        text: 'Voice Disabled',
        textColor: '#666'
      };
    }
    
    if (isListening) {
      return {
        colors: ['#FF6B6B', '#FF4444'],
        iconColor: '#FFF',
        text: 'Listening...',
        textColor: '#FFF'
      };
    }
    
    return {
      colors: ['#00FF88', '#00CC6A'],
      iconColor: '#000',
      text: 'Voice Command',
      textColor: '#000'
    };
  };

  const buttonState = getButtonState();

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={0.8}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <LinearGradient
          colors={buttonState.colors}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <Animated.View
              style={[
                styles.iconContainer,
                isListening && {
                  transform: [{ scale: pulseAnim }]
                }
              ]}
            >
              <Icon
                name={isListening ? "mic" : "mic-none"}
                size={24}
                color={buttonState.iconColor}
              />
            </Animated.View>
            
            <Text style={[styles.text, { color: buttonState.textColor }]}>
              {buttonState.text}
            </Text>
          </View>

          {/* Listening indicator rings */}
          {isListening && (
            <>
              <Animated.View
                style={[
                  styles.pulseRing,
                  styles.pulseRing1,
                  {
                    transform: [{ scale: pulseAnim }],
                    opacity: pulseAnim.interpolate({
                      inputRange: [1, 1.2],
                      outputRange: [0.6, 0],
                    }),
                  }
                ]}
              />
              <Animated.View
                style={[
                  styles.pulseRing,
                  styles.pulseRing2,
                  {
                    transform: [{ scale: pulseAnim }],
                    opacity: pulseAnim.interpolate({
                      inputRange: [1, 1.2],
                      outputRange: [0.4, 0],
                    }),
                  }
                ]}
              />
            </>
          )}
        </LinearGradient>
      </Animated.View>

      {/* Voice command hint */}
      {!isListening && !disabled && (
        <Text style={styles.hintText}>
          Say "VibeVoyage" + command
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  buttonContainer: {
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  gradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 120,
    position: 'relative',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFF',
    borderRadius: 35,
  },
  pulseRing1: {
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
  },
  pulseRing2: {
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
  },
});

export default VoiceButton;
