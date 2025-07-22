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
import { useSafety } from '../context/SafetyContext';
import { useVoice } from '../context/VoiceContext';

const VehicleSettingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { shouldBlockInteraction } = useSafety();
  const { speak } = useVoice();

  const [selectedVehicle, setSelectedVehicle] = useState('car');
  const [vehicleSettings, setVehicleSettings] = useState({
    avoidNarrowRoads: false,
    avoidLowBridges: false,
    avoidPedestrianZones: false,
    preferBikeLanes: false,
    avoidHighways: false,
  });

  const vehicleTypes = [
    {
      id: 'car',
      title: 'Car',
      icon: 'directions-car',
      color: '#007AFF',
      description: 'Standard passenger vehicle',
      co2PerKm: 0.12,
      restrictions: ['Some city centers', 'Pedestrian zones'],
      features: ['Standard routing', 'All road types', 'Parking assistance'],
    },
    {
      id: 'motorcycle',
      title: 'Motorcycle',
      icon: 'two-wheeler',
      color: '#FF6B6B',
      description: 'Two-wheeled motor vehicle',
      co2PerKm: 0.08,
      restrictions: ['Some highways', 'Weather dependent'],
      features: ['Lane splitting', 'Narrow passages', 'Fuel efficient'],
    },
    {
      id: 'truck',
      title: 'Truck/Heavy Vehicle',
      icon: 'local-shipping',
      color: '#FFA500',
      description: 'Commercial heavy vehicle',
      co2PerKm: 0.25,
      restrictions: ['Low bridges', 'Weight limits', 'City centers'],
      features: ['Truck routes', 'Bridge heights', 'Weight restrictions'],
    },
    {
      id: 'bicycle',
      title: 'Bicycle',
      icon: 'directions-bike',
      color: '#4CAF50',
      description: 'Human-powered bicycle',
      co2PerKm: 0.0,
      restrictions: ['Highways', 'Motor vehicle only roads'],
      features: ['Bike lanes', 'Cycle paths', 'Elevation aware'],
    },
    {
      id: 'pedestrian',
      title: 'Walking',
      icon: 'directions-walk',
      color: '#9C27B0',
      description: 'On foot navigation',
      co2PerKm: 0.0,
      restrictions: ['Vehicle roads', 'Private property'],
      features: ['Sidewalks', 'Pedestrian paths', 'Stairs/elevators'],
    },
    {
      id: 'electric',
      title: 'Electric Vehicle',
      icon: 'electric-car',
      color: '#00FF88',
      description: 'Battery electric vehicle',
      co2PerKm: 0.05,
      restrictions: ['Range limitations', 'Charging stations'],
      features: ['Charging stations', 'Range optimization', 'Eco routes'],
    },
  ];

  useEffect(() => {
    loadVehicleSettings();
  }, []);

  const loadVehicleSettings = async () => {
    try {
      // Load current vehicle type from routing service
      // This would be implemented in the routing service
      setSelectedVehicle('car'); // Default
    } catch (error) {
      console.error('Error loading vehicle settings:', error);
    }
  };

  const handleVehicleSelection = async (vehicleId) => {
    if (shouldBlockInteraction()) {
      speak('Pull over safely to change vehicle type');
      return;
    }

    setSelectedVehicle(vehicleId);
    
    try {
      // Update routing service with new vehicle type
      await RoutingService.updateVehicleType(vehicleId);
      
      const vehicle = vehicleTypes.find(v => v.id === vehicleId);
      speak(`Vehicle type changed to ${vehicle.title}`);
      
      // Update vehicle-specific settings
      updateVehicleSpecificSettings(vehicleId);
      
    } catch (error) {
      console.error('Error updating vehicle type:', error);
      Alert.alert('Error', 'Failed to update vehicle type');
    }
  };

  const updateVehicleSpecificSettings = (vehicleId) => {
    const defaultSettings = {
      car: {
        avoidNarrowRoads: false,
        avoidLowBridges: false,
        avoidPedestrianZones: true,
        preferBikeLanes: false,
        avoidHighways: false,
      },
      motorcycle: {
        avoidNarrowRoads: false,
        avoidLowBridges: false,
        avoidPedestrianZones: true,
        preferBikeLanes: false,
        avoidHighways: false,
      },
      truck: {
        avoidNarrowRoads: true,
        avoidLowBridges: true,
        avoidPedestrianZones: true,
        preferBikeLanes: false,
        avoidHighways: false,
      },
      bicycle: {
        avoidNarrowRoads: false,
        avoidLowBridges: false,
        avoidPedestrianZones: false,
        preferBikeLanes: true,
        avoidHighways: true,
      },
      pedestrian: {
        avoidNarrowRoads: false,
        avoidLowBridges: false,
        avoidPedestrianZones: false,
        preferBikeLanes: false,
        avoidHighways: true,
      },
      electric: {
        avoidNarrowRoads: false,
        avoidLowBridges: false,
        avoidPedestrianZones: true,
        preferBikeLanes: false,
        avoidHighways: false,
      },
    };

    setVehicleSettings(defaultSettings[vehicleId] || defaultSettings.car);
  };

  const renderVehicleCard = (vehicle) => {
    const isSelected = selectedVehicle === vehicle.id;
    
    return (
      <TouchableOpacity
        key={vehicle.id}
        style={[styles.vehicleCard, isSelected && styles.selectedVehicleCard]}
        onPress={() => handleVehicleSelection(vehicle.id)}
      >
        <LinearGradient
          colors={
            isSelected
              ? [vehicle.color, `${vehicle.color}CC`]
              : [`${vehicle.color}20`, `${vehicle.color}10`]
          }
          style={styles.vehicleGradient}
        >
          <View style={styles.vehicleHeader}>
            <Icon
              name={vehicle.icon}
              size={40}
              color={isSelected ? '#FFF' : vehicle.color}
            />
            <View style={styles.vehicleInfo}>
              <Text style={[
                styles.vehicleTitle,
                { color: isSelected ? '#FFF' : '#FFF' }
              ]}>
                {vehicle.title}
              </Text>
              <Text style={[
                styles.vehicleDescription,
                { color: isSelected ? '#FFF' : '#999' }
              ]}>
                {vehicle.description}
              </Text>
            </View>
            {isSelected && (
              <Icon name="check-circle" size={24} color="#FFF" />
            )}
          </View>

          <View style={styles.vehicleDetails}>
            <View style={styles.detailRow}>
              <Icon name="eco" size={16} color={isSelected ? '#FFF' : '#4CAF50'} />
              <Text style={[
                styles.detailText,
                { color: isSelected ? '#FFF' : '#999' }
              ]}>
                {vehicle.co2PerKm === 0 ? 'Zero emissions' : `${vehicle.co2PerKm} kg CO₂/km`}
              </Text>
            </View>

            <View style={styles.featuresContainer}>
              <Text style={[
                styles.featuresTitle,
                { color: isSelected ? '#FFF' : '#CCC' }
              ]}>
                Features:
              </Text>
              {vehicle.features.slice(0, 2).map((feature, index) => (
                <Text
                  key={index}
                  style={[
                    styles.featureText,
                    { color: isSelected ? '#FFF' : '#999' }
                  ]}
                >
                  • {feature}
                </Text>
              ))}
            </View>

            {vehicle.restrictions.length > 0 && (
              <View style={styles.restrictionsContainer}>
                <Text style={[
                  styles.restrictionsTitle,
                  { color: isSelected ? '#FFF' : '#FFA500' }
                ]}>
                  Restrictions:
                </Text>
                <Text style={[
                  styles.restrictionText,
                  { color: isSelected ? '#FFF' : '#999' }
                ]}>
                  {vehicle.restrictions.slice(0, 2).join(', ')}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
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
          <Icon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Vehicle Type</Text>
        
        <View style={styles.backButton} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Your Vehicle</Text>
          <Text style={styles.sectionDescription}>
            Choose your vehicle type to get optimized routes and accurate navigation
          </Text>
        </View>

        {/* Vehicle Types */}
        <View style={styles.vehicleGrid}>
          {vehicleTypes.map(renderVehicleCard)}
        </View>

        {/* Selected Vehicle Info */}
        {selectedVehicle && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Route Optimization</Text>
            
            <View style={styles.infoCard}>
              <LinearGradient
                colors={['rgba(0, 122, 255, 0.2)', 'rgba(0, 122, 255, 0.1)']}
                style={styles.infoGradient}
              >
                <Icon name="info-outline" size={24} color="#007AFF" />
                <View style={styles.infoText}>
                  <Text style={styles.infoTitle}>Smart Routing Active</Text>
                  <Text style={styles.infoDescription}>
                    Routes are optimized for your {vehicleTypes.find(v => v.id === selectedVehicle)?.title.toLowerCase()} 
                    with appropriate restrictions and preferences applied.
                  </Text>
                </View>
              </LinearGradient>
            </View>
          </View>
        )}

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Icon name="help-outline" size={20} color="#00FF88" />
          <Text style={styles.helpText}>
            Vehicle type affects route calculation, restrictions, and environmental impact. 
            Choose the type that best matches your current mode of transportation.
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
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
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
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  vehicleGrid: {
    gap: 15,
  },
  vehicleCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  selectedVehicleCard: {
    transform: [{ scale: 1.02 }],
  },
  vehicleGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  vehicleInfo: {
    flex: 1,
    marginLeft: 15,
  },
  vehicleTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  vehicleDescription: {
    fontSize: 14,
  },
  vehicleDetails: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '500',
  },
  featuresContainer: {
    gap: 4,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  featureText: {
    fontSize: 12,
    marginLeft: 8,
  },
  restrictionsContainer: {
    gap: 4,
  },
  restrictionsTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  restrictionText: {
    fontSize: 12,
    marginLeft: 8,
  },
  infoCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  infoGradient: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
  },
  infoText: {
    flex: 1,
    marginLeft: 15,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: '#999',
    lineHeight: 18,
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  helpText: {
    flex: 1,
    fontSize: 14,
    color: '#ccc',
    marginLeft: 10,
    lineHeight: 20,
  },
});

export default VehicleSettingsScreen;
