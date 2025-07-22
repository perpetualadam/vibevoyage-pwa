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
import RoutingService from '../services/RoutingService';
import RoadObstacleService from '../services/RoadObstacleService';
import RouteIntegrationService from '../services/RouteIntegrationService';
import WeatherService from '../services/WeatherService';
import UnitsService from '../services/UnitsService';
import { useSafety } from '../context/SafetyContext';
import { useVoice } from '../context/VoiceContext';

const RoutePreviewScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { shouldBlockInteraction } = useSafety();
  const { speak } = useVoice();

  const { origin, destination, routeOptions } = route.params;
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [avoidanceSettings, setAvoidanceSettings] = useState({});
  const [includePOIs, setIncludePOIs] = useState(false);
  const [poiCategories, setPOICategories] = useState(['fuel', 'food']);

  useEffect(() => {
    loadRoutePreview();
    loadAvoidanceSettings();
  }, []);

  const loadRoutePreview = async () => {
    try {
      setIsLoading(true);

      let calculatedRoutes;
      if (includePOIs) {
        // Use RouteIntegrationService for routes with POIs
        calculatedRoutes = await RouteIntegrationService.calculateRouteWithPOIs(
          origin,
          destination,
          {
            ...routeOptions,
            alternatives: true,
            avoidCameras: true,
            includePOIs: true,
            poiCategories,
            maxDetourTime: 15, // 15 minutes max detour
          }
        );
      } else {
        // Use standard RoutingService
        calculatedRoutes = await RoutingService.getRoute(origin, destination, {
          ...routeOptions,
          alternatives: true,
          avoidCameras: true,
        });
      }

      setRoutes(calculatedRoutes || []);

      if (calculatedRoutes && calculatedRoutes.length > 0) {
        const poiRoutes = calculatedRoutes.filter(r => r.poiWaypoint);
        const routeDescription = includePOIs && poiRoutes.length > 0
          ? `Found ${calculatedRoutes.length} routes, ${poiRoutes.length} with convenient stops`
          : `Found ${calculatedRoutes.length} route${calculatedRoutes.length > 1 ? 's' : ''}`;

        speak(routeDescription);
      }
    } catch (error) {
      console.error('Error loading route preview:', error);
      Alert.alert('Error', 'Failed to calculate routes');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvoidanceSettings = () => {
    const settings = RoadObstacleService.getSettings();
    setAvoidanceSettings(settings);
  };

  const handleRouteSelection = (index) => {
    if (shouldBlockInteraction()) {
      speak('Pull over safely to change route selection');
      return;
    }

    setSelectedRoute(index);
    const route = routes[index];
    speak(`Route ${index + 1} selected. ${Math.round(route.duration)} minutes, ${route.distance.toFixed(1)} kilometers`);
  };

  const handleStartNavigation = () => {
    if (routes.length === 0) {
      Alert.alert('Error', 'No routes available');
      return;
    }

    const selectedRouteData = routes[selectedRoute];
    
    // Check for unavoidable obstacles
    if (selectedRouteData.obstacleInfo && selectedRouteData.obstacleInfo.avoidableObstacles > 0) {
      const obstacleTypes = Object.keys(selectedRouteData.obstacleInfo.avoidanceImpact.obstacleTypes);
      const obstacleList = obstacleTypes.map(type => type.replace('_', ' ')).join(', ');
      
      Alert.alert(
        'Route Contains Obstacles',
        `This route contains: ${obstacleList}\n\nWould you like to proceed or try a different route?`,
        [
          { text: 'Try Different Route', style: 'cancel' },
          {
            text: 'Proceed Anyway',
            onPress: () => startNavigationWithRoute(selectedRouteData),
          },
        ]
      );
    } else {
      startNavigationWithRoute(selectedRouteData);
    }
  };

  const startNavigationWithRoute = (routeData) => {
    navigation.navigate('Navigation', {
      route: routeData,
      destination,
      origin,
    });
  };

  const handleAdjustPreferences = () => {
    if (shouldBlockInteraction()) {
      speak('Pull over safely to adjust preferences');
      return;
    }

    navigation.navigate('RoadObstacleSettings');
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getObstacleIcon = (type) => {
    switch (type) {
      case 'speed_camera': return 'camera-alt';
      case 'red_light_camera': return 'traffic';
      case 'police_checkpoint': return 'local-police';
      case 'railway_crossing': return 'train';
      case 'toll_road': return 'toll';
      case 'construction_zone': return 'construction';
      default: return 'block';
    }
  };

  const getObstacleSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#FF6B6B';
      case 'medium': return '#FFA500';
      case 'low': return '#FFD700';
      default: return '#666';
    }
  };

  const renderRouteCard = (routeData, index) => {
    const isSelected = index === selectedRoute;
    const obstacleInfo = routeData.obstacleInfo || {};
    const avoidanceImpact = obstacleInfo.avoidanceImpact || {};
    
    return (
      <TouchableOpacity
        key={index}
        style={[styles.routeCard, isSelected && styles.selectedRouteCard]}
        onPress={() => handleRouteSelection(index)}
      >
        <LinearGradient
          colors={
            isSelected
              ? ['rgba(0, 255, 136, 0.3)', 'rgba(0, 255, 136, 0.1)']
              : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
          }
          style={styles.routeGradient}
        >
          <View style={styles.routeHeader}>
            <View style={styles.routeInfo}>
              <Text style={styles.routeTitle}>Route {index + 1}</Text>
              <Text style={styles.routeSubtitle}>
                {formatDuration(routeData.duration)} • {routeData.distance.toFixed(1)} km
              </Text>
            </View>
            
            <View style={styles.routeStats}>
              <View style={styles.statItem}>
                <Icon name="eco" size={16} color="#4CAF50" />
                <Text style={styles.statText}>{routeData.ecoScore}%</Text>
              </View>
              
              {routeData.tollFree === false && (
                <View style={styles.statItem}>
                  <Icon name="toll" size={16} color="#FFA500" />
                  <Text style={styles.statText}>${routeData.estimatedTollCost}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Obstacle Summary */}
          {obstacleInfo.totalObstacles > 0 && (
            <View style={styles.obstacleSection}>
              <Text style={styles.obstacleTitle}>
                {obstacleInfo.avoidableObstacles > 0 ? 'Unavoidable Obstacles' : 'Route Clear'}
              </Text>
              
              {obstacleInfo.avoidableObstacles > 0 ? (
                <View style={styles.obstacleList}>
                  {Object.entries(avoidanceImpact.obstacleTypes || {}).map(([type, count]) => (
                    <View key={type} style={styles.obstacleItem}>
                      <Icon
                        name={getObstacleIcon(type)}
                        size={14}
                        color={getObstacleSeverityColor(avoidanceImpact.severity)}
                      />
                      <Text style={styles.obstacleText}>
                        {count}x {type.replace('_', ' ')}
                      </Text>
                    </View>
                  ))}
                  
                  <Text style={styles.extraTimeText}>
                    +{Math.round(avoidanceImpact.estimatedExtraTime / 60)} min extra
                  </Text>
                </View>
              ) : (
                <View style={styles.clearRoute}>
                  <Icon name="check-circle" size={16} color="#00FF88" />
                  <Text style={styles.clearRouteText}>No obstacles to avoid</Text>
                </View>
              )}
            </View>
          )}

          {/* Route Features */}
          <View style={styles.routeFeatures}>
            {routeData.isEcoFriendly && (
              <View style={[styles.featureTag, { backgroundColor: 'rgba(76, 175, 80, 0.2)' }]}>
                <Text style={[styles.featureText, { color: '#4CAF50' }]}>Eco-Friendly</Text>
              </View>
            )}
            
            {routeData.tollFree && (
              <View style={[styles.featureTag, { backgroundColor: 'rgba(0, 255, 136, 0.2)' }]}>
                <Text style={[styles.featureText, { color: '#00FF88' }]}>Toll-Free</Text>
              </View>
            )}
            
            {routeData.obstacleFriendly && (
              <View style={[styles.featureTag, { backgroundColor: 'rgba(0, 255, 136, 0.2)' }]}>
                <Text style={[styles.featureText, { color: '#00FF88' }]}>Obstacle-Free</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#1a1a1a', '#000']} style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#00FF88" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Route Preview</Text>
          <View style={styles.backButton} />
        </LinearGradient>
        
        <View style={styles.loadingContainer}>
          <Icon name="route" size={60} color="#00FF88" />
          <Text style={styles.loadingText}>Calculating routes...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={['#1a1a1a', '#000']} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#00FF88" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Route Preview</Text>
        
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={handleAdjustPreferences}
        >
          <Icon name="tune" size={24} color="#FFA500" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Destination Info */}
        <View style={styles.destinationCard}>
          <LinearGradient
            colors={['rgba(0, 122, 255, 0.2)', 'rgba(0, 122, 255, 0.1)']}
            style={styles.destinationGradient}
          >
            <Icon name="place" size={24} color="#007AFF" />
            <View style={styles.destinationInfo}>
              <Text style={styles.destinationTitle}>Destination</Text>
              <Text style={styles.destinationAddress}>
                {destination.name || `${destination.latitude.toFixed(4)}, ${destination.longitude.toFixed(4)}`}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Routes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Available Routes ({routes.length})
          </Text>
          
          {routes.length === 0 ? (
            <View style={styles.noRoutesContainer}>
              <Icon name="error-outline" size={60} color="#666" />
              <Text style={styles.noRoutesText}>No routes found</Text>
              <Text style={styles.noRoutesSubtext}>
                Try adjusting your avoidance preferences or check your destination
              </Text>
            </View>
          ) : (
            routes.map(renderRouteCard)
          )}
        </View>

        {/* Action Buttons */}
        {routes.length > 0 && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={handleAdjustPreferences}
            >
              <LinearGradient
                colors={['rgba(255, 165, 0, 0.3)', 'rgba(255, 165, 0, 0.1)']}
                style={styles.buttonGradient}
              >
                <Icon name="tune" size={20} color="#FFA500" />
                <Text style={styles.adjustButtonText}>Adjust Preferences</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStartNavigation}
            >
              <LinearGradient
                colors={['#00FF88', '#00E676']}
                style={styles.buttonGradient}
              >
                <Icon name="navigation" size={20} color="#000" />
                <Text style={styles.startButtonText}>Start Navigation</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
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
  settingsButton: {
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#00FF88',
    marginTop: 20,
  },
  destinationCard: {
    marginVertical: 15,
    borderRadius: 15,
    overflow: 'hidden',
  },
  destinationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
  },
  destinationInfo: {
    marginLeft: 15,
    flex: 1,
  },
  destinationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  destinationAddress: {
    fontSize: 14,
    color: '#999',
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
  routeCard: {
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
  },
  selectedRouteCard: {
    transform: [{ scale: 1.02 }],
  },
  routeGradient: {
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  routeInfo: {
    flex: 1,
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  routeSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  routeStats: {
    flexDirection: 'row',
    gap: 15,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  obstacleSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  obstacleTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 8,
  },
  obstacleList: {
    gap: 4,
  },
  obstacleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  obstacleText: {
    fontSize: 12,
    color: '#ccc',
  },
  extraTimeText: {
    fontSize: 12,
    color: '#FFA500',
    fontWeight: '500',
    marginTop: 4,
  },
  clearRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearRouteText: {
    fontSize: 12,
    color: '#00FF88',
  },
  routeFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  featureTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featureText: {
    fontSize: 10,
    fontWeight: '500',
  },
  noRoutesContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  noRoutesText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  noRoutesSubtext: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15,
    marginVertical: 20,
  },
  adjustButton: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
  },
  startButton: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },
  adjustButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFA500',
    marginLeft: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
});

export default RoutePreviewScreen;
