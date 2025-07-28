/**
 * JavaScript Geocoding Service
 * Replaces the TypeScript version with pure JavaScript implementation
 */

class GeocodingService {
    constructor() {
        this.baseUrl = 'https://nominatim.openstreetmap.org';
        this.requestDelay = 1000; // 1 second delay between requests to respect rate limits
        this.lastRequestTime = 0;
    }

    async waitForRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.requestDelay) {
            const waitTime = this.requestDelay - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastRequestTime = Date.now();
    }

    async geocode(address, options = {}) {
        await this.waitForRateLimit();

        try {
            const params = new URLSearchParams({
                format: 'json',
                q: address,
                limit: options.limit || 5,
                addressdetails: '1',
                extratags: '1',
                namedetails: '1'
            });

            if (options.countryCode) {
                params.append('countrycodes', options.countryCode);
            }

            if (options.bounds) {
                params.append('viewbox', options.bounds);
                params.append('bounded', '1');
            }

            const response = await fetch(`${this.baseUrl}/search?${params}`);
            
            if (!response.ok) {
                throw new Error(`Geocoding request failed: ${response.status}`);
            }

            const data = await response.json();
            
            return data.map(item => this.formatGeocodingResult(item));
        } catch (error) {
            // Handle CORS errors more gracefully
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                console.warn('🚫 CORS error blocked geocoding request - this is expected for some queries');
            } else {
                console.error('Geocoding error:', error);
            }
            return [];
        }
    }

    async reverseGeocode(lat, lng, options = {}) {
        await this.waitForRateLimit();

        try {
            const params = new URLSearchParams({
                format: 'json',
                lat: lat.toString(),
                lon: lng.toString(),
                addressdetails: '1',
                extratags: '1',
                namedetails: '1',
                zoom: options.zoom || '18'
            });

            const response = await fetch(`${this.baseUrl}/reverse?${params}`);
            
            if (!response.ok) {
                throw new Error(`Reverse geocoding request failed: ${response.status}`);
            }

            const data = await response.json();
            
            return this.formatGeocodingResult(data);
        } catch (error) {
            // Handle CORS errors more gracefully
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                console.warn('🚫 CORS error blocked reverse geocoding request');
            } else {
                console.error('Reverse geocoding error:', error);
            }
            return null;
        }
    }

    async searchPlaces(query, options = {}) {
        const searchOptions = {
            ...options,
            limit: options.limit || 10
        };

        return await this.geocode(query, searchOptions);
    }

    async searchPostcode(postcode, countryCode = 'gb') {
        const searchOptions = {
            countryCode: countryCode,
            limit: 5
        };

        return await this.geocode(postcode, searchOptions);
    }

    async searchAddress(address, options = {}) {
        const searchOptions = {
            ...options,
            limit: options.limit || 5
        };

        return await this.geocode(address, searchOptions);
    }

    async searchPOI(query, lat, lng, radius = 5000) {
        await this.waitForRateLimit();

        try {
            // Create a bounding box around the center point
            const bounds = this.createBoundingBox(lat, lng, radius);
            
            const params = new URLSearchParams({
                format: 'json',
                q: query,
                limit: '20',
                addressdetails: '1',
                extratags: '1',
                viewbox: bounds,
                bounded: '1'
            });

            const response = await fetch(`${this.baseUrl}/search?${params}`);
            
            if (!response.ok) {
                throw new Error(`POI search request failed: ${response.status}`);
            }

            const data = await response.json();
            
            return data
                .map(item => this.formatGeocodingResult(item))
                .filter(item => {
                    // Filter by actual distance
                    const distance = this.calculateDistance(
                        { lat, lng },
                        { lat: item.lat, lng: item.lng }
                    );
                    return distance <= radius;
                })
                .sort((a, b) => {
                    // Sort by distance
                    const distanceA = this.calculateDistance({ lat, lng }, { lat: a.lat, lng: a.lng });
                    const distanceB = this.calculateDistance({ lat, lng }, { lat: b.lat, lng: b.lng });
                    return distanceA - distanceB;
                });
        } catch (error) {
            console.error('POI search error:', error);
            return [];
        }
    }

    formatGeocodingResult(item) {
        if (!item) return null;

        const address = item.address || {};
        const displayName = item.display_name || '';
        
        return {
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            displayName: displayName,
            address: {
                house_number: address.house_number || '',
                road: address.road || '',
                suburb: address.suburb || address.neighbourhood || '',
                city: address.city || address.town || address.village || '',
                county: address.county || '',
                state: address.state || '',
                postcode: address.postcode || '',
                country: address.country || '',
                country_code: address.country_code || ''
            },
            type: item.type || 'unknown',
            class: item.class || 'unknown',
            importance: item.importance || 0,
            place_id: item.place_id,
            osm_type: item.osm_type,
            osm_id: item.osm_id,
            boundingbox: item.boundingbox || [],
            extratags: item.extratags || {},
            namedetails: item.namedetails || {}
        };
    }

    createBoundingBox(lat, lng, radiusMeters) {
        // Approximate conversion: 1 degree ≈ 111,000 meters
        const latDelta = radiusMeters / 111000;
        const lngDelta = radiusMeters / (111000 * Math.cos(lat * Math.PI / 180));

        const minLng = lng - lngDelta;
        const minLat = lat - latDelta;
        const maxLng = lng + lngDelta;
        const maxLat = lat + latDelta;

        return `${minLng},${minLat},${maxLng},${maxLat}`;
    }

    calculateDistance(point1, point2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = point1.lat * Math.PI / 180;
        const φ2 = point2.lat * Math.PI / 180;
        const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
        const Δλ = (point2.lng - point1.lng) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // Distance in meters
    }

    // Utility methods
    isValidCoordinate(lat, lng) {
        return !isNaN(lat) && !isNaN(lng) && 
               lat >= -90 && lat <= 90 && 
               lng >= -180 && lng <= 180;
    }

    formatAddress(addressComponents) {
        const parts = [];
        
        if (addressComponents.house_number && addressComponents.road) {
            parts.push(`${addressComponents.house_number} ${addressComponents.road}`);
        } else if (addressComponents.road) {
            parts.push(addressComponents.road);
        }
        
        if (addressComponents.suburb) {
            parts.push(addressComponents.suburb);
        }
        
        if (addressComponents.city) {
            parts.push(addressComponents.city);
        }
        
        if (addressComponents.postcode) {
            parts.push(addressComponents.postcode);
        }
        
        if (addressComponents.country) {
            parts.push(addressComponents.country);
        }
        
        return parts.join(', ');
    }

    // Get suggestions based on partial input
    async getSuggestions(partialInput, options = {}) {
        if (!partialInput || partialInput.length < 3) {
            return [];
        }

        const searchOptions = {
            ...options,
            limit: options.limit || 5
        };

        return await this.geocode(partialInput, searchOptions);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeocodingService;
} else {
    window.GeocodingService = GeocodingService;
}
