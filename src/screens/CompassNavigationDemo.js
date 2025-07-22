import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

import PlatformNavigationBar from '../components/PlatformNavigationBar';
import DigitalCompass from '../components/DigitalCompass';
import CompassCalibrationPrompt from '../components/CompassCalibrationPrompt';
import CompassNavigationService from '../services/CompassNavigationService';
import NLPVoiceService from '../services/NLPVoiceService';

const CompassNavigationDemo = ({ navigation }) => {
  const [compassSettings, setCompassSettings] = useState({});
  const [currentHeading, setCurrentHeading] = useState(0);
  const [currentDirection, setCurrentDirection] = useState({ name: 'north', short: 'N' });
  const [calibrationVisible, setCalibrationVisible] = useState(false);
  const [calibrationAccuracy, setCalibrationAccuracy] = useState('high');
  const [demoInstructions, setDemoInstructions] = useState([]);

  useEffect(() => {
    initializeCompassDemo();
  }, []);

  const initializeCompassDemo = async () => {
    try {
      await CompassNavigationService.initialize();
      
      // Load current settings
      const settings = CompassNavigationService.getCompassSettings();
      setCompassSettings(settings);
      
      // Get current heading and direction
      const heading = CompassNavigationService.getCurrentHeading();
      const direction = CompassNavigationService.getCurrentDirection();
      setCurrentHeading(heading);
      setCurrentDirection(direction);
      
      // Listen for compass updates
      const unsubscribe = CompassNavigationService.addListener((event, data) => {
        if (event === 'headingChanged') {
          setCurrentHeading(data.heading);
          setCurrentDirection(CompassNavigationService.getCurrentDirection());
          setCalibrationAccuracy(data.accuracy);
        } else if (event === 'settingsUpdated') {
          setCompassSettings(data.settings);
        }
      });

      // Generate demo instructions
      generateDemoInstructions();

      return unsubscribe;
    } catch (error) {
      console.error('Error initializing compass demo:', error);
    }
  };

  const generateDemoInstructions = () => {
    const sampleInstructions = [
      { basic: 'Turn left onto Main Street', bearing: 270 },
      { basic: 'Continue straight for 1.2 miles', bearing: 0 },
      { basic: 'Turn right onto Oak Avenue', bearing: 90 },
      { basic: 'Merge onto Highway 101', bearing: 45 },
      { basic: 'Take exit 15 toward Downtown', bearing: 315 },
    ];

    const enhanced = sampleInstructions.map(instruction => ({
      ...instruction,
      withCompass: CompassNavigationService.formatNavigationWithCompass(
        instruction.basic,
        instruction.bearing,
        instruction.basic.includes('onto') ? instruction.basic.split('onto ')[1] : ''
      ),
    }));

    setDemoInstructions(enhanced);
  };

  const handleSettingToggle = async (setting, value) => {
    const updates = { [setting]: value };
    await CompassNavigationService.updateCompassSettings(updates);
    
    // Regenerate demo instructions
    generateDemoInstructions();
  };

  const testVoiceAnnouncement = async (instruction, bearing) => {
    try {
      await NLPVoiceService.announceNavigation(
        instruction.basic,
        500, // 500 meters
        instruction.basic.includes('onto') ? instruction.basic.split('onto ')[1] : '',
        bearing
      );
    } catch (error) {
      console.error('Error testing voice announcement:', error);
    }
  };

  const testPOIAnnouncement = async () => {
    try {
      await NLPVoiceService.announcePOI(
        'Shell Gas Station',
        300, // 300 meters
        90, // East
        'Fuel'
      );
    } catch (error) {
      console.error('Error testing POI announcement:', error);
    }
  };

  const testObstacleAnnouncement = async () => {
    try {
      await NLPVoiceService.announceObstacle(
        'Speed camera',
        800, // 800 meters
        { bearing: 45, severity: 'medium' }
      );
    } catch (error) {
      console.error('Error testing obstacle announcement:', error);
    }
  };

  const showCalibrationPrompt = () => {
    setCalibrationVisible(true);
  };

  const handleCalibrationComplete = () => {
    Alert.alert('Calibration Complete', 'Your compass is now calibrated for accurate directional guidance.');
  };

  const getAccuracyColor = () => {
    switch (calibrationAccuracy) {
      case 'high': return '#00FF88';
      case 'medium': return '#FFA500';
      case 'low': return '#FF6B6B';
      default: return '#666';
    }
  };

  const getAccuracyText = () => {
    switch (calibrationAccuracy) {
      case 'high': return 'High Accuracy';
      case 'medium': return 'Medium Accuracy';
      case 'low': return 'Low Accuracy - Calibration Needed';
      default: return 'Unknown';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <PlatformNavigationBar
        title="Compass Navigation Demo"
        showBackButton
        onBackPress={() => navigation.goBack()}
        rightAction={{
          icon: 'explore',
          onPress: () => Alert.alert('Compass Info', 'This demo showcases compass-enhanced navigation with cardinal directions in voice announcements and visual instructions.'),
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Compass Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Compass Status</Text>
          
          <View style={styles.compassStatus}>
            <View style={styles.compassContainer}>
              <DigitalCompass
                size={120}
                showCardinals={true}
                showBearing={false}
              />
            </View>
            
            <View style={styles.statusInfo}>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Heading:</Text>
                <Text style={styles.statusValue}>{Math.round(currentHeading)}°</Text>
              </View>
              
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Direction:</Text>
                <Text style={styles.statusValue}>
                  {currentDirection.name} ({currentDirection.short})
                </Text>
              </View>
              
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Accuracy:</Text>
                <Text style={[styles.statusValue, { color: getAccuracyColor() }]}>
                  {getAccuracyText()}
                </Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.calibrateButton}
            onPress={showCalibrationPrompt}
          >
            <Icon name="tune" size={20} color="#FFF" />
            <Text style={styles.calibrateText}>Calibrate Compass</Text>
          </TouchableOpacity>
        </View>

        {/* Compass Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compass Settings</Text>
          
          <View style={styles.settingsList}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Compass Directions</Text>
                <Text style={styles.settingDescription}>
                  Enable cardinal directions in navigation
                </Text>
              </View>
              <Switch
                value={compassSettings.enabled}
                onValueChange={(value) => handleSettingToggle('enabled', value)}
                trackColor={{ false: '#333', true: '#00FF88' }}
                thumbColor="#FFF"
              />
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Voice Announcements</Text>
                <Text style={styles.settingDescription}>
                  Include directions in voice guidance
                </Text>
              </View>
              <Switch
                value={compassSettings.showInVoiceAnnouncements}
                onValueChange={(value) => handleSettingToggle('showInVoiceAnnouncements', value)}
                trackColor={{ false: '#333', true: '#00FF88' }}
                thumbColor="#FFF"
              />
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Visual Instructions</Text>
                <Text style={styles.settingDescription}>
                  Show directions in turn instructions
                </Text>
              </View>
              <Switch
                value={compassSettings.showInVisualInstructions}
                onValueChange={(value) => handleSettingToggle('showInVisualInstructions', value)}
                trackColor={{ false: '#333', true: '#00FF88' }}
                thumbColor="#FFF"
              />
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>POI Announcements</Text>
                <Text style={styles.settingDescription}>
                  Include directions for nearby places
                </Text>
              </View>
              <Switch
                value={compassSettings.showInPOIAnnouncements}
                onValueChange={(value) => handleSettingToggle('showInPOIAnnouncements', value)}
                trackColor={{ false: '#333', true: '#00FF88' }}
                thumbColor="#FFF"
              />
            </View>
          </View>
        </View>

        {/* Demo Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Navigation Instructions Demo</Text>
          <Text style={styles.sectionDescription}>
            Compare basic instructions with compass-enhanced versions
          </Text>
          
          {demoInstructions.map((instruction, index) => (
            <View key={index} style={styles.instructionDemo}>
              <View style={styles.instructionHeader}>
                <Icon name="navigation" size={20} color="#2196F3" />
                <Text style={styles.instructionTitle}>Sample Instruction {index + 1}</Text>
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={() => testVoiceAnnouncement(instruction, instruction.bearing)}
                >
                  <Icon name="volume-up" size={16} color="#00FF88" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.instructionComparison}>
                <View style={styles.instructionVersion}>
                  <Text style={styles.versionLabel}>Basic:</Text>
                  <Text style={styles.versionText}>{instruction.basic}</Text>
                </View>
                
                <View style={styles.instructionVersion}>
                  <Text style={styles.versionLabel}>With Compass:</Text>
                  <Text style={[styles.versionText, styles.enhancedText]}>
                    {instruction.withCompass}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Voice Announcement Tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice Announcement Tests</Text>
          
          <View style={styles.testButtons}>
            <TouchableOpacity
              style={styles.testButton}
              onPress={testPOIAnnouncement}
            >
              <Icon name="place" size={20} color="#4CAF50" />
              <Text style={styles.testButtonText}>Test POI Announcement</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.testButton}
              onPress={testObstacleAnnouncement}
            >
              <Icon name="warning" size={20} color="#FF9800" />
              <Text style={styles.testButtonText}>Test Obstacle Alert</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Features Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compass Navigation Features</Text>
          
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Cardinal directions in navigation instructions</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Compass-enhanced voice announcements</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Directional POI and obstacle alerts</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Toggleable compass settings</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Automatic compass calibration prompts</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Real-time heading and direction display</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Compass Calibration Prompt */}
      <CompassCalibrationPrompt
        visible={calibrationVisible}
        onClose={() => setCalibrationVisible(false)}
        onCalibrationComplete={handleCalibrationComplete}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#CCC',
    marginBottom: 16,
    lineHeight: 20,
  },
  compassStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  compassContainer: {
    marginRight: 20,
  },
  statusInfo: {
    flex: 1,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#CCC',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  calibrateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
  },
  calibrateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
  settingsList: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#CCC',
  },
  instructionDemo: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
    flex: 1,
    marginLeft: 8,
  },
  playButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: 6,
  },
  instructionComparison: {
    marginTop: 8,
  },
  instructionVersion: {
    marginBottom: 8,
  },
  versionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 14,
    color: '#CCC',
    lineHeight: 20,
  },
  enhancedText: {
    color: '#00FF88',
  },
  testButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 6,
  },
  testButtonText: {
    fontSize: 14,
    color: '#FFF',
    marginLeft: 8,
  },
  featureList: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#CCC',
    marginLeft: 12,
    flex: 1,
  },
});

export default CompassNavigationDemo;
