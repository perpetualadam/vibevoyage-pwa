import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

import PlatformNavigationBar from '../components/PlatformNavigationBar';
import DisplayOverAppsService from '../services/DisplayOverAppsService';

const DisplayOverAppsDemo = ({ navigation }) => {
  const [overlaySettings, setOverlaySettings] = useState({});
  const [hasPermission, setHasPermission] = useState(false);
  const [overlayActive, setOverlayActive] = useState(false);
  const [demoData, setDemoData] = useState({
    currentSpeed: 65,
    speedLimit: 70,
    currentInstruction: 'Turn right onto Main Street in 300m',
    eta: '15:30',
    isNavigating: true,
  });

  useEffect(() => {
    initializeDisplayOverApps();
  }, []);

  const initializeDisplayOverApps = async () => {
    try {
      await DisplayOverAppsService.initialize();
      
      // Load current settings
      const settings = DisplayOverAppsService.getOverlaySettings();
      setOverlaySettings(settings);
      
      // Check permission status
      const permission = DisplayOverAppsService.hasOverlayPermission();
      setHasPermission(permission);
      
      // Check if overlay is active
      const active = DisplayOverAppsService.isOverlayActive();
      setOverlayActive(active);
      
      // Listen for service updates
      const unsubscribe = DisplayOverAppsService.addListener((event, data) => {
        switch (event) {
          case 'permissionGranted':
            setHasPermission(true);
            break;
          case 'overlayShown':
            setOverlayActive(true);
            break;
          case 'overlayHidden':
            setOverlayActive(false);
            break;
          case 'settingsUpdated':
            setOverlaySettings(data.settings);
            break;
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error initializing display over apps demo:', error);
    }
  };

  const handlePermissionRequest = async () => {
    try {
      const granted = await DisplayOverAppsService.requestOverlayPermission();
      if (granted) {
        Alert.alert('Permission Granted', 'You can now use display over other apps feature.');
      } else {
        Alert.alert('Permission Denied', 'Display over other apps feature requires this permission to work.');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      Alert.alert('Error', 'Failed to request permission.');
    }
  };

  const handleShowOverlay = async () => {
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please grant overlay permission first.');
      return;
    }

    try {
      const success = await DisplayOverAppsService.showOverlay(demoData);
      if (success) {
        Alert.alert('Overlay Shown', 'Navigation overlay is now displayed over other apps.');
      } else {
        Alert.alert('Error', 'Failed to show overlay.');
      }
    } catch (error) {
      console.error('Error showing overlay:', error);
      Alert.alert('Error', 'Failed to show overlay.');
    }
  };

  const handleHideOverlay = async () => {
    try {
      const success = await DisplayOverAppsService.hideOverlay();
      if (success) {
        Alert.alert('Overlay Hidden', 'Navigation overlay has been hidden.');
      }
    } catch (error) {
      console.error('Error hiding overlay:', error);
    }
  };

  const handleUpdateOverlay = async () => {
    if (!overlayActive) {
      Alert.alert('No Overlay', 'Please show the overlay first.');
      return;
    }

    try {
      const newData = {
        ...demoData,
        currentSpeed: Math.floor(Math.random() * 40) + 40, // 40-80 km/h
        currentInstruction: getRandomInstruction(),
      };
      
      setDemoData(newData);
      await DisplayOverAppsService.updateOverlayData(newData);
      
      Alert.alert('Overlay Updated', 'Navigation data has been updated.');
    } catch (error) {
      console.error('Error updating overlay:', error);
    }
  };

  const handleObstacleAlert = async () => {
    if (!overlayActive) {
      Alert.alert('No Overlay', 'Please show the overlay first.');
      return;
    }

    try {
      await DisplayOverAppsService.showObstacleAlert({
        type: 'Speed camera',
        distance: 500,
        severity: 'high',
      });
      
      Alert.alert('Alert Sent', 'Speed camera alert has been shown in overlay.');
    } catch (error) {
      console.error('Error showing obstacle alert:', error);
    }
  };

  const handleSettingToggle = async (setting, value) => {
    try {
      await DisplayOverAppsService.updateSettings({ [setting]: value });
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  };

  const getRandomInstruction = () => {
    const instructions = [
      'Turn left onto Oak Avenue in 200m',
      'Continue straight for 1.5km',
      'Turn right onto Highway 101 in 800m',
      'Take exit 15 toward Downtown in 1.2km',
      'Merge onto Main Street in 400m',
    ];
    return instructions[Math.floor(Math.random() * instructions.length)];
  };

  const getPermissionStatusColor = () => {
    return hasPermission ? '#00FF88' : '#FF6B6B';
  };

  const getPermissionStatusText = () => {
    return hasPermission ? 'Granted' : 'Not Granted';
  };

  const getOverlayStatusColor = () => {
    return overlayActive ? '#00FF88' : '#666';
  };

  const getOverlayStatusText = () => {
    return overlayActive ? 'Active' : 'Inactive';
  };

  return (
    <SafeAreaView style={styles.container}>
      <PlatformNavigationBar
        title="Display Over Apps Demo"
        showBackButton
        onBackPress={() => navigation.goBack()}
        rightAction={{
          icon: 'picture-in-picture-alt',
          onPress: () => Alert.alert('Display Over Apps', 'This demo showcases the ability to display navigation information over other apps for safer hands-free driving.'),
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Status</Text>
          
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <View style={styles.statusInfo}>
                <Text style={styles.statusLabel}>Platform:</Text>
                <Text style={styles.statusValue}>{Platform.OS === 'android' ? 'Android' : 'iOS'}</Text>
              </View>
              <Icon name="smartphone" size={24} color="#2196F3" />
            </View>
            
            <View style={styles.statusItem}>
              <View style={styles.statusInfo}>
                <Text style={styles.statusLabel}>Permission:</Text>
                <Text style={[styles.statusValue, { color: getPermissionStatusColor() }]}>
                  {getPermissionStatusText()}
                </Text>
              </View>
              <Icon 
                name={hasPermission ? 'check-circle' : 'cancel'} 
                size={24} 
                color={getPermissionStatusColor()} 
              />
            </View>
            
            <View style={styles.statusItem}>
              <View style={styles.statusInfo}>
                <Text style={styles.statusLabel}>Overlay:</Text>
                <Text style={[styles.statusValue, { color: getOverlayStatusColor() }]}>
                  {getOverlayStatusText()}
                </Text>
              </View>
              <Icon 
                name={overlayActive ? 'visibility' : 'visibility-off'} 
                size={24} 
                color={getOverlayStatusColor()} 
              />
            </View>
          </View>
        </View>

        {/* Permission Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overlay Permission</Text>
          <Text style={styles.sectionDescription}>
            {Platform.OS === 'android' 
              ? 'Android requires SYSTEM_ALERT_WINDOW permission to display over other apps.'
              : 'iOS uses Picture-in-Picture mode for overlay functionality.'
            }
          </Text>
          
          {!hasPermission && (
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={handlePermissionRequest}
            >
              <Icon name="security" size={20} color="#FFF" />
              <Text style={styles.permissionButtonText}>Request Permission</Text>
            </TouchableOpacity>
          )}
          
          {hasPermission && (
            <View style={styles.permissionGranted}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.permissionGrantedText}>Permission Granted</Text>
            </View>
          )}
        </View>

        {/* Demo Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demo Controls</Text>
          
          <View style={styles.controlsGrid}>
            <TouchableOpacity
              style={[styles.controlButton, !hasPermission && styles.controlButtonDisabled]}
              onPress={handleShowOverlay}
              disabled={!hasPermission}
            >
              <Icon name="visibility" size={24} color={hasPermission ? "#00FF88" : "#666"} />
              <Text style={[styles.controlButtonText, !hasPermission && styles.controlButtonTextDisabled]}>
                Show Overlay
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, !overlayActive && styles.controlButtonDisabled]}
              onPress={handleHideOverlay}
              disabled={!overlayActive}
            >
              <Icon name="visibility-off" size={24} color={overlayActive ? "#FF6B6B" : "#666"} />
              <Text style={[styles.controlButtonText, !overlayActive && styles.controlButtonTextDisabled]}>
                Hide Overlay
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, !overlayActive && styles.controlButtonDisabled]}
              onPress={handleUpdateOverlay}
              disabled={!overlayActive}
            >
              <Icon name="update" size={24} color={overlayActive ? "#2196F3" : "#666"} />
              <Text style={[styles.controlButtonText, !overlayActive && styles.controlButtonTextDisabled]}>
                Update Data
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, !overlayActive && styles.controlButtonDisabled]}
              onPress={handleObstacleAlert}
              disabled={!overlayActive}
            >
              <Icon name="warning" size={24} color={overlayActive ? "#FFA500" : "#666"} />
              <Text style={[styles.controlButtonText, !overlayActive && styles.controlButtonTextDisabled]}>
                Test Alert
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Demo Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Demo Data</Text>
          
          <View style={styles.demoDataContainer}>
            <View style={styles.demoDataItem}>
              <Text style={styles.demoDataLabel}>Speed:</Text>
              <Text style={styles.demoDataValue}>{demoData.currentSpeed} km/h</Text>
            </View>
            
            <View style={styles.demoDataItem}>
              <Text style={styles.demoDataLabel}>Speed Limit:</Text>
              <Text style={styles.demoDataValue}>{demoData.speedLimit} km/h</Text>
            </View>
            
            <View style={styles.demoDataItem}>
              <Text style={styles.demoDataLabel}>Instruction:</Text>
              <Text style={styles.demoDataValue}>{demoData.currentInstruction}</Text>
            </View>
            
            <View style={styles.demoDataItem}>
              <Text style={styles.demoDataLabel}>ETA:</Text>
              <Text style={styles.demoDataValue}>{demoData.eta}</Text>
            </View>
          </View>
        </View>

        {/* Overlay Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overlay Settings</Text>
          
          <View style={styles.settingsList}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Auto-Show During Navigation</Text>
                <Text style={styles.settingDescription}>
                  Automatically show overlay when navigation starts
                </Text>
              </View>
              <Switch
                value={overlaySettings.autoShowDuringNavigation}
                onValueChange={(value) => handleSettingToggle('autoShowDuringNavigation', value)}
                trackColor={{ false: '#333', true: '#00FF88' }}
                thumbColor="#FFF"
              />
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Show Speedometer</Text>
                <Text style={styles.settingDescription}>
                  Display current speed in overlay
                </Text>
              </View>
              <Switch
                value={overlaySettings.showSpeedometer}
                onValueChange={(value) => handleSettingToggle('showSpeedometer', value)}
                trackColor={{ false: '#333', true: '#00FF88' }}
                thumbColor="#FFF"
              />
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Show Instructions</Text>
                <Text style={styles.settingDescription}>
                  Display turn-by-turn directions
                </Text>
              </View>
              <Switch
                value={overlaySettings.showNextTurn}
                onValueChange={(value) => handleSettingToggle('showNextTurn', value)}
                trackColor={{ false: '#333', true: '#00FF88' }}
                thumbColor="#FFF"
              />
            </View>
          </View>
        </View>

        {/* Features Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Display Over Apps Features</Text>
          
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>System overlay permission management</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Real-time navigation data overlay</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Draggable and resizable overlay window</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Obstacle alerts in overlay</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Cross-platform support (Android/iOS)</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Automatic show/hide during navigation</Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    color: '#CCC',
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
  permissionGranted: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#00FF88',
  },
  permissionGrantedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00FF88',
    marginLeft: 8,
  },
  controlsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  controlButton: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  controlButtonDisabled: {
    backgroundColor: '#0a0a0a',
    borderColor: '#222',
  },
  controlButtonText: {
    fontSize: 14,
    color: '#FFF',
    marginTop: 8,
    textAlign: 'center',
  },
  controlButtonTextDisabled: {
    color: '#666',
  },
  demoDataContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  demoDataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  demoDataLabel: {
    fontSize: 14,
    color: '#CCC',
  },
  demoDataValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    flex: 1,
    textAlign: 'right',
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

export default DisplayOverAppsDemo;
