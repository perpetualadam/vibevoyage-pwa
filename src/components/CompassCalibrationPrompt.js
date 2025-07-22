import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import CompassNavigationService from '../services/CompassNavigationService';

const { width } = Dimensions.get('window');

const CompassCalibrationPrompt = ({ 
  visible, 
  onClose, 
  onCalibrationComplete,
  autoShow = true 
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [rotateAnim] = useState(new Animated.Value(0));
  const [calibrationStep, setCalibrationStep] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);

  useEffect(() => {
    if (visible) {
      showPrompt();
    } else {
      hidePrompt();
    }
  }, [visible]);

  useEffect(() => {
    // Listen for compass calibration updates
    const unsubscribe = CompassNavigationService.addListener((event, data) => {
      if (event === 'calibrationComplete') {
        handleCalibrationSuccess();
      }
    });

    return unsubscribe;
  }, []);

  const showPrompt = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    startRotationAnimation();
  };

  const hidePrompt = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startRotationAnimation = () => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  };

  const handleStartCalibration = () => {
    setIsCalibrating(true);
    setCalibrationStep(1);
    
    // Simulate calibration steps
    setTimeout(() => setCalibrationStep(2), 2000);
    setTimeout(() => setCalibrationStep(3), 4000);
    setTimeout(() => {
      CompassNavigationService.markCalibrationComplete();
    }, 6000);
  };

  const handleCalibrationSuccess = () => {
    setIsCalibrating(false);
    setCalibrationStep(0);
    
    if (onCalibrationComplete) {
      onCalibrationComplete();
    }
    
    setTimeout(() => {
      if (onClose) onClose();
    }, 1500);
  };

  const handleSkip = () => {
    if (onClose) onClose();
  };

  const getCalibrationContent = () => {
    if (!isCalibrating) {
      return {
        icon: 'explore',
        title: 'Compass Calibration Needed',
        message: 'Your device compass needs calibration for accurate directional guidance.',
        instruction: 'Move your device in a figure-eight pattern to calibrate.',
        buttonText: 'Start Calibration',
        buttonAction: handleStartCalibration,
      };
    }

    switch (calibrationStep) {
      case 1:
        return {
          icon: 'rotate-right',
          title: 'Calibrating Compass',
          message: 'Move your device in a figure-eight pattern.',
          instruction: 'Keep moving your device smoothly in all directions.',
          buttonText: 'Calibrating...',
          buttonAction: null,
        };
      case 2:
        return {
          icon: 'sync',
          title: 'Almost Done',
          message: 'Continue the figure-eight motion.',
          instruction: 'A few more movements to complete calibration.',
          buttonText: 'Calibrating...',
          buttonAction: null,
        };
      case 3:
        return {
          icon: 'check-circle',
          title: 'Calibration Complete!',
          message: 'Your compass is now calibrated for accurate directions.',
          instruction: 'You will now receive precise directional guidance.',
          buttonText: 'Done',
          buttonAction: null,
        };
      default:
        return getCalibrationContent();
    }
  };

  if (!visible) return null;

  const content = getCalibrationContent();
  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleSkip}
    >
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: fadeAnim }
        ]}
      >
        <Animated.View
          style={[
            styles.promptContainer,
            {
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.95)', 'rgba(26,26,26,0.95)']}
            style={styles.promptContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <Animated.View
                style={[
                  styles.iconContainer,
                  content.icon === 'rotate-right' && {
                    transform: [{ rotate: rotation }]
                  }
                ]}
              >
                <Icon 
                  name={content.icon} 
                  size={48} 
                  color={calibrationStep === 3 ? '#00FF88' : '#2196F3'} 
                />
              </Animated.View>
              
              {!isCalibrating && (
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={handleSkip}
                  accessibilityLabel="Skip calibration"
                  accessibilityRole="button"
                >
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>{content.title}</Text>
              <Text style={styles.message}>{content.message}</Text>
              <Text style={styles.instruction}>{content.instruction}</Text>

              {/* Calibration Steps Indicator */}
              {isCalibrating && (
                <View style={styles.stepsContainer}>
                  {[1, 2, 3].map((step) => (
                    <View
                      key={step}
                      style={[
                        styles.stepIndicator,
                        calibrationStep >= step && styles.stepActive,
                        calibrationStep === step && styles.stepCurrent,
                      ]}
                    />
                  ))}
                </View>
              )}

              {/* Figure-8 Animation */}
              {isCalibrating && calibrationStep < 3 && (
                <View style={styles.animationContainer}>
                  <Animated.View
                    style={[
                      styles.phoneIcon,
                      {
                        transform: [{ rotate: rotation }]
                      }
                    ]}
                  >
                    <Icon name="smartphone" size={32} color="#2196F3" />
                  </Animated.View>
                  <Text style={styles.animationText}>
                    Move your device like this
                  </Text>
                </View>
              )}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              {content.buttonAction ? (
                <TouchableOpacity
                  style={styles.calibrateButton}
                  onPress={content.buttonAction}
                  accessibilityLabel={content.buttonText}
                  accessibilityRole="button"
                >
                  <Icon name="explore" size={20} color="#000" />
                  <Text style={styles.calibrateText}>{content.buttonText}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.statusContainer}>
                  <Text style={styles.statusText}>{content.buttonText}</Text>
                  {calibrationStep < 3 && (
                    <View style={styles.loadingIndicator}>
                      <Animated.View
                        style={[
                          styles.loadingDot,
                          {
                            transform: [{ rotate: rotation }]
                          }
                        ]}
                      />
                    </View>
                  )}
                </View>
              )}

              {!isCalibrating && (
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleSkip}
                  accessibilityLabel="Skip calibration"
                  accessibilityRole="button"
                >
                  <Text style={styles.skipText}>Skip for now</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Accuracy Indicator */}
            <View style={[
              styles.accuracyIndicator,
              { backgroundColor: calibrationStep === 3 ? '#00FF88' : '#2196F3' }
            ]} />
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  promptContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  promptContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#CCC',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  instruction: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  stepsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 16,
  },
  stepIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#333',
    marginHorizontal: 4,
  },
  stepActive: {
    backgroundColor: '#2196F3',
  },
  stepCurrent: {
    backgroundColor: '#00FF88',
  },
  animationContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  phoneIcon: {
    marginBottom: 8,
  },
  animationText: {
    fontSize: 12,
    color: '#999',
  },
  actions: {
    alignItems: 'center',
  },
  calibrateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    minWidth: 200,
  },
  calibrateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 16,
    color: '#CCC',
    marginBottom: 8,
  },
  loadingIndicator: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    color: '#666',
  },
  accuracyIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
});

export default CompassCalibrationPrompt;
