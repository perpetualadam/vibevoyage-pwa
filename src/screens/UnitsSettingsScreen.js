import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import services
import UnitsService from '../services/UnitsService';
import { useSafety } from '../context/SafetyContext';
import { useVoice } from '../context/VoiceContext';

const UnitsSettingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { shouldBlockInteraction } = useSafety();
  const { speak } = useVoice();

  const [currentUnits, setCurrentUnits] = useState({
    distance: 'metric',
    speed: 'metric',
    temperature: 'celsius',
  });

  const unitOptions = {
    distance: [
      {
        id: 'metric',
        title: 'Metric',
        description: 'Kilometers and meters',
        examples: ['2.5 km', '500 m', '1.2 km'],
        icon: 'straighten',
        color: '#4CAF50',
      },
      {
        id: 'imperial',
        title: 'Imperial',
        description: 'Miles and feet',
        examples: ['1.5 mi', '1640 ft', '0.7 mi'],
        icon: 'straighten',
        color: '#2196F3',
      },
    ],
    speed: [
      {
        id: 'metric',
        title: 'Metric',
        description: 'Kilometers per hour',
        examples: ['50 km/h', '120 km/h', '30 km/h'],
        icon: 'speed',
        color: '#4CAF50',
      },
      {
        id: 'imperial',
        title: 'Imperial',
        description: 'Miles per hour',
        examples: ['30 mph', '75 mph', '20 mph'],
        icon: 'speed',
        color: '#2196F3',
      },
    ],
    temperature: [
      {
        id: 'celsius',
        title: 'Celsius',
        description: 'Degrees Celsius',
        examples: ['20°C', '0°C', '35°C'],
        icon: 'thermostat',
        color: '#FF9800',
      },
      {
        id: 'fahrenheit',
        title: 'Fahrenheit',
        description: 'Degrees Fahrenheit',
        examples: ['68°F', '32°F', '95°F'],
        icon: 'thermostat',
        color: '#F44336',
      },
    ],
  };

  useEffect(() => {
    loadCurrentUnits();
  }, []);

  const loadCurrentUnits = async () => {
    try {
      await UnitsService.initialize();
      const units = UnitsService.getCurrentUnits();
      setCurrentUnits(units);
    } catch (error) {
      console.error('Error loading units:', error);
    }
  };

  const handleUnitChange = async (unitType, value) => {
    if (shouldBlockInteraction()) {
      speak('Pull over safely to change unit settings');
      return;
    }

    try {
      await UnitsService.updateUnits(unitType, value);
      setCurrentUnits(prev => ({ ...prev, [unitType]: value }));
      
      const option = unitOptions[unitType].find(opt => opt.id === value);
      speak(`${unitType} units changed to ${option.title}`);
      
    } catch (error) {
      console.error('Error updating units:', error);
      Alert.alert('Error', 'Failed to update unit settings');
    }
  };

  const handlePresetSelection = async (preset) => {
    if (shouldBlockInteraction()) {
      speak('Pull over safely to change unit settings');
      return;
    }

    try {
      if (preset === 'metric') {
        await UnitsService.setMetricUnits();
        setCurrentUnits({
          distance: 'metric',
          speed: 'metric',
          temperature: 'celsius',
        });
        speak('Units changed to metric system');
      } else {
        await UnitsService.setImperialUnits();
        setCurrentUnits({
          distance: 'imperial',
          speed: 'imperial',
          temperature: 'fahrenheit',
        });
        speak('Units changed to imperial system');
      }
    } catch (error) {
      console.error('Error setting preset units:', error);
      Alert.alert('Error', 'Failed to update unit settings');
    }
  };

  const handleAutoDetect = async () => {
    if (shouldBlockInteraction()) {
      speak('Pull over safely to change unit settings');
      return;
    }

    try {
      await UnitsService.autoDetectUnits();
      const units = UnitsService.getCurrentUnits();
      setCurrentUnits(units);
      speak('Units automatically detected based on your location');
    } catch (error) {
      console.error('Error auto-detecting units:', error);
      Alert.alert('Error', 'Failed to auto-detect units');
    }
  };

  const renderUnitSection = (unitType, title, icon) => (
    <View key={unitType} style={styles.section}>
      <View style={styles.sectionHeader}>
        <Icon name={icon} size={24} color="#00FF88" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      
      <View style={styles.optionsContainer}>
        {unitOptions[unitType].map((option) => {
          const isSelected = currentUnits[unitType] === option.id;
          
          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.optionCard, isSelected && styles.selectedOptionCard]}
              onPress={() => handleUnitChange(unitType, option.id)}
            >
              <LinearGradient
                colors={
                  isSelected
                    ? [option.color, `${option.color}CC`]
                    : [`${option.color}20`, `${option.color}10`]
                }
                style={styles.optionGradient}
              >
                <View style={styles.optionHeader}>
                  <Icon
                    name={option.icon}
                    size={24}
                    color={isSelected ? '#FFF' : option.color}
                  />
                  <Text style={[
                    styles.optionTitle,
                    { color: isSelected ? '#FFF' : '#FFF' }
                  ]}>
                    {option.title}
                  </Text>
                  {isSelected && (
                    <Icon name="check-circle" size={20} color="#FFF" />
                  )}
                </View>
                
                <Text style={[
                  styles.optionDescription,
                  { color: isSelected ? '#FFF' : '#999' }
                ]}>
                  {option.description}
                </Text>
                
                <View style={styles.examplesContainer}>
                  {option.examples.map((example, index) => (
                    <Text
                      key={index}
                      style={[
                        styles.exampleText,
                        { color: isSelected ? '#FFF' : '#666' }
                      ]}
                    >
                      {example}
                    </Text>
                  ))}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>
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
          <Icon name="arrow-back" size={24} color="#00FF88" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Units & Measurements</Text>
        
        <TouchableOpacity
          style={styles.autoDetectButton}
          onPress={handleAutoDetect}
        >
          <Icon name="my-location" size={24} color="#FFA500" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Presets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Presets</Text>
          
          <View style={styles.presetsContainer}>
            <TouchableOpacity
              style={styles.presetButton}
              onPress={() => handlePresetSelection('metric')}
            >
              <LinearGradient
                colors={['rgba(76, 175, 80, 0.3)', 'rgba(76, 175, 80, 0.1)']}
                style={styles.presetGradient}
              >
                <Icon name="public" size={24} color="#4CAF50" />
                <Text style={styles.presetTitle}>Metric System</Text>
                <Text style={styles.presetDescription}>km, m, km/h, °C</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetButton}
              onPress={() => handlePresetSelection('imperial')}
            >
              <LinearGradient
                colors={['rgba(33, 150, 243, 0.3)', 'rgba(33, 150, 243, 0.1)']}
                style={styles.presetGradient}
              >
                <Icon name="flag" size={24} color="#2196F3" />
                <Text style={styles.presetTitle}>Imperial System</Text>
                <Text style={styles.presetDescription}>mi, ft, mph, °F</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Individual Unit Settings */}
        {renderUnitSection('distance', 'Distance', 'straighten')}
        {renderUnitSection('speed', 'Speed', 'speed')}
        {renderUnitSection('temperature', 'Temperature', 'thermostat')}

        {/* Current Settings Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Settings</Text>
          
          <View style={styles.summaryCard}>
            <LinearGradient
              colors={['rgba(0, 255, 136, 0.2)', 'rgba(0, 255, 136, 0.1)']}
              style={styles.summaryGradient}
            >
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Distance:</Text>
                <Text style={styles.summaryValue}>
                  {UnitsService.formatDistance(1500)} • {UnitsService.formatDistance(500)}
                </Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Speed:</Text>
                <Text style={styles.summaryValue}>
                  {UnitsService.formatSpeed(60)} • {UnitsService.formatSpeed(120)}
                </Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Temperature:</Text>
                <Text style={styles.summaryValue}>
                  {UnitsService.formatTemperature(20)} • {UnitsService.formatTemperature(0)}
                </Text>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Icon name="info-outline" size={20} color="#00FF88" />
          <Text style={styles.helpText}>
            Unit settings affect all distance, speed, and temperature displays throughout the app, 
            including voice announcements and navigation instructions. Auto-detect uses your 
            device's location to suggest appropriate units.
          </Text>
        </View>
      </ScrollView>
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
  autoDetectButton: {
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 10,
  },
  presetsContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  presetButton: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
  },
  presetGradient: {
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
  },
  presetTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  presetDescription: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  optionCard: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
  },
  selectedOptionCard: {
    transform: [{ scale: 1.02 }],
  },
  optionGradient: {
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    minHeight: 120,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  optionDescription: {
    fontSize: 12,
    marginBottom: 8,
  },
  examplesContainer: {
    gap: 2,
  },
  exampleText: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  summaryCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  summaryGradient: {
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#00FF88',
    fontFamily: 'monospace',
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
});

export default UnitsSettingsScreen;
