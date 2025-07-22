import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import DeviceInfo from 'react-native-device-info';
import { useTranslation } from 'react-i18next';
import LegalComplianceService from '../services/LegalComplianceService';

const { width, height } = Dimensions.get('window');

const DisclaimerScreen = ({ onAccept }) => {
  const { t, i18n } = useTranslation();
  const [currentCountry, setCurrentCountry] = useState('US');
  const [isAccepted, setIsAccepted] = useState(false);
  const [legalDisclaimer, setLegalDisclaimer] = useState(null);
  const [showDetailedRegulations, setShowDetailedRegulations] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);

  useEffect(() => {
    initializeLegalCompliance();
  }, []);

  const initializeLegalCompliance = async () => {
    try {
      await LegalComplianceService.initialize();

      // Listen for country changes
      const unsubscribe = LegalComplianceService.addListener((event, data) => {
        if (event === 'countryChanged') {
          setCurrentCountry(data.country);
          setLegalDisclaimer(data.disclaimer);
        }
      });

      // Get current disclaimer
      const disclaimer = LegalComplianceService.getCurrentDisclaimer();
      setLegalDisclaimer(disclaimer);
      setCurrentCountry(LegalComplianceService.currentCountry);

      return unsubscribe;
    } catch (error) {
      console.error('Error initializing legal compliance:', error);
      // Fallback to basic detection
      detectCountry();
    }
  };

  const detectCountry = async () => {
    try {
      const country = await DeviceInfo.getDeviceCountry();
      setCurrentCountry(country.toUpperCase());

      // Get disclaimer for detected country
      const disclaimer = LegalComplianceService.getRegulationsForCountry(country.toUpperCase());
      setLegalDisclaimer(disclaimer);
    } catch (error) {
      console.warn('Could not detect country:', error);
      // Use default disclaimer
      const disclaimer = LegalComplianceService.getRegulationsForCountry('DEFAULT');
      setLegalDisclaimer(disclaimer);
    }
  };

  const getCountrySpecificDisclaimer = () => {
    const disclaimers = {
      US: {
        title: 'Safety First - US Legal Notice',
        regulation: 'Federal Motor Vehicle Safety Standards',
        warning: 'It is illegal in most US states to use a handheld mobile phone while driving.',
        details: [
          'Use only hands-free voice commands while driving',
          'Pull over safely to interact with the screen',
          'Driver is responsible for safe operation',
          'App is for navigation assistance only'
        ]
      },
      GB: {
        title: 'Safety First - UK Legal Notice',
        regulation: 'Road Traffic Act 1988',
        warning: 'It is illegal to use a handheld mobile phone while driving in the UK.',
        details: [
          'Use only hands-free voice commands while driving',
          'Pull over safely to interact with the screen',
          'Driver is responsible for safe operation',
          'App is for navigation assistance only'
        ]
      },
      CA: {
        title: 'Safety First - Canada Legal Notice',
        regulation: 'Provincial Motor Vehicle Acts',
        warning: 'Handheld device use while driving is prohibited across Canada.',
        details: [
          'Use only hands-free voice commands while driving',
          'Pull over safely to interact with the screen',
          'Driver is responsible for safe operation',
          'App is for navigation assistance only'
        ]
      },
      AU: {
        title: 'Safety First - Australia Legal Notice',
        regulation: 'Australian Road Rules',
        warning: 'Using a handheld mobile phone while driving is illegal in Australia.',
        details: [
          'Use only hands-free voice commands while driving',
          'Pull over safely to interact with the screen',
          'Driver is responsible for safe operation',
          'App is for navigation assistance only'
        ]
      },
      NG: {
        title: 'Safety First - Nigeria Legal Notice',
        regulation: 'Federal Road Safety Corps (FRSC) Regulations',
        warning: 'Handheld phone use while driving is prohibited in Nigeria.',
        details: [
          'Use only hands-free voice commands while driving',
          'Pull over safely to interact with the screen',
          'Driver is responsible for safe operation',
          'App is for navigation assistance only'
        ]
      },
      MX: {
        title: 'Safety First - Mexico Legal Notice',
        regulation: 'Reglamento de Tránsito',
        warning: 'El uso de teléfonos móviles mientras se conduce está prohibido en México.',
        details: [
          'Use only hands-free voice commands while driving',
          'Pull over safely to interact with the screen',
          'Driver is responsible for safe operation',
          'App is for navigation assistance only'
        ]
      },
      ID: {
        title: 'Safety First - Indonesia Legal Notice',
        regulation: 'Indonesian Traffic Law',
        warning: 'Penggunaan ponsel saat mengemudi dilarang di Indonesia.',
        details: [
          'Use only hands-free voice commands while driving',
          'Pull over safely to interact with the screen',
          'Driver is responsible for safe operation',
          'App is for navigation assistance only'
        ]
      },
      AE: {
        title: 'Safety First - UAE Legal Notice',
        regulation: 'UAE Federal Traffic Law',
        warning: 'استخدام الهاتف المحمول أثناء القيادة محظور في دولة الإمارات العربية المتحدة.',
        details: [
          'Use only hands-free voice commands while driving',
          'Pull over safely to interact with the screen',
          'Driver is responsible for safe operation',
          'App is for navigation assistance only'
        ]
      },
      DEFAULT: {
        title: 'Safety First - Legal Notice',
        regulation: 'Local Traffic Regulations',
        warning: 'It is illegal to use a handheld mobile phone while driving in most countries.',
        details: [
          'Use only hands-free voice commands while driving',
          'Pull over safely to interact with the screen',
          'Driver is responsible for safe operation',
          'App is for navigation assistance only'
        ]
      }
    };

    return disclaimers[currentCountry] || disclaimers.DEFAULT;
  };

  const handleAccept = async () => {
    if (!isAccepted) {
      Alert.alert(
        'Confirmation Required',
        'Please confirm you understand and agree to use VibeVoyage safely and legally, following all local traffic laws.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'I Understand', onPress: () => setIsAccepted(true) }
        ]
      );
      return;
    }

    try {
      // Update compliance settings
      await LegalComplianceService.updateComplianceSettings({
        showDisclaimerOnLaunch: reminderEnabled,
      });

      // Acknowledge disclaimer
      await LegalComplianceService.acknowledgeDisclaimer();

      onAccept();
    } catch (error) {
      console.error('Error accepting disclaimer:', error);
      onAccept(); // Continue anyway
    }
  };

  const disclaimer = getCountrySpecificDisclaimer();

  return (
    <LinearGradient
      colors={['#000', '#1a1a1a', '#000']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Icon name="security" size={60} color="#00FF88" />
          <Text style={styles.title}>{disclaimer.title}</Text>
          <Text style={styles.subtitle}>VibeVoyage Navigation App</Text>
        </View>

        <View style={styles.warningBox}>
          <Icon name="warning" size={24} color="#FF6B6B" />
          <Text style={styles.warningText}>{disclaimer.warning}</Text>
        </View>

        <View style={styles.regulationBox}>
          <Text style={styles.regulationTitle}>Legal Authority:</Text>
          <Text style={styles.regulationText}>{disclaimer.regulation}</Text>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>Safety Requirements:</Text>
          {disclaimer.details.map((detail, index) => (
            <View key={index} style={styles.detailItem}>
              <Icon name="check-circle" size={16} color="#00FF88" />
              <Text style={styles.detailText}>{detail}</Text>
            </View>
          ))}
        </View>

        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Safety Features:</Text>
          <View style={styles.featureItem}>
            <Icon name="speed" size={20} color="#00FF88" />
            <Text style={styles.featureText}>GPS Speed Detection (>5 mph lock)</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="mic" size={20} color="#00FF88" />
            <Text style={styles.featureText}>Hands-free Voice Commands</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="eco" size={20} color="#00FF88" />
            <Text style={styles.featureText}>Eco-friendly Route Options</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="group" size={20} color="#00FF88" />
            <Text style={styles.featureText}>Community Safety Reports</Text>
          </View>
        </View>

        {/* Enhanced Legal Compliance Section */}
        {legalDisclaimer && (
          <View style={styles.legalComplianceSection}>
            <TouchableOpacity
              style={styles.regulationsToggle}
              onPress={() => setShowDetailedRegulations(!showDetailedRegulations)}
            >
              <Text style={styles.regulationsToggleText}>
                {showDetailedRegulations ? 'Hide' : 'Show'} Country-Specific Legal Requirements
              </Text>
              <Icon
                name={showDetailedRegulations ? 'expand-less' : 'expand-more'}
                size={24}
                color="#00FF88"
              />
            </TouchableOpacity>

            {showDetailedRegulations && (
              <View style={styles.regulationsContent}>
                <Text style={styles.regulationsCountry}>
                  {legalDisclaimer.country} - {legalDisclaimer.regulation}
                </Text>

                <Text style={styles.regulationsDisclaimer}>
                  {legalDisclaimer.mainDisclaimer}
                </Text>

                <Text style={styles.regulationsSubtitle}>Key Legal Requirements:</Text>
                {legalDisclaimer.keyRegulations.map((regulation, index) => (
                  <View key={index} style={styles.regulationItem}>
                    <Icon name="gavel" size={16} color="#00FF88" />
                    <Text style={styles.regulationText}>{regulation}</Text>
                  </View>
                ))}

                <View style={styles.penaltiesSection}>
                  <Text style={styles.penaltiesTitle}>Penalties for Violations:</Text>
                  <Text style={styles.penaltiesText}>{legalDisclaimer.penalties}</Text>
                </View>

                <View style={styles.emergencySection}>
                  <Text style={styles.emergencyTitle}>Emergency Contact:</Text>
                  <Text style={styles.emergencyNumber}>{legalDisclaimer.emergencyNumber}</Text>
                </View>

                <Text style={styles.additionalInfo}>{legalDisclaimer.additionalInfo}</Text>
              </View>
            )}
          </View>
        )}

        {/* Reminder Settings */}
        <View style={styles.reminderSection}>
          <View style={styles.reminderToggle}>
            <Text style={styles.reminderText}>Show legal reminders periodically</Text>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ false: '#333', true: '#00FF88' }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.checkbox, isAccepted && styles.checkboxChecked]}
          onPress={() => setIsAccepted(!isAccepted)}
        >
          <Icon
            name={isAccepted ? "check-box" : "check-box-outline-blank"}
            size={24}
            color={isAccepted ? "#00FF88" : "#666"}
          />
          <Text style={styles.checkboxText}>
            I understand and agree to use VibeVoyage safely and legally
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.acceptButton, isAccepted && styles.acceptButtonActive]}
          onPress={handleAccept}
          disabled={!isAccepted}
        >
          <LinearGradient
            colors={isAccepted ? ['#00FF88', '#00CC6A'] : ['#333', '#333']}
            style={styles.buttonGradient}
          >
            <Text style={[styles.acceptButtonText, isAccepted && styles.acceptButtonTextActive]}>
              Start Safe Navigation
            </Text>
            <Icon
              name="arrow-forward"
              size={24}
              color={isAccepted ? "#000" : "#666"}
            />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 15,
  },
  subtitle: {
    fontSize: 16,
    color: '#00FF88',
    textAlign: 'center',
    marginTop: 5,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderColor: '#FF6B6B',
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  warningText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
  regulationBox: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderColor: '#00FF88',
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  regulationTitle: {
    color: '#00FF88',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  regulationText: {
    color: '#fff',
    fontSize: 14,
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  featuresContainer: {
    marginBottom: 30,
  },
  featuresTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 10,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    padding: 15,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  checkboxChecked: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  checkboxText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
    flex: 1,
  },
  acceptButton: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
  },
  acceptButtonActive: {
    elevation: 5,
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  acceptButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginRight: 10,
  },
  acceptButtonTextActive: {
    color: '#000',
  },
  // Enhanced Legal Compliance Styles
  legalComplianceSection: {
    marginVertical: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  regulationsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  regulationsToggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#00FF88',
    flex: 1,
  },
  regulationsContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  regulationsCountry: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  regulationsDisclaimer: {
    fontSize: 14,
    color: '#CCC',
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'justify',
  },
  regulationsSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00FF88',
    marginBottom: 12,
  },
  regulationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingLeft: 8,
  },
  regulationText: {
    fontSize: 13,
    color: '#CCC',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  penaltiesSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#2a1a1a',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  penaltiesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 6,
  },
  penaltiesText: {
    fontSize: 13,
    color: '#CCC',
    lineHeight: 18,
  },
  emergencySection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#1a2a1a',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#00FF88',
  },
  emergencyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00FF88',
    marginBottom: 6,
  },
  emergencyNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00FF88',
  },
  additionalInfo: {
    fontSize: 12,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  reminderSection: {
    marginVertical: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
  },
  reminderToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderText: {
    fontSize: 14,
    color: '#CCC',
    flex: 1,
  },
});

export default DisclaimerScreen;
