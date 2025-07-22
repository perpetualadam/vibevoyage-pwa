import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { ProgressBar, Card } from 'react-native-paper';

import ErrorMonitoringService from '../services/ErrorMonitoringService';
import FallbackBehaviorService from '../services/FallbackBehaviorService';

const SystemHealthDashboard = ({ 
  onErrorPress,
  onRecoveryPress,
  showDetailedView = true,
  refreshInterval = 30000,
}) => {
  const [systemHealth, setSystemHealth] = useState({});
  const [fallbackModes, setFallbackModes] = useState({});
  const [errorHistory, setErrorHistory] = useState([]);
  const [overallScore, setOverallScore] = useState(100);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    initializeDashboard();
    setupListeners();
    
    const interval = setInterval(() => {
      refreshHealthData();
    }, refreshInterval);

    return () => {
      clearInterval(interval);
      cleanupListeners();
    };
  }, []);

  const initializeDashboard = async () => {
    try {
      await ErrorMonitoringService.initialize();
      await FallbackBehaviorService.initialize();
      refreshHealthData();
    } catch (error) {
      console.error('Failed to initialize system health dashboard:', error);
    }
  };

  const setupListeners = () => {
    // Listen for error monitoring events
    ErrorMonitoringService.addListener((event, data) => {
      switch (event) {
        case 'systemHealthUpdate':
          setSystemHealth(data.systemHealth);
          setOverallScore(data.overallScore);
          break;
        case 'errorLogged':
          refreshErrorHistory();
          triggerHealthAlert();
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
        case 'emergencyModeActivated':
          setFallbackModes(FallbackBehaviorService.getCurrentFallbackModes());
          break;
      }
    });
  };

  const cleanupListeners = () => {
    // Cleanup would be handled by service destroy methods
  };

  const refreshHealthData = async () => {
    try {
      const health = ErrorMonitoringService.getSystemHealth();
      const modes = FallbackBehaviorService.getCurrentFallbackModes();
      const errors = ErrorMonitoringService.getErrorHistory();
      
      setSystemHealth(health);
      setFallbackModes(modes);
      setErrorHistory(errors.slice(0, 10)); // Show last 10 errors
      
      // Calculate overall score
      const scores = Object.values(health).map(component => {
        switch (component.status) {
          case 'good': return 100;
          case 'fair': return 60;
          case 'poor': return 30;
          case 'error': return 0;
          default: return 50;
        }
      });
      
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      setOverallScore(avgScore);
      
    } catch (error) {
      console.error('Failed to refresh health data:', error);
    }
  };

  const refreshErrorHistory = () => {
    const errors = ErrorMonitoringService.getErrorHistory();
    setErrorHistory(errors.slice(0, 10));
  };

  const triggerHealthAlert = () => {
    // Animate pulse effect for health alerts
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const showEmergencyAlert = () => {
    Alert.alert(
      'Emergency Mode Activated',
      'System health is critically low. VibeVoyage is now operating in emergency mode with minimal features.',
      [
        { text: 'View Details', onPress: () => toggleSection('emergency') },
        { text: 'OK' },
      ]
    );
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await refreshHealthData();
    setIsRefreshing(false);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getOverallHealthColor = () => {
    if (overallScore >= 80) return '#00FF88';
    if (overallScore >= 60) return '#FFA500';
    if (overallScore >= 40) return '#FF6B6B';
    return '#F44336';
  };

  const getHealthIcon = (component, status) => {
    const icons = {
      internet: status === 'good' ? 'wifi' : 'wifi-off',
      location: status === 'good' ? 'location-on' : 'location-off',
      gps: status === 'good' ? 'gps-fixed' : 'gps-not-fixed',
      compass: status === 'good' ? 'explore' : 'explore-off',
      storage: status === 'good' ? 'storage' : 'sd-storage',
      battery: status === 'good' ? 'battery-full' : 'battery-alert',
    };
    return icons[component] || 'help-outline';
  };

  const getHealthColor = (status) => {
    switch (status) {
      case 'good': return '#00FF88';
      case 'fair': return '#FFA500';
      case 'poor': return '#FF6B6B';
      case 'error': return '#F44336';
      default: return '#666';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#FF6B6B';
      case 'medium': return '#FFA500';
      case 'low': return '#FFEB3B';
      default: return '#2196F3';
    }
  };

  const renderOverallHealth = () => (
    <Animated.View style={[styles.overallHealthCard, { transform: [{ scale: pulseAnim }] }]}>
      <LinearGradient
        colors={[`${getOverallHealthColor()}20`, `${getOverallHealthColor()}10`]}
        style={styles.healthCardGradient}
      >
        <View style={styles.healthScoreContainer}>
          <Text style={styles.healthScoreLabel}>System Health</Text>
          <Text style={[styles.healthScore, { color: getOverallHealthColor() }]}>
            {Math.round(overallScore)}%
          </Text>
        </View>
        
        <View style={styles.healthProgressContainer}>
          <ProgressBar 
            progress={overallScore / 100} 
            color={getOverallHealthColor()}
            style={styles.healthProgressBar}
          />
        </View>
        
        <View style={styles.healthStatusContainer}>
          <Icon 
            name={overallScore >= 80 ? 'check-circle' : overallScore >= 40 ? 'warning' : 'error'} 
            size={20} 
            color={getOverallHealthColor()} 
          />
          <Text style={[styles.healthStatusText, { color: getOverallHealthColor() }]}>
            {overallScore >= 80 ? 'Excellent' : overallScore >= 60 ? 'Good' : overallScore >= 40 ? 'Fair' : 'Poor'}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderComponentHealth = () => (
    <Card style={styles.componentCard}>
      <TouchableOpacity 
        style={styles.cardHeader}
        onPress={() => toggleSection('components')}
      >
        <Text style={styles.cardTitle}>Component Health</Text>
        <Icon 
          name={expandedSections.components ? 'expand-less' : 'expand-more'} 
          size={24} 
          color="#FFF" 
        />
      </TouchableOpacity>
      
      {expandedSections.components && (
        <View style={styles.cardContent}>
          {Object.entries(systemHealth).map(([component, health]) => (
            <View key={component} style={styles.componentItem}>
              <View style={styles.componentHeader}>
                <Icon 
                  name={getHealthIcon(component, health.status)} 
                  size={20} 
                  color={getHealthColor(health.status)} 
                />
                <Text style={styles.componentName}>
                  {component.charAt(0).toUpperCase() + component.slice(1)}
                </Text>
                <Text style={[styles.componentStatus, { color: getHealthColor(health.status) }]}>
                  {health.status}
                </Text>
              </View>
              
              {health.lastCheck && (
                <Text style={styles.componentLastCheck}>
                  Last checked: {new Date(health.lastCheck).toLocaleTimeString()}
                </Text>
              )}
              
              {health.failures > 0 && (
                <Text style={styles.componentFailures}>
                  Failures: {health.failures}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </Card>
  );

  const renderFallbackModes = () => (
    <Card style={styles.fallbackCard}>
      <TouchableOpacity 
        style={styles.cardHeader}
        onPress={() => toggleSection('fallbacks')}
      >
        <Text style={styles.cardTitle}>Fallback Modes</Text>
        <Icon 
          name={expandedSections.fallbacks ? 'expand-less' : 'expand-more'} 
          size={24} 
          color="#FFF" 
        />
      </TouchableOpacity>
      
      {expandedSections.fallbacks && (
        <View style={styles.cardContent}>
          {Object.entries(fallbackModes).map(([mode, active]) => (
            <View key={mode} style={styles.fallbackItem}>
              <Icon 
                name={active ? 'toggle-on' : 'toggle-off'} 
                size={24} 
                color={active ? '#00FF88' : '#666'} 
              />
              <Text style={[styles.fallbackName, { color: active ? '#00FF88' : '#CCC' }]}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode
              </Text>
              <Text style={[styles.fallbackStatus, { color: active ? '#00FF88' : '#666' }]}>
                {active ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );

  const renderRecentErrors = () => (
    <Card style={styles.errorsCard}>
      <TouchableOpacity 
        style={styles.cardHeader}
        onPress={() => toggleSection('errors')}
      >
        <Text style={styles.cardTitle}>Recent Errors</Text>
        <View style={styles.errorBadge}>
          <Text style={styles.errorBadgeText}>{errorHistory.length}</Text>
        </View>
        <Icon 
          name={expandedSections.errors ? 'expand-less' : 'expand-more'} 
          size={24} 
          color="#FFF" 
        />
      </TouchableOpacity>
      
      {expandedSections.errors && (
        <View style={styles.cardContent}>
          {errorHistory.length === 0 ? (
            <Text style={styles.noErrorsText}>No recent errors</Text>
          ) : (
            errorHistory.map((error, index) => (
              <TouchableOpacity
                key={error.id}
                style={styles.errorItem}
                onPress={() => onErrorPress && onErrorPress(error)}
              >
                <View style={styles.errorHeader}>
                  <Icon 
                    name="error-outline" 
                    size={16} 
                    color={getSeverityColor(error.severity)} 
                  />
                  <Text style={styles.errorType}>
                    {error.type.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                  <Text style={styles.errorTime}>
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={styles.errorMessage} numberOfLines={2}>
                  {error.message}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </Card>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <TouchableOpacity 
        style={styles.quickActionButton}
        onPress={() => onRecoveryPress && onRecoveryPress()}
      >
        <Icon name="auto-fix-high" size={20} color="#000" />
        <Text style={styles.quickActionText}>Auto Recovery</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.quickActionButton}
        onPress={onRefresh}
      >
        <Icon name="refresh" size={20} color="#000" />
        <Text style={styles.quickActionText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor="#00FF88"
          colors={['#00FF88']}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {renderOverallHealth()}
      {renderComponentHealth()}
      {renderFallbackModes()}
      {renderRecentErrors()}
      {renderQuickActions()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
  },
  overallHealthCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  healthCardGradient: {
    padding: 20,
  },
  healthScoreContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  healthScoreLabel: {
    fontSize: 16,
    color: '#CCC',
    marginBottom: 8,
  },
  healthScore: {
    fontSize: 48,
    fontWeight: '700',
  },
  healthProgressContainer: {
    marginBottom: 16,
  },
  healthProgressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  healthStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthStatusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  componentCard: {
    backgroundColor: '#1a1a1a',
    marginBottom: 16,
    borderRadius: 12,
  },
  fallbackCard: {
    backgroundColor: '#1a1a1a',
    marginBottom: 16,
    borderRadius: 12,
  },
  errorsCard: {
    backgroundColor: '#1a1a1a',
    marginBottom: 16,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    flex: 1,
  },
  errorBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  errorBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  cardContent: {
    padding: 16,
  },
  componentItem: {
    marginBottom: 16,
  },
  componentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  componentName: {
    fontSize: 16,
    color: '#FFF',
    marginLeft: 8,
    flex: 1,
  },
  componentStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  componentLastCheck: {
    fontSize: 12,
    color: '#999',
    marginLeft: 28,
  },
  componentFailures: {
    fontSize: 12,
    color: '#FF6B6B',
    marginLeft: 28,
  },
  fallbackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fallbackName: {
    fontSize: 16,
    marginLeft: 8,
    flex: 1,
  },
  fallbackStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  noErrorsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  errorType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 6,
    flex: 1,
  },
  errorTime: {
    fontSize: 12,
    color: '#999',
  },
  errorMessage: {
    fontSize: 12,
    color: '#CCC',
    marginLeft: 22,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    marginBottom: 20,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00FF88',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginLeft: 6,
  },
});

export default SystemHealthDashboard;
