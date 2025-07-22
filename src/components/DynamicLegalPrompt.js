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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import LegalComplianceService from '../services/LegalComplianceService';
import RoadRegulationService from '../services/RoadRegulationService';

const DynamicLegalPrompt = ({ 
  visible, 
  onClose, 
  promptType = 'border_crossing', // 'border_crossing', 'navigation_start', 'reminder'
  fromCountry,
  toCountry,
  autoHide = false,
  autoHideDelay = 10000,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));
  const [currentRegulation, setCurrentRegulation] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (visible) {
      loadRegulationData();
      showPrompt();
      
      if (autoHide) {
        setTimeout(() => {
          hidePrompt();
        }, autoHideDelay);
      }
    } else {
      hidePrompt();
    }
  }, [visible, toCountry]);

  const loadRegulationData = async () => {
    try {
      await RoadRegulationService.initialize();
      
      const regulation = RoadRegulationService.getRegulationsForCountry(toCountry || 'DEFAULT');
      setCurrentRegulation(regulation);
    } catch (error) {
      console.error('Error loading regulation data:', error);
    }
  };

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
    ]).start(() => {
      if (onClose) onClose(acknowledged);
    });
  };

  const handleAcknowledge = async () => {
    setAcknowledged(true);
    
    try {
      await LegalComplianceService.acknowledgeDisclaimer();
    } catch (error) {
      console.error('Error acknowledging disclaimer:', error);
    }
    
    hidePrompt();
  };

  const getPromptConfig = () => {
    if (!currentRegulation) return null;

    switch (promptType) {
      case 'border_crossing':
        return {
          icon: 'flag',
          iconColor: '#00FF88',
          title: `Entering ${currentRegulation.country}`,
          subtitle: `Please review local traffic regulations`,
          message: `You are now entering ${currentRegulation.country}. Please be aware of the local traffic laws and regulations.`,
          showRegulations: true,
          urgency: 'high',
        };

      case 'navigation_start':
        return {
          icon: 'navigation',
          iconColor: '#2196F3',
          title: 'Navigation Started',
          subtitle: `${currentRegulation.country} Traffic Laws Apply`,
          message: `Navigation has started. Please ensure you comply with ${currentRegulation.country} traffic regulations during your journey.`,
          showRegulations: true,
          urgency: 'medium',
        };

      case 'reminder':
        return {
          icon: 'info-outline',
          iconColor: '#FF9800',
          title: 'Legal Reminder',
          subtitle: 'Safe and Legal Driving',
          message: 'Remember to drive safely and comply with all local traffic laws. This is a periodic reminder to ensure your safety and legal compliance.',
          showRegulations: false,
          urgency: 'low',
        };

      default:
        return {
          icon: 'gavel',
          iconColor: '#9C27B0',
          title: 'Legal Notice',
          subtitle: 'Traffic Law Compliance',
          message: 'Please review and comply with local traffic regulations.',
          showRegulations: true,
          urgency: 'medium',
        };
    }
  };

  const renderRegulationDetails = () => {
    if (!currentRegulation || !config.showRegulations) return null;

    return (
      <View style={styles.regulationDetails}>
        <Text style={styles.regulationTitle}>Key Regulations:</Text>
        
        {/* Phone Usage Rule */}
        <View style={styles.regulationItem}>
          <Icon name="phone-android" size={20} color="#FF6B6B" />
          <Text style={styles.regulationText}>{currentRegulation.phoneRule}</Text>
        </View>

        {/* Speed Limits */}
        <View style={styles.regulationItem}>
          <Icon name="speed" size={20} color="#FFA500" />
          <Text style={styles.regulationText}>
            Speed Limits: Urban {currentRegulation.speedLimits.urban} km/h, 
            Rural {currentRegulation.speedLimits.rural} km/h, 
            Highway {currentRegulation.speedLimits.highway} km/h
          </Text>
        </View>

        {/* Seat Belt */}
        {currentRegulation.seatBeltMandatory && (
          <View style={styles.regulationItem}>
            <Icon name="airline-seat-legroom-normal" size={20} color="#00FF88" />
            <Text style={styles.regulationText}>Seat belt use is mandatory for all occupants</Text>
          </View>
        )}

        {/* Alcohol Limit */}
        <View style={styles.regulationItem}>
          <Icon name="local-bar" size={20} color="#9C27B0" />
          <Text style={styles.regulationText}>
            Blood alcohol limit: {currentRegulation.alcoholLimit}‰
            {currentRegulation.alcoholLimit === 0.0 && ' (Zero tolerance)'}
          </Text>
        </View>

        {/* Emergency Number */}
        <View style={styles.emergencyInfo}>
          <Icon name="emergency" size={20} color="#FF6B6B" />
          <Text style={styles.emergencyText}>
            Emergency: {currentRegulation.emergencyNumber}
          </Text>
        </View>
      </View>
    );
  };

  const renderCountryComparison = () => {
    if (!showComparison || !fromCountry || !toCountry) return null;

    const fromRegulation = RoadRegulationService.getRegulationsForCountry(fromCountry);
    const toRegulation = currentRegulation;

    return (
      <View style={styles.comparisonSection}>
        <Text style={styles.comparisonTitle}>Regulation Changes:</Text>
        
        <View style={styles.comparisonRow}>
          <View style={styles.comparisonColumn}>
            <Text style={styles.comparisonHeader}>{fromRegulation.country}</Text>
            <Text style={styles.comparisonValue}>
              Urban: {fromRegulation.speedLimits.urban} km/h
            </Text>
          </View>
          <Icon name="arrow-forward" size={20} color="#00FF88" />
          <View style={styles.comparisonColumn}>
            <Text style={styles.comparisonHeader}>{toRegulation.country}</Text>
            <Text style={styles.comparisonValue}>
              Urban: {toRegulation.speedLimits.urban} km/h
            </Text>
          </View>
        </View>

        <View style={styles.comparisonRow}>
          <View style={styles.comparisonColumn}>
            <Text style={styles.comparisonValue}>
              Alcohol: {fromRegulation.alcoholLimit}‰
            </Text>
          </View>
          <Icon name="arrow-forward" size={20} color="#00FF88" />
          <View style={styles.comparisonColumn}>
            <Text style={styles.comparisonValue}>
              Alcohol: {toRegulation.alcoholLimit}‰
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (!visible || !currentRegulation) return null;

  const config = getPromptConfig();
  if (!config) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={hidePrompt}
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
              <View style={[styles.iconContainer, { backgroundColor: `${config.iconColor}20` }]}>
                <Icon 
                  name={config.icon} 
                  size={32} 
                  color={config.iconColor} 
                />
              </View>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={hidePrompt}
                accessibilityLabel="Close legal prompt"
                accessibilityRole="button"
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>{config.title}</Text>
              <Text style={styles.subtitle}>{config.subtitle}</Text>
              <Text style={styles.message}>{config.message}</Text>

              {renderRegulationDetails()}

              {fromCountry && toCountry && (
                <TouchableOpacity
                  style={styles.comparisonToggle}
                  onPress={() => setShowComparison(!showComparison)}
                >
                  <Text style={styles.comparisonToggleText}>
                    {showComparison ? 'Hide' : 'Show'} Regulation Changes
                  </Text>
                  <Icon 
                    name={showComparison ? 'expand-less' : 'expand-more'} 
                    size={20} 
                    color="#00FF88" 
                  />
                </TouchableOpacity>
              )}

              {renderCountryComparison()}
            </ScrollView>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.acknowledgeButton}
                onPress={handleAcknowledge}
                accessibilityLabel="Acknowledge legal requirements"
                accessibilityRole="button"
              >
                <Icon name="check-circle" size={20} color="#000" />
                <Text style={styles.acknowledgeText}>I Understand</Text>
              </TouchableOpacity>
            </View>

            {/* Urgency Indicator */}
            <View style={[
              styles.urgencyIndicator,
              { backgroundColor: config.urgency === 'high' ? '#FF6B6B' : config.urgency === 'medium' ? '#FFA500' : '#666' }
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
    maxHeight: '80%',
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
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#00FF88',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#CCC',
    lineHeight: 24,
    marginBottom: 20,
  },
  regulationDetails: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  regulationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 12,
  },
  regulationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  regulationText: {
    fontSize: 14,
    color: '#CCC',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  emergencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  emergencyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 8,
  },
  comparisonToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: 8,
    marginBottom: 12,
  },
  comparisonToggleText: {
    fontSize: 16,
    color: '#00FF88',
    fontWeight: '500',
  },
  comparisonSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 12,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  comparisonColumn: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00FF88',
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 13,
    color: '#CCC',
  },
  actions: {
    padding: 20,
    paddingTop: 10,
  },
  acknowledgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00FF88',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  acknowledgeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  urgencyIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
});

export default DynamicLegalPrompt;
