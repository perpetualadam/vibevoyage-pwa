/**
 * Enhanced Navigation Service
 * Provides turn-by-turn navigation with route following, off-route detection, and automatic rerouting
 */

import VoiceNavigationService from './VoiceNavigationService';
import HazardDetectionService from './HazardDetectionService';
import type { Coordinates } from './HazardDetectionService';
import type { NavigationInstruction } from './VoiceNavigationService';

interface RouteStep {
  instruction: string;
  maneuver: string;
  distance: number;
  duration: number;
  geometry: Coordinates[];
  name?: string;
  way_name?: string;
  mode: string;
  driving_side: string;
  weight: number;
  intersections: any[];
}

interface Route {
  distance: number;
  duration: number;
  geometry: Coordinates[];
  legs: Array<{
    distance: number;
    duration: number;
    steps: RouteStep[];
  }>;
  weight_name: string;
  weight: number;
}

interface NavigationState {
  isNavigating: boolean;
  currentRoute: Route | null;
  currentStepIndex: number;
  currentLegIndex: number;
  distanceToNextManeuver: number;
  timeToNextManeuver: number;
  totalDistanceRemaining: number;
  totalTimeRemaining: number;
  currentSpeed: number;
  isOffRoute: boolean;
  lastKnownPosition: Coordinates | null;
  routeProgress: number; // 0-1
}

interface NavigationSettings {
  autoReroute: boolean;
  offRouteThreshold: number; // meters
  rerouteDelay: number; // seconds
  voiceGuidance: boolean;
  hazardAlerts: boolean;
  speedAlerts: boolean;
  maneuverDistance: number; // meters ahead to announce
}

class NavigationService {
  private static instance: NavigationService;
  private state: NavigationState;
  private settings: NavigationSettings;
  private voiceService: VoiceNavigationService;
  private hazardService: HazardDetectionService;
  private listeners: Array<(state: NavigationState) => void> = [];
  private routeCheckInterval: number | null = null;
  private lastAnnouncedStep = -1;
  private lastRerouteTime = 0;
  private storageKey = 'vibevoyage_navigation_settings';

  private constructor() {
    this.state = this.getInitialState();
    this.settings = this.loadSettings();
    this.voiceService = VoiceNavigationService.getInstance();
    this.hazardService = HazardDetectionService.getInstance();
  }

  public static getInstance(): NavigationService {
    if (!NavigationService.instance) {
      NavigationService.instance = new NavigationService();
    }
    return NavigationService.instance;
  }

  private getInitialState(): NavigationState {
    return {
      isNavigating: false,
      currentRoute: null,
      currentStepIndex: 0,
      currentLegIndex: 0,
      distanceToNextManeuver: 0,
      timeToNextManeuver: 0,
      totalDistanceRemaining: 0,
      totalTimeRemaining: 0,
      currentSpeed: 0,
      isOffRoute: false,
      lastKnownPosition: null,
      routeProgress: 0
    };
  }

  private loadSettings(): NavigationSettings {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return { ...this.getDefaultSettings(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load navigation settings:', error);
    }
    return this.getDefaultSettings();
  }

  private getDefaultSettings(): NavigationSettings {
    return {
      autoReroute: true,
      offRouteThreshold: 50, // 50 meters
      rerouteDelay: 5, // 5 seconds
      voiceGuidance: true,
      hazardAlerts: true,
      speedAlerts: true,
      maneuverDistance: 200 // 200 meters
    };
  }

  public startNavigation(route: Route): void {
    this.state = {
      ...this.getInitialState(),
      isNavigating: true,
      currentRoute: route,
      totalDistanceRemaining: route.distance,
      totalTimeRemaining: route.duration
    };

    this.lastAnnouncedStep = -1;
    this.startRouteTracking();
    
    if (this.settings.voiceGuidance) {
      this.voiceService.speak('Navigation started', 'normal');
    }

    this.notifyListeners();
  }

  public stopNavigation(): void {
    this.state.isNavigating = false;
    this.stopRouteTracking();
    
    if (this.settings.voiceGuidance) {
      this.voiceService.speak('Navigation stopped', 'normal');
    }

    this.state = this.getInitialState();
    this.notifyListeners();
  }

  public updateLocation(location: Coordinates, speed?: number, heading?: number): void {
    if (!this.state.isNavigating || !this.state.currentRoute) {
      return;
    }

    this.state.lastKnownPosition = location;
    this.state.currentSpeed = speed || 0;

    // Calculate progress along route
    this.updateRouteProgress(location);

    // Check if off route
    this.checkOffRoute(location);

    // Update distances and times
    this.updateNavigationMetrics(location);

    // Check for upcoming maneuvers
    this.checkUpcomingManeuvers(location);

    // Check for hazards
    if (this.settings.hazardAlerts) {
      this.checkHazards(location, speed);
    }

    this.notifyListeners();
  }

  private updateRouteProgress(location: Coordinates): void {
    if (!this.state.currentRoute) return;

    const route = this.state.currentRoute;
    let closestDistance = Infinity;
    let closestPointIndex = 0;

    // Find closest point on route
    for (let i = 0; i < route.geometry.length; i++) {
      const distance = this.calculateDistance(location, route.geometry[i]);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPointIndex = i;
      }
    }

    // Calculate progress as percentage
    this.state.routeProgress = closestPointIndex / route.geometry.length;

    // Update current step based on progress
    this.updateCurrentStep(closestPointIndex);
  }

  private updateCurrentStep(routePointIndex: number): void {
    if (!this.state.currentRoute) return;

    const route = this.state.currentRoute;
    let totalDistance = 0;
    let currentStepIndex = 0;
    let currentLegIndex = 0;

    // Calculate which step we're on based on distance
    for (let legIndex = 0; legIndex < route.legs.length; legIndex++) {
      const leg = route.legs[legIndex];
      
      for (let stepIndex = 0; stepIndex < leg.steps.length; stepIndex++) {
        const step = leg.steps[stepIndex];
        totalDistance += step.distance;
        
        const progressDistance = (routePointIndex / route.geometry.length) * route.distance;
        
        if (progressDistance <= totalDistance) {
          currentStepIndex = stepIndex;
          currentLegIndex = legIndex;
          break;
        }
      }
    }

    this.state.currentStepIndex = currentStepIndex;
    this.state.currentLegIndex = currentLegIndex;
  }

  private checkOffRoute(location: Coordinates): void {
    if (!this.state.currentRoute) return;

    const route = this.state.currentRoute;
    let minDistance = Infinity;

    // Check distance to route geometry
    for (const point of route.geometry) {
      const distance = this.calculateDistance(location, point);
      minDistance = Math.min(minDistance, distance);
    }

    const wasOffRoute = this.state.isOffRoute;
    this.state.isOffRoute = minDistance > this.settings.offRouteThreshold;

    // Handle off-route detection
    if (this.state.isOffRoute && !wasOffRoute) {
      this.handleOffRoute(location);
    } else if (!this.state.isOffRoute && wasOffRoute) {
      this.handleBackOnRoute();
    }
  }

  private handleOffRoute(location: Coordinates): void {
    console.log('User went off route');
    
    if (this.settings.voiceGuidance) {
      this.voiceService.announceOffRoute();
    }

    // Auto-reroute if enabled and enough time has passed
    if (this.settings.autoReroute) {
      const now = Date.now();
      if (now - this.lastRerouteTime > this.settings.rerouteDelay * 1000) {
        this.requestReroute(location);
        this.lastRerouteTime = now;
      }
    }
  }

  private handleBackOnRoute(): void {
    console.log('User back on route');
    
    if (this.settings.voiceGuidance) {
      this.voiceService.speak('Back on route', 'normal');
    }
  }

  private async requestReroute(location: Coordinates): Promise<void> {
    try {
      if (this.settings.voiceGuidance) {
        this.voiceService.announceRerouting();
      }

      // In a real implementation, this would call the routing service
      // For now, we'll just simulate a reroute
      console.log('Requesting reroute from:', location);
      
      // TODO: Implement actual rerouting logic
      // const newRoute = await RoutingService.getRoute(location, destination);
      // this.updateRoute(newRoute);
      
    } catch (error) {
      console.error('Rerouting failed:', error);
    }
  }

  private updateNavigationMetrics(location: Coordinates): void {
    if (!this.state.currentRoute) return;

    const currentLeg = this.state.currentRoute.legs[this.state.currentLegIndex];
    if (!currentLeg) return;

    const currentStep = currentLeg.steps[this.state.currentStepIndex];
    if (!currentStep) return;

    // Calculate distance to next maneuver
    if (currentStep.geometry.length > 0) {
      const nextManeuverPoint = currentStep.geometry[currentStep.geometry.length - 1];
      this.state.distanceToNextManeuver = this.calculateDistance(location, nextManeuverPoint);
    }

    // Calculate time to next maneuver based on current speed
    if (this.state.currentSpeed > 0) {
      this.state.timeToNextManeuver = this.state.distanceToNextManeuver / (this.state.currentSpeed * 1000 / 3600);
    }

    // Calculate remaining distance and time
    let remainingDistance = 0;
    let remainingTime = 0;

    for (let legIndex = this.state.currentLegIndex; legIndex < this.state.currentRoute.legs.length; legIndex++) {
      const leg = this.state.currentRoute.legs[legIndex];
      
      for (let stepIndex = (legIndex === this.state.currentLegIndex ? this.state.currentStepIndex : 0); 
           stepIndex < leg.steps.length; stepIndex++) {
        const step = leg.steps[stepIndex];
        remainingDistance += step.distance;
        remainingTime += step.duration;
      }
    }

    this.state.totalDistanceRemaining = remainingDistance;
    this.state.totalTimeRemaining = remainingTime;
  }

  private checkUpcomingManeuvers(location: Coordinates): void {
    if (!this.state.currentRoute || !this.settings.voiceGuidance) return;

    const currentLeg = this.state.currentRoute.legs[this.state.currentLegIndex];
    if (!currentLeg) return;

    const currentStep = currentLeg.steps[this.state.currentStepIndex];
    if (!currentStep) return;

    // Check if we should announce the current maneuver
    if (this.state.currentStepIndex !== this.lastAnnouncedStep &&
        this.state.distanceToNextManeuver <= this.settings.maneuverDistance) {
      
      const instruction: NavigationInstruction = {
        type: this.getInstructionType(currentStep.maneuver),
        direction: this.getDirection(currentStep.maneuver),
        distance: this.state.distanceToNextManeuver,
        street: currentStep.name || currentStep.way_name,
        instruction: currentStep.instruction,
        maneuver: currentStep.maneuver
      };

      this.voiceService.announceNavigation(instruction);
      this.lastAnnouncedStep = this.state.currentStepIndex;
    }
  }

  private getInstructionType(maneuver: string): 'turn' | 'continue' | 'arrive' | 'depart' | 'roundabout' {
    if (maneuver.includes('turn')) return 'turn';
    if (maneuver.includes('roundabout')) return 'roundabout';
    if (maneuver.includes('arrive')) return 'arrive';
    if (maneuver.includes('depart')) return 'depart';
    return 'continue';
  }

  private getDirection(maneuver: string): 'left' | 'right' | 'straight' | 'slight_left' | 'slight_right' | 'sharp_left' | 'sharp_right' | undefined {
    if (maneuver.includes('left')) {
      if (maneuver.includes('slight')) return 'slight_left';
      if (maneuver.includes('sharp')) return 'sharp_left';
      return 'left';
    }
    if (maneuver.includes('right')) {
      if (maneuver.includes('slight')) return 'slight_right';
      if (maneuver.includes('sharp')) return 'sharp_right';
      return 'right';
    }
    if (maneuver.includes('straight')) return 'straight';
    return undefined;
  }

  private async checkHazards(location: Coordinates, speed?: number): Promise<void> {
    try {
      const alerts = await this.hazardService.checkProximity(location, speed);
      
      for (const alert of alerts) {
        if (alert.alertLevel === 'critical' || alert.alertLevel === 'warning') {
          this.voiceService.announceHazard(
            alert.hazard.properties.type,
            alert.distance,
            alert.hazard.properties.severity
          );
        }
      }
    } catch (error) {
      console.error('Error checking hazards:', error);
    }
  }

  private calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private startRouteTracking(): void {
    this.routeCheckInterval = window.setInterval(() => {
      if (this.state.lastKnownPosition) {
        this.updateLocation(this.state.lastKnownPosition, this.state.currentSpeed);
      }
    }, 1000); // Check every second
  }

  private stopRouteTracking(): void {
    if (this.routeCheckInterval) {
      clearInterval(this.routeCheckInterval);
      this.routeCheckInterval = null;
    }
  }

  public getState(): NavigationState {
    return { ...this.state };
  }

  public getSettings(): NavigationSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<NavigationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save navigation settings:', error);
    }
  }

  public onStateChange(callback: (state: NavigationState) => void): void {
    this.listeners.push(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.state));
  }

  public getCurrentInstruction(): string | null {
    if (!this.state.currentRoute) return null;

    const currentLeg = this.state.currentRoute.legs[this.state.currentLegIndex];
    if (!currentLeg) return null;

    const currentStep = currentLeg.steps[this.state.currentStepIndex];
    return currentStep ? currentStep.instruction : null;
  }

  public isNavigating(): boolean {
    return this.state.isNavigating;
  }
}

export default NavigationService;
export type { NavigationState, NavigationSettings, Route, RouteStep };
