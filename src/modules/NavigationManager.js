/**
 * Navigation Manager Module
 * Handles turn-by-turn navigation, instructions, and guidance
 */
class NavigationManager extends BaseModule {
    constructor() {
        super('NavigationManager');
        
        // Navigation state
        this.isNavigating = false;
        this.currentRoute = null;
        this.currentStep = 0;
        this.navigationStartTime = null;
        this.estimatedArrival = null;
        
        // Navigation settings
        this.voiceEnabled = true;
        this.autoRecalculate = true;
        this.recalculateThreshold = 100; // meters off route
        
        // Progress tracking
        this.distanceRemaining = 0;
        this.timeRemaining = 0;
        this.progressPercent = 0;
        
        // Voice synthesis
        this.speechSynthesis = null;
        this.currentVoice = null;
    }

    async initialize() {
        await super.initialize();
        this.initializeVoice();
        this.log('Navigation manager initialized successfully', 'success');
    }

    initializeVoice() {
        try {
            if ('speechSynthesis' in window) {
                this.speechSynthesis = window.speechSynthesis;

                // Wait for voices to load
                if (this.speechSynthesis.getVoices().length === 0) {
                    this.speechSynthesis.addEventListener('voiceschanged', () => {
                        this.selectVoice();
                    });
                } else {
                    this.selectVoice();
                }
            } else {
                this.log('Speech synthesis not supported', 'warning');
                this.voiceEnabled = false;
            }
        } catch (error) {
            this.handleError(error, 'Voice initialization failed');
            this.voiceEnabled = false;
        }
    }

    selectVoice() {
        const voices = this.speechSynthesis.getVoices();
        // Prefer English voices
        this.currentVoice = voices.find(voice => voice.lang.startsWith('en')) || voices[0];
        this.log(`Voice selected: ${this.currentVoice?.name || 'None'}`, 'debug');
    }

    async startNavigation(from, to, route = null) {
        this.validateLocation(from);
        this.validateLocation(to);
        
        try {
            this.log('Starting navigation...');
            
            // Use provided route or calculate new one
            if (!route) {
                // Route should be calculated by RouteManager
                throw new Error('No route provided for navigation');
            }
            
            this.currentRoute = route;
            this.currentStep = 0;
            this.navigationStartTime = Date.now();
            this.isNavigating = true;
            
            // Calculate initial progress
            this.updateProgress(from);
            
            // Start navigation guidance
            this.startGuidance();
            
            this.emit('navigation:started', {
                route: this.currentRoute,
                startTime: this.navigationStartTime
            });
            
            this.log('Navigation started successfully', 'success');
            
        } catch (error) {
            this.handleError(error, 'Failed to start navigation');
            throw error;
        }
    }

    stopNavigation() {
        if (!this.isNavigating) {
            return;
        }

        const navigationData = {
            route: this.currentRoute,
            startTime: this.navigationStartTime,
            endTime: Date.now(),
            duration: Date.now() - this.navigationStartTime,
            completed: this.progressPercent >= 95
        };

        this.isNavigating = false;
        this.currentRoute = null;
        this.currentStep = 0;
        this.navigationStartTime = null;
        
        this.emit('navigation:stopped', navigationData);
        this.log('Navigation stopped', 'info');
    }

    updateLocation(location) {
        if (!this.isNavigating || !this.currentRoute) {
            return;
        }

        this.validateLocation(location);
        
        // Update progress
        this.updateProgress(location);
        
        // Check if we need to advance to next step
        this.checkStepProgress(location);
        
        // Check if we're off route
        if (this.autoRecalculate) {
            this.checkOffRoute(location);
        }
        
        // Check if we've arrived
        this.checkArrival(location);
        
        this.emit('navigation:location:updated', {
            location,
            step: this.currentStep,
            progress: this.progressPercent,
            distanceRemaining: this.distanceRemaining,
            timeRemaining: this.timeRemaining
        });
    }

    updateProgress(currentLocation) {
        if (!this.currentRoute) return;
        
        const destination = this.getDestination();
        if (!destination) return;
        
        // Calculate remaining distance
        this.distanceRemaining = this.calculateDistance(currentLocation, destination);
        
        // Calculate progress percentage
        const totalDistance = this.currentRoute.distance;
        const traveledDistance = totalDistance - this.distanceRemaining;
        this.progressPercent = Math.min(100, Math.max(0, (traveledDistance / totalDistance) * 100));
        
        // Estimate remaining time
        const avgSpeed = this.calculateAverageSpeed();
        this.timeRemaining = avgSpeed > 0 ? (this.distanceRemaining / avgSpeed) * 3.6 : 0; // Convert to minutes
        
        // Update estimated arrival
        this.estimatedArrival = new Date(Date.now() + this.timeRemaining * 60000);
    }

    calculateAverageSpeed() {
        if (!this.navigationStartTime) return 30; // Default 30 km/h
        
        const elapsedTime = (Date.now() - this.navigationStartTime) / 1000 / 3600; // hours
        const traveledDistance = (this.currentRoute.distance - this.distanceRemaining) / 1000; // km
        
        return elapsedTime > 0 ? traveledDistance / elapsedTime : 30;
    }

    checkStepProgress(location) {
        const steps = this.getRouteSteps();
        if (!steps || this.currentStep >= steps.length) return;
        
        const currentStepData = steps[this.currentStep];
        if (!currentStepData) return;
        
        // Simple distance-based step advancement
        const stepEndLocation = this.getStepEndLocation(currentStepData);
        if (stepEndLocation) {
            const distanceToStepEnd = this.calculateDistance(location, stepEndLocation);
            
            // If we're close to the step end, advance to next step
            if (distanceToStepEnd < 50) { // 50 meters threshold
                this.advanceToNextStep();
            }
        }
    }

    advanceToNextStep() {
        const steps = this.getRouteSteps();
        if (!steps || this.currentStep >= steps.length - 1) return;
        
        this.currentStep++;
        const nextStep = steps[this.currentStep];
        
        if (nextStep) {
            this.announceInstruction(nextStep);
            this.emit('navigation:step:advanced', {
                step: this.currentStep,
                instruction: nextStep
            });
        }
    }

    checkOffRoute(location) {
        // Simplified off-route detection
        const routeCoordinates = this.getRouteCoordinates();
        if (!routeCoordinates || routeCoordinates.length === 0) return;
        
        // Find closest point on route
        let minDistance = Infinity;
        for (const coord of routeCoordinates) {
            const distance = this.calculateDistance(location, { lat: coord[1], lng: coord[0] });
            minDistance = Math.min(minDistance, distance);
        }
        
        if (minDistance > this.recalculateThreshold) {
            this.emit('navigation:off:route', {
                location,
                distanceFromRoute: minDistance
            });
        }
    }

    checkArrival(location) {
        const destination = this.getDestination();
        if (!destination) return;
        
        const distanceToDestination = this.calculateDistance(location, destination);
        
        if (distanceToDestination < 50) { // 50 meters arrival threshold
            this.handleArrival();
        }
    }

    handleArrival() {
        this.announceArrival();
        this.emit('navigation:arrived');
        this.stopNavigation();
    }

    startGuidance() {
        const steps = this.getRouteSteps();
        if (steps && steps.length > 0) {
            this.announceInstruction(steps[0]);
        }
    }

    announceInstruction(step) {
        if (!this.voiceEnabled || !step) return;
        
        const instruction = this.formatInstruction(step);
        this.speak(instruction);
        
        this.emit('navigation:instruction', {
            step: this.currentStep,
            instruction,
            maneuver: step.maneuver
        });
    }

    announceArrival() {
        this.speak('You have arrived at your destination.');
    }

    formatInstruction(step) {
        if (!step.maneuver) return 'Continue straight';
        
        const maneuver = step.maneuver;
        const distance = step.distance ? Math.round(step.distance) : 0;
        
        let instruction = maneuver.instruction || 'Continue';
        
        if (distance > 0) {
            instruction += ` in ${distance} meters`;
        }
        
        return instruction;
    }

    speak(text) {
        if (!this.speechSynthesis || !this.currentVoice || !this.voiceEnabled) {
            return;
        }

        // Cancel any ongoing speech
        this.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = this.currentVoice;
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
        this.speechSynthesis.speak(utterance);
        this.log(`Speaking: ${text}`, 'debug');
    }

    /**
     * Utility methods
     */
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

    getRouteSteps() {
        return this.currentRoute?.legs?.[0]?.steps || [];
    }

    getRouteCoordinates() {
        return this.currentRoute?.geometry?.coordinates || [];
    }

    getDestination() {
        const coordinates = this.getRouteCoordinates();
        if (coordinates.length === 0) return null;
        
        const lastCoord = coordinates[coordinates.length - 1];
        return { lat: lastCoord[1], lng: lastCoord[0] };
    }

    getStepEndLocation(step) {
        // Simplified - would need more complex logic for real implementation
        return null;
    }

    /**
     * Settings methods
     */
    setVoiceEnabled(enabled) {
        this.voiceEnabled = enabled;
        this.emit('navigation:voice:changed', enabled);
    }

    setAutoRecalculate(enabled) {
        this.autoRecalculate = enabled;
    }

    /**
     * Status methods
     */
    getNavigationStatus() {
        return {
            isNavigating: this.isNavigating,
            currentStep: this.currentStep,
            progressPercent: this.progressPercent,
            distanceRemaining: this.distanceRemaining,
            timeRemaining: this.timeRemaining,
            estimatedArrival: this.estimatedArrival
        };
    }

    destroy() {
        this.stopNavigation();
        if (this.speechSynthesis) {
            this.speechSynthesis.cancel();
        }
        super.destroy();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationManager;
} else {
    window.NavigationManager = NavigationManager;
}
