import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import Slider from '@react-native-community/slider';

const POIFilterModal = ({ 
  visible, 
  onClose, 
  onApplyFilters, 
  category, 
  currentFilters = {} 
}) => {
  const [filters, setFilters] = useState({
    priceRange: [1, 2, 3, 4],
    minRating: 0,
    openNow: false,
    maxDistance: 5000,
    fuelType: [],
    cuisine: [],
    amenities: [],
    ...currentFilters,
  });

  const fuelTypes = [
    { id: 'petrol', name: 'Petrol', icon: 'local-gas-station' },
    { id: 'diesel', name: 'Diesel', icon: 'local-shipping' },
    { id: 'electric', name: 'Electric', icon: 'electric-car' },
    { id: 'lpg', name: 'LPG', icon: 'propane-tank' },
    { id: 'cng', name: 'CNG', icon: 'air' },
  ];

  const cuisineTypes = [
    { id: 'italian', name: 'Italian', icon: 'restaurant' },
    { id: 'chinese', name: 'Chinese', icon: 'restaurant' },
    { id: 'indian', name: 'Indian', icon: 'restaurant' },
    { id: 'mexican', name: 'Mexican', icon: 'restaurant' },
    { id: 'american', name: 'American', icon: 'restaurant' },
    { id: 'japanese', name: 'Japanese', icon: 'restaurant' },
    { id: 'thai', name: 'Thai', icon: 'restaurant' },
    { id: 'mediterranean', name: 'Mediterranean', icon: 'restaurant' },
    { id: 'fast_food', name: 'Fast Food', icon: 'fastfood' },
    { id: 'vegetarian', name: 'Vegetarian', icon: 'eco' },
  ];

  const amenities = [
    { id: 'wifi', name: 'WiFi', icon: 'wifi' },
    { id: 'parking', name: 'Parking', icon: 'local-parking' },
    { id: 'wheelchair_accessible', name: 'Wheelchair Access', icon: 'accessible' },
    { id: 'takeaway', name: 'Takeaway', icon: 'takeout-dining' },
    { id: 'delivery', name: 'Delivery', icon: 'delivery-dining' },
    { id: 'outdoor_seating', name: 'Outdoor Seating', icon: 'deck' },
    { id: 'air_conditioning', name: 'Air Conditioning', icon: 'ac-unit' },
    { id: 'car_wash', name: 'Car Wash', icon: 'local-car-wash' },
  ];

  const priceLabels = ['$', '$$', '$$$', '$$$$'];

  const handlePriceToggle = (priceLevel) => {
    const newPriceRange = filters.priceRange.includes(priceLevel)
      ? filters.priceRange.filter(p => p !== priceLevel)
      : [...filters.priceRange, priceLevel];
    
    setFilters(prev => ({ ...prev, priceRange: newPriceRange }));
  };

  const handleFuelTypeToggle = (fuelType) => {
    const newFuelTypes = filters.fuelType.includes(fuelType)
      ? filters.fuelType.filter(f => f !== fuelType)
      : [...filters.fuelType, fuelType];
    
    setFilters(prev => ({ ...prev, fuelType: newFuelTypes }));
  };

  const handleCuisineToggle = (cuisine) => {
    const newCuisines = filters.cuisine.includes(cuisine)
      ? filters.cuisine.filter(c => c !== cuisine)
      : [...filters.cuisine, cuisine];
    
    setFilters(prev => ({ ...prev, cuisine: newCuisines }));
  };

  const handleAmenityToggle = (amenity) => {
    const newAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter(a => a !== amenity)
      : [...filters.amenities, amenity];
    
    setFilters(prev => ({ ...prev, amenities: newAmenities }));
  };

  const resetFilters = () => {
    setFilters({
      priceRange: [1, 2, 3, 4],
      minRating: 0,
      openNow: false,
      maxDistance: 5000,
      fuelType: [],
      cuisine: [],
      amenities: [],
    });
  };

  const applyFilters = () => {
    onApplyFilters(filters);
    onClose();
  };

  const renderPriceFilter = () => (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>Price Range</Text>
      <View style={styles.priceContainer}>
        {[1, 2, 3, 4].map(price => (
          <TouchableOpacity
            key={price}
            style={[
              styles.priceButton,
              filters.priceRange.includes(price) && styles.priceButtonSelected
            ]}
            onPress={() => handlePriceToggle(price)}
          >
            <Text style={[
              styles.priceText,
              filters.priceRange.includes(price) && styles.priceTextSelected
            ]}>
              {priceLabels[price - 1]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderRatingFilter = () => (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>Minimum Rating</Text>
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={5}
          step={0.5}
          value={filters.minRating}
          onValueChange={(value) => setFilters(prev => ({ ...prev, minRating: value }))}
          minimumTrackTintColor="#00FF88"
          maximumTrackTintColor="#333"
          thumbStyle={styles.sliderThumb}
        />
        <View style={styles.ratingDisplay}>
          <Text style={styles.ratingText}>
            {filters.minRating === 0 ? 'Any Rating' : `${filters.minRating}+ Stars`}
          </Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map(star => (
              <Icon
                key={star}
                name="star"
                size={16}
                color={star <= filters.minRating ? '#FFD700' : '#333'}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );

  const renderDistanceFilter = () => (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>Maximum Distance</Text>
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={500}
          maximumValue={20000}
          step={500}
          value={filters.maxDistance}
          onValueChange={(value) => setFilters(prev => ({ ...prev, maxDistance: value }))}
          minimumTrackTintColor="#00FF88"
          maximumTrackTintColor="#333"
          thumbStyle={styles.sliderThumb}
        />
        <Text style={styles.distanceText}>
          {filters.maxDistance >= 1000 
            ? `${(filters.maxDistance / 1000).toFixed(1)} km`
            : `${filters.maxDistance} m`}
        </Text>
      </View>
    </View>
  );

  const renderOpenNowFilter = () => (
    <View style={styles.filterSection}>
      <View style={styles.switchContainer}>
        <Text style={styles.filterTitle}>Open Now</Text>
        <Switch
          value={filters.openNow}
          onValueChange={(value) => setFilters(prev => ({ ...prev, openNow: value }))}
          trackColor={{ false: '#333', true: '#00FF88' }}
          thumbColor={filters.openNow ? '#FFF' : '#666'}
        />
      </View>
    </View>
  );

  const renderFuelTypeFilter = () => {
    if (category !== 'fuel') return null;

    return (
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Fuel Types</Text>
        <View style={styles.optionsGrid}>
          {fuelTypes.map(fuel => (
            <TouchableOpacity
              key={fuel.id}
              style={[
                styles.optionButton,
                filters.fuelType.includes(fuel.id) && styles.optionButtonSelected
              ]}
              onPress={() => handleFuelTypeToggle(fuel.id)}
            >
              <Icon 
                name={fuel.icon} 
                size={20} 
                color={filters.fuelType.includes(fuel.id) ? '#000' : '#00FF88'} 
              />
              <Text style={[
                styles.optionText,
                filters.fuelType.includes(fuel.id) && styles.optionTextSelected
              ]}>
                {fuel.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderCuisineFilter = () => {
    if (category !== 'food') return null;

    return (
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Cuisine Types</Text>
        <View style={styles.optionsGrid}>
          {cuisineTypes.map(cuisine => (
            <TouchableOpacity
              key={cuisine.id}
              style={[
                styles.optionButton,
                filters.cuisine.includes(cuisine.id) && styles.optionButtonSelected
              ]}
              onPress={() => handleCuisineToggle(cuisine.id)}
            >
              <Icon 
                name={cuisine.icon} 
                size={20} 
                color={filters.cuisine.includes(cuisine.id) ? '#000' : '#00FF88'} 
              />
              <Text style={[
                styles.optionText,
                filters.cuisine.includes(cuisine.id) && styles.optionTextSelected
              ]}>
                {cuisine.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderAmenitiesFilter = () => (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>Amenities</Text>
      <View style={styles.optionsGrid}>
        {amenities.map(amenity => (
          <TouchableOpacity
            key={amenity.id}
            style={[
              styles.optionButton,
              filters.amenities.includes(amenity.id) && styles.optionButtonSelected
            ]}
            onPress={() => handleAmenityToggle(amenity.id)}
          >
            <Icon 
              name={amenity.icon} 
              size={20} 
              color={filters.amenities.includes(amenity.id) ? '#000' : '#00FF88'} 
            />
            <Text style={[
              styles.optionText,
              filters.amenities.includes(amenity.id) && styles.optionTextSelected
            ]}>
              {amenity.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={['#000', '#1a1a1a']}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Filter POIs</Text>
          <TouchableOpacity onPress={resetFilters} style={styles.resetButton}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderPriceFilter()}
          {renderRatingFilter()}
          {renderDistanceFilter()}
          {renderOpenNowFilter()}
          {renderFuelTypeFilter()}
          {renderCuisineFilter()}
          {renderAmenitiesFilter()}
        </ScrollView>

        {/* Apply Button */}
        <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
          <LinearGradient
            colors={['#00FF88', '#00CC6A']}
            style={styles.applyGradient}
          >
            <Text style={styles.applyText}>Apply Filters</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  resetButton: {
    padding: 5,
  },
  resetText: {
    color: '#00FF88',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginVertical: 20,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 15,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  priceButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00FF88',
    minWidth: 60,
    alignItems: 'center',
  },
  priceButtonSelected: {
    backgroundColor: '#00FF88',
  },
  priceText: {
    color: '#00FF88',
    fontWeight: 'bold',
  },
  priceTextSelected: {
    color: '#000',
  },
  sliderContainer: {
    marginVertical: 10,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    backgroundColor: '#00FF88',
    width: 20,
    height: 20,
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  ratingText: {
    color: '#FFF',
    fontSize: 14,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  distanceText: {
    color: '#FFF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00FF88',
    marginBottom: 10,
  },
  optionButtonSelected: {
    backgroundColor: '#00FF88',
  },
  optionText: {
    color: '#00FF88',
    marginLeft: 8,
    fontSize: 12,
  },
  optionTextSelected: {
    color: '#000',
  },
  applyButton: {
    margin: 20,
    borderRadius: 25,
    overflow: 'hidden',
  },
  applyGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  applyText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default POIFilterModal;
