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

import PlatformNavigationBar from '../components/PlatformNavigationBar';
import SystemHealthDashboard from '../components/SystemHealthDashboard';
import ErrorRecoveryPrompt from '../components/ErrorRecoveryPrompt';
import ErrorMonitoringService from '../services/ErrorMonitoringService';
import FallbackBehaviorService from '../services/FallbackBehaviorService';

const SystemHealthDemo = ({ navigation }) => {
  const [showDashboard, setShowDashboard] = useState(true);
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
  const [selectedError, setSelectedError] = useState(null);
  const [monitoringSettings, setMonitoringSettings] = useState({});
  const [systemHealth, setSystemHealth] = useState({});
  const [fallbackModes, setFallbackModes] = useState({});

  useEffect(() => {
    initializeDemo();
    setupListeners();
  }, []);

  const initializeDemo = async () => {
    try {
      await ErrorMonitoringService.initialize();
      await FallbackBehaviorService.initialize();
      
      // Load current settings and status
      const health = ErrorMonitoringService.getSystemHealth();
      const modes = FallbackBehaviorService.getCurrentFallbackModes();
      
      setSystemHealth(health);
      setFallbackModes(modes);
      
    } catch (error) {
      console.error('Error initializing system health demo:', error);
    }
  };

  const setupListeners = () => {
    // Listen for error monitoring events
    ErrorMonitoringService.addListener((event, data) => {
      switch (event) {
        case 'systemHealthUpdate':
          setSystemHealth(data.systemHealth);
          break;
        case 'showErrorPrompt':
          handleErrorPrompt(data);
          break;
        case 'emergencyModeActivated':
          showEmergencyAlert();
          break;
      }
    });

    // Listen for fallback behavior events
    FallbackBehaviorService.addListener((event, data) => {
      switch (event) {
        case 'offlineModeActivated':
        case 'lowPowerModeActivated':
        case 'degradedModeActivated':
          setFallbackModes(FallbackBehaviorService.getCurrentFallbackModes());
          break;
      }
    });
  };

  const handleErrorPrompt = (errorData) => {
    setSelectedError(errorData);
    setShowRecoveryPrompt(true);
  };

  const showEmergencyAlert = () => {
    Alert.alert(
      'Emergency Mode Demo',
      'This demonstrates how VibeVoyage responds to critical system health issues by activating emergency mode.',
      [{ text: 'OK' }]
    );
  };

  const simulateError = (errorType) => {
    const errorMessages = {
      internet_disabled: 'Internet connection has been lost',
      location_disabled: 'Location services are not available',
      gps_weak: 'GPS signal is too weak for accurate navigation',
      compass_weak: 'Compass calibration is required',
      storage_full: 'Device storage is critically low',
      battery_low: 'Battery level is critically low',
      service_unavailable: 'Navigation services are temporarily unavailable',
    };

    const recoveryOptions = {
      internet_disabled: [
        {
          name: 'Check Network Settings',
          description: 'Verify WiFi and mobile data settings',
          icon: 'wifi',
          successRate: 0.8,
          estimatedDuration: '15',
          recommended: true,
          steps: ['Checking WiFi...', 'Checking mobile data...', 'Testing connection...'],
        },
        {
          name: 'Enable Offline Mode',
          description: 'Switch to cached data and offline navigation',
          icon: 'cloud-off',
          successRate: 0.95,
          estimatedDuration: '5',
          steps: ['Switching to offline mode...', 'Loading cached data...', 'Ready for offline use'],
        },
      ],
      gps_weak: [
        {
          name: 'Improve GPS Signal',
          description: 'Move to an open area for better GPS reception',
          icon: 'gps-fixed',
          successRate: 0.7,
          estimatedDuration: '30',
          recommended: true,
          steps: ['Scanning for satellites...', 'Improving signal strength...', 'GPS signal restored'],
        },
        {
          name: 'Use Network Location',
          description: 'Fall back to WiFi and cell tower positioning',
          icon: 'cell-tower',
          successRate: 0.9,
          estimatedDuration: '10',
          steps: ['Switching to network location...', 'Calibrating position...', 'Location services ready'],
        },
      ],
    };

    ErrorMonitoringService.handleError(
      errorType,
      errorMessages[errorType] || 'An error has occurred',
      'medium'
    );

    // Show recovery prompt with options
    setSelectedError({
      type: errorType,
      message: errorMessages[errorType],
      severity: 'medium',
      systemHealth: ErrorMonitoringService.getSystemHealth(),
    });
    setShowRecoveryPrompt(true);
  };

  const simulateFallbackMode = async (mode) => {
    switch (mode) {
      case 'offline':
        await FallbackBehaviorService.activateOfflineMode('demo_simulation');
        Alert.alert('Offline Mode', 'Offline mode has been activated. The app will use cached data.');
        break;
      case 'lowPower':
        await FallbackBehaviorService.activateLowPowerMode('demo_simulation');
        Alert.alert('Low Power Mode', 'Low power mode has been activated to conserve battery.');
        break;
      case 'degraded':
        await FallbackBehaviorService.activateDegradedMode('demo_simulation');
        Alert.alert('Degraded Mode', 'Degraded mode has been activated for better performance.');
        break;
      case 'emergency':
        await FallbackBehaviorService.activateEmergencyMode('demo_simulation');
        break;
    }
  };

  const resetAllModes = async () => {
    await FallbackBehaviorService.deactivateOfflineMode('demo_reset');
    await FallbackBehaviorService.deactivateLowPowerMode('demo_reset');
    await FallbackBehaviorService.deactivateDegradedMode('demo_reset');
    await FallbackBehaviorService.deactivateEmergencyMode('demo_reset');
    
    Alert.alert('Reset Complete', 'All fallback modes have been deactivated.');
  };

  const handleRecoveryPromptClose = (result) => {
    setShowRecoveryPrompt(false);
    setSelectedError(null);
    
    if (result.recovered) {
      Alert.alert(
        'Recovery Successful',
        `The error was resolved using: ${result.method}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleErrorPress = (error) => {
    Alert.alert(
      'Error Details',
      `Type: ${error.type}\nSeverity: ${error.severity}\nTime: ${new Date(error.timestamp).toLocaleString()}\n\nMessage: ${error.message}`,
      [{ text: 'OK' }]
    );
  };

  const handleRecoveryPress = () => {
    Alert.alert(
      'Auto Recovery',
      'This would attempt to automatically recover from all detected issues.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start Recovery', onPress: () => simulateAutoRecovery() },
      ]
    );
  };

  const simulateAutoRecovery = () => {
    Alert.alert('Auto Recovery', 'Auto recovery simulation would run here.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <PlatformNavigationBar
        title="System Health Demo"
        showBackButton
        onBackPress={() => navigation.goBack()}
        rightAction={{
          icon: 'health-and-safety',
          onPress: () => Alert.alert('System Health', 'This demo showcases VibeVoyage\'s advanced error monitoring, automatic recovery, and fallback behavior systems.'),
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Dashboard Toggle */}
        <View style={styles.section}>
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Show Health Dashboard</Text>
            <Switch
              value={showDashboard}
              onValueChange={setShowDashboard}
              trackColor={{ false: '#333', true: '#00FF88' }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        {/* System Health Dashboard */}
        {showDashboard && (
          <View style={styles.section}>
            <SystemHealthDashboard
              onErrorPress={handleErrorPress}
              onRecoveryPress={handleRecoveryPress}
              showDetailedView={true}
              refreshInterval={10000}
            />
          </View>
        )}

        {/* Error Simulation Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Error Simulation</Text>
          <Text style={styles.sectionDescription}>
            Simulate different types of errors to see how the system responds
          </Text>
          
          <View style={styles.controlsGrid}>
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => simulateError('internet_disabled')}
            >
              <Icon name="wifi-off" size={24} color="#FF6B6B" />
              <Text style={styles.errorButtonText}>Internet Error</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => simulateError('gps_weak')}
            >
              <Icon name="gps-not-fixed" size={24} color="#FFA500" />
              <Text style={styles.errorButtonText}>GPS Error</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => simulateError('compass_weak')}
            >
              <Icon name="explore-off" size={24} color="#FFEB3B" />
              <Text style={styles.errorButtonText}>Compass Error</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => simulateError('battery_low')}
            >
              <Icon name="battery-alert" size={24} color="#F44336" />
              <Text style={styles.errorButtonText}>Battery Error</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Fallback Mode Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fallback Mode Simulation</Text>
          <Text style={styles.sectionDescription}>
            Test different fallback modes that activate during system issues
          </Text>
          
          <View style={styles.controlsGrid}>
            <TouchableOpacity
              style={styles.fallbackButton}
              onPress={() => simulateFallbackMode('offline')}
            >
              <Icon name="cloud-off" size={24} color="#9E9E9E" />
              <Text style={styles.fallbackButtonText}>Offline Mode</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.fallbackButton}
              onPress={() => simulateFallbackMode('lowPower')}
            >
              <Icon name="battery-saver" size={24} color="#FFA500" />
              <Text style={styles.fallbackButtonText}>Low Power</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.fallbackButton}
              onPress={() => simulateFallbackMode('degraded')}
            >
              <Icon name="speed" size={24} color="#2196F3" />
              <Text style={styles.fallbackButtonText}>Degraded</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.fallbackButton}
              onPress={() => simulateFallbackMode('emergency')}
            >
              <Icon name="emergency" size={24} color="#FF6B6B" />
              <Text style={styles.fallbackButtonText}>Emergency</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetAllModes}
          >
            <Icon name="refresh" size={20} color="#000" />
            <Text style={styles.resetButtonText}>Reset All Modes</Text>
          </TouchableOpacity>
        </View>

        {/* Current Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current System Status</Text>
          
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Error Monitoring:</Text>
              <Text style={styles.statusValue}>
                {ErrorMonitoringService.isInitialized ? 'Active' : 'Inactive'}
              </Text>
            </View>
            
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Emergency Mode:</Text>
              <Text style={[
                styles.statusValue,
                { color: ErrorMonitoringService.isEmergencyMode() ? '#FF6B6B' : '#00FF88' }
              ]}>
                {ErrorMonitoringService.isEmergencyMode() ? 'Active' : 'Inactive'}
              </Text>
            </View>
            
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Fallback Modes:</Text>
              <Text style={styles.statusValue}>
                {Object.values(fallbackModes).some(Boolean) ? 'Active' : 'None'}
              </Text>
            </View>
          </View>
        </View>

        {/* Features Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Error Monitoring Features</Text>
          
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Proactive error detection and monitoring</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Automatic error recovery attempts</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Intelligent fallback behavior</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>System health monitoring dashboard</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Emergency mode for critical situations</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Comprehensive error logging and analytics</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Error Recovery Prompt */}
      <ErrorRecoveryPrompt
        visible={showRecoveryPrompt}
        onClose={handleRecoveryPromptClose}
        errorData={selectedError}
        recoveryOptions={selectedError?.type === 'internet_disabled' ? [
          {
            name: 'Check Network Settings',
            description: 'Verify WiFi and mobile data settings',
            icon: 'wifi',
            successRate: 0.8,
            estimatedDuration: '15',
            recommended: true,
          },
          {
            name: 'Enable Offline Mode',
            description: 'Switch to cached data and offline navigation',
            icon: 'cloud-off',
            successRate: 0.95,
            estimatedDuration: '5',
          },
        ] : []}
        autoRecovery={true}
        showSystemHealth={true}
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
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#FFF',
  },
  controlsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  errorButton: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  errorButtonText: {
    fontSize: 14,
    color: '#FFF',
    marginTop: 8,
    textAlign: 'center',
  },
  fallbackButton: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  fallbackButtonText: {
    fontSize: 14,
    color: '#FFF',
    marginTop: 8,
    textAlign: 'center',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00FF88',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  statusContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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

export default SystemHealthDemo;
