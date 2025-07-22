import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import contexts
import { useSafety } from '../context/SafetyContext';
import { useVoice } from '../context/VoiceContext';
import CompassNavigationService from '../services/CompassNavigationService';
import DisplayOverAppsService from '../services/DisplayOverAppsService';
import ErrorMonitoringService from '../services/ErrorMonitoringService';
import FallbackBehaviorService from '../services/FallbackBehaviorService';

const SettingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { shouldBlockInteraction, setSpeedThreshold } = useSafety();
  const { isVoiceEnabled, toggleVoice, currentLanguage, setLanguage } = useVoice();

  const [settings, setSettings] = useState({
    voiceEnabled: isVoiceEnabled,
    ecoMode: true,
    notifications: true,
    shareData: false,
    darkMode: true,
    hapticFeedback: true,
    autoNightMode: true,
    speedAlerts: true,
    compassDirections: true,
    compassInVoice: true,
    compassInVisual: true,
    compassInPOI: true,
    displayOverApps: false,
    overlayDuringNavigation: true,
    overlayShowSpeed: true,
    overlayShowInstructions: true,
    errorMonitoring: true,
    proactiveErrorDetection: true,
    autoErrorRecovery: true,
    systemHealthAlerts: true,
  });

  const handleDisplayOverAppsToggle = async (setting) => {
    const enabled = !settings[setting];

    if (enabled) {
      const hasPermission = await DisplayOverAppsService.requestOverlayPermission();
      if (hasPermission) {
        await DisplayOverAppsService.updateSettings({ enabled: true });
        setSettings(prev => ({ ...prev, [setting]: true }));
      }
    } else {
      await DisplayOverAppsService.updateSettings({ enabled: false });
      setSettings(prev => ({ ...prev, [setting]: false }));
    }
  };

  const handleSettingToggle = (setting) => {
    if (shouldBlockInteraction()) {
      Alert.alert(
        'Safety First',
        'Pull over safely to change settings',
        [{ text: 'OK' }]
      );
      return;
    }

    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting],
    }));

    if (setting === 'voiceEnabled') {
      toggleVoice();
    } else if (setting === 'compassDirections') {
      CompassNavigationService.toggleCompassDirections(settings[setting]);
    } else if (setting === 'compassInVoice') {
      CompassNavigationService.toggleVoiceDirections(settings[setting]);
    } else if (setting === 'compassInVisual') {
      CompassNavigationService.toggleVisualDirections(settings[setting]);
    } else if (setting === 'compassInPOI') {
      CompassNavigationService.togglePOIDirections(settings[setting]);
    } else if (setting === 'displayOverApps') {
      handleDisplayOverAppsToggle(setting);
      return; // Don't toggle normally, handled by special function
    } else if (setting === 'overlayDuringNavigation') {
      DisplayOverAppsService.updateSettings({ autoShowDuringNavigation: settings[setting] });
    } else if (setting === 'overlayShowSpeed') {
      DisplayOverAppsService.updateSettings({ showSpeedometer: settings[setting] });
    } else if (setting === 'overlayShowInstructions') {
      DisplayOverAppsService.updateSettings({ showNextTurn: settings[setting] });
    } else if (setting === 'errorMonitoring') {
      ErrorMonitoringService.updateSettings({ enabled: value });
    } else if (setting === 'proactiveErrorDetection') {
      ErrorMonitoringService.updateSettings({ proactiveDetection: value });
    } else if (setting === 'autoErrorRecovery') {
      ErrorMonitoringService.updateSettings({ autoRecovery: value });
    } else if (setting === 'systemHealthAlerts') {
      ErrorMonitoringService.updateSettings({ healthAlerts: value });
    }
  };

  const handleSpeedThresholdChange = () => {
    if (shouldBlockInteraction()) {
      Alert.alert(
        'Safety First',
        'Pull over safely to change safety settings',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Speed Threshold',
      'Set the speed threshold for driving mode detection',
      [
        { text: '3 mph', onPress: () => setSpeedThreshold(3) },
        { text: '5 mph', onPress: () => setSpeedThreshold(5) },
        { text: '8 mph', onPress: () => setSpeedThreshold(8) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const settingSections = [
    {
      title: 'Safety & Navigation',
      items: [
        {
          icon: 'mic',
          title: 'Voice Commands',
          description: 'Enable hands-free voice control',
          type: 'switch',
          key: 'voiceEnabled',
          color: '#00FF88',
        },
        {
          icon: 'eco',
          title: 'Eco Mode',
          description: 'Prioritize fuel-efficient routes',
          type: 'switch',
          key: 'ecoMode',
          color: '#4CAF50',
        },
        {
          icon: 'speed',
          title: 'Speed Threshold',
          description: 'Adjust driving mode detection sensitivity',
          type: 'action',
          onPress: handleSpeedThresholdChange,
          color: '#FFA500',
        },
        {
          icon: 'warning',
          title: 'Speed Alerts',
          description: 'Get notified when exceeding speed limits',
          type: 'switch',
          key: 'speedAlerts',
          color: '#FF6B6B',
        },
      ],
    },
    {
      title: 'Compass & Directions',
      items: [
        {
          icon: 'explore',
          title: 'Compass Directions',
          description: 'Show cardinal directions (N/S/E/W) in navigation',
          type: 'switch',
          key: 'compassDirections',
          color: '#2196F3',
        },
        {
          icon: 'record-voice-over',
          title: 'Voice Directions',
          description: 'Include compass directions in voice announcements',
          type: 'switch',
          key: 'compassInVoice',
          color: '#9C27B0',
        },
        {
          icon: 'visibility',
          title: 'Visual Directions',
          description: 'Show compass directions in turn instructions',
          type: 'switch',
          key: 'compassInVisual',
          color: '#FF9800',
        },
        {
          icon: 'place',
          title: 'POI Directions',
          description: 'Include directions when announcing nearby places',
          type: 'switch',
          key: 'compassInPOI',
          color: '#4CAF50',
        },
      ],
    },
    {
      title: 'Display Over Other Apps',
      items: [
        {
          icon: 'picture-in-picture-alt',
          title: 'Display Over Apps',
          description: 'Show navigation overlay on top of other apps',
          type: 'switch',
          key: 'displayOverApps',
          color: '#E91E63',
        },
        {
          icon: 'navigation',
          title: 'Auto-Show During Navigation',
          description: 'Automatically show overlay when navigation starts',
          type: 'switch',
          key: 'overlayDuringNavigation',
          color: '#2196F3',
        },
        {
          icon: 'speed',
          title: 'Show Speedometer',
          description: 'Display current speed in overlay',
          type: 'switch',
          key: 'overlayShowSpeed',
          color: '#00FF88',
        },
        {
          icon: 'directions',
          title: 'Show Instructions',
          description: 'Display turn-by-turn directions in overlay',
          type: 'switch',
          key: 'overlayShowInstructions',
          color: '#FF9800',
        },
      ],
    },
    {
      title: 'Error Monitoring & Recovery',
      items: [
        {
          icon: 'monitor-heart',
          title: 'Error Monitoring',
          description: 'Monitor system health and detect errors proactively',
          type: 'switch',
          key: 'errorMonitoring',
          color: '#E91E63',
        },
        {
          icon: 'auto-fix-high',
          title: 'Proactive Error Detection',
          description: 'Detect potential issues before they cause problems',
          type: 'switch',
          key: 'proactiveErrorDetection',
          color: '#2196F3',
        },
        {
          icon: 'healing',
          title: 'Auto Error Recovery',
          description: 'Automatically attempt to recover from errors',
          type: 'switch',
          key: 'autoErrorRecovery',
          color: '#00FF88',
        },
        {
          icon: 'notifications-active',
          title: 'System Health Alerts',
          description: 'Receive alerts about system health issues',
          type: 'switch',
          key: 'systemHealthAlerts',
          color: '#FF9800',
        },
      ],
    },
    {
      title: 'App Experience',
      items: [
        {
          icon: 'notifications',
          title: 'Notifications',
          description: 'Receive app notifications and alerts',
          type: 'switch',
          key: 'notifications',
          color: '#007AFF',
        },
        {
          icon: 'vibration',
          title: 'Haptic Feedback',
          description: 'Feel vibrations for interactions',
          type: 'switch',
          key: 'hapticFeedback',
          color: '#9C27B0',
        },
        {
          icon: 'dark-mode',
          title: 'Dark Mode',
          description: 'Use dark theme for better night visibility',
          type: 'switch',
          key: 'darkMode',
          color: '#666',
        },
        {
          icon: 'brightness-auto',
          title: 'Auto Night Mode',
          description: 'Automatically adjust for night driving',
          type: 'switch',
          key: 'autoNightMode',
          color: '#FFD700',
        },
      ],
    },
    {
      title: 'Navigation Settings',
      items: [
        {
          icon: 'directions-car',
          title: 'Vehicle Type',
          description: 'Set your vehicle type for optimized routing',
          type: 'action',
          onPress: () => navigation.navigate('VehicleSettings'),
          color: '#9C27B0',
        },
        {
          icon: 'straighten',
          title: 'Units & Measurements',
          description: 'Configure distance and speed units',
          type: 'action',
          onPress: () => navigation.navigate('UnitsSettings'),
          color: '#FF9800',
        },
        {
          icon: 'record-voice-over',
          title: 'Voice Settings',
          description: 'Customize voice announcements and language',
          type: 'action',
          onPress: () => navigation.navigate('VoiceSettings'),
          color: '#4CAF50',
        },
        {
          icon: 'offline-pin',
          title: 'Offline Maps',
          description: 'Download maps for offline navigation',
          type: 'action',
          onPress: () => navigation.navigate('OfflineMap'),
          color: '#2196F3',
        },
      ],
    },
    {
      title: 'Premium Features',
      items: [
        {
          icon: 'workspace-premium',
          title: 'VibeVoyage Premium',
          description: 'Unlock advanced features and remove ads',
          type: 'action',
          onPress: () => navigation.navigate('Premium'),
          color: '#FFD700',
        },
        {
          icon: 'share',
          title: 'Social Sharing',
          description: 'Share your achievements and routes',
          type: 'action',
          onPress: () => navigation.navigate('SocialSharing'),
          color: '#E91E63',
        },
      ],
    },
    {
      title: 'Privacy & Data',
      items: [
        {
          icon: 'share',
          title: 'Share Usage Data',
          description: 'Help improve VibeVoyage with anonymous data',
          type: 'switch',
          key: 'shareData',
          color: '#00BCD4',
        },
        {
          icon: 'privacy-tip',
          title: 'Privacy Policy',
          description: 'View our privacy policy',
          type: 'action',
          onPress: () => Alert.alert('Privacy Policy', 'Feature coming soon!'),
          color: '#795548',
        },
        {
          icon: 'delete',
          title: 'Clear Data',
          description: 'Reset all app data and preferences',
          type: 'action',
          onPress: () => {
            Alert.alert(
              'Clear Data',
              'This will reset all your progress and settings. Are you sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => {} },
              ]
            );
          },
          color: '#F44336',
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          icon: 'info',
          title: 'App Version',
          description: 'VibeVoyage v1.0.0',
          type: 'info',
          color: '#607D8B',
        },
        {
          icon: 'help',
          title: 'Help & Support',
          description: 'Get help and contact support',
          type: 'action',
          onPress: () => Alert.alert('Help & Support', 'Feature coming soon!'),
          color: '#3F51B5',
        },
        {
          icon: 'feedback',
          title: 'Send Feedback',
          description: 'Share your thoughts and suggestions',
          type: 'action',
          onPress: () => Alert.alert('Send Feedback', 'Feature coming soon!'),
          color: '#E91E63',
        },
      ],
    },
  ];

  const renderSettingItem = (item) => {
    switch (item.type) {
      case 'switch':
        return (
          <View key={item.key} style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: `${item.color}20` }]}>
                <Icon name={item.icon} size={24} color={item.color} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{item.title}</Text>
                <Text style={styles.settingDescription}>{item.description}</Text>
              </View>
            </View>
            <Switch
              value={settings[item.key]}
              onValueChange={() => handleSettingToggle(item.key)}
              trackColor={{ false: '#333', true: item.color }}
              thumbColor={settings[item.key] ? '#fff' : '#666'}
            />
          </View>
        );

      case 'action':
        return (
          <TouchableOpacity
            key={item.title}
            style={styles.settingItem}
            onPress={item.onPress}
          >
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: `${item.color}20` }]}>
                <Icon name={item.icon} size={24} color={item.color} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{item.title}</Text>
                <Text style={styles.settingDescription}>{item.description}</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>
        );

      case 'info':
        return (
          <View key={item.title} style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: `${item.color}20` }]}>
                <Icon name={item.icon} size={24} color={item.color} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{item.title}</Text>
                <Text style={styles.settingDescription}>{item.description}</Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

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
        
        <Text style={styles.headerTitle}>Settings</Text>
        
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {settingSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map(renderSettingItem)}
            </View>
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            VibeVoyage - Safe, Smart, Sustainable Navigation
          </Text>
          <Text style={styles.footerSubtext}>
            Made with ❤️ for safer roads
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
  headerSpacer: {
    width: 40,
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
  sectionContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#999',
    lineHeight: 16,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#00FF88',
    fontWeight: '500',
    marginBottom: 5,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#666',
  },
});

export default SettingsScreen;
