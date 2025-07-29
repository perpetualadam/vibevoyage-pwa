/**
 * Route Manager Module
 * Handles route calculation, optimization, and management
 */
class RouteManager extends BaseModule {
    constructor() {
        super('RouteManager');
        
        // Route state
        this.currentRoute = null;
        this.availableRoutes = [];
        this.routeOptions = {
            avoidTolls: false,
            avoidHighways: false,
            avoidFerries: false,
            routeType: 'fastest' // fastest, shortest, scenic
        };
        
        // API endpoints
        this.osrmEndpoint = 'https://router.project-osrm.org/route/v1/driving';
        this.requestTimeout = 10000;
        
        // Route cache
        this.routeCache = new Map();
        this.maxCacheSize = 50;
    }

    async initialize() {
        await super.initialize();
        this.loadRouteOptions();
        this.log('Route manager initialized successfully', 'success');
    }

    async calculateRoute(from, to, options = {}) {
        this.validateLocation(from);
        this.validateLocation(to);
        
        const routeKey = this.generateRouteKey(from, to, options);
        
        // Check cache first
        if (this.routeCache.has(routeKey)) {
            this.log('Route found in cache', 'debug');
            const cachedRoute = this.routeCache.get(routeKey);
            this.emit('route:calculated', cachedRoute);
            return cachedRoute;
        }

        try {
            this.log('Calculating route...');
            this.emit('route:calculating');
            
            const routes = await this.calculateMultipleRoutes(from, to, options);
            
            if (routes.length === 0) {
                throw new Error('No routes found');
            }

            // Select best route
            const bestRoute = this.selectBestRoute(routes);
            this.currentRoute = bestRoute;
            this.availableRoutes = routes;
            
            // Cache the result
            this.cacheRoute(routeKey, bestRoute);
            
            this.emit('route:calculated', bestRoute);
            this.log('Route calculated successfully', 'success');
            
            return bestRoute;
            
        } catch (error) {
            this.handleError(error, 'Route calculation failed');
            this.emit('route:error', error);
            throw error;
        }
    }

    async calculateMultipleRoutes(from, to, options = {}) {
        const mergedOptions = { ...this.routeOptions, ...options };
        const routePromises = [];

        // Build different route variants
        const routeVariants = this.buildRouteVariants(from, to, mergedOptions);
        
        // Execute all route requests
        for (const variant of routeVariants) {
            routePromises.push(
                this.fetchRoute(variant.url, variant.name)
                    .catch(error => {
                        this.log(`Route variant ${variant.name} failed: ${error.message}`, 'warning');
                        return null;
                    })
            );
        }

        const results = await Promise.all(routePromises);
        const validRoutes = results.filter(route => route !== null);
        
        // Process and enhance routes
        return validRoutes.map((route, index) => this.enhanceRoute(route, index));
    }

    buildRouteVariants(from, to, options) {
        const start = `${from.lng},${from.lat}`;
        const end = `${to.lng},${to.lat}`;
        // Remove invalid OSRM parameters: voice_instructions is not supported by OSRM
        const baseParams = 'overview=full&geometries=geojson&steps=true';

        const variants = [
            {
                name: 'Fastest Route',
                url: `${this.osrmEndpoint}/${start};${end}?${baseParams}&alternatives=true`,
                type: 'fastest'
            }
        ];

        // Add highway-avoiding route if not already avoiding
        // Note: OSRM supports exclude parameter with specific road types
        if (!options.avoidHighways) {
            variants.push({
                name: 'No Highways',
                url: `${this.osrmEndpoint}/${start};${end}?${baseParams}&exclude=motorway`,
                type: 'no_highways'
            });
        }

        // Add shortest route - remove continue_straight parameter as it's not valid for OSRM
        variants.push({
            name: 'Shortest Route',
            url: `${this.osrmEndpoint}/${start};${end}?${baseParams}`,
            type: 'shortest'
        });

        return variants;
    }

    async fetchRoute(url, routeName) {
        try {
            // Check if fetch is available
            if (typeof fetch === 'undefined') {
                throw new Error('Fetch API not available');
            }

            this.log(`Fetching route: ${routeName}`, 'debug');
            this.log(`Request URL: ${url}`, 'debug');

            const response = await this.withTimeout(
                fetch(url),
                this.requestTimeout,
                `Route request timed out for ${routeName}`
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.routes || data.routes.length === 0) {
                throw new Error('No routes in response');
            }

            this.log(`Route fetched successfully: ${routeName}`, 'success');

            return {
                ...data.routes[0],
                name: routeName,
                source: 'OSRM'
            };

        } catch (error) {
            this.log(`Route fetch failed: ${routeName} - ${error.message}`, 'error');
            throw new Error(`Failed to fetch ${routeName}: ${error.message}`);
        }
    }

    enhanceRoute(route, index) {
        // Add additional route properties
        const enhanced = {
            ...route,
            id: `route_${Date.now()}_${index}`,
            color: this.getRouteColor(index),
            score: this.calculateRouteScore(route),
            estimatedFuelCost: this.calculateFuelCost(route.distance),
            estimatedTime: Math.round(route.duration / 60), // minutes
            createdAt: Date.now()
        };

        // Add route type classification
        enhanced.classification = this.classifyRoute(enhanced);
        
        return enhanced;
    }

    calculateRouteScore(route) {
        // Score based on time, distance, and other factors
        const timeScore = Math.max(0, 100 - (route.duration / 60)); // Lower time = higher score
        const distanceScore = Math.max(0, 100 - (route.distance / 1000)); // Lower distance = higher score
        
        return Math.round((timeScore + distanceScore) / 2);
    }

    classifyRoute(route) {
        const avgSpeed = (route.distance / 1000) / (route.duration / 3600); // km/h
        
        if (avgSpeed > 60) return 'highway';
        if (avgSpeed < 30) return 'city';
        if (route.name?.includes('Scenic')) return 'scenic';
        
        return 'mixed';
    }

    calculateFuelCost(distance) {
        const fuelEfficiency = 8; // L/100km default
        const fuelPrice = 1.45; // £1.45 per liter default
        const litersUsed = (distance / 1000) * (fuelEfficiency / 100);
        return litersUsed * fuelPrice;
    }

    getRouteColor(index) {
        const colors = ['#00FF88', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
        return colors[index % colors.length];
    }

    selectBestRoute(routes) {
        if (routes.length === 0) {
            throw new Error('No routes to select from');
        }

        // Sort by score (highest first)
        const sortedRoutes = routes.sort((a, b) => b.score - a.score);
        return sortedRoutes[0];
    }

    /**
     * Route management methods
     */
    getCurrentRoute() {
        return this.currentRoute;
    }

    getAvailableRoutes() {
        return [...this.availableRoutes];
    }

    selectRoute(routeId) {
        const route = this.availableRoutes.find(r => r.id === routeId);
        if (!route) {
            throw new Error('Route not found');
        }

        this.currentRoute = route;
        this.emit('route:selected', route);
        return route;
    }

    /**
     * Cache management
     */
    generateRouteKey(from, to, options) {
        const fromKey = `${from.lat.toFixed(4)},${from.lng.toFixed(4)}`;
        const toKey = `${to.lat.toFixed(4)},${to.lng.toFixed(4)}`;
        const optionsKey = JSON.stringify(options);
        return `${fromKey}-${toKey}-${optionsKey}`;
    }

    cacheRoute(key, route) {
        // Implement LRU cache
        if (this.routeCache.size >= this.maxCacheSize) {
            const firstKey = this.routeCache.keys().next().value;
            this.routeCache.delete(firstKey);
        }
        
        this.routeCache.set(key, route);
    }

    clearCache() {
        this.routeCache.clear();
        this.log('Route cache cleared', 'info');
    }

    /**
     * Settings management
     */
    updateRouteOptions(options) {
        this.routeOptions = { ...this.routeOptions, ...options };
        this.saveRouteOptions();
        this.emit('options:updated', this.routeOptions);
    }

    loadRouteOptions() {
        const saved = this.loadFromStorage('routeOptions');
        if (saved) {
            this.routeOptions = { ...this.routeOptions, ...saved };
        }
    }

    saveRouteOptions() {
        this.saveToStorage('routeOptions', this.routeOptions);
    }

    /**
     * Utility methods
     */
    getRouteDistance(route) {
        return route ? route.distance : 0;
    }

    getRouteDuration(route) {
        return route ? route.duration : 0;
    }

    getRouteSteps(route) {
        return route && route.legs ? route.legs[0]?.steps || [] : [];
    }

    destroy() {
        this.clearCache();
        super.destroy();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RouteManager;
} else {
    window.RouteManager = RouteManager;
}
