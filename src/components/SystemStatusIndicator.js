import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NetInfo from '@react-native-community/netinfo';
import { check, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SystemStatusIndicator = ({ 
  position = 'top', // 'top', 'bottom', 'floating'
  onStatusPress,
  showDetails = false,
  style,
}) => {
  const insets = useSafeAreaInsets();
  const [systemStatus, setSystemStatus] = useState({
    internet: { status: 'checking', strength: 0 },
    location: { status: 'checking', accuracy: 0 },
    gps: { status: 'checking', satellites: 0 },
    battery: { status: 'good', level: 100 },
    storage: { status: 'good', available: 100 },
  });
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0.8));
  const [slideAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    initializeStatusMonitoring();
    const interval = setInterval(updateSystemStatus, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  const initializeStatusMonitoring = async () => {
    // Monitor network status
    NetInfo.addEventListener(handleNetworkChange);
    
    // Check initial status
    await updateSystemStatus();
    
    // Animate in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const handleNetworkChange = (state) => {
    setSystemStatus(prev => ({
      ...prev,
      internet: {
        status: state.isConnected ? 'connected' : 'disconnected',
        strength: state.isConnected ? (state.details?.strength || 100) : 0,
        type: state.type,
      },
    }));
  };

  const updateSystemStatus = async () => {
    try {
      // Check location permission
      const locationPermission = await checkLocationPermission();
      
      // Check GPS status (simulated)
      const gpsStatus = await checkGPSStatus();
      
      // Check battery status (simulated for demo)
      const batteryStatus = await checkBatteryStatus();
      
      // Check storage status (simulated)
      const storageStatus = await checkStorageStatus();

      setSystemStatus(prev => ({
        ...prev,
        location: locationPermission,
        gps: gpsStatus,
        battery: batteryStatus,
        storage: storageStatus,
      }));
    } catch (error) {
      console.error('Error updating system status:', error);
    }
  };

  const checkLocationPermission = async () => {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE 
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
      
      const result = await check(permission);
      
      return {
        status: result === RESULTS.GRANTED ? 'granted' : 'denied',
        accuracy: result === RESULTS.GRANTED ? 95 : 0,
      };
    } catch (error) {
      return { status: 'error', accuracy: 0 };
    }
  };

  const checkGPSStatus = async () => {
    // In a real implementation, this would check actual GPS status
    // For now, we'll simulate based on location permission
    const hasLocation = systemStatus.location.status === 'granted';
    
    return {
      status: hasLocation ? 'active' : 'inactive',
      satellites: hasLocation ? Math.floor(Math.random() * 8) + 4 : 0,
      accuracy: hasLocation ? Math.floor(Math.random() * 10) + 3 : 0,
    };
  };

  const checkBatteryStatus = async () => {
    // In a real implementation, this would use react-native-device-info
    // For now, we'll simulate battery status
    const level = Math.floor(Math.random() * 100);
    
    return {
      status: level > 20 ? 'good' : level > 10 ? 'low' : 'critical',
      level,
      charging: Math.random() > 0.5,
    };
  };

  const checkStorageStatus = async () => {
    // In a real implementation, this would check actual storage
    const available = Math.floor(Math.random() * 100);
    
    return {
      status: available > 20 ? 'good' : available > 10 ? 'low' : 'critical',
      available,
      total: 100,
    };
  };

  const getStatusColor = (status, value) => {
    switch (status) {
      case 'connected':
      case 'granted':
      case 'active':
      case 'good':
        return '#00FF88';
      case 'checking':
      case 'low':
        return '#FFA500';
      case 'disconnected':
      case 'denied':
      case 'inactive':
      case 'critical':
      case 'error':
        return '#FF6B6B';
      default:
        return '#666';
    }
  };

  const getStatusIcon = (type, status) => {
    const iconMap = {
      internet: {
        connected: 'wifi',
        disconnected: 'wifi-off',
        checking: 'wifi',
      },
      location: {
        granted: 'location-on',
        denied: 'location-off',
        checking: 'location-searching',
      },
      gps: {
        active: 'gps-fixed',
        inactive: 'gps-not-fixed',
        checking: 'gps-not-fixed',
      },
      battery: {
        good: 'battery-full',
        low: 'battery-alert',
        critical: 'battery-unknown',
      },
      storage: {
        good: 'storage',
        low: 'sd-storage',
        critical: 'storage',
      },
    };

    return iconMap[type]?.[status] || 'help-outline';
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    
    Animated.timing(slideAnim, {
      toValue: isExpanded ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    if (onStatusPress) {
      onStatusPress(systemStatus);
    }
  };

  const getOverallStatus = () => {
    const statuses = Object.values(systemStatus);
    const criticalCount = statuses.filter(s => 
      s.status === 'critical' || s.status === 'error' || s.status === 'disconnected' || s.status === 'denied'
    ).length;
    
    const warningCount = statuses.filter(s => 
      s.status === 'low' || s.status === 'checking' || s.status === 'inactive'
    ).length;

    if (criticalCount > 0) return { status: 'critical', color: '#FF6B6B' };
    if (warningCount > 0) return { status: 'warning', color: '#FFA500' };
    return { status: 'good', color: '#00FF88' };
  };

  const renderCompactView = () => {
    const overall = getOverallStatus();
    
    return (
      <TouchableOpacity 
        style={[styles.compactContainer, { backgroundColor: `${overall.color}20` }]}
        onPress={toggleExpanded}
        accessibilityLabel="System status indicator"
        accessibilityRole="button"
      >
        <Icon name="info-outline" size={16} color={overall.color} />
        <Text style={[styles.compactText, { color: overall.color }]}>
          {overall.status.toUpperCase()}
        </Text>
        <Icon 
          name={isExpanded ? 'expand-less' : 'expand-more'} 
          size={16} 
          color={overall.color} 
        />
      </TouchableOpacity>
    );
  };

  const renderDetailedView = () => {
    return (
      <Animated.View 
        style={[
          styles.detailedContainer,
          {
            opacity: slideAnim,
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              }),
            }],
          },
        ]}
      >
        {Object.entries(systemStatus).map(([key, status]) => (
          <View key={key} style={styles.statusItem}>
            <Icon 
              name={getStatusIcon(key, status.status)} 
              size={20} 
              color={getStatusColor(status.status)} 
            />
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Text>
              <Text style={[styles.statusValue, { color: getStatusColor(status.status) }]}>
                {getStatusText(key, status)}
              </Text>
            </View>
          </View>
        ))}
      </Animated.View>
    );
  };

  const getStatusText = (type, status) => {
    switch (type) {
      case 'internet':
        return status.status === 'connected' 
          ? `${status.type?.toUpperCase() || 'Connected'}` 
          : 'Offline';
      case 'location':
        return status.status === 'granted' 
          ? `Accuracy: ${status.accuracy}%` 
          : 'Disabled';
      case 'gps':
        return status.status === 'active' 
          ? `${status.satellites} satellites` 
          : 'No signal';
      case 'battery':
        return `${status.level}%${status.charging ? ' (Charging)' : ''}`;
      case 'storage':
        return `${status.available}% available`;
      default:
        return status.status;
    }
  };

  const getContainerStyle = () => {
    const baseStyle = [styles.container];
    
    switch (position) {
      case 'top':
        baseStyle.push({ 
          top: insets.top + 10,
          left: 10,
          right: 10,
        });
        break;
      case 'bottom':
        baseStyle.push({ 
          bottom: insets.bottom + 10,
          left: 10,
          right: 10,
        });
        break;
      case 'floating':
        baseStyle.push(styles.floating);
        break;
    }
    
    if (style) baseStyle.push(style);
    
    return baseStyle;
  };

  return (
    <Animated.View 
      style={[
        getContainerStyle(),
        { opacity: fadeAnim }
      ]}
    >
      {renderCompactView()}
      {isExpanded && renderDetailedView()}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
  },
  floating: {
    top: 100,
    right: 10,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  compactText: {
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 6,
  },
  detailedContainer: {
    marginTop: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 12,
    padding: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  statusInfo: {
    marginLeft: 12,
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFF',
  },
  statusValue: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default SystemStatusIndicator;
