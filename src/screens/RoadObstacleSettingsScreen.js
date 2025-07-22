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
import RoadObstacleService from '../services/RoadObstacleService';
import { useSafety } from '../context/SafetyContext';
import { useVoice } from '../context/VoiceContext';

const RoadObstacleSettingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { shouldBlockInteraction } = useSafety();
  const { speak } = useVoice();

  const [settings, setSettings] = useState({});
  const [statistics, setStatistics] = useState({});
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedInfo, setSelectedInfo] = useState(null);

  useEffect(() => {
    loadSettings();
    loadStatistics();
  }, []);

  const loadSettings = async () => {
    try {
      await RoadObstacleService.initialize();
      const currentSettings = RoadObstacleService.getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadStatistics = () => {
    try {
      const stats = RoadObstacleService.getAvoidanceStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleSettingChange = async (key, value) => {
    if (shouldBlockInteraction()) {
      speak('Pull over safely to change route settings');
      return;
    }

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      await RoadObstacleService.updateSettings({ [key]: value });
      speak(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()} ${value ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating setting:', error);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleSliderChange = async (key, value) => {
    if (shouldBlockInteraction()) {
      speak('Pull over safely to change route settings');
      return;
    }

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      await RoadObstacleService.updateSettings({ [key]: value });
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  };

  const showInfo = (infoType) => {
    const infoData = {
      cameras: {
        title: 'Traffic Cameras',
        description: 'Avoid speed cameras, red light cameras, and traffic enforcement cameras. Routes will be planned to minimize encounters with these devices.',
        impact: 'May add 2-5 minutes to journey time',
      },
      police: {
        title: 'Law Enforcement',
        description: 'Avoid police checkpoints and stations. Useful for avoiding potential delays from routine checks or heavy police presence areas.',
        impact: 'May add 1-3 minutes to avoid police areas',
      },
      railway: {
        title: 'Railway Crossings',
        description: 'Avoid level railway crossings where trains may cause delays. Particularly useful during rush hours.',
        impact: 'May add 3-8 minutes to avoid potential train delays',
      },
      junctions: {
        title: 'Difficult Junctions',
        description: 'Avoid complex motorway junctions and large roundabouts that can be challenging to navigate.',
        impact: 'May add 2-6 minutes for simpler route',
      },
      motorways: {
        title: 'Motorways/Highways',
        description: 'Avoid high-speed motorways and highways. Useful for new drivers or those preferring local roads.',
        impact: 'May add 10-20 minutes but uses familiar local roads',
      },
      tolls: {
        title: 'Toll Roads',
        description: 'Avoid toll roads and toll booths to save money. Routes will use free alternatives where possible.',
        impact: 'May add 5-15 minutes but saves toll costs',
      },
      conditions: {
        title: 'Road Conditions',
        description: 'Avoid unpaved roads, narrow roads, and steep grades for more comfortable driving.',
        impact: 'May add 3-10 minutes for better road quality',
      },
      ferries: {
        title: 'Ferries',
        description: 'Avoid ferry crossings which can have long wait times and additional costs.',
        impact: 'May add 15-30 minutes but avoids ferry delays and costs',
      },
      zones: {
        title: 'Special Zones',
        description: 'Avoid school zones during school hours and construction zones with reduced speed limits.',
        impact: 'May add 2-8 minutes to avoid delays',
      },
    };

    setSelectedInfo(infoData[infoType]);
    setShowInfoModal(true);
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'Reset all road obstacle avoidance settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            const defaultSettings = {
              avoidSpeedCameras: true,
              avoidRedLightCameras: true,
              avoidTrafficEnforcement: true,
              avoidPoliceCheckpoints: false,
              avoidPoliceStations: false,
              avoidRailwayCrossings: false,
              avoidDifficultJunctions: false,
              avoidMotorways: false,
              avoidTollRoads: true,
              avoidUnpavedRoads: false,
              avoidNarrowRoads: false,
              avoidSteepGrades: false,
              avoidFerries: false,
              avoidSchoolZones: false,
              avoidConstructionZones: true,
              maxExtraTime: 20,
              alertDistance: 500,
            };
            
            setSettings(defaultSettings);
            await RoadObstacleService.updateSettings(defaultSettings);
            speak('Settings reset to defaults');
          },
        },
      ]
    );
  };

  const renderSettingGroup = (title, icon, color, settings, infoType) => (
    <View style={styles.settingGroup}>
      <View style={styles.groupHeader}>
        <View style={styles.groupTitleContainer}>
          <Icon name={icon} size={24} color={color} />
          <Text style={styles.groupTitle}>{title}</Text>
        </View>
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => showInfo(infoType)}
        >
          <Icon name="info-outline" size={20} color="#666" />
        </TouchableOpacity>
      </View>
      
      {settings.map((setting) => (
        <View key={setting.key} style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>{setting.title}</Text>
            <Text style={styles.settingDescription}>{setting.description}</Text>
          </View>
          <Switch
            value={settings[setting.key]}
            onValueChange={(value) => handleSettingChange(setting.key, value)}
            trackColor={{ false: '#333', true: color }}
            thumbColor={settings[setting.key] ? '#fff' : '#666'}
          />
        </View>
      ))}
    </View>
  );

  const renderSliderSetting = (title, key, min, max, step, unit, color) => (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderTitle}>{title}</Text>
        <Text style={[styles.sliderValue, { color }]}>
          {settings[key]}{unit}
        </Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={settings[key] || min}
        onValueChange={(value) => handleSliderChange(key, value)}
        minimumTrackTintColor={color}
        maximumTrackTintColor="#333"
        thumbStyle={{ backgroundColor: color }}
      />
    </View>
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
          <Icon name="arrow-back" size={24} color="#FFA500" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Route Avoidance</Text>
        
        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetToDefaults}
        >
          <Icon name="refresh" size={24} color="#666" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Database Statistics</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{statistics.totalObstacles || 0}</Text>
              <Text style={styles.statLabel}>Total Obstacles</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{statistics.userReported || 0}</Text>
              <Text style={styles.statLabel}>User Reported</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {Object.keys(statistics.enabledAvoidance || {}).length}
              </Text>
              <Text style={styles.statLabel}>Active Filters</Text>
            </View>
          </View>
        </View>

        {/* Traffic Cameras */}
        {renderSettingGroup(
          'Traffic Cameras',
          'camera-alt',
          '#FF6B6B',
          [
            {
              key: 'avoidSpeedCameras',
              title: 'Speed Cameras',
              description: 'Avoid fixed and mobile speed cameras',
            },
            {
              key: 'avoidRedLightCameras',
              title: 'Red Light Cameras',
              description: 'Avoid traffic light enforcement cameras',
            },
            {
              key: 'avoidTrafficEnforcement',
              title: 'Traffic Enforcement',
              description: 'Avoid general traffic monitoring cameras',
            },
          ],
          'cameras'
        )}

        {/* Law Enforcement */}
        {renderSettingGroup(
          'Law Enforcement',
          'local-police',
          '#9C27B0',
          [
            {
              key: 'avoidPoliceCheckpoints',
              title: 'Police Checkpoints',
              description: 'Avoid known police checkpoint locations',
            },
            {
              key: 'avoidPoliceStations',
              title: 'Police Stations',
              description: 'Avoid routes near police stations',
            },
          ],
          'police'
        )}

        {/* Road Infrastructure */}
        {renderSettingGroup(
          'Road Infrastructure',
          'traffic',
          '#007AFF',
          [
            {
              key: 'avoidRailwayCrossings',
              title: 'Railway Crossings',
              description: 'Avoid level crossings with potential train delays',
            },
            {
              key: 'avoidDifficultJunctions',
              title: 'Complex Junctions',
              description: 'Avoid motorway junctions and large roundabouts',
            },
            {
              key: 'avoidMotorways',
              title: 'Motorways/Highways',
              description: 'Prefer local roads over high-speed motorways',
            },
          ],
          'railway'
        )}

        {/* Toll Roads */}
        {renderSettingGroup(
          'Toll Roads',
          'toll',
          '#FFA500',
          [
            {
              key: 'avoidTollRoads',
              title: 'Toll Roads',
              description: 'Avoid roads that require toll payments',
            },
          ],
          'tolls'
        )}

        {/* Road Conditions */}
        {renderSettingGroup(
          'Road Conditions',
          'terrain',
          '#4CAF50',
          [
            {
              key: 'avoidUnpavedRoads',
              title: 'Unpaved Roads',
              description: 'Avoid gravel, dirt, and unpaved surfaces',
            },
            {
              key: 'avoidNarrowRoads',
              title: 'Narrow Roads',
              description: 'Avoid roads less than 3 meters wide',
            },
            {
              key: 'avoidSteepGrades',
              title: 'Steep Grades',
              description: 'Avoid roads with inclines over 10%',
            },
            {
              key: 'avoidFerries',
              title: 'Ferry Crossings',
              description: 'Avoid routes requiring ferry transport',
            },
          ],
          'conditions'
        )}

        {/* Special Zones */}
        {renderSettingGroup(
          'Special Zones',
          'school',
          '#9C27B0',
          [
            {
              key: 'avoidSchoolZones',
              title: 'School Zones',
              description: 'Avoid areas near schools during school hours',
            },
            {
              key: 'avoidConstructionZones',
              title: 'Construction Zones',
              description: 'Avoid active construction areas',
            },
          ],
          'zones'
        )}

        {/* Timing Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timing Preferences</Text>
          
          {renderSliderSetting(
            'Maximum Extra Time',
            'maxExtraTime',
            5,
            60,
            5,
            ' min',
            '#00FF88'
          )}
          
          {renderSliderSetting(
            'Alert Distance',
            'alertDistance',
            100,
            1000,
            50,
            ' m',
            '#00FF88'
          )}
        </View>

        {/* Help Text */}
        <View style={styles.helpSection}>
          <Icon name="lightbulb-outline" size={20} color="#FFA500" />
          <Text style={styles.helpText}>
            These settings help you avoid specific road obstacles and conditions. 
            Routes may take longer but will be more comfortable and predictable. 
            Tap the info icons for more details about each option.
          </Text>
        </View>
      </ScrollView>

      {/* Info Modal */}
      <Modal
        visible={showInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedInfo?.title}</Text>
            <Text style={styles.modalDescription}>{selectedInfo?.description}</Text>
            <Text style={styles.modalImpact}>Impact: {selectedInfo?.impact}</Text>
            
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowInfoModal(false)}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
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
  resetButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 102, 102, 0.1)',
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00FF88',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
  },
  settingGroup: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  groupTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 10,
  },
  infoButton: {
    padding: 5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
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
  },
  slider: {
    width: '100%',
    height: 40,
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.3)',
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
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  modalDescription: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 22,
    marginBottom: 15,
  },
  modalImpact: {
    fontSize: 14,
    color: '#FFA500',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#00FF88',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RoadObstacleSettingsScreen;
