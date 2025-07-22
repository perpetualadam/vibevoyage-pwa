import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Alert,
  Platform,
  AppState,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

// Import screens
import DisclaimerScreen from './src/screens/DisclaimerScreen';
import NavigationScreen from './src/screens/NavigationScreen';
import GameScreen from './src/screens/GameScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ARNavigationScreen from './src/screens/ARNavigationScreen';
import DestinationSearchScreen from './src/screens/DestinationSearchScreen';
import SocialSharingScreen from './src/screens/SocialSharingScreen';
import PremiumScreen from './src/screens/PremiumScreen';
import VehicleSettingsScreen from './src/screens/VehicleSettingsScreen';
import UnitsSettingsScreen from './src/screens/UnitsSettingsScreen';
import VoiceSettingsScreen from './src/screens/VoiceSettingsScreen';

// Import services
import SafetyService from './src/services/SafetyService';
import VoiceService from './src/services/VoiceService';
import LocationService from './src/services/LocationService';
import GameService from './src/services/GameService';
import PlatformUIService from './src/services/PlatformUIService';
import PerformanceOptimizationService from './src/services/PerformanceOptimizationService';
import AdMobService from './src/services/AdMobService';
import FreeTTSService from './src/services/FreeTTSService';
import CommunityValidationService from './src/services/CommunityValidationService';
import CostOptimizationService from './src/services/CostOptimizationService';
import AccessibilityService from './src/services/AccessibilityService';
import EnhancedOfflineModeService from './src/services/EnhancedOfflineModeService';
import LegalComplianceService from './src/services/LegalComplianceService';
import RoadRegulationService from './src/services/RoadRegulationService';
import CompassNavigationService from './src/services/CompassNavigationService';
import DisplayOverAppsService from './src/services/DisplayOverAppsService';
import ErrorMonitoringService from './src/services/ErrorMonitoringService';
import FallbackBehaviorService from './src/services/FallbackBehaviorService';

// Import context providers
import { SafetyProvider } from './src/context/SafetyContext';
import { GameProvider } from './src/context/GameContext';
import { LocationProvider } from './src/context/LocationContext';
import { VoiceProvider } from './src/context/VoiceContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Navigate':
              iconName = 'navigation';
              break;
            case 'Game':
              iconName = 'emoji-events';
              break;
            case 'Community':
              iconName = 'group';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'circle';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#00FF88',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: '#333',
        },
        headerStyle: {
          backgroundColor: '#1a1a1a',
        },
        headerTintColor: '#fff',
      })}
    >
      <Tab.Screen name="Navigate" component={NavigationScreen} />
      <Tab.Screen name="Game" component={GameScreen} />
      <Tab.Screen name="Community" component={CommunityScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const App = () => {
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    initializeApp();
    
    const handleAppStateChange = (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        SafetyService.checkDrivingStatus();
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState]);

  const initializeApp = async () => {
    try {
      // Check if user has accepted disclaimer
      const disclaimerAccepted = await AsyncStorage.getItem('disclaimerAccepted');
      setHasAcceptedDisclaimer(disclaimerAccepted === 'true');

      // Request permissions
      await requestPermissions();

      // Initialize services
      await SafetyService.initialize();
      await VoiceService.initialize();
      await LocationService.initialize();
      await GameService.initialize();
      await PlatformUIService.initialize();
      await PerformanceOptimizationService.initialize();

      // Initialize budget-friendly services
      await CostOptimizationService.initialize();
      await FreeTTSService.initialize();
      await CommunityValidationService.initialize();

      // Initialize enhanced UI/UX services
      await AccessibilityService.initialize();
      await EnhancedOfflineModeService.initialize();

      // Initialize legal compliance services
      await LegalComplianceService.initialize();
      await RoadRegulationService.initialize();

      // Initialize compass navigation service
      await CompassNavigationService.initialize();

      // Initialize display over apps service
      await DisplayOverAppsService.initialize();

      // Initialize error monitoring and fallback services
      await ErrorMonitoringService.initialize();
      await FallbackBehaviorService.initialize();

      // Initialize monetization (if enabled)
      if (process.env.ENABLE_ADS === 'true') {
        await AdMobService.initialize();
      }

      setIsLoading(false);
    } catch (error) {
      console.error('App initialization error:', error);
      Alert.alert('Initialization Error', 'Failed to initialize app. Please restart.');
      setIsLoading(false);
    }
  };

  const requestPermissions = async () => {
    const permissions = Platform.select({
      ios: [
        PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
        PERMISSIONS.IOS.MICROPHONE,
        PERMISSIONS.IOS.CAMERA,
      ],
      android: [
        PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION,
        PERMISSIONS.ANDROID.RECORD_AUDIO,
        PERMISSIONS.ANDROID.CAMERA,
      ],
    });

    for (const permission of permissions) {
      const result = await request(permission);
      if (result !== RESULTS.GRANTED) {
        console.warn(`Permission ${permission} not granted:`, result);
      }
    }
  };

  const handleDisclaimerAccept = async () => {
    await AsyncStorage.setItem('disclaimerAccepted', 'true');
    setHasAcceptedDisclaimer(true);
  };

  if (isLoading) {
    return null; // Show splash screen component here
  }

  return (
    <SafetyProvider>
      <GameProvider>
        <LocationProvider>
          <VoiceProvider>
            <SafeAreaView style={styles.container}>
              <StatusBar
                barStyle="light-content"
                backgroundColor="#1a1a1a"
                translucent={false}
              />
              <NavigationContainer>
                <Stack.Navigator
                  screenOptions={{
                    headerShown: false,
                    cardStyle: { backgroundColor: '#000' },
                  }}
                >
                  {!hasAcceptedDisclaimer ? (
                    <Stack.Screen name="Disclaimer">
                      {props => (
                        <DisclaimerScreen
                          {...props}
                          onAccept={handleDisclaimerAccept}
                        />
                      )}
                    </Stack.Screen>
                  ) : (
                    <>
                      <Stack.Screen name="Main" component={MainTabs} />
                      <Stack.Screen name="Settings" component={SettingsScreen} />
                      <Stack.Screen name="ARNavigation" component={ARNavigationScreen} />
                      <Stack.Screen name="DestinationSearch" component={DestinationSearchScreen} />
                      <Stack.Screen name="SocialSharing" component={SocialSharingScreen} />
                      <Stack.Screen name="Premium" component={PremiumScreen} />
                      <Stack.Screen name="VehicleSettings" component={VehicleSettingsScreen} />
                      <Stack.Screen name="UnitsSettings" component={UnitsSettingsScreen} />
                      <Stack.Screen name="VoiceSettings" component={VoiceSettingsScreen} />
                    </>
                  )}
                </Stack.Navigator>
              </NavigationContainer>
            </SafeAreaView>
          </VoiceProvider>
        </LocationProvider>
      </GameProvider>
    </SafetyProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default App;
