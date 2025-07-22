import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

class POIService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.cachedPOIs = new Map();
    this.userPOIs = [];
    this.favoritePOIs = [];
    this.overpassBaseUrl = 'https://overpass-api.de/api/interpreter';
    this.cacheDuration = 30 * 60 * 1000; // 30 minutes
    this.googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY;
    this.yelpApiKey = process.env.YELP_API_KEY;
    this.transitApiKey = process.env.TRANSIT_API_KEY;
    this.settings = {
      enableExternalAPIs: true,
      enableTransitSchedules: true,
      preferredDataSource: 'combined', // 'osm', 'google', 'yelp', 'combined'
      maxResults: 50,
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadUserPOIs();
      await this.loadFavoritePOIs();
      this.isInitialized = true;
      console.log('POIService initialized successfully');
    } catch (error) {
      console.error('POIService initialization failed:', error);
      throw error;
    }
  }

  async searchNearbyPOIs(location, category = 'all', radius = 2000) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const cacheKey = `${location.latitude},${location.longitude},${category},${radius}`;
    
    // Check cache first
    const cached = this.cachedPOIs.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }

    try {
      const query = this.buildOverpassQuery(location, category, radius);
      const response = await axios.post(this.overpassBaseUrl, query, {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 10000,
      });

      const pois = this.parseOverpassResponse(response.data, category);
      
      // Cache the results
      this.cachedPOIs.set(cacheKey, {
        data: pois,
        timestamp: Date.now(),
      });

      this.notifyListeners('poisFound', { pois, category, location });
      return pois;

    } catch (error) {
      console.error('POI search error:', error);
      this.notifyListeners('poiError', { error: error.message });
      return [];
    }
  }

  buildOverpassQuery(location, category, radius) {
    const { latitude, longitude } = location;
    const bbox = this.calculateBoundingBox(latitude, longitude, radius);
    
    let amenityFilter = '';
    switch (category) {
      case 'fuel':
        amenityFilter = 'amenity~"fuel"';
        break;
      case 'food':
        amenityFilter = 'amenity~"restaurant|fast_food|cafe|bar|pub"';
        break;
      case 'lodging':
        amenityFilter = 'tourism~"hotel|motel|hostel|guest_house"';
        break;
      case 'medical':
        amenityFilter = 'amenity~"hospital|clinic|pharmacy|dentist"';
        break;
      case 'shopping':
        amenityFilter = 'shop~"supermarket|mall|department_store"';
        break;
      case 'tourism':
        amenityFilter = 'tourism~"attraction|museum|viewpoint|zoo"';
        break;
      case 'parking':
        amenityFilter = 'amenity~"parking"';
        break;
      case 'bank':
        amenityFilter = 'amenity~"bank|atm"';
        break;
      default:
        amenityFilter = 'amenity';
    }

    return `
      [out:json][timeout:25];
      (
        node[${amenityFilter}](${bbox});
        way[${amenityFilter}](${bbox});
        relation[${amenityFilter}](${bbox});
      );
      out center meta;
    `;
  }

  calculateBoundingBox(lat, lon, radiusMeters) {
    const latDelta = radiusMeters / 111320; // Approximate meters per degree latitude
    const lonDelta = radiusMeters / (111320 * Math.cos(lat * Math.PI / 180));
    
    const south = lat - latDelta;
    const north = lat + latDelta;
    const west = lon - lonDelta;
    const east = lon + lonDelta;
    
    return `${south},${west},${north},${east}`;
  }

  parseOverpassResponse(data, category) {
    const pois = [];
    
    if (!data.elements) return pois;

    data.elements.forEach(element => {
      if (!element.tags) return;

      const poi = {
        id: element.id,
        type: element.type,
        category: this.categorizePOI(element.tags),
        name: element.tags.name || element.tags.brand || 'Unknown',
        amenity: element.tags.amenity,
        location: {
          latitude: element.lat || element.center?.lat,
          longitude: element.lon || element.center?.lon,
        },
        address: this.formatAddress(element.tags),
        phone: element.tags.phone,
        website: element.tags.website,
        openingHours: element.tags.opening_hours,
        rating: this.parseRating(element.tags),
        priceLevel: this.parsePriceLevel(element.tags),
        features: this.extractFeatures(element.tags),
        distance: null, // Will be calculated later
        timestamp: Date.now(),
      };

      // Only include POIs with valid coordinates
      if (poi.location.latitude && poi.location.longitude) {
        pois.push(poi);
      }
    });

    return pois.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }

  categorizePOI(tags) {
    if (tags.amenity === 'fuel') return 'fuel';
    if (['restaurant', 'fast_food', 'cafe', 'bar', 'pub'].includes(tags.amenity)) return 'food';
    if (['hotel', 'motel', 'hostel', 'guest_house'].includes(tags.tourism)) return 'lodging';
    if (['hospital', 'clinic', 'pharmacy', 'dentist'].includes(tags.amenity)) return 'medical';
    if (tags.shop) return 'shopping';
    if (['attraction', 'museum', 'viewpoint', 'zoo'].includes(tags.tourism)) return 'tourism';
    if (tags.amenity === 'parking') return 'parking';
    if (['bank', 'atm'].includes(tags.amenity)) return 'bank';
    return 'other';
  }

  formatAddress(tags) {
    const parts = [];
    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
    if (tags['addr:street']) parts.push(tags['addr:street']);
    if (tags['addr:city']) parts.push(tags['addr:city']);
    if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
    return parts.join(', ') || null;
  }

  parseRating(tags) {
    if (tags.stars) return parseFloat(tags.stars);
    if (tags.rating) return parseFloat(tags.rating);
    return null;
  }

  parsePriceLevel(tags) {
    if (tags.price_level) return parseInt(tags.price_level);
    if (tags.fee === 'yes') return 2;
    if (tags.fee === 'no') return 0;
    return null;
  }

  extractFeatures(tags) {
    const features = [];
    
    // Common features
    if (tags.wifi === 'yes' || tags.internet_access === 'wlan') features.push('wifi');
    if (tags.wheelchair === 'yes') features.push('wheelchair_accessible');
    if (tags.parking === 'yes') features.push('parking');
    if (tags.takeaway === 'yes') features.push('takeaway');
    if (tags.delivery === 'yes') features.push('delivery');
    if (tags.outdoor_seating === 'yes') features.push('outdoor_seating');
    if (tags.air_conditioning === 'yes') features.push('air_conditioning');
    
    // Fuel station features
    if (tags.amenity === 'fuel') {
      if (tags.shop === 'convenience') features.push('convenience_store');
      if (tags.car_wash === 'yes') features.push('car_wash');
      if (tags.compressed_air === 'yes') features.push('air_pump');
    }
    
    return features;
  }

  async calculateDistances(pois, userLocation) {
    return pois.map(poi => ({
      ...poi,
      distance: this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        poi.location.latitude,
        poi.location.longitude
      ),
    }));
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  // User POI management
  async addUserPOI(poi) {
    const userPOI = {
      ...poi,
      id: Date.now(),
      isUserCreated: true,
      timestamp: Date.now(),
    };
    
    this.userPOIs.push(userPOI);
    await this.saveUserPOIs();
    this.notifyListeners('userPOIAdded', { poi: userPOI });
    return userPOI;
  }

  async removeUserPOI(poiId) {
    this.userPOIs = this.userPOIs.filter(poi => poi.id !== poiId);
    await this.saveUserPOIs();
    this.notifyListeners('userPOIRemoved', { poiId });
  }

  async addToFavorites(poi) {
    if (!this.favoritePOIs.find(fav => fav.id === poi.id)) {
      this.favoritePOIs.push({
        ...poi,
        favoritedAt: Date.now(),
      });
      await this.saveFavoritePOIs();
      this.notifyListeners('poiAddedToFavorites', { poi });
    }
  }

  async removeFromFavorites(poiId) {
    this.favoritePOIs = this.favoritePOIs.filter(poi => poi.id !== poiId);
    await this.saveFavoritePOIs();
    this.notifyListeners('poiRemovedFromFavorites', { poiId });
  }

  // Storage methods
  async loadUserPOIs() {
    try {
      const stored = await AsyncStorage.getItem('userPOIs');
      if (stored) {
        this.userPOIs = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading user POIs:', error);
    }
  }

  async saveUserPOIs() {
    try {
      await AsyncStorage.setItem('userPOIs', JSON.stringify(this.userPOIs));
    } catch (error) {
      console.error('Error saving user POIs:', error);
    }
  }

  async loadFavoritePOIs() {
    try {
      const stored = await AsyncStorage.getItem('favoritePOIs');
      if (stored) {
        this.favoritePOIs = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading favorite POIs:', error);
    }
  }

  async saveFavoritePOIs() {
    try {
      await AsyncStorage.setItem('favoritePOIs', JSON.stringify(this.favoritePOIs));
    } catch (error) {
      console.error('Error saving favorite POIs:', error);
    }
  }

  // Getters
  getUserPOIs() {
    return [...this.userPOIs];
  }

  getFavoritePOIs() {
    return [...this.favoritePOIs];
  }

  getCachedPOIs() {
    const cached = [];
    for (const [key, value] of this.cachedPOIs) {
      if (Date.now() - value.timestamp < this.cacheDuration) {
        cached.push(...value.data);
      }
    }
    return cached;
  }

  // Listener management
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('POIService listener error:', error);
      }
    });
  }

  // Enhanced POI search with external APIs and advanced filtering
  async searchPOIsWithFilters(location, category = 'all', radius = 5000, filters = {}) {
    const cacheKey = `${location.latitude}_${location.longitude}_${category}_${radius}_${JSON.stringify(filters)}`;

    // Check cache first
    const cached = this.cachedPOIs.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }

    try {
      let allPOIs = [];

      // Fetch from multiple sources based on settings
      if (this.settings.preferredDataSource === 'combined' || this.settings.preferredDataSource === 'osm') {
        const osmPOIs = await this.fetchFromOpenStreetMapWithFilters(location, category, radius, filters);
        allPOIs = allPOIs.concat(osmPOIs);
      }

      if (this.settings.enableExternalAPIs && this.googlePlacesApiKey &&
          (this.settings.preferredDataSource === 'combined' || this.settings.preferredDataSource === 'google')) {
        const googlePOIs = await this.fetchFromGooglePlaces(location, category, radius, filters);
        allPOIs = allPOIs.concat(googlePOIs);
      }

      if (this.settings.enableExternalAPIs && this.yelpApiKey &&
          (this.settings.preferredDataSource === 'combined' || this.settings.preferredDataSource === 'yelp')) {
        const yelpPOIs = await this.fetchFromYelp(location, category, radius, filters);
        allPOIs = allPOIs.concat(yelpPOIs);
      }

      // Remove duplicates and merge data
      const uniquePOIs = this.deduplicateAndMergePOIs(allPOIs);

      // Apply advanced filters
      const filteredPOIs = this.applyAdvancedFilters(uniquePOIs, filters);

      // Sort by relevance and distance
      const sortedPOIs = this.sortPOIsByRelevance(filteredPOIs, location, filters);

      // Limit results
      const limitedPOIs = sortedPOIs.slice(0, this.settings.maxResults);

      // Cache the results
      this.cachedPOIs.set(cacheKey, {
        data: limitedPOIs,
        timestamp: Date.now(),
      });

      this.notifyListeners('poisFound', { pois: limitedPOIs, category, location, filters });
      return limitedPOIs;

    } catch (error) {
      console.error('Enhanced POI search error:', error);
      this.notifyListeners('poiError', { error: error.message });
      return [];
    }
  }

  async fetchFromGooglePlaces(location, category, radius, filters) {
    if (!this.googlePlacesApiKey) return [];

    try {
      const placeType = this.mapCategoryToGoogleType(category);
      const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

      const params = {
        location: `${location.latitude},${location.longitude}`,
        radius: Math.min(radius, 50000), // Google Places API limit
        type: placeType,
        key: this.googlePlacesApiKey,
      };

      // Add filters
      if (filters.keyword) {
        params.keyword = filters.keyword;
      }
      if (filters.minPrice) {
        params.minprice = filters.minPrice;
      }
      if (filters.maxPrice) {
        params.maxprice = filters.maxPrice;
      }

      const response = await axios.get(url, { params, timeout: 10000 });

      if (response.data.status === 'OK') {
        return this.parseGooglePlacesResponse(response.data.results, category);
      }

      return [];
    } catch (error) {
      console.error('Google Places API error:', error);
      return [];
    }
  }

  async fetchFromYelp(location, category, radius, filters) {
    if (!this.yelpApiKey) return [];

    try {
      const yelpCategory = this.mapCategoryToYelpCategory(category);
      const url = 'https://api.yelp.com/v3/businesses/search';

      const params = {
        latitude: location.latitude,
        longitude: location.longitude,
        radius: Math.min(radius, 40000), // Yelp API limit
        categories: yelpCategory,
        limit: 50,
      };

      // Add filters
      if (filters.priceRange) {
        params.price = filters.priceRange.join(',');
      }
      if (filters.openNow) {
        params.open_now = true;
      }
      if (filters.rating) {
        params.rating = filters.rating;
      }

      const response = await axios.get(url, {
        params,
        headers: {
          'Authorization': `Bearer ${this.yelpApiKey}`,
        },
        timeout: 10000,
      });

      if (response.data.businesses) {
        return this.parseYelpResponse(response.data.businesses, category);
      }

      return [];
    } catch (error) {
      console.error('Yelp API error:', error);
      return [];
    }
  }

  async fetchFromOpenStreetMapWithFilters(location, category, radius, filters) {
    try {
      const query = this.buildOverpassQueryWithFilters(location, category, radius, filters);
      const response = await axios.post(this.overpassBaseUrl, query, {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 10000,
      });

      return this.parseOverpassResponse(response.data, category);
    } catch (error) {
      console.error('OSM POI fetch error:', error);
      return [];
    }
  }

  buildOverpassQueryWithFilters(location, category, radius, filters) {
    const { latitude, longitude } = location;
    const bbox = this.calculateBoundingBox(latitude, longitude, radius);

    let amenityFilter = this.getCategoryFilter(category);

    // Add fuel type filter for fuel stations
    if (category === 'fuel' && filters.fuelType) {
      const fuelTypes = Array.isArray(filters.fuelType) ? filters.fuelType : [filters.fuelType];
      const fuelFilter = fuelTypes.map(type => `["fuel:${type}"="yes"]`).join('');
      amenityFilter += fuelFilter;
    }

    // Add cuisine filter for restaurants
    if (category === 'food' && filters.cuisine) {
      const cuisines = Array.isArray(filters.cuisine) ? filters.cuisine : [filters.cuisine];
      const cuisineFilter = cuisines.map(cuisine => `["cuisine"~"${cuisine}"]`).join('|');
      amenityFilter += `[${cuisineFilter}]`;
    }

    return `
      [out:json][timeout:25];
      (
        node[${amenityFilter}](${bbox});
        way[${amenityFilter}](${bbox});
        relation[${amenityFilter}](${bbox});
      );
      out center meta;
    `;
  }

  mapCategoryToGoogleType(category) {
    const mapping = {
      fuel: 'gas_station',
      food: 'restaurant',
      lodging: 'lodging',
      medical: 'hospital',
      shopping: 'shopping_mall',
      tourism: 'tourist_attraction',
      parking: 'parking',
      bank: 'bank',
      transit: 'transit_station',
    };
    return mapping[category] || 'establishment';
  }

  mapCategoryToYelpCategory(category) {
    const mapping = {
      fuel: 'servicestations',
      food: 'restaurants',
      lodging: 'hotels',
      medical: 'health',
      shopping: 'shopping',
      tourism: 'tours',
      bank: 'financialservices',
    };
    return mapping[category] || 'all';
  }

  parseGooglePlacesResponse(results, category) {
    return results.map(place => ({
      id: `google_${place.place_id}`,
      type: 'google_place',
      category: this.categorizePOI({ amenity: category }),
      name: place.name,
      location: {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      },
      address: place.vicinity,
      rating: place.rating,
      priceLevel: place.price_level,
      features: this.extractGooglePlaceFeatures(place),
      openingHours: place.opening_hours?.open_now ? 'Open now' : 'Unknown',
      photos: place.photos?.map(photo => ({
        reference: photo.photo_reference,
        width: photo.width,
        height: photo.height,
      })) || [],
      source: 'google_places',
      timestamp: Date.now(),
    }));
  }

  parseYelpResponse(businesses, category) {
    return businesses.map(business => ({
      id: `yelp_${business.id}`,
      type: 'yelp_business',
      category: this.categorizePOI({ amenity: category }),
      name: business.name,
      location: {
        latitude: business.coordinates.latitude,
        longitude: business.coordinates.longitude,
      },
      address: business.location.display_address.join(', '),
      phone: business.phone,
      rating: business.rating,
      priceLevel: business.price ? business.price.length : null,
      features: this.extractYelpFeatures(business),
      openingHours: business.is_closed ? 'Closed' : 'Unknown',
      photos: business.image_url ? [{ url: business.image_url }] : [],
      reviewCount: business.review_count,
      categories: business.categories.map(cat => cat.title),
      source: 'yelp',
      timestamp: Date.now(),
    }));
  }

  extractGooglePlaceFeatures(place) {
    const features = [];
    if (place.opening_hours?.open_now) features.push('open_now');
    if (place.price_level !== undefined) features.push(`price_level_${place.price_level}`);
    if (place.rating >= 4.0) features.push('highly_rated');
    return features;
  }

  extractYelpFeatures(business) {
    const features = [];
    if (!business.is_closed) features.push('open_now');
    if (business.price) features.push(`price_${business.price}`);
    if (business.rating >= 4.0) features.push('highly_rated');
    if (business.transactions?.includes('delivery')) features.push('delivery');
    if (business.transactions?.includes('pickup')) features.push('pickup');
    return features;
  }

  deduplicateAndMergePOIs(pois) {
    const uniquePOIs = new Map();

    pois.forEach(poi => {
      const key = `${Math.round(poi.location.latitude * 1000)}_${Math.round(poi.location.longitude * 1000)}_${poi.name.toLowerCase()}`;

      if (!uniquePOIs.has(key)) {
        uniquePOIs.set(key, poi);
      } else {
        // Merge data from multiple sources
        const existing = uniquePOIs.get(key);
        const merged = this.mergePOIData(existing, poi);
        uniquePOIs.set(key, merged);
      }
    });

    return Array.from(uniquePOIs.values());
  }

  mergePOIData(poi1, poi2) {
    return {
      ...poi1,
      rating: poi2.rating || poi1.rating,
      priceLevel: poi2.priceLevel || poi1.priceLevel,
      phone: poi2.phone || poi1.phone,
      website: poi2.website || poi1.website,
      features: [...new Set([...poi1.features, ...poi2.features])],
      photos: [...(poi1.photos || []), ...(poi2.photos || [])],
      sources: [poi1.source, poi2.source].filter(Boolean),
    };
  }

  applyAdvancedFilters(pois, filters) {
    return pois.filter(poi => {
      // Price range filter
      if (filters.priceRange && poi.priceLevel !== null) {
        if (!filters.priceRange.includes(poi.priceLevel)) {
          return false;
        }
      }

      // Rating filter
      if (filters.minRating && poi.rating !== null) {
        if (poi.rating < filters.minRating) {
          return false;
        }
      }

      // Open now filter
      if (filters.openNow && !poi.features.includes('open_now')) {
        return false;
      }

      // Fuel type filter
      if (filters.fuelType && poi.category === 'fuel') {
        const hasFuelType = Array.isArray(filters.fuelType)
          ? filters.fuelType.some(type => poi.features.includes(`fuel_${type}`))
          : poi.features.includes(`fuel_${filters.fuelType}`);
        if (!hasFuelType) {
          return false;
        }
      }

      // Cuisine filter
      if (filters.cuisine && poi.category === 'food') {
        const hasCuisine = Array.isArray(filters.cuisine)
          ? filters.cuisine.some(cuisine => poi.features.includes(`cuisine_${cuisine}`))
          : poi.features.includes(`cuisine_${filters.cuisine}`);
        if (!hasCuisine) {
          return false;
        }
      }

      return true;
    });
  }

  sortPOIsByRelevance(pois, location, filters) {
    return pois.sort((a, b) => {
      // Calculate relevance score
      let scoreA = 0;
      let scoreB = 0;

      // Distance factor (closer is better)
      const distanceA = this.calculateDistance(
        location.latitude, location.longitude,
        a.location.latitude, a.location.longitude
      );
      const distanceB = this.calculateDistance(
        location.latitude, location.longitude,
        b.location.latitude, b.location.longitude
      );

      scoreA += (5000 - Math.min(distanceA, 5000)) / 100;
      scoreB += (5000 - Math.min(distanceB, 5000)) / 100;

      // Rating factor
      if (a.rating) scoreA += a.rating * 10;
      if (b.rating) scoreB += b.rating * 10;

      // Source reliability factor
      const sourceScores = { google_places: 30, yelp: 25, osm: 20 };
      scoreA += sourceScores[a.source] || 10;
      scoreB += sourceScores[b.source] || 10;

      return scoreB - scoreA;
    });
  }

  // Real-time transit schedules for bus stops
  async getTransitSchedules(poi) {
    if (!this.settings.enableTransitSchedules || !this.transitApiKey || poi.category !== 'transit') {
      return null;
    }

    try {
      // This would integrate with local transit APIs
      // Example implementation for generic transit API
      const url = `https://api.transitapp.com/v3/public/stops/${poi.id}/departures`;

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.transitApiKey}`,
        },
        timeout: 5000,
      });

      if (response.data.departures) {
        return {
          stopName: poi.name,
          departures: response.data.departures.map(dep => ({
            route: dep.route_short_name,
            destination: dep.headsign,
            departureTime: dep.departure_time,
            delay: dep.delay,
            realtime: dep.realtime,
          })),
          lastUpdated: Date.now(),
        };
      }

      return null;
    } catch (error) {
      console.error('Transit schedule fetch error:', error);
      return null;
    }
  }

  // Add POI as waypoint to route
  async addPOIAsWaypoint(poi, routeOptions = {}) {
    try {
      const waypoint = {
        id: poi.id,
        name: poi.name,
        location: poi.location,
        category: poi.category,
        estimatedStopTime: this.getEstimatedStopTime(poi.category),
        addedAt: Date.now(),
      };

      this.notifyListeners('poiAddedAsWaypoint', { poi, waypoint, routeOptions });
      return waypoint;
    } catch (error) {
      console.error('Error adding POI as waypoint:', error);
      throw error;
    }
  }

  getEstimatedStopTime(category) {
    const stopTimes = {
      fuel: 5, // 5 minutes
      food: 30, // 30 minutes
      shopping: 60, // 1 hour
      tourism: 45, // 45 minutes
      medical: 20, // 20 minutes
      bank: 10, // 10 minutes
    };
    return stopTimes[category] || 15; // Default 15 minutes
  }

  // POI announcements during navigation
  shouldAnnouncePOI(poi, distance, userPreferences = {}) {
    const announcementDistances = {
      fuel: [1000, 500], // Announce at 1km and 500m
      food: [800, 400],
      tourism: [1200, 600],
      medical: [1500, 800],
      shopping: [600, 300],
    };

    const distances = announcementDistances[poi.category] || [1000, 500];
    return distances.some(threshold => Math.abs(distance - threshold) < 50);
  }

  generatePOIAnnouncement(poi, distance, units = 'metric') {
    const distanceText = units === 'imperial'
      ? `${(distance * 0.000621371).toFixed(1)} miles`
      : `${distance} meters`;

    const announcements = {
      fuel: [
        `Petrol station ${distanceText} ahead on the right`,
        `Fuel station coming up in ${distanceText}`,
        `Gas station ${distanceText} ahead`,
      ],
      food: [
        `Restaurant ${distanceText} ahead`,
        `Dining option in ${distanceText}`,
        `Food available ${distanceText} ahead`,
      ],
      tourism: [
        `Tourist attraction ${distanceText} ahead`,
        `Point of interest in ${distanceText}`,
        `Landmark coming up in ${distanceText}`,
      ],
    };

    const categoryAnnouncements = announcements[poi.category] || [
      `${poi.name} ${distanceText} ahead`,
    ];

    return categoryAnnouncements[Math.floor(Math.random() * categoryAnnouncements.length)];
  }

  destroy() {
    this.listeners = [];
    this.cachedPOIs.clear();
    this.isInitialized = false;
  }
}

export default new POIService();
