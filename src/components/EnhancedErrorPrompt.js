import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import NetInfo from '@react-native-community/netinfo';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const EnhancedErrorPrompt = ({ 
  visible, 
  onClose, 
  errorType, 
  customMessage,
  showActions = true,
  autoHide = false,
  autoHideDelay = 5000,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));
  const [isConnected, setIsConnected] = useState(true);
  const [locationPermission, setLocationPermission] = useState('granted');

  useEffect(() => {
    if (visible) {
      showPrompt();
      if (autoHide) {
        setTimeout(() => {
          hidePrompt();
        }, autoHideDelay);
      }
    } else {
      hidePrompt();
    }
  }, [visible]);

  useEffect(() => {
    // Monitor network status
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    // Check location permission
    checkLocationPermission();

    return unsubscribe;
  }, []);

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
      if (onClose) onClose();
    });
  };

  const checkLocationPermission = async () => {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE 
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
      
      const result = await check(permission);
      setLocationPermission(result);
    } catch (error) {
      console.error('Error checking location permission:', error);
    }
  };

  const getErrorConfig = () => {
    switch (errorType) {
      case 'internet_disabled':
        return {
          icon: 'wifi-off',
          iconColor: '#FF6B6B',
          title: 'Internet Connection Required',
          message: customMessage || 'Please turn on your internet connection to access real-time traffic updates and POIs.',
          actions: [
            {
              title: 'Open Settings',
              action: () => openNetworkSettings(),
              primary: true,
            },
            {
              title: 'Use Offline Mode',
              action: () => enableOfflineMode(),
              primary: false,
            },
          ],
        };

      case 'location_disabled':
        return {
          icon: 'location-off',
          iconColor: '#FF9800',
          title: 'Location Services Required',
          message: customMessage || 'Please enable location services to start navigation and view your speed.',
          actions: [
            {
              title: 'Enable Location',
              action: () => requestLocationPermission(),
              primary: true,
            },
            {
              title: 'Open Settings',
              action: () => openLocationSettings(),
              primary: false,
            },
          ],
        };

      case 'gps_weak':
        return {
          icon: 'gps-not-fixed',
          iconColor: '#FFA500',
          title: 'Weak GPS Signal',
          message: customMessage || 'Weak GPS signal detected. Navigation accuracy may be affected. Please move to an open area.',
          actions: [
            {
              title: 'Retry',
              action: () => retryGPS(),
              primary: true,
            },
            {
              title: 'Continue Anyway',
              action: () => hidePrompt(),
              primary: false,
            },
          ],
        };

      case 'offline_mode':
        return {
          icon: 'cloud-off',
          iconColor: '#9E9E9E',
          title: 'App is Offline',
          message: customMessage || 'The app is currently offline. Using cached data for navigation. Some features like live traffic updates may be unavailable.',
          actions: [
            {
              title: 'Check Connection',
              action: () => checkConnection(),
              primary: true,
            },
            {
              title: 'Continue Offline',
              action: () => hidePrompt(),
              primary: false,
            },
          ],
        };

      case 'invalid_input':
        return {
          icon: 'error-outline',
          iconColor: '#F44336',
          title: 'Invalid Input',
          message: customMessage || 'Please enter a valid starting point or destination to begin navigation.',
          actions: [
            {
              title: 'Try Again',
              action: () => hidePrompt(),
              primary: true,
            },
          ],
        };

      case 'route_not_found':
        return {
          icon: 'directions-off',
          iconColor: '#FF5722',
          title: 'Route Not Found',
          message: customMessage || 'Unable to find a route to your destination. Please check your destination or try a different route.',
          actions: [
            {
              title: 'Modify Route',
              action: () => modifyRoute(),
              primary: true,
            },
            {
              title: 'Clear Avoidances',
              action: () => clearAvoidances(),
              primary: false,
            },
          ],
        };

      case 'service_unavailable':
        return {
          icon: 'cloud-off',
          iconColor: '#607D8B',
          title: 'Service Temporarily Unavailable',
          message: customMessage || 'Navigation services are temporarily unavailable. Please try again in a few moments.',
          actions: [
            {
              title: 'Retry',
              action: () => retryService(),
              primary: true,
            },
            {
              title: 'Use Offline',
              action: () => enableOfflineMode(),
              primary: false,
            },
          ],
        };

      default:
        return {
          icon: 'info-outline',
          iconColor: '#2196F3',
          title: 'Information',
          message: customMessage || 'Something needs your attention.',
          actions: [
            {
              title: 'OK',
              action: () => hidePrompt(),
              primary: true,
            },
          ],
        };
    }
  };

  const openNetworkSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('App-Prefs:WIFI');
    } else {
      Linking.sendIntent('android.settings.WIFI_SETTINGS');
    }
    hidePrompt();
  };

  const openLocationSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('App-Prefs:Privacy&path=LOCATION');
    } else {
      Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
    }
    hidePrompt();
  };

  const requestLocationPermission = async () => {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE 
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
      
      const result = await request(permission);
      
      if (result === RESULTS.GRANTED) {
        hidePrompt();
      } else {
        Alert.alert(
          'Permission Required',
          'Location permission is required for navigation. Please enable it in settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: openLocationSettings },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const enableOfflineMode = () => {
    // Notify parent component to enable offline mode
    if (onClose) onClose('enable_offline');
    hidePrompt();
  };

  const retryGPS = () => {
    // Notify parent component to retry GPS
    if (onClose) onClose('retry_gps');
    hidePrompt();
  };

  const checkConnection = async () => {
    const state = await NetInfo.fetch();
    if (state.isConnected) {
      hidePrompt();
    } else {
      Alert.alert(
        'Still Offline',
        'Your device is still not connected to the internet. Please check your connection and try again.'
      );
    }
  };

  const modifyRoute = () => {
    if (onClose) onClose('modify_route');
    hidePrompt();
  };

  const clearAvoidances = () => {
    if (onClose) onClose('clear_avoidances');
    hidePrompt();
  };

  const retryService = () => {
    if (onClose) onClose('retry_service');
    hidePrompt();
  };

  const config = getErrorConfig();

  if (!visible) return null;

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
              <View style={styles.iconContainer}>
                <Icon 
                  name={config.icon} 
                  size={32} 
                  color={config.iconColor} 
                />
              </View>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={hidePrompt}
                accessibilityLabel="Close error prompt"
                accessibilityRole="button"
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>{config.title}</Text>
              <Text style={styles.message}>{config.message}</Text>
            </View>

            {/* Actions */}
            {showActions && config.actions && (
              <View style={styles.actions}>
                {config.actions.map((action, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.actionButton,
                      action.primary ? styles.primaryButton : styles.secondaryButton
                    ]}
                    onPress={action.action}
                    accessibilityLabel={action.title}
                    accessibilityRole="button"
                  >
                    <Text style={[
                      styles.actionText,
                      action.primary ? styles.primaryText : styles.secondaryText
                    ]}>
                      {action.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Status Indicators */}
            <View style={styles.statusIndicators}>
              <View style={styles.statusItem}>
                <Icon 
                  name={isConnected ? 'wifi' : 'wifi-off'} 
                  size={16} 
                  color={isConnected ? '#00FF88' : '#FF6B6B'} 
                />
                <Text style={styles.statusText}>
                  {isConnected ? 'Online' : 'Offline'}
                </Text>
              </View>
              
              <View style={styles.statusItem}>
                <Icon 
                  name={locationPermission === 'granted' ? 'location-on' : 'location-off'} 
                  size={16} 
                  color={locationPermission === 'granted' ? '#00FF88' : '#FF6B6B'} 
                />
                <Text style={styles.statusText}>
                  {locationPermission === 'granted' ? 'Location' : 'No Location'}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  promptContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  promptContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#CCC',
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#00FF88',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  primaryText: {
    color: '#000',
  },
  secondaryText: {
    color: '#FFF',
  },
  statusIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
});

export default EnhancedErrorPrompt;
