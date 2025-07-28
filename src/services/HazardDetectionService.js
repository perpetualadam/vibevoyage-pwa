/**
 * JavaScript Hazard Detection Service
 * Replaces the TypeScript version with pure JavaScript implementation
 */

class HazardDetectionService {
    constructor() {
        this.hazards = [];
        this.alertDistance = 500; // meters
        this.lastAlertTime = {};
        this.loadHazards();
    }

    async loadHazards() {
        try {
            const response = await fetch('/public/hazards.geojson');
            if (!response.ok) {
                // Try alternative path
                const altResponse = await fetch('/hazards.geojson');
                if (!altResponse.ok) {
                    throw new Error('Hazards file not found');
                }
                const geojson = await altResponse.json();
                this.hazards = geojson.features || [];
            } else {
                const geojson = await response.json();
                this.hazards = geojson.features || [];
            }
            
            console.log(`✅ HazardDetectionService: Loaded ${this.hazards.length} hazards`);
        } catch (error) {
            console.error('Error loading hazards:', error);
            this.hazards = [];
        }
    }

    async checkProximity(currentLocation, alertDistance = this.alertDistance) {
        if (!currentLocation || !this.hazards.length) {
            return [];
        }

        const alerts = [];
        const now = Date.now();

        for (const hazard of this.hazards) {
            const hazardLocation = {
                lat: hazard.geometry.coordinates[1],
                lng: hazard.geometry.coordinates[0]
            };

            const distance = this.calculateDistance(currentLocation, hazardLocation);

            if (distance <= alertDistance) {
                const hazardId = hazard.properties.id || `${hazard.geometry.coordinates[0]}_${hazard.geometry.coordinates[1]}`;
                
                // Check if we've alerted for this hazard recently (5 second cooldown)
                if (!this.lastAlertTime[hazardId] || (now - this.lastAlertTime[hazardId]) > 5000) {
                    alerts.push({
                        hazard: hazard,
                        distance: distance,
                        type: hazard.properties.type,
                        severity: hazard.properties.severity || 'medium'
                    });
                    
                    this.lastAlertTime[hazardId] = now;
                }
            }
        }

        return alerts.sort((a, b) => a.distance - b.distance);
    }

    getHazardsNearRoute(routeCoordinates, bufferDistance = 500) {
        if (!routeCoordinates || !this.hazards.length) {
            return [];
        }

        const nearRouteHazards = [];

        for (const hazard of this.hazards) {
            const hazardLocation = {
                lat: hazard.geometry.coordinates[1],
                lng: hazard.geometry.coordinates[0]
            };

            // Check if hazard is within buffer distance of any route point
            const isNearRoute = routeCoordinates.some(routePoint => {
                const distance = this.calculateDistance(routePoint, hazardLocation);
                return distance <= bufferDistance;
            });

            if (isNearRoute) {
                nearRouteHazards.push(hazard);
            }
        }

        return nearRouteHazards;
    }

    getHazardsByType(type) {
        return this.hazards.filter(hazard => hazard.properties.type === type);
    }

    getHazardsBySeverity(severity) {
        return this.hazards.filter(hazard => hazard.properties.severity === severity);
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

    // Get hazard display information
    getHazardDisplayInfo(hazard) {
        const type = hazard.properties.type;
        const severity = hazard.properties.severity || 'medium';

        const displayInfo = {
            name: this.getHazardDisplayName(type),
            icon: this.getHazardIcon(type),
            color: this.getHazardColor(type, severity),
            description: hazard.properties.description || 'No description available'
        };

        return displayInfo;
    }

    getHazardDisplayName(type) {
        const names = {
            'speed_camera': 'Speed Camera',
            'red_light_camera': 'Red Light Camera',
            'roadwork': 'Road Work',
            'average_speed_camera': 'Average Speed Camera',
            'traffic_light': 'Traffic Light',
            'school_zone': 'School Zone',
            'hospital_zone': 'Hospital Zone'
        };
        return names[type] || 'Unknown Hazard';
    }

    getHazardIcon(type) {
        const icons = {
            'speed_camera': '📷',
            'red_light_camera': '🚦',
            'roadwork': '🚧',
            'average_speed_camera': '📹',
            'traffic_light': '🚥',
            'school_zone': '🏫',
            'hospital_zone': '🏥'
        };
        return icons[type] || '⚠️';
    }

    getHazardColor(type, severity) {
        const baseColors = {
            'speed_camera': '#FFA500',
            'red_light_camera': '#FF6B6B',
            'roadwork': '#FFD700',
            'average_speed_camera': '#87CEEB',
            'traffic_light': '#32CD32',
            'school_zone': '#FF69B4',
            'hospital_zone': '#FF0000'
        };
        
        let color = baseColors[type] || '#666';
        
        // Adjust for severity
        if (severity === 'high') {
            return color;
        } else if (severity === 'medium') {
            return color + 'CC'; // 80% opacity
        } else {
            return color + '99'; // 60% opacity
        }
    }

    // Update alert distance
    setAlertDistance(distance) {
        this.alertDistance = Math.max(100, Math.min(2000, distance)); // Between 100m and 2km
    }

    // Get statistics
    getStatistics() {
        const stats = {
            total: this.hazards.length,
            byType: {},
            bySeverity: {}
        };

        this.hazards.forEach(hazard => {
            const type = hazard.properties.type;
            const severity = hazard.properties.severity || 'medium';

            stats.byType[type] = (stats.byType[type] || 0) + 1;
            stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
        });

        return stats;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HazardDetectionService;
} else {
    window.HazardDetectionService = HazardDetectionService;
}
