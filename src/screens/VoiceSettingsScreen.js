import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';

// Import services
import NLPVoiceService from '../services/NLPVoiceService';
import { useSafety } from '../context/SafetyContext';
import { useVoice } from '../context/VoiceContext';

const VoiceSettingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { shouldBlockInteraction } = useSafety();
  const { speak } = useVoice();

  const [voiceSettings, setVoiceSettings] = useState({
    rate: 0.5,
    pitch: 1.0,
    volume: 1.0,
  });
  const [currentLanguage, setCurrentLanguage] = useState('en-US');
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [announcementDistances, setAnnouncementDistances] = useState([1000, 500, 200]);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showDistanceModal, setShowDistanceModal] = useState(false);

  const [obstacleAnnouncements, setObstacleAnnouncements] = useState({
    speedCameras: true,
    policeSightings: true,
    railwayCrossings: true,
    tollBooths: true,
    construction: true,
    trafficCameras: true,
  });

  useEffect(() => {
    loadVoiceSettings();
    loadAvailableOptions();
  }, []);

  const loadVoiceSettings = async () => {
    try {
      await NLPVoiceService.initialize();
      // Load current settings from service
      // This would be implemented in the service
    } catch (error) {
      console.error('Error loading voice settings:', error);
    }
  };

  const loadAvailableOptions = () => {
    try {
      const languages = NLPVoiceService.getAvailableLanguages();
      const voices = NLPVoiceService.getAvailableVoices();
      
      setAvailableLanguages(languages);
      setAvailableVoices(voices);
    } catch (error) {
      console.error('Error loading voice options:', error);
    }
  };

  const handleVoiceSettingChange = async (setting, value) => {
    if (shouldBlockInteraction()) {
      speak('Pull over safely to change voice settings');
      return;
    }

    const newSettings = { ...voiceSettings, [setting]: value };
    setVoiceSettings(newSettings);
    
    try {
      await NLPVoiceService.updateVoiceSettings({ [setting]: value });
    } catch (error) {
      console.error('Error updating voice setting:', error);
    }
  };

  const handleLanguageChange = async (language) => {
    if (shouldBlockInteraction()) {
      speak('Pull over safely to change language');
      return;
    }

    setCurrentLanguage(language);
    setShowLanguageModal(false);
    
    try {
      await NLPVoiceService.updateLanguage(language);
      speak('Language updated');
      
      // Reload available voices for new language
      const voices = NLPVoiceService.getAvailableVoices();
      setAvailableVoices(voices);
    } catch (error) {
      console.error('Error updating language:', error);
      Alert.alert('Error', 'Failed to update language');
    }
  };

  const handleDistanceUpdate = async (distances) => {
    setAnnouncementDistances(distances);
    setShowDistanceModal(false);
    
    try {
      await NLPVoiceService.updateAnnouncementDistances(distances);
      speak('Announcement distances updated');
    } catch (error) {
      console.error('Error updating distances:', error);
    }
  };

  const handleObstacleToggle = (obstacleType, enabled) => {
    if (shouldBlockInteraction()) {
      speak('Pull over safely to change announcement settings');
      return;
    }

    setObstacleAnnouncements(prev => ({
      ...prev,
      [obstacleType]: enabled
    }));
    
    speak(`${obstacleType.replace(/([A-Z])/g, ' $1').toLowerCase()} announcements ${enabled ? 'enabled' : 'disabled'}`);
  };

  const testVoiceAnnouncement = async () => {
    const testPhrases = [
      'Speed camera ahead in 500 meters',
      'Police reported 1 kilometer ahead',
      'Railway crossing in 200 meters',
      'In 300 meters, turn left onto Main Street'
    ];
    
    const randomPhrase = testPhrases[Math.floor(Math.random() * testPhrases.length)];
    await NLPVoiceService.speak(randomPhrase, 'high');
  };

  const renderLanguageModal = () => (
    <Modal
      visible={showLanguageModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowLanguageModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Language</Text>
          
          <ScrollView style={styles.optionsList}>
            {availableLanguages.map((language) => (
              <TouchableOpacity
                key={language}
                style={[
                  styles.optionItem,
                  currentLanguage === language && styles.selectedOption
                ]}
                onPress={() => handleLanguageChange(language)}
              >
                <Text style={[
                  styles.optionText,
                  currentLanguage === language && styles.selectedOptionText
                ]}>
                  {language}
                </Text>
                {currentLanguage === language && (
                  <Icon name="check" size={20} color="#00FF88" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowLanguageModal(false)}
          >
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderDistanceModal = () => (
    <Modal
      visible={showDistanceModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDistanceModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Announcement Distances</Text>
          
          <Text style={styles.modalDescription}>
            Configure at what distances you want to be warned about obstacles
          </Text>
          
          <View style={styles.distanceOptions}>
            {[
              { label: '2 km', value: 2000 },
              { label: '1 km', value: 1000 },
              { label: '500 m', value: 500 },
              { label: '200 m', value: 200 },
              { label: '100 m', value: 100 },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.distanceOption,
                  announcementDistances.includes(option.value) && styles.selectedDistance
                ]}
                onPress={() => {
                  const newDistances = announcementDistances.includes(option.value)
                    ? announcementDistances.filter(d => d !== option.value)
                    : [...announcementDistances, option.value].sort((a, b) => b - a);
                  setAnnouncementDistances(newDistances);
                }}
              >
                <Text style={[
                  styles.distanceOptionText,
                  announcementDistances.includes(option.value) && styles.selectedDistanceText
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowDistanceModal(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={() => handleDistanceUpdate(announcementDistances)}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient
        colors={['#1a1a1a', '#000']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#00FF88" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Voice Settings</Text>
        
        <TouchableOpacity
          style={styles.testButton}
          onPress={testVoiceAnnouncement}
        >
          <Icon name="volume-up" size={24} color="#FFA500" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Language & Voice */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Language & Voice</Text>
          
          <TouchableOpacity
            style={styles.settingCard}
            onPress={() => setShowLanguageModal(true)}
          >
            <LinearGradient
              colors={['rgba(0, 122, 255, 0.2)', 'rgba(0, 122, 255, 0.1)']}
              style={styles.settingGradient}
            >
              <Icon name="language" size={24} color="#007AFF" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Language</Text>
                <Text style={styles.settingValue}>{currentLanguage}</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#666" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Voice Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice Controls</Text>
          
          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <Text style={styles.sliderTitle}>Speech Rate</Text>
              <Text style={styles.sliderValue}>{voiceSettings.rate.toFixed(1)}x</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0.1}
              maximumValue={1.0}
              step={0.1}
              value={voiceSettings.rate}
              onValueChange={(value) => handleVoiceSettingChange('rate', value)}
              minimumTrackTintColor="#00FF88"
              maximumTrackTintColor="#333"
              thumbStyle={{ backgroundColor: '#00FF88' }}
            />
          </View>

          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <Text style={styles.sliderTitle}>Pitch</Text>
              <Text style={styles.sliderValue}>{voiceSettings.pitch.toFixed(1)}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0.5}
              maximumValue={2.0}
              step={0.1}
              value={voiceSettings.pitch}
              onValueChange={(value) => handleVoiceSettingChange('pitch', value)}
              minimumTrackTintColor="#00FF88"
              maximumTrackTintColor="#333"
              thumbStyle={{ backgroundColor: '#00FF88' }}
            />
          </View>
        </View>

        {/* Announcement Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Announcement Settings</Text>
          
          <TouchableOpacity
            style={styles.settingCard}
            onPress={() => setShowDistanceModal(true)}
          >
            <LinearGradient
              colors={['rgba(255, 165, 0, 0.2)', 'rgba(255, 165, 0, 0.1)']}
              style={styles.settingGradient}
            >
              <Icon name="straighten" size={24} color="#FFA500" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Alert Distances</Text>
                <Text style={styles.settingValue}>
                  {announcementDistances.map(d => d >= 1000 ? `${d/1000}km` : `${d}m`).join(', ')}
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color="#666" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Obstacle Announcements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Obstacle Announcements</Text>
          
          {Object.entries(obstacleAnnouncements).map(([key, enabled]) => (
            <View key={key} style={styles.toggleItem}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleTitle}>
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </Text>
                <Text style={styles.toggleDescription}>
                  Announce {key.replace(/([A-Z])/g, ' $1').toLowerCase()} ahead
                </Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={(value) => handleObstacleToggle(key, value)}
                trackColor={{ false: '#333', true: '#00FF88' }}
                thumbColor={enabled ? '#fff' : '#666'}
              />
            </View>
          ))}
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Icon name="info-outline" size={20} color="#00FF88" />
          <Text style={styles.helpText}>
            Voice announcements use natural language processing to provide varied, 
            context-aware warnings. Adjust distances and enable/disable specific 
            obstacle types based on your preferences.
          </Text>
        </View>
      </ScrollView>

      {/* Modals */}
      {renderLanguageModal()}
      {renderDistanceModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  testButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  settingCard: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 10,
  },
  settingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
  },
  settingInfo: {
    flex: 1,
    marginLeft: 15,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 14,
    color: '#999',
  },
  sliderContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sliderTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00FF88',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  toggleInfo: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 12,
    color: '#999',
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  helpText: {
    flex: 1,
    fontSize: 14,
    color: '#ccc',
    marginLeft: 10,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 25,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalDescription: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 10,
    marginBottom: 5,
    backgroundColor: '#333',
  },
  selectedOption: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
  },
  optionText: {
    fontSize: 16,
    color: '#fff',
  },
  selectedOptionText: {
    color: '#00FF88',
    fontWeight: '600',
  },
  distanceOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  distanceOption: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#555',
  },
  selectedDistance: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    borderColor: '#00FF88',
  },
  distanceOptionText: {
    fontSize: 14,
    color: '#fff',
  },
  selectedDistanceText: {
    color: '#00FF88',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#333',
  },
  saveButton: {
    backgroundColor: '#00FF88',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCloseButton: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 15,
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VoiceSettingsScreen;
