import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import services and contexts
import POIService from '../services/POIService';
import { useLocation } from '../context/LocationContext';
import { useSafety } from '../context/SafetyContext';
import { useVoice } from '../context/VoiceContext';

const POIScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { currentLocation } = useLocation();
  const { shouldBlockInteraction } = useSafety();
  const { speak } = useVoice();

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [nearbyPOIs, setNearbyPOIs] = useState([]);
  const [favoritePOIs, setFavoritePOIs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);

  const categories = [
    { id: 'all', name: 'All', icon: 'place', color: '#00FF88' },
    { id: 'fuel', name: 'Gas', icon: 'local-gas-station', color: '#FF6B6B' },
    { id: 'food', name: 'Food', icon: 'restaurant', color: '#FFA500' },
    { id: 'lodging', name: 'Hotels', icon: 'hotel', color: '#007AFF' },
    { id: 'medical', name: 'Medical', icon: 'local-hospital', color: '#FF6B6B' },
    { id: 'shopping', name: 'Shopping', icon: 'shopping-cart', color: '#9C27B0' },
    { id: 'tourism', name: 'Tourism', icon: 'camera-alt', color: '#4CAF50' },
    { id: 'parking', name: 'Parking', icon: 'local-parking', color: '#666' },
  ];

  useEffect(() => {
    initializePOIService();
    loadFavorites();
  }, []);

  useEffect(() => {
    if (currentLocation && !showFavorites) {
      searchNearbyPOIs();
    }
  }, [currentLocation, activeCategory]);

  const initializePOIService = async () => {
    try {
      await POIService.initialize();
      setupPOIServiceListeners();
    } catch (error) {
      console.error('Error initializing POI service:', error);
    }
  };

  const setupPOIServiceListeners = () => {
    const unsubscribe = POIService.addListener((event, data) => {
      switch (event) {
        case 'poisFound':
          handlePOIsFound(data);
          break;
        case 'poiError':
          handlePOIError(data);
          break;
        case 'poiAddedToFavorites':
          loadFavorites();
          break;
        case 'poiRemovedFromFavorites':
          loadFavorites();
          break;
      }
    });

    this.poiServiceUnsubscribe = unsubscribe;
  };

  const handlePOIsFound = async (data) => {
    if (currentLocation) {
      const poisWithDistance = await POIService.calculateDistances(data.pois, currentLocation);
      setNearbyPOIs(poisWithDistance);
    } else {
      setNearbyPOIs(data.pois);
    }
    setIsLoading(false);
  };

  const handlePOIError = (data) => {
    console.error('POI search error:', data.error);
    setIsLoading(false);
    speak('Error searching for nearby places');
  };

  const searchNearbyPOIs = async () => {
    if (!currentLocation) return;

    setIsLoading(true);
    try {
      await POIService.searchNearbyPOIs(currentLocation, activeCategory, 5000);
    } catch (error) {
      console.error('Error searching POIs:', error);
      setIsLoading(false);
    }
  };

  const loadFavorites = () => {
    const favorites = POIService.getFavoritePOIs();
    setFavoritePOIs(favorites);
  };

  const handleCategoryPress = (categoryId) => {
    if (shouldBlockInteraction()) {
      speak('Use voice commands to search for places while driving');
      return;
    }

    setActiveCategory(categoryId);
    setShowFavorites(false);
  };

  const handlePOIPress = (poi) => {
    if (shouldBlockInteraction()) {
      speak(`${poi.name} selected. Use voice commands for navigation while driving.`);
      return;
    }

    Alert.alert(
      poi.name,
      `${poi.address || 'Address not available'}\n\nDistance: ${poi.distance ? `${poi.distance.toFixed(1)} km` : 'Unknown'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Navigate',
          onPress: () => {
            // Navigate to this POI
            speak(`Navigating to ${poi.name}`);
            navigation.navigate('Navigation', { destination: poi });
          },
        },
        {
          text: 'Favorite',
          onPress: () => toggleFavorite(poi),
        },
      ]
    );
  };

  const toggleFavorite = async (poi) => {
    const isFavorite = favoritePOIs.some(fav => fav.id === poi.id);
    
    try {
      if (isFavorite) {
        await POIService.removeFromFavorites(poi.id);
        speak(`${poi.name} removed from favorites`);
      } else {
        await POIService.addToFavorites(poi);
        speak(`${poi.name} added to favorites`);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleSearch = () => {
    if (shouldBlockInteraction()) {
      speak('Use voice commands to search while driving');
      return;
    }

    if (!searchQuery.trim()) return;

    // Filter POIs by search query
    const filtered = nearbyPOIs.filter(poi =>
      poi.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (poi.address && poi.address.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    setNearbyPOIs(filtered);
    speak(`Found ${filtered.length} results for ${searchQuery}`);
  };

  const getPOIIcon = (category) => {
    const categoryData = categories.find(cat => cat.id === category);
    return categoryData ? categoryData.icon : 'place';
  };

  const getPOIColor = (category) => {
    const categoryData = categories.find(cat => cat.id === category);
    return categoryData ? categoryData.color : '#666';
  };

  const formatDistance = (distance) => {
    if (!distance) return '';
    if (distance < 1) return `${Math.round(distance * 1000)}m`;
    return `${distance.toFixed(1)}km`;
  };

  const renderPOIItem = ({ item: poi }) => {
    const isFavorite = favoritePOIs.some(fav => fav.id === poi.id);
    
    return (
      <TouchableOpacity
        style={styles.poiCard}
        onPress={() => handlePOIPress(poi)}
      >
        <LinearGradient
          colors={[`${getPOIColor(poi.category)}20`, `${getPOIColor(poi.category)}10`]}
          style={styles.poiGradient}
        >
          <View style={styles.poiHeader}>
            <View style={[styles.poiIcon, { backgroundColor: getPOIColor(poi.category) }]}>
              <Icon name={getPOIIcon(poi.category)} size={20} color="#000" />
            </View>
            
            <View style={styles.poiInfo}>
              <Text style={styles.poiName} numberOfLines={1}>{poi.name}</Text>
              <Text style={styles.poiAddress} numberOfLines={1}>
                {poi.address || 'Address not available'}
              </Text>
              <View style={styles.poiMeta}>
                <Text style={styles.poiDistance}>{formatDistance(poi.distance)}</Text>
                {poi.rating && (
                  <View style={styles.rating}>
                    <Icon name="star" size={12} color="#FFD700" />
                    <Text style={styles.ratingText}>{poi.rating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={() => toggleFavorite(poi)}
            >
              <Icon
                name={isFavorite ? 'favorite' : 'favorite-border'}
                size={20}
                color={isFavorite ? '#FF6B6B' : '#666'}
              />
            </TouchableOpacity>
          </View>

          {poi.features && poi.features.length > 0 && (
            <View style={styles.features}>
              {poi.features.slice(0, 3).map((feature, index) => (
                <View key={index} style={styles.featureTag}>
                  <Text style={styles.featureText}>{feature.replace('_', ' ')}</Text>
                </View>
              ))}
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="search-off" size={60} color="#666" />
      <Text style={styles.emptyText}>
        {showFavorites ? 'No favorite places yet' : 'No places found nearby'}
      </Text>
      <Text style={styles.emptySubtext}>
        {showFavorites 
          ? 'Add places to favorites to see them here'
          : 'Try a different category or search term'
        }
      </Text>
    </View>
  );

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
        
        <Text style={styles.headerTitle}>Places Nearby</Text>
        
        <TouchableOpacity
          style={styles.favoritesButton}
          onPress={() => {
            setShowFavorites(!showFavorites);
            speak(showFavorites ? 'Showing nearby places' : 'Showing favorite places');
          }}
        >
          <Icon 
            name={showFavorites ? 'place' : 'favorite'} 
            size={24} 
            color={showFavorites ? '#00FF88' : '#FF6B6B'} 
          />
        </TouchableOpacity>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search places..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            editable={!shouldBlockInteraction()}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                searchNearbyPOIs();
              }}
            >
              <Icon name="clear" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories */}
      {!showFavorites && (
        <ScrollView
          horizontal
          style={styles.categoriesContainer}
          showsHorizontalScrollIndicator={false}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                activeCategory === category.id && styles.activeCategoryButton,
                { borderColor: category.color }
              ]}
              onPress={() => handleCategoryPress(category.id)}
            >
              <Icon
                name={category.icon}
                size={20}
                color={activeCategory === category.id ? category.color : '#666'}
              />
              <Text
                style={[
                  styles.categoryText,
                  activeCategory === category.id && { color: category.color }
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* POI List */}
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Icon name="hourglass-empty" size={40} color="#00FF88" />
            <Text style={styles.loadingText}>Searching nearby places...</Text>
          </View>
        ) : (
          <FlatList
            data={showFavorites ? favoritePOIs : nearbyPOIs}
            renderItem={renderPOIItem}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
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
  favoritesButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginLeft: 10,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
    backgroundColor: '#1a1a1a',
  },
  activeCategoryButton: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContainer: {
    paddingBottom: 20,
  },
  poiCard: {
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
  },
  poiGradient: {
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
  },
  poiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  poiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  poiInfo: {
    flex: 1,
  },
  poiName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  poiAddress: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  poiMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  poiDistance: {
    fontSize: 12,
    color: '#00FF88',
    fontWeight: '500',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  ratingText: {
    fontSize: 12,
    color: '#FFD700',
    marginLeft: 2,
  },
  favoriteButton: {
    padding: 8,
  },
  features: {
    flexDirection: 'row',
    marginTop: 10,
    flexWrap: 'wrap',
  },
  featureTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 10,
    color: '#ccc',
    textTransform: 'capitalize',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#00FF88',
    marginTop: 15,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
  },
});

export default POIScreen;
