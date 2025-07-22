import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import services
import POIService from '../services/POIService';
import RoutingService from '../services/RoutingService';
import { useSafety } from '../context/SafetyContext';
import { useVoice } from '../context/VoiceContext';
import { useLocation } from '../context/LocationContext';

const DestinationSearchScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { shouldBlockInteraction } = useSafety();
  const { speak } = useVoice();
  const { currentLocation } = useLocation();
  const searchInputRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('search'); // 'search', 'recent', 'favorites'

  const quickSearchCategories = [
    { id: 'gas_station', name: 'Gas Stations', icon: 'local-gas-station', color: '#FF9800' },
    { id: 'restaurant', name: 'Restaurants', icon: 'restaurant', color: '#4CAF50' },
    { id: 'hospital', name: 'Hospitals', icon: 'local-hospital', color: '#F44336' },
    { id: 'parking', name: 'Parking', icon: 'local-parking', color: '#2196F3' },
    { id: 'atm', name: 'ATMs', icon: 'atm', color: '#9C27B0' },
    { id: 'hotel', name: 'Hotels', icon: 'hotel', color: '#FF5722' },
  ];

  useEffect(() => {
    loadRecentSearches();
    
    // Auto-focus search input if not driving
    if (!shouldBlockInteraction()) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 500);
    }
  }, []);

  useEffect(() => {
    if (searchQuery.length > 2) {
      const debounceTimer = setTimeout(() => {
        performSearch();
      }, 300);
      
      return () => clearTimeout(debounceTimer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadRecentSearches = async () => {
    try {
      // Load from AsyncStorage or service
      const recent = [
        { id: '1', name: 'Home', address: '123 Main St', type: 'home' },
        { id: '2', name: 'Work', address: '456 Business Ave', type: 'work' },
        { id: '3', name: 'Starbucks Coffee', address: '789 Coffee Blvd', type: 'poi' },
      ];
      setRecentSearches(recent);
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const performSearch = async () => {
    if (!currentLocation || searchQuery.length < 3) return;

    setIsLoading(true);
    try {
      // Search POIs using the POI service
      const pois = await POIService.searchNearbyPOIs(currentLocation, 'all', 10000);
      
      // Filter POIs by search query
      const filtered = pois.filter(poi =>
        poi.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (poi.address && poi.address.toLowerCase().includes(searchQuery.toLowerCase()))
      );

      // Add distance to results
      const resultsWithDistance = await POIService.calculateDistances(filtered, currentLocation);
      
      // Sort by distance and limit results
      const sortedResults = resultsWithDistance
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 20);

      setSearchResults(sortedResults);
      
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', 'Unable to search for destinations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSearch = async (category) => {
    if (shouldBlockInteraction()) {
      speak(`Searching for nearby ${category.name.toLowerCase()}`);
    }

    if (!currentLocation) {
      Alert.alert('Location Required', 'Current location is needed for search');
      return;
    }

    setIsLoading(true);
    try {
      const pois = await POIService.searchNearbyPOIs(currentLocation, category.id, 5000);
      const resultsWithDistance = await POIService.calculateDistances(pois, currentLocation);
      
      setSearchResults(resultsWithDistance.slice(0, 10));
      setActiveTab('search');
      speak(`Found ${resultsWithDistance.length} ${category.name.toLowerCase()}`);
      
    } catch (error) {
      console.error('Quick search error:', error);
      speak('Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDestinationSelect = async (destination) => {
    if (shouldBlockInteraction()) {
      speak('Pull over safely to select destination');
      return;
    }

    try {
      // Add to recent searches
      const newRecent = {
        id: Date.now().toString(),
        name: destination.name,
        address: destination.address || 'Unknown address',
        type: 'poi',
        location: destination.location,
      };

      setRecentSearches(prev => [newRecent, ...prev.slice(0, 9)]);
      
      // Navigate to route preview
      navigation.navigate('RoutePreview', {
        origin: currentLocation,
        destination: {
          name: destination.name,
          location: destination.location,
        },
      });

      speak(`Calculating route to ${destination.name}`);
      
    } catch (error) {
      console.error('Error selecting destination:', error);
      Alert.alert('Error', 'Failed to select destination');
    }
  };

  const handleVoiceSearch = () => {
    speak('Say your destination after the beep');
    // This would integrate with voice service
  };

  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  };

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleDestinationSelect(item)}
    >
      <View style={styles.resultIcon}>
        <Icon name="place" size={24} color="#00FF88" />
      </View>
      
      <View style={styles.resultInfo}>
        <Text style={styles.resultName}>{item.name}</Text>
        <Text style={styles.resultAddress}>{item.address || 'No address'}</Text>
        {item.distance && (
          <Text style={styles.resultDistance}>{formatDistance(item.distance)} away</Text>
        )}
      </View>
      
      <Icon name="chevron-right" size={20} color="#666" />
    </TouchableOpacity>
  );

  const renderRecentSearch = ({ item }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleDestinationSelect(item)}
    >
      <View style={styles.resultIcon}>
        <Icon 
          name={item.type === 'home' ? 'home' : item.type === 'work' ? 'work' : 'history'} 
          size={24} 
          color="#FFA500" 
        />
      </View>
      
      <View style={styles.resultInfo}>
        <Text style={styles.resultName}>{item.name}</Text>
        <Text style={styles.resultAddress}>{item.address}</Text>
      </View>
      
      <Icon name="chevron-right" size={20} color="#666" />
    </TouchableOpacity>
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
        
        <Text style={styles.headerTitle}>Where to?</Text>
        
        <TouchableOpacity
          style={styles.voiceButton}
          onPress={handleVoiceSearch}
        >
          <Icon name="mic" size={24} color="#00FF88" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={24} color="#666" />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search for places..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            editable={!shouldBlockInteraction()}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Icon name="clear" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quick Search Categories */}
      {searchQuery.length === 0 && (
        <View style={styles.quickSearchContainer}>
          <Text style={styles.sectionTitle}>Quick Search</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
          >
            {quickSearchCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryButton, { backgroundColor: `${category.color}20` }]}
                onPress={() => handleQuickSearch(category)}
              >
                <Icon name={category.icon} size={24} color={category.color} />
                <Text style={[styles.categoryText, { color: category.color }]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
        >
          <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
            Search Results
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recent' && styles.activeTab]}
          onPress={() => setActiveTab('recent')}
        >
          <Text style={[styles.tabText, activeTab === 'recent' && styles.activeTabText]}>
            Recent
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'search' && (
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                {isLoading ? (
                  <Text style={styles.emptyText}>Searching...</Text>
                ) : searchQuery.length > 0 ? (
                  <Text style={styles.emptyText}>No results found</Text>
                ) : (
                  <Text style={styles.emptyText}>Start typing to search</Text>
                )}
              </View>
            }
          />
        )}

        {activeTab === 'recent' && (
          <FlatList
            data={recentSearches}
            renderItem={renderRecentSearch}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No recent searches</Text>
              </View>
            }
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
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginLeft: 10,
  },
  clearButton: {
    padding: 5,
  },
  quickSearchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  categoriesScroll: {
    flexDirection: 'row',
  },
  categoryButton: {
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 15,
    marginRight: 15,
    minWidth: 100,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#00FF88',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#00FF88',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  resultAddress: {
    fontSize: 14,
    color: '#999',
    marginBottom: 2,
  },
  resultDistance: {
    fontSize: 12,
    color: '#00FF88',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default DestinationSearchScreen;
