/**
 * Hazard Manager Module
 * Handles hazard detection, reporting, and avoidance
 */
class HazardManager extends BaseModule {
    constructor() {
        super('HazardManager');
        
        // Hazard types
        this.hazardTypes = {
            speedCamera: { icon: '📷', priority: 'high', color: '#FF6B6B' },
            redLightCamera: { icon: '🚦', priority: 'high', color: '#FF6B6B' },
            policeReport: { icon: '👮', priority: 'high', color: '#4ECDC4' },
            accident: { icon: '🚗💥', priority: 'critical', color: '#FF4444' },
            roadwork: { icon: '🚧', priority: 'medium', color: '#FFB347' },
            railwayCrossing: { icon: '🚂', priority: 'medium', color: '#96CEB4' },
            schoolZone: { icon: '🏫', priority: 'medium', color: '#45B7D1' },
            hospitalZone: { icon: '🏥', priority: 'low', color: '#98D8C8' },
            weather: { icon: '🌧️', priority: 'medium', color: '#87CEEB' },
            steepGrade: { icon: '⛰️', priority: 'low', color: '#DDA0DD' }
        };
        
        // Active hazards
        this.activeHazards = new Map();
        
        // Hazard settings
        this.settings = {
            speedCameras: true,
            redLightCameras: true,
            policeReports: true,
            roadwork: false,
            railwayCrossings: true,
            accidents: true,
            weather: false,
            steepGrades: false,
            schoolZones: true,
            hospitalZones: true
        };
        
        // Detection radius (meters)
        this.detectionRadius = 2000;
        
        // Warning distances (meters)
        this.warningDistances = {
            speedCamera: 500,
            redLightCamera: 300,
            policeReport: 1000,
            accident: 1000,
            roadwork: 800,
            railwayCrossing: 400,
            schoolZone: 200,
            hospitalZone: 200,
            weather: 5000,
            steepGrade: 1000
        };
    }

    async initialize() {
        await super.initialize();
        
        try {
            this.loadSettings();
            this.setupHazardDetection();
            this.log('Hazard manager initialized successfully', 'success');
        } catch (error) {
            this.handleError(error, 'Hazard manager initialization failed');
        }
    }

    loadSettings() {
        const saved = this.loadFromStorage('hazardSettings');
        if (saved) {
            this.settings = { ...this.settings, ...saved };
        }
    }

    saveSettings() {
        this.saveToStorage('hazardSettings', this.settings);
    }

    setupHazardDetection() {
        // Set up periodic hazard checking
        this.detectionInterval = setInterval(() => {
            this.checkForHazards();
        }, 5000); // Check every 5 seconds
    }

    async checkForHazards() {
        // This would typically fetch hazards from an API
        // For now, we'll simulate hazard detection
        try {
            const mockHazards = this.generateMockHazards();
            this.processHazards(mockHazards);
        } catch (error) {
            this.handleError(error, 'Hazard detection failed');
        }
    }

    generateMockHazards() {
        // Generate some mock hazards for demonstration
        const hazards = [];
        
        if (Math.random() < 0.3) { // 30% chance of speed camera
            hazards.push({
                id: `hazard_${Date.now()}_1`,
                type: 'speedCamera',
                lat: 53.5444 + (Math.random() - 0.5) * 0.01,
                lng: -1.3762 + (Math.random() - 0.5) * 0.01,
                speedLimit: 30,
                direction: 'both',
                confidence: 0.9,
                reportedAt: Date.now(),
                source: 'community'
            });
        }
        
        if (Math.random() < 0.2) { // 20% chance of roadwork
            hazards.push({
                id: `hazard_${Date.now()}_2`,
                type: 'roadwork',
                lat: 53.5444 + (Math.random() - 0.5) * 0.01,
                lng: -1.3762 + (Math.random() - 0.5) * 0.01,
                description: 'Lane closure',
                startDate: Date.now() - 86400000, // Started yesterday
                endDate: Date.now() + 604800000, // Ends in a week
                confidence: 0.8,
                source: 'official'
            });
        }
        
        return hazards;
    }

    processHazards(hazards) {
        hazards.forEach(hazard => {
            // Check if hazard type is enabled
            if (!this.settings[hazard.type]) {
                return;
            }
            
            // Add to active hazards
            this.activeHazards.set(hazard.id, {
                ...hazard,
                processedAt: Date.now()
            });
            
            this.emit('hazard:detected', hazard);
        });
        
        // Clean up old hazards
        this.cleanupOldHazards();
    }

    cleanupOldHazards() {
        const maxAge = 300000; // 5 minutes
        const now = Date.now();
        
        for (const [id, hazard] of this.activeHazards) {
            if (now - hazard.processedAt > maxAge) {
                this.activeHazards.delete(id);
                this.emit('hazard:expired', hazard);
            }
        }
    }

    checkHazardProximity(currentLocation) {
        if (!currentLocation) return;
        
        const nearbyHazards = [];
        
        for (const [id, hazard] of this.activeHazards) {
            const distance = this.calculateDistance(currentLocation, hazard);
            const warningDistance = this.warningDistances[hazard.type] || 500;
            
            if (distance <= warningDistance) {
                nearbyHazards.push({
                    ...hazard,
                    distance,
                    warningDistance
                });
            }
        }
        
        if (nearbyHazards.length > 0) {
            this.emit('hazards:nearby', nearbyHazards);
            this.processHazardWarnings(nearbyHazards);
        }
    }

    processHazardWarnings(hazards) {
        hazards.forEach(hazard => {
            const urgency = this.calculateUrgency(hazard);
            
            this.emit('hazard:warning', {
                hazard,
                urgency,
                message: this.generateWarningMessage(hazard)
            });
        });
    }

    calculateUrgency(hazard) {
        const priority = this.hazardTypes[hazard.type]?.priority || 'low';
        const distanceRatio = hazard.distance / hazard.warningDistance;
        
        if (priority === 'critical' || distanceRatio < 0.3) return 'critical';
        if (priority === 'high' || distanceRatio < 0.6) return 'high';
        if (priority === 'medium' || distanceRatio < 0.8) return 'medium';
        return 'low';
    }

    generateWarningMessage(hazard) {
        const hazardInfo = this.hazardTypes[hazard.type];
        const distance = Math.round(hazard.distance);
        
        const messages = {
            speedCamera: `Speed camera ahead in ${distance}m`,
            redLightCamera: `Red light camera in ${distance}m`,
            policeReport: `Police reported ahead in ${distance}m`,
            accident: `Accident reported ahead in ${distance}m`,
            roadwork: `Road work ahead in ${distance}m`,
            railwayCrossing: `Railway crossing in ${distance}m`,
            schoolZone: `School zone ahead in ${distance}m`,
            hospitalZone: `Hospital zone ahead in ${distance}m`,
            weather: `Weather hazard ahead in ${distance}m`,
            steepGrade: `Steep grade ahead in ${distance}m`
        };
        
        return messages[hazard.type] || `Hazard ahead in ${distance}m`;
    }

    calculateDistance(from, to) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = from.lat * Math.PI / 180;
        const φ2 = to.lat * Math.PI / 180;
        const Δφ = (to.lat - from.lat) * Math.PI / 180;
        const Δλ = (to.lng - from.lng) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }

    // Public API methods
    reportHazard(hazard) {
        const hazardReport = {
            id: `user_report_${Date.now()}`,
            ...hazard,
            reportedAt: Date.now(),
            source: 'user',
            confidence: 0.7
        };
        
        this.activeHazards.set(hazardReport.id, hazardReport);
        this.emit('hazard:reported', hazardReport);
        
        this.log(`Hazard reported: ${hazard.type}`, 'info');
        return hazardReport.id;
    }

    updateHazardSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
        this.emit('settings:updated', this.settings);
    }

    getHazardSettings() {
        return { ...this.settings };
    }

    getActiveHazards() {
        return Array.from(this.activeHazards.values());
    }

    getHazardTypes() {
        return { ...this.hazardTypes };
    }

    clearHazard(hazardId) {
        if (this.activeHazards.has(hazardId)) {
            const hazard = this.activeHazards.get(hazardId);
            this.activeHazards.delete(hazardId);
            this.emit('hazard:cleared', hazard);
            return true;
        }
        return false;
    }

    clearAllHazards() {
        const count = this.activeHazards.size;
        this.activeHazards.clear();
        this.emit('hazards:cleared', { count });
        this.log(`Cleared ${count} hazards`, 'info');
    }

    getHazardStatistics() {
        const stats = {
            total: this.activeHazards.size,
            byType: {},
            byPriority: { critical: 0, high: 0, medium: 0, low: 0 },
            bySources: { community: 0, official: 0, user: 0 }
        };
        
        for (const hazard of this.activeHazards.values()) {
            // Count by type
            stats.byType[hazard.type] = (stats.byType[hazard.type] || 0) + 1;
            
            // Count by priority
            const priority = this.hazardTypes[hazard.type]?.priority || 'low';
            stats.byPriority[priority]++;
            
            // Count by source
            stats.bySources[hazard.source] = (stats.bySources[hazard.source] || 0) + 1;
        }
        
        return stats;
    }

    destroy() {
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
        }
        this.activeHazards.clear();
        super.destroy();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HazardManager;
} else {
    window.HazardManager = HazardManager;
}
