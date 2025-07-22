import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import EnhancedErrorPrompt from '../components/EnhancedErrorPrompt';
import SystemStatusIndicator from '../components/SystemStatusIndicator';
import SmartInputValidator from '../components/SmartInputValidator';
import PlatformNavigationBar from '../components/PlatformNavigationBar';

import AccessibilityService from '../services/AccessibilityService';
import EnhancedOfflineModeService from '../services/EnhancedOfflineModeService';

const EnhancedUIDemo = ({ navigation }) => {
  const [errorPromptVisible, setErrorPromptVisible] = useState(false);
  const [currentErrorType, setCurrentErrorType] = useState('internet_disabled');
  const [addressInput, setAddressInput] = useState('');
  const [coordinatesInput, setCoordinatesInput] = useState('');
  const [accessibilitySettings, setAccessibilitySettings] = useState({
    screenReaderEnabled: false,
    highContrastEnabled: false,
    largeTextEnabled: false,
  });
  const [systemStatus, setSystemStatus] = useState(null);

  useEffect(() => {
    // Listen for accessibility changes
    const unsubscribeAccessibility = AccessibilityService.addListener((event, data) => {
      if (event === 'accessibilitySettingsApplied') {
        setAccessibilitySettings(data.settings);
      }
    });

    // Listen for offline mode changes
    const unsubscribeOffline = EnhancedOfflineModeService.addListener((event, data) => {
      if (event === 'showOfflinePrompt') {
        setCurrentErrorType('offline_mode');
        setErrorPromptVisible(true);
      }
    });

    return () => {
      unsubscribeAccessibility();
      unsubscribeOffline();
    };
  }, []);

  const showErrorPrompt = (errorType) => {
    setCurrentErrorType(errorType);
    setErrorPromptVisible(true);
  };

  const handleErrorPromptClose = (action) => {
    setErrorPromptVisible(false);
    
    if (action) {
      switch (action) {
        case 'enable_offline':
          Alert.alert('Offline Mode', 'Offline mode has been enabled. Some features may be limited.');
          break;
        case 'retry_gps':
          Alert.alert('GPS Retry', 'Attempting to reconnect to GPS...');
          break;
        case 'modify_route':
          Alert.alert('Route Modification', 'Opening route modification options...');
          break;
        case 'clear_avoidances':
          Alert.alert('Avoidances Cleared', 'All route avoidances have been cleared.');
          break;
        case 'retry_service':
          Alert.alert('Service Retry', 'Retrying navigation service...');
          break;
      }
    }
  };

  const handleSystemStatusPress = (status) => {
    setSystemStatus(status);
    Alert.alert(
      'System Status',
      `Internet: ${status.internet.status}\nLocation: ${status.location.status}\nGPS: ${status.gps.status}\nBattery: ${status.battery.status} (${status.battery.level}%)`
    );
  };

  const toggleAccessibilitySetting = async (setting) => {
    const newSettings = {
      ...accessibilitySettings,
      [setting]: !accessibilitySettings[setting],
    };
    
    setAccessibilitySettings(newSettings);
    await AccessibilityService.updateAccessibilitySettings(newSettings);
    
    // Announce change for screen readers
    AccessibilityService.announceForScreenReader(
      `${setting.replace(/([A-Z])/g, ' $1').toLowerCase()} ${newSettings[setting] ? 'enabled' : 'disabled'}`
    );
  };

  const errorTypes = [
    { key: 'internet_disabled', title: 'Internet Disabled', icon: 'wifi-off' },
    { key: 'location_disabled', title: 'Location Disabled', icon: 'location-off' },
    { key: 'gps_weak', title: 'Weak GPS Signal', icon: 'gps-not-fixed' },
    { key: 'offline_mode', title: 'Offline Mode', icon: 'cloud-off' },
    { key: 'invalid_input', title: 'Invalid Input', icon: 'error-outline' },
    { key: 'route_not_found', title: 'Route Not Found', icon: 'directions-off' },
    { key: 'service_unavailable', title: 'Service Unavailable', icon: 'cloud-off' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <PlatformNavigationBar
        title="Enhanced UI/UX Demo"
        showBackButton
        onBackPress={() => navigation.goBack()}
        rightAction={{
          icon: 'info-outline',
          onPress: () => Alert.alert('Info', 'This demo showcases enhanced UI/UX features including error prompts, accessibility, and smart input validation.'),
        }}
      />

      <SystemStatusIndicator
        position="top"
        onStatusPress={handleSystemStatusPress}
        showDetails={false}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Error Prompts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enhanced Error Prompts</Text>
          <Text style={styles.sectionDescription}>
            User-friendly error messages with actionable solutions
          </Text>
          
          <View style={styles.buttonGrid}>
            {errorTypes.map((errorType) => (
              <TouchableOpacity
                key={errorType.key}
                style={styles.demoButton}
                onPress={() => showErrorPrompt(errorType.key)}
                accessibilityLabel={`Show ${errorType.title} error`}
                accessibilityRole="button"
              >
                <Icon name={errorType.icon} size={24} color="#00FF88" />
                <Text style={styles.buttonText}>{errorType.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Smart Input Validation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Smart Input Validation</Text>
          <Text style={styles.sectionDescription}>
            Intelligent input validation with suggestions and real-time feedback
          </Text>
          
          <SmartInputValidator
            value={addressInput}
            onChangeText={setAddressInput}
            placeholder="Enter destination address"
            validationType="address"
            required
            showSuggestions
            accessibilityLabel="Destination address input"
          />
          
          <SmartInputValidator
            value={coordinatesInput}
            onChangeText={setCoordinatesInput}
            placeholder="Enter coordinates (lat,lng)"
            validationType="coordinates"
            accessibilityLabel="Coordinates input"
            style={{ marginTop: 16 }}
          />
        </View>

        {/* Accessibility Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accessibility Features</Text>
          <Text style={styles.sectionDescription}>
            Enhanced accessibility support for all users
          </Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Icon name="record-voice-over" size={24} color="#00FF88" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Screen Reader Support</Text>
                <Text style={styles.settingSubtitle}>Enhanced VoiceOver/TalkBack integration</Text>
              </View>
            </View>
            <Switch
              value={accessibilitySettings.screenReaderEnabled}
              onValueChange={() => toggleAccessibilitySetting('screenReaderEnabled')}
              trackColor={{ false: '#333', true: '#00FF88' }}
              thumbColor="#FFF"
              accessibilityLabel="Toggle screen reader support"
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Icon name="contrast" size={24} color="#00FF88" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>High Contrast Mode</Text>
                <Text style={styles.settingSubtitle}>Improved visibility for low vision users</Text>
              </View>
            </View>
            <Switch
              value={accessibilitySettings.highContrastEnabled}
              onValueChange={() => toggleAccessibilitySetting('highContrastEnabled')}
              trackColor={{ false: '#333', true: '#00FF88' }}
              thumbColor="#FFF"
              accessibilityLabel="Toggle high contrast mode"
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Icon name="text-fields" size={24} color="#00FF88" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Large Text</Text>
                <Text style={styles.settingSubtitle}>Increased text size for better readability</Text>
              </View>
            </View>
            <Switch
              value={accessibilitySettings.largeTextEnabled}
              onValueChange={() => toggleAccessibilitySetting('largeTextEnabled')}
              trackColor={{ false: '#333', true: '#00FF88' }}
              thumbColor="#FFF"
              accessibilityLabel="Toggle large text"
            />
          </View>
        </View>

        {/* System Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Status Monitoring</Text>
          <Text style={styles.sectionDescription}>
            Real-time monitoring of connectivity, GPS, and system health
          </Text>
          
          <TouchableOpacity
            style={styles.statusButton}
            onPress={() => handleSystemStatusPress(systemStatus || {})}
            accessibilityLabel="View detailed system status"
            accessibilityRole="button"
          >
            <Icon name="info-outline" size={24} color="#00FF88" />
            <Text style={styles.buttonText}>View System Status</Text>
          </TouchableOpacity>
        </View>

        {/* Features Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enhanced Features Summary</Text>
          
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>User-friendly error prompts with actionable solutions</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Smart input validation with real-time feedback</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Comprehensive accessibility support</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Real-time system status monitoring</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Enhanced offline mode with intelligent caching</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Enhanced Error Prompt */}
      <EnhancedErrorPrompt
        visible={errorPromptVisible}
        onClose={handleErrorPromptClose}
        errorType={currentErrorType}
        showActions={true}
        autoHide={false}
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
    paddingTop: 60, // Account for system status indicator
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
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  demoButton: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  statusButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    color: '#FFF',
    marginTop: 8,
    textAlign: 'center',
    marginLeft: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 2,
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

export default EnhancedUIDemo;
