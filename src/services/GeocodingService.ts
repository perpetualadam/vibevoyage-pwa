/**
 * Geocoding Service using Nominatim API
 * Provides address search, reverse geocoding, and location suggestions
 */

interface GeocodingResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
  type: string;
  importance: number;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
  boundingbox: [string, string, string, string];
}

interface SearchSuggestion {
  id: string;
  display_name: string;
  short_name: string;
  type: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  address: any;
  importance: number;
}

class GeocodingService {
  private static instance: GeocodingService;
  private baseUrl = 'https://nominatim.openstreetmap.org';
  private cache = new Map<string, any>();
  private cacheDuration = 24 * 60 * 60 * 1000; // 24 hours
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private minRequestInterval = 1000; // 1 second between requests (Nominatim rate limit)

  private constructor() {}

  public static getInstance(): GeocodingService {
    if (!GeocodingService.instance) {
      GeocodingService.instance = new GeocodingService();
    }
    return GeocodingService.instance;
  }

  /**
   * Search for addresses and places
   */
  public async search(query: string, options: {
    limit?: number;
    countrycodes?: string;
    bounded?: boolean;
    viewbox?: string;
  } = {}): Promise<SearchSuggestion[]> {
    if (!query || query.length < 3) {
      return [];
    }

    const cacheKey = `search_${query}_${JSON.stringify(options)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: (options.limit || 5).toString(),
        'accept-language': 'en',
        ...options
      });

      const results = await this.makeRequest(`${this.baseUrl}/search?${params}`);
      const suggestions = this.formatSearchResults(results);
      
      this.setCache(cacheKey, suggestions);
      return suggestions;
    } catch (error) {
      console.error('Geocoding search error:', error);
      return [];
    }
  }

  /**
   * Reverse geocoding - get address from coordinates
   */
  public async reverse(lat: number, lng: number, options: {
    zoom?: number;
    addressdetails?: boolean;
  } = {}): Promise<SearchSuggestion | null> {
    const cacheKey = `reverse_${lat}_${lng}_${JSON.stringify(options)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lng.toString(),
        format: 'json',
        addressdetails: (options.addressdetails !== false).toString(),
        zoom: (options.zoom || 18).toString(),
        'accept-language': 'en'
      });

      const result = await this.makeRequest(`${this.baseUrl}/reverse?${params}`);
      if (!result) {
        return null;
      }

      const suggestion = this.formatSingleResult(result);
      this.setCache(cacheKey, suggestion);
      return suggestion;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Get suggestions as user types
   */
  public async getSuggestions(query: string, userLocation?: {lat: number, lng: number}): Promise<SearchSuggestion[]> {
    if (!query || query.length < 3) {
      return [];
    }

    const options: any = {
      limit: 8,
      addressdetails: true
    };

    // Bias results towards user location if available
    if (userLocation) {
      const radius = 0.1; // ~11km radius
      options.viewbox = `${userLocation.lng - radius},${userLocation.lat + radius},${userLocation.lng + radius},${userLocation.lat - radius}`;
      options.bounded = '1';
    }

    // Try to detect country from query for better results
    const countryMatch = query.match(/\b(UK|GB|United Kingdom|England|Scotland|Wales)\b/i);
    if (countryMatch) {
      options.countrycodes = 'gb';
    }

    return await this.search(query, options);
  }

  /**
   * Parse various address formats
   */
  public parseAddress(input: string): {
    type: 'coordinates' | 'postcode' | 'address' | 'place';
    query: string;
    coordinates?: {lat: number, lng: number};
  } {
    // Check for coordinates (lat,lng or lng,lat)
    const coordPattern = /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/;
    const coordMatch = input.match(coordPattern);
    if (coordMatch) {
      const [, first, second] = coordMatch;
      const num1 = parseFloat(first);
      const num2 = parseFloat(second);
      
      // Determine if it's lat,lng or lng,lat based on ranges
      if (Math.abs(num1) <= 90 && Math.abs(num2) <= 180) {
        return {
          type: 'coordinates',
          query: input,
          coordinates: { lat: num1, lng: num2 }
        };
      } else if (Math.abs(num2) <= 90 && Math.abs(num1) <= 180) {
        return {
          type: 'coordinates',
          query: input,
          coordinates: { lat: num2, lng: num1 }
        };
      }
    }

    // Check for UK postcode
    const postcodePattern = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
    if (postcodePattern.test(input.replace(/\s+/g, ' ').trim())) {
      return {
        type: 'postcode',
        query: input.toUpperCase()
      };
    }

    // Check if it looks like a place name (single word or short phrase)
    if (input.split(' ').length <= 2 && !/\d/.test(input)) {
      return {
        type: 'place',
        query: input
      };
    }

    // Default to address
    return {
      type: 'address',
      query: input
    };
  }

  private async makeRequest(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          // Respect rate limiting
          const now = Date.now();
          const timeSinceLastRequest = now - this.lastRequestTime;
          if (timeSinceLastRequest < this.minRequestInterval) {
            await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
          }

          const response = await fetch(url, {
            headers: {
              'User-Agent': 'VibeVoyage PWA Navigation App'
            }
          });

          this.lastRequestTime = Date.now();

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          resolve(data);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        await request();
      }
    }

    this.isProcessingQueue = false;
  }

  private formatSearchResults(results: GeocodingResult[]): SearchSuggestion[] {
    return results.map(result => this.formatSingleResult(result));
  }

  private formatSingleResult(result: GeocodingResult): SearchSuggestion {
    const address = result.address || {};
    
    // Create a short, readable name
    let shortName = '';
    if (address.house_number && address.road) {
      shortName = `${address.house_number} ${address.road}`;
    } else if (address.road) {
      shortName = address.road;
    } else if (address.suburb || address.city) {
      shortName = address.suburb || address.city || '';
    } else {
      shortName = result.display_name.split(',')[0];
    }

    return {
      id: result.place_id,
      display_name: result.display_name,
      short_name: shortName,
      type: result.type,
      coordinates: {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon)
      },
      address: address,
      importance: result.importance || 0
    };
  }

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Clean old cache entries
    if (this.cache.size > 1000) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      entries.slice(0, 200).forEach(([key]) => this.cache.delete(key));
    }
  }
}

export default GeocodingService;
export type { SearchSuggestion, GeocodingResult };
