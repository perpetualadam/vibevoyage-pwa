import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { ProgressBar } from 'react-native-paper';

const ErrorRecoveryPrompt = ({ 
  visible, 
  onClose, 
  errorData,
  recoveryOptions = [],
  autoRecovery = false,
  showSystemHealth = true,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));
  const [recoveryProgress, setRecoveryProgress] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState(null);
  const [selectedRecoveryOption, setSelectedRecoveryOption] = useState(null);

  useEffect(() => {
    if (visible) {
      showPrompt();
      if (autoRecovery && recoveryOptions.length > 0) {
        setTimeout(() => {
          startAutoRecovery();
        }, 2000);
      }
    } else {
      hidePrompt();
    }
  }, [visible]);

  const showPrompt = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hidePrompt = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startAutoRecovery = async () => {
    if (recoveryOptions.length === 0) return;

    setIsRecovering(true);
    setRecoveryProgress(0);
    setRecoveryStep('Initializing recovery...');

    try {
      for (let i = 0; i < recoveryOptions.length; i++) {
        const option = recoveryOptions[i];
        setRecoveryStep(option.description || `Attempting ${option.name}...`);
        setRecoveryProgress((i / recoveryOptions.length) * 100);

        const success = await executeRecoveryOption(option);
        
        if (success) {
          setRecoveryProgress(100);
          setRecoveryStep('Recovery successful!');
          setRecoverySuccess(true);
          
          setTimeout(() => {
            if (onClose) onClose({ recovered: true, method: option.name });
          }, 2000);
          return;
        }

        // Wait between attempts
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // All recovery attempts failed
      setRecoveryProgress(100);
      setRecoveryStep('Recovery failed. Manual intervention required.');
      setRecoverySuccess(false);
      
    } catch (error) {
      setRecoveryStep('Recovery error occurred.');
      setRecoverySuccess(false);
    } finally {
      setIsRecovering(false);
    }
  };

  const startManualRecovery = async (option) => {
    setSelectedRecoveryOption(option);
    setIsRecovering(true);
    setRecoveryProgress(0);
    setRecoveryStep(option.description || `Attempting ${option.name}...`);

    try {
      const success = await executeRecoveryOption(option);
      setRecoveryProgress(100);
      
      if (success) {
        setRecoveryStep('Recovery successful!');
        setRecoverySuccess(true);
        
        setTimeout(() => {
          if (onClose) onClose({ recovered: true, method: option.name });
        }, 2000);
      } else {
        setRecoveryStep('Recovery failed. Try another option.');
        setRecoverySuccess(false);
      }
    } catch (error) {
      setRecoveryStep('Recovery error occurred.');
      setRecoverySuccess(false);
    } finally {
      setIsRecovering(false);
      setSelectedRecoveryOption(null);
    }
  };

  const executeRecoveryOption = async (option) => {
    // Simulate recovery process with progress updates
    const steps = option.steps || ['Preparing...', 'Executing...', 'Verifying...'];
    
    for (let i = 0; i < steps.length; i++) {
      setRecoveryStep(steps[i]);
      setRecoveryProgress(((i + 1) / steps.length) * 100);
      
      // Simulate work
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Simulate success/failure based on option priority
    return Math.random() > (1 - option.successRate || 0.7);
  };

  const getErrorSeverityColor = () => {
    if (!errorData) return '#2196F3';
    
    switch (errorData.severity) {
      case 'high': return '#FF6B6B';
      case 'medium': return '#FFA500';
      case 'low': return '#FFEB3B';
      default: return '#2196F3';
    }
  };

  const getErrorIcon = () => {
    if (!errorData) return 'error-outline';
    
    switch (errorData.type) {
      case 'internet_disabled': return 'wifi-off';
      case 'location_disabled': return 'location-off';
      case 'gps_weak': return 'gps-not-fixed';
      case 'compass_weak': return 'explore-off';
      case 'storage_full': return 'storage';
      case 'battery_low': return 'battery-alert';
      case 'service_unavailable': return 'cloud-off';
      default: return 'error-outline';
    }
  };

  const renderSystemHealth = () => {
    if (!showSystemHealth || !errorData?.systemHealth) return null;

    const healthComponents = Object.entries(errorData.systemHealth);
    
    return (
      <View style={styles.systemHealthSection}>
        <Text style={styles.systemHealthTitle}>System Health</Text>
        
        <View style={styles.healthGrid}>
          {healthComponents.map(([component, health]) => (
            <View key={component} style={styles.healthItem}>
              <Icon 
                name={getHealthIcon(component, health.status)} 
                size={16} 
                color={getHealthColor(health.status)} 
              />
              <Text style={styles.healthLabel}>
                {component.charAt(0).toUpperCase() + component.slice(1)}
              </Text>
              <Text style={[styles.healthStatus, { color: getHealthColor(health.status) }]}>
                {health.status}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const getHealthIcon = (component, status) => {
    const icons = {
      internet: status === 'good' ? 'wifi' : 'wifi-off',
      location: status === 'good' ? 'location-on' : 'location-off',
      gps: status === 'good' ? 'gps-fixed' : 'gps-not-fixed',
      compass: status === 'good' ? 'explore' : 'explore-off',
      storage: status === 'good' ? 'storage' : 'sd-storage',
      battery: status === 'good' ? 'battery-full' : 'battery-alert',
    };
    return icons[component] || 'help-outline';
  };

  const getHealthColor = (status) => {
    switch (status) {
      case 'good': return '#00FF88';
      case 'fair': return '#FFA500';
      case 'poor': return '#FF6B6B';
      case 'error': return '#F44336';
      default: return '#666';
    }
  };

  const renderRecoveryOptions = () => {
    if (isRecovering || recoveryOptions.length === 0) return null;

    return (
      <View style={styles.recoveryOptionsSection}>
        <Text style={styles.recoveryOptionsTitle}>Recovery Options</Text>
        
        {recoveryOptions.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.recoveryOption,
              option.recommended && styles.recommendedOption,
            ]}
            onPress={() => startManualRecovery(option)}
            disabled={isRecovering}
          >
            <View style={styles.optionHeader}>
              <Icon 
                name={option.icon || 'build'} 
                size={20} 
                color={option.recommended ? '#00FF88' : '#2196F3'} 
              />
              <Text style={[
                styles.optionName,
                option.recommended && styles.recommendedOptionText,
              ]}>
                {option.name}
              </Text>
              {option.recommended && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedBadgeText}>RECOMMENDED</Text>
                </View>
              )}
            </View>
            
            <Text style={styles.optionDescription}>
              {option.description}
            </Text>
            
            <View style={styles.optionFooter}>
              <Text style={styles.optionSuccessRate}>
                Success Rate: {Math.round((option.successRate || 0.7) * 100)}%
              </Text>
              <Text style={styles.optionDuration}>
                ~{option.estimatedDuration || '30'}s
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderRecoveryProgress = () => {
    if (!isRecovering) return null;

    return (
      <View style={styles.recoveryProgressSection}>
        <Text style={styles.recoveryProgressTitle}>
          {selectedRecoveryOption ? 'Manual Recovery' : 'Auto Recovery'} in Progress
        </Text>
        
        <View style={styles.progressContainer}>
          <ProgressBar 
            progress={recoveryProgress / 100} 
            color="#00FF88"
            style={styles.progressBar}
          />
          <Text style={styles.progressText}>{Math.round(recoveryProgress)}%</Text>
        </View>
        
        <Text style={styles.recoveryStepText}>{recoveryStep}</Text>
        
        {recoverySuccess !== null && (
          <View style={[
            styles.recoveryResult,
            { backgroundColor: recoverySuccess ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 107, 107, 0.1)' }
          ]}>
            <Icon 
              name={recoverySuccess ? 'check-circle' : 'error'} 
              size={20} 
              color={recoverySuccess ? '#00FF88' : '#FF6B6B'} 
            />
            <Text style={[
              styles.recoveryResultText,
              { color: recoverySuccess ? '#00FF88' : '#FF6B6B' }
            ]}>
              {recoverySuccess ? 'Recovery Successful!' : 'Recovery Failed'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => onClose && onClose({ recovered: false })}
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
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.95)', 'rgba(26,26,26,0.95)']}
            style={styles.promptContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={[
                styles.iconContainer,
                { backgroundColor: `${getErrorSeverityColor()}20` }
              ]}>
                <Icon 
                  name={getErrorIcon()} 
                  size={32} 
                  color={getErrorSeverityColor()} 
                />
              </View>
              
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => onClose && onClose({ recovered: false })}
                disabled={isRecovering}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>
                {errorData?.type ? errorData.type.replace(/_/g, ' ').toUpperCase() : 'System Error'}
              </Text>
              
              <Text style={styles.message}>
                {errorData?.message || 'An error has occurred that requires attention.'}
              </Text>

              {renderSystemHealth()}
              {renderRecoveryProgress()}
              {renderRecoveryOptions()}
            </ScrollView>

            {/* Actions */}
            {!isRecovering && recoverySuccess === null && (
              <View style={styles.actions}>
                {autoRecovery && recoveryOptions.length > 0 && (
                  <TouchableOpacity
                    style={styles.autoRecoveryButton}
                    onPress={startAutoRecovery}
                  >
                    <Icon name="auto-fix-high" size={20} color="#000" />
                    <Text style={styles.autoRecoveryText}>Auto Recovery</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={styles.manualButton}
                  onPress={() => onClose && onClose({ recovered: false, manual: true })}
                >
                  <Text style={styles.manualText}>Manual Fix</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Severity Indicator */}
            <View style={[
              styles.severityIndicator,
              { backgroundColor: getErrorSeverityColor() }
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
    maxWidth: 450,
    maxHeight: '85%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  promptContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: 8,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#CCC',
    lineHeight: 24,
    marginBottom: 20,
  },
  systemHealthSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  systemHealthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 12,
  },
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  healthItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  healthLabel: {
    fontSize: 12,
    color: '#CCC',
    marginLeft: 6,
    flex: 1,
  },
  healthStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  recoveryProgressSection: {
    backgroundColor: 'rgba(0, 255, 136, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  recoveryProgressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00FF88',
    marginBottom: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressText: {
    fontSize: 14,
    color: '#00FF88',
    marginLeft: 12,
    fontWeight: '600',
  },
  recoveryStepText: {
    fontSize: 14,
    color: '#CCC',
    marginBottom: 8,
  },
  recoveryResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  recoveryResultText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  recoveryOptionsSection: {
    marginBottom: 20,
  },
  recoveryOptionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 12,
  },
  recoveryOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  recommendedOption: {
    borderColor: '#00FF88',
    backgroundColor: 'rgba(0, 255, 136, 0.05)',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
    flex: 1,
  },
  recommendedOptionText: {
    color: '#00FF88',
  },
  recommendedBadge: {
    backgroundColor: '#00FF88',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },
  optionDescription: {
    fontSize: 14,
    color: '#CCC',
    marginBottom: 8,
    lineHeight: 20,
  },
  optionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionSuccessRate: {
    fontSize: 12,
    color: '#999',
  },
  optionDuration: {
    fontSize: 12,
    color: '#999',
  },
  actions: {
    padding: 20,
    paddingTop: 10,
  },
  autoRecoveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00FF88',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  autoRecoveryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  manualButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  manualText: {
    fontSize: 14,
    color: '#666',
  },
  severityIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
});

export default ErrorRecoveryPrompt;
