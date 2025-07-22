import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import services
import SafetyService from '../services/SafetyService';
import VoiceService from '../services/VoiceService';
import NLPVoiceService from '../services/NLPVoiceService';
import LocationService from '../services/LocationService';
import RoutingService from '../services/RoutingService';
import RoadObstacleService from '../services/RoadObstacleService';
import UnitsService from '../services/UnitsService';
import NotificationSoundsService from '../services/NotificationSoundsService';
import LiveTrafficService from '../services/LiveTrafficService';
import CrashDetectionService from '../services/CrashDetectionService';
import WeatherService from '../services/WeatherService';
import SpeedLimitService from '../services/SpeedLimitService';
import CarIntegrationService from '../services/CarIntegrationService';
import RouteIntegrationService from '../services/RouteIntegrationService';
import CompassNavigationService from '../services/CompassNavigationService';
import DisplayOverAppsService from '../services/DisplayOverAppsService';

// Import components
import SafetyIndicator from '../components/SafetyIndicator';
import VoiceButton from '../components/VoiceButton';
import EnhancedSpeedometer from '../components/EnhancedSpeedometer';
import EcoIndicator from '../components/EcoIndicator';
import ReportButton from '../components/ReportButton';
import DigitalCompass from '../components/DigitalCompass';
import FloatingOverlay from '../components/FloatingOverlay';

const { width, height } = Dimensions.get('window');

const NavigationScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  
  // State management
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [route, setRoute] = useState(null);
  const [isDriving, setIsDriving] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [speedLimit, setSpeedLimit] = useState(null);
  const [isEcoMode, setIsEcoMode] = useState(false);
  const [isCarConnected, setIsCarConnected] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [nearbyPOIs, setNearbyPOIs] = useState([]);
  const [announcedPOIs, setAnnouncedPOIs] = useState(new Set());
  const [mapStyle, setMapStyle] = useState('standard');
  const [showReports, setShowReports] = useState(true);
  const [nearbyReports, setNearbyReports] = useState([]);
  const [showCompass, setShowCompass] = useState(true);
  const [showFloatingOverlay, setShowFloatingOverlay] = useState(false);
  const [overlayMinimized, setOverlayMinimized] = useState(false);
  const [currentInstruction, setCurrentInstruction] = useState(null);
  const [nextTurn, setNextTurn] = useState(null);
  const [eta, setEta] = useState(null);
  const [obstacleAlerts, setObstacleAlerts] = useState([]);
  const [avoidanceSettings, setAvoidanceSettings] = useState({});
  const [unavoidableObstacles, setUnavoidableObstacles] = useState([]);
  const [showUnavoidableAlert, setShowUnavoidableAlert] = useState(false);

  useEffect(() => {
    initializeScreen();
    setupServiceListeners();

    return () => {
      cleanupListeners();
    };
  }, []);

  useEffect(() => {
    // Monitor for obstacles when location changes
    if (currentLocation && isDriving) {
      checkForUpcomingObstacles();
      checkForTrafficRerouting();
      updateSpeedLimit();
      checkForNearbyPOIs();
    }
  }, [currentLocation, isDriving]);

  const initializeScreen = async () => {
    try {
      // Initialize services
      await RoadObstacleService.initialize();
      await NLPVoiceService.initialize();
      await UnitsService.initialize();
      await NotificationSoundsService.initialize();
      await LiveTrafficService.initialize();
      await CrashDetectionService.initialize();
      await WeatherService.initialize();
      await SpeedLimitService.initialize();
      await CarIntegrationService.initialize();
      await RouteIntegrationService.initialize();

      // Get current location
      const location = await LocationService.getCurrentLocation();
      setCurrentLocation(location);

      // Load avoidance settings
      const settings = RoadObstacleService.getSettings();
      setAvoidanceSettings(settings);

      // Center map on current location
      if (mapRef.current && location) {
        mapRef.current.animateToRegion({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    } catch (error) {
      console.error('Navigation screen initialization error:', error);
      Alert.alert('Location Error', 'Unable to get current location');
    }
  };

  const setupServiceListeners = () => {
    // Safety service listeners
    const safetyUnsubscribe = SafetyService.addListener((event, data) => {
      switch (event) {
        case 'drivingStatusChanged':
          setIsDriving(data.isDriving);
          if (data.isDriving) {
            VoiceService.speak('Driving mode activated. Use voice commands for safety.');
          }
          break;
        case 'speedUpdate':
          setCurrentSpeed(data.speed);
          break;
        case 'voiceCommandRequested':
          handleVoiceCommandRequest(data.action);
          break;
      }
    });

    // Voice service listeners
    const voiceUnsubscribe = VoiceService.addListener((event, data) => {
      switch (event) {
        case 'listeningStart':
          setIsVoiceListening(true);
          break;
        case 'listeningStop':
          setIsVoiceListening(false);
          break;
        case 'navigationRequested':
          handleVoiceNavigation(data.destination);
          break;
        case 'searchRequested':
          handleVoiceSearch(data.query);
          break;
        case 'reportRequested':
          handleVoiceReport(data.type);
          break;
        case 'routeTypeRequested':
          handleRouteTypeChange(data.type);
          break;
        case 'arRequested':
          handleARRequest(data.action);
          break;
      }
    });

    // Store unsubscribe functions
    this.safetyUnsubscribe = safetyUnsubscribe;
    this.voiceUnsubscribe = voiceUnsubscribe;
  };

  const cleanupListeners = () => {
    if (this.safetyUnsubscribe) this.safetyUnsubscribe();
    if (this.voiceUnsubscribe) this.voiceUnsubscribe();
  };

  // Voice command handlers
  const handleVoiceCommandRequest = (action) => {
    VoiceService.startListening();
  };

  const handleVoiceNavigation = async (destination) => {
    if (!currentLocation) {
      VoiceService.speak('Current location not available');
      return;
    }

    try {
      VoiceService.speak(`Searching for route to ${destination}`);
      // This would integrate with routing service
      // const route = await RoutingService.getRoute(currentLocation, destination, isEcoMode);
      // setRoute(route);
      // setDestination(destination);
    } catch (error) {
      VoiceService.speak('Unable to find route to destination');
    }
  };

  const handleVoiceSearch = (query) => {
    VoiceService.speak(`Searching for ${query}`);
    // Implement POI search
  };

  const handleVoiceReport = (type) => {
    if (!isDriving) {
      Alert.alert('Report', `Please confirm ${type} report`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => submitReport(type) }
      ]);
    } else {
      // Auto-submit voice reports while driving
      submitReport(type);
      VoiceService.speak(`${type} report submitted`);
    }
  };

  const handleRouteTypeChange = (type) => {
    setIsEcoMode(type === 'eco');
    VoiceService.speak(`Switched to ${type} route`);
    // Recalculate route if active
    if (route && destination) {
      recalculateRoute();
    }
  };

  const handleARRequest = (action) => {
    if (action === 'start') {
      navigation.navigate('ARNavigation');
    }
  };

  // Manual interaction handlers with safety checks
  const handleManualInteraction = (action, callback) => {
    if (SafetyService.shouldBlockManualInteraction()) {
      SafetyService.showSafetyWarning(action);
      return;
    }
    callback();
  };

  const handleReportPress = (type) => {
    handleManualInteraction('report hazard', () => {
      Alert.alert('Report Hazard', `Report ${type}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report', onPress: () => submitReport(type) }
      ]);
    });
  };

  const handleDestinationSearch = () => {
    handleManualInteraction('search destination', () => {
      // Navigate to search screen
      navigation.navigate('Search');
    });
  };

  const submitReport = async (type) => {
    if (!currentLocation) return;

    try {
      // Submit report to community service
      const report = {
        type,
        location: currentLocation,
        timestamp: Date.now(),
        speed: currentSpeed,
        verified: false
      };
      
      // This would integrate with community service
      console.log('Submitting report:', report);
      
      // Add to local reports for immediate display
      setNearbyReports(prev => [...prev, { ...report, id: Date.now() }]);
      
    } catch (error) {
      console.error('Report submission error:', error);
      VoiceService.speak('Failed to submit report');
    }
  };

  const recalculateRoute = async () => {
    if (!currentLocation || !destination) return;
    
    try {
      // Recalculate with current preferences
      // const newRoute = await RoutingService.getRoute(currentLocation, destination, isEcoMode);
      // setRoute(newRoute);
    } catch (error) {
      console.error('Route recalculation error:', error);
    }
  };

  const toggleMapStyle = () => {
    handleManualInteraction('change map style', () => {
      const styles = ['standard', 'satellite', 'hybrid'];
      const currentIndex = styles.indexOf(mapStyle);
      const nextStyle = styles[(currentIndex + 1) % styles.length];
      setMapStyle(nextStyle);
    });
  };

  const centerOnLocation = () => {
    if (mapRef.current && currentLocation) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const checkForUpcomingObstacles = async () => {
    if (!currentLocation || !isDriving) return;

    try {
      // Get current heading from compass service
      const heading = CompassNavigationService.getCurrentHeading();

      // Get upcoming obstacle alerts
      const alerts = RoadObstacleService.getUpcomingObstacleAlerts(
        currentLocation,
        heading,
        currentSpeed
      );

      // Update obstacle alerts
      setObstacleAlerts(alerts);

      // Announce obstacles using NLP voice service with notification sounds and compass directions
      alerts.forEach(alert => {
        if (NLPVoiceService.shouldAnnounceAtDistance(alert.distance)) {
          // Calculate bearing to obstacle
          const bearing = CompassNavigationService.calculateBearing(
            currentLocation.latitude,
            currentLocation.longitude,
            alert.obstacle.location.latitude,
            alert.obstacle.location.longitude
          );

          // Play notification sound first, then voice announcement
          NotificationSoundsService.playWithVoiceDelay(
            alert.obstacle.type,
            () => {
              NLPVoiceService.announceObstacle(
                alert.obstacle.type,
                alert.distance,
                {
                  severity: alert.obstacle.severity,
                  bearing: bearing
                }
              );
            }
          );
        }
      });

      // Check for unavoidable obstacles
      checkForUnavoidableObstacles(alerts);

    } catch (error) {
      console.error('Error checking obstacles:', error);
    }
  };

  const checkForUnavoidableObstacles = (alerts) => {
    const unavoidable = alerts.filter(alert => {
      // Check if this obstacle type should be avoided but can't be
      return RoadObstacleService.shouldAvoidObstacle(alert.obstacle) &&
             alert.distance < 1000; // Within 1km
    });

    if (unavoidable.length > 0 && !showUnavoidableAlert) {
      setUnavoidableObstacles(unavoidable);
      setShowUnavoidableAlert(true);

      const obstacleTypes = unavoidable.map(alert =>
        alert.obstacle.type.replace('_', ' ')
      ).join(', ');

      NLPVoiceService.speak(`Unavoidable obstacles ahead: ${obstacleTypes}`, 'high');
    }
  };

  const handleUnavoidableObstacleResponse = (action) => {
    setShowUnavoidableAlert(false);

    switch (action) {
      case 'proceed':
        NLPVoiceService.speak('Proceeding with current route', 'high');
        break;
      case 'reroute':
        NLPVoiceService.speak('Searching for alternative route', 'high');
        // Trigger reroute logic here
        break;
      case 'adjust':
        navigation.navigate('RoadObstacleSettings');
        break;
    }
  };

  const openObstacleSettings = () => {
    if (shouldBlockInteraction()) {
      VoiceService.speak('Pull over safely to change route settings');
      return;
    }
    navigation.navigate('RoadObstacleSettings');
  };

  const checkForTrafficRerouting = async () => {
    if (!currentRoute || !currentLocation) return;

    try {
      const rerouteRecommendation = await LiveTrafficService.checkForRerouting(
        currentRoute,
        currentLocation
      );

      if (rerouteRecommendation) {
        const timeSavedMinutes = Math.round(rerouteRecommendation.timeSaved / 60);

        Alert.alert(
          'Traffic Detected',
          `${rerouteRecommendation.reason}\n\nReroute to save ${timeSavedMinutes} minutes?`,
          [
            { text: 'Keep Current Route', style: 'cancel' },
            {
              text: 'Reroute',
              onPress: () => {
                setCurrentRoute(rerouteRecommendation.newRoute);
                NLPVoiceService.speak(`Rerouting to avoid traffic. Saving ${timeSavedMinutes} minutes.`, 'high');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error checking for traffic rerouting:', error);
    }
  };

  const setupCrashDetection = async () => {
    try {
      // Set up crash detection listener
      const unsubscribe = CrashDetectionService.addListener((event, data) => {
        if (event === 'crashDetected') {
          handleCrashDetected(data);
        } else if (event === 'hardBraking') {
          handleHardBraking(data);
        } else if (event === 'rapidAcceleration') {
          handleRapidAcceleration(data);
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up crash detection:', error);
    }
  };

  const handleCrashDetected = (crashData) => {
    Alert.alert(
      '🚨 Crash Detected',
      'A potential crash has been detected. Are you okay?',
      [
        {
          text: "I'm OK",
          onPress: () => {
            CrashDetectionService.cancelEmergencyCall();
            speak('Glad you are safe');
          },
        },
        {
          text: 'Call Emergency',
          onPress: () => {
            CrashDetectionService.initiateEmergencyCall();
            speak('Calling emergency services');
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleHardBraking = (data) => {
    // Log for safety analytics but don't interrupt
    console.log('Hard braking detected:', data);
  };

  const handleRapidAcceleration = (data) => {
    // Log for safety analytics but don't interrupt
    console.log('Rapid acceleration detected:', data);
  };

  const updateSpeedLimit = async () => {
    if (!currentLocation) return;

    try {
      const speedLimitData = await SpeedLimitService.getSpeedLimit(currentLocation);
      if (speedLimitData) {
        setSpeedLimit(speedLimitData.value);

        // Update car integration if connected
        if (isCarConnected) {
          await CarIntegrationService.updateNavigationInfo({
            currentSpeed,
            speedLimit: speedLimitData.value,
            currentInstruction: 'Continue straight',
            distanceToNextTurn: 500,
            estimatedTimeRemaining: 1200,
          });
        }
      }
    } catch (error) {
      console.error('Error updating speed limit:', error);
    }
  };

  const handleSpeedExceedance = (exceedanceData) => {
    const { level, exceedance, currentSpeed, speedLimit } = exceedanceData;

    if (level === 2) {
      // Danger level - immediate voice warning
      NLPVoiceService.speak(
        `You are exceeding the speed limit by ${Math.round(exceedance)} kilometers per hour. Please slow down immediately.`,
        'high'
      );
    } else if (level === 1) {
      // Warning level - gentle reminder
      NLPVoiceService.speak(
        `Speed limit is ${speedLimit} kilometers per hour. Please reduce speed.`,
        'medium'
      );
    }
  };

  const checkForNearbyPOIs = async () => {
    if (!currentLocation || !route) return;

    try {
      // Search for POIs near current location
      const pois = await POIService.searchPOIsWithFilters(
        currentLocation,
        'all',
        1500, // 1.5km radius
        { openNow: true, minRating: 3.0 }
      );

      setNearbyPOIs(pois);

      // Check for POIs that should be announced
      pois.forEach(poi => {
        const distance = POIService.calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          poi.location.latitude,
          poi.location.longitude
        );

        // Check if we should announce this POI
        if (POIService.shouldAnnouncePOI(poi, distance) &&
            !announcedPOIs.has(poi.id)) {

          announcePOI(poi, distance);
          setAnnouncedPOIs(prev => new Set([...prev, poi.id]));
        }
      });

    } catch (error) {
      console.error('Error checking for nearby POIs:', error);
    }
  };

  const announcePOI = async (poi, distance) => {
    try {
      // Play subtle notification sound for POI
      await NotificationSoundsService.playNotificationSound('poi_nearby');

      // Calculate bearing to POI
      const bearing = CompassNavigationService.calculateBearing(
        currentLocation.latitude,
        currentLocation.longitude,
        poi.location.latitude,
        poi.location.longitude
      );

      // Generate and speak POI announcement with compass direction
      await NLPVoiceService.announcePOI(
        poi.name,
        distance,
        bearing,
        poi.category
      );

      // Update car integration if connected
      if (isCarConnected) {
        await CarIntegrationService.updateNavigationInfo({
          currentSpeed,
          speedLimit,
          nearbyPOI: {
            name: poi.name,
            category: poi.category,
            distance: Math.round(distance),
          },
        });
      }

    } catch (error) {
      console.error('Error announcing POI:', error);
    }
  };

  // Update display over apps overlay when navigation data changes
  useEffect(() => {
    if (isDriving && DisplayOverAppsService.isOverlayEnabled()) {
      const updateOverlayData = async () => {
        try {
          await DisplayOverAppsService.updateNavigationData({
            currentSpeed,
            speedLimit,
            isNavigating: isDriving,
            currentInstruction: currentInstruction || 'Continue driving',
            eta: eta || null,
          });
        } catch (error) {
          console.error('Error updating overlay data:', error);
        }
      };

      updateOverlayData();
    }
  }, [currentSpeed, speedLimit, isDriving, currentInstruction, eta]);

  // Show obstacle alerts in overlay
  useEffect(() => {
    if (obstacleAlerts.length > 0 && DisplayOverAppsService.isOverlayEnabled()) {
      const latestAlert = obstacleAlerts[0];
      DisplayOverAppsService.showObstacleAlert({
        type: latestAlert.obstacle.type,
        distance: latestAlert.distance,
        severity: latestAlert.obstacle.severity || 'medium',
      });
    }
  }, [obstacleAlerts]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Map View */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType={mapStyle}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        showsTraffic={true}
        followsUserLocation={isDriving}
        initialRegion={{
          latitude: currentLocation?.latitude || 37.78825,
          longitude: currentLocation?.longitude || -122.4324,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {/* Current location marker */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.locationMarker}>
              <Icon name="my-location" size={20} color="#00FF88" />
            </View>
          </Marker>
        )}

        {/* Destination marker */}
        {destination && (
          <Marker coordinate={destination}>
            <Icon name="place" size={30} color="#FF6B6B" />
          </Marker>
        )}

        {/* Route polyline */}
        {route && (
          <Polyline
            coordinates={route.coordinates}
            strokeColor={isEcoMode ? "#00FF88" : "#007AFF"}
            strokeWidth={4}
          />
        )}

        {/* Community reports */}
        {nearbyReports.map(report => (
          <Marker
            key={report.id}
            coordinate={report.location}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.reportMarker}>
              <Icon
                name={getReportIcon(report.type)}
                size={16}
                color="#FFF"
              />
            </View>
          </Marker>
        ))}

        {/* Obstacle alerts */}
        {obstacleAlerts.map(alert => (
          <Marker
            key={alert.obstacle.id}
            coordinate={alert.obstacle.location}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[
              styles.obstacleMarker,
              { backgroundColor: getObstacleSeverityColor(alert.obstacle.severity) }
            ]}>
              <Icon
                name={getObstacleIcon(alert.obstacle.type)}
                size={14}
                color="#FFF"
              />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Top UI Panel */}
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        style={[styles.topPanel, { paddingTop: insets.top }]}
      >
        <View style={styles.topRow}>
          <SafetyIndicator isDriving={isDriving} speed={currentSpeed} />
          <EnhancedSpeedometer
            currentSpeed={currentSpeed}
            speedLimit={speedLimit}
            isDriving={isDriving}
            location={currentLocation}
            onSpeedExceedance={handleSpeedExceedance}
          />
          <EcoIndicator isActive={isEcoMode} onToggle={() => setIsEcoMode(!isEcoMode)} />
        </View>
      </LinearGradient>

      {/* Bottom UI Panel */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={[styles.bottomPanel, { paddingBottom: insets.bottom }]}
      >
        <View style={styles.bottomRow}>
          {/* Voice Button */}
          <VoiceButton
            isListening={isVoiceListening}
            onPress={() => VoiceService.startListening()}
            disabled={false}
          />

          {/* Report Buttons */}
          <View style={styles.reportButtons}>
            <ReportButton
              type="police"
              onPress={() => handleReportPress('police')}
              isDriving={isDriving}
            />
            <ReportButton
              type="accident"
              onPress={() => handleReportPress('accident')}
              isDriving={isDriving}
            />
            <ReportButton
              type="hazard"
              onPress={() => handleReportPress('hazard')}
              isDriving={isDriving}
            />
          </View>

          {/* Utility Buttons */}
          <View style={styles.utilityButtons}>
            <TouchableOpacity
              style={styles.utilityButton}
              onPress={centerOnLocation}
            >
              <Icon name="my-location" size={24} color="#00FF88" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.utilityButton}
              onPress={toggleMapStyle}
            >
              <Icon name="layers" size={24} color="#00FF88" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={handleDestinationSearch}
        >
          <Icon name="search" size={24} color="#666" />
          <Text style={styles.searchText}>
            {destination ? `To: ${destination.name}` : 'Where to?'}
          </Text>
          <Icon name="mic" size={24} color="#00FF88" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Digital Compass */}
      {showCompass && currentLocation && (
        <View style={styles.compassContainer}>
          <DigitalCompass
            size={80}
            showCardinals={true}
            showBearing={!!destination}
            destination={destination}
          />
        </View>
      )}

      {/* Floating Overlay */}
      <FloatingOverlay
        visible={showFloatingOverlay}
        minimized={overlayMinimized}
        onToggleMinimize={setOverlayMinimized}
        onClose={() => setShowFloatingOverlay(false)}
        currentInstruction={currentInstruction}
        nextTurn={nextTurn}
        eta={eta}
      />

      {/* Quick Access Menu */}
      <View style={styles.quickAccessMenu}>
        <TouchableOpacity
          style={styles.quickAccessButton}
          onPress={() => navigation.navigate('POI')}
        >
          <Icon name="place" size={20} color="#00FF88" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAccessButton}
          onPress={() => navigation.navigate('Emergency')}
        >
          <Icon name="emergency" size={20} color="#FF6B6B" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAccessButton}
          onPress={openObstacleSettings}
        >
          <Icon name="block" size={20} color="#FFA500" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAccessButton}
          onPress={() => setShowFloatingOverlay(!showFloatingOverlay)}
        >
          <Icon name="picture-in-picture" size={20} color="#007AFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAccessButton}
          onPress={() => navigation.navigate('ARNavigation')}
        >
          <Icon name="view-in-ar" size={20} color="#9C27B0" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAccessButton}
          onPress={() => navigation.navigate('ErrorReport', {
            location: currentLocation,
            autoReport: true
          })}
        >
          <Icon name="report" size={20} color="#FF6B6B" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAccessButton}
          onPress={() => navigation.navigate('VoiceSettings')}
        >
          <Icon name="record-voice-over" size={20} color="#4CAF50" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAccessButton}
          onPress={() => navigation.navigate('VehicleSettings')}
        >
          <Icon name="directions-car" size={20} color="#9C27B0" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAccessButton}
          onPress={() => navigation.navigate('UnitsSettings')}
        >
          <Icon name="straighten" size={20} color="#FF9800" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAccessButton}
          onPress={() => navigation.navigate('DestinationSearch')}
        >
          <Icon name="search" size={20} color="#2196F3" />
        </TouchableOpacity>
      </View>

      {/* Unavoidable Obstacle Alert */}
      {showUnavoidableAlert && (
        <View style={styles.unavoidableAlert}>
          <LinearGradient
            colors={['rgba(255, 107, 107, 0.95)', 'rgba(255, 107, 107, 0.9)']}
            style={styles.alertGradient}
          >
            <View style={styles.alertHeader}>
              <Icon name="warning" size={24} color="#FFF" />
              <Text style={styles.alertTitle}>Unavoidable Obstacles</Text>
            </View>

            <Text style={styles.alertMessage}>
              Your route contains obstacles you've chosen to avoid:
            </Text>

            <View style={styles.obstaclesList}>
              {unavoidableObstacles.slice(0, 3).map((alert, index) => (
                <Text key={index} style={styles.obstacleItem}>
                  • {alert.obstacle.type.replace('_', ' ')} ({Math.round(alert.distance)}m)
                </Text>
              ))}
            </View>

            <View style={styles.alertActions}>
              <TouchableOpacity
                style={[styles.alertButton, styles.proceedButton]}
                onPress={() => handleUnavoidableObstacleResponse('proceed')}
              >
                <Text style={styles.proceedButtonText}>Proceed</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.alertButton, styles.rerouteButton]}
                onPress={() => handleUnavoidableObstacleResponse('reroute')}
              >
                <Text style={styles.rerouteButtonText}>Reroute</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.alertButton, styles.adjustButton]}
                onPress={() => handleUnavoidableObstacleResponse('adjust')}
              >
                <Text style={styles.adjustButtonText}>Settings</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}
    </View>
  );
};

const getReportIcon = (type) => {
  switch (type) {
    case 'police': return 'local-police';
    case 'accident': return 'car-crash';
    case 'hazard': return 'warning';
    case 'traffic': return 'traffic';
    default: return 'report';
  }
};

const getObstacleIcon = (type) => {
  switch (type) {
    case 'speed_camera': return 'camera-alt';
    case 'red_light_camera': return 'traffic';
    case 'traffic_camera': return 'videocam';
    case 'police_checkpoint': return 'local-police';
    case 'police_station': return 'local-police';
    case 'railway_crossing': return 'train';
    case 'toll_booth': return 'toll';
    case 'toll_road': return 'attach-money';
    case 'motorway_junction': return 'merge-type';
    case 'roundabout': return 'rotate-right';
    case 'construction_zone': return 'construction';
    case 'school_zone': return 'school';
    case 'ferry_terminal': return 'directions-boat';
    case 'ferry_route': return 'directions-boat';
    case 'narrow_road': return 'straighten';
    case 'steep_grade': return 'trending-up';
    case 'unpaved_road': return 'terrain';
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  map: {
    flex: 1,
  },
  topPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  reportButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  utilityButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  utilityButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchText: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    marginLeft: 15,
  },
  locationMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00FF88',
  },
  reportMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  obstacleMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  compassContainer: {
    position: 'absolute',
    top: 120,
    right: 20,
  },
  quickAccessMenu: {
    position: 'absolute',
    left: 20,
    top: '50%',
    transform: [{ translateY: -80 }],
    gap: 10,
  },
  quickAccessButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  unavoidableAlert: {
    position: 'absolute',
    top: '30%',
    left: 20,
    right: 20,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  alertGradient: {
    padding: 20,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 10,
  },
  alertMessage: {
    fontSize: 14,
    color: '#FFF',
    marginBottom: 10,
    lineHeight: 18,
  },
  obstaclesList: {
    marginBottom: 15,
  },
  obstacleItem: {
    fontSize: 12,
    color: '#FFF',
    marginBottom: 4,
  },
  alertActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  alertButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  proceedButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  rerouteButton: {
    backgroundColor: 'rgba(0, 255, 136, 0.3)',
  },
  adjustButton: {
    backgroundColor: 'rgba(255, 165, 0, 0.3)',
  },
  proceedButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  rerouteButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  adjustButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default NavigationScreen;
