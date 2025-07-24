/**
 * Hazard Detection Service
 * Real-time hazard proximity checking using hazards.geojson data
 */

import type { HazardAvoidanceSettings } from '../components/HazardAvoidancePanel';

interface Coordinates {
  lat: number;
  lng: number;
}

interface HazardFeature {
  type: 'Feature';
  properties: {
    id: string;
    type: 'speed_camera' | 'red_light_camera' | 'roadwork' | 'average_speed_camera';
    name: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    verified: boolean;
    last_updated: string;
    source: string;
    avoidance_radius: number;
    [key: string]: any;
  };
  geometry: {
    type: 'Point' | 'LineString';
    coordinates: number[] | number[][];
  };
}

interface HazardAlert {
  hazard: HazardFeature;
  distance: number;
  bearing: number;
  timeToReach: number;
  alertLevel: 'info' | 'warning' | 'critical';
  message: string;
}

class HazardDetectionService {
  private static instance: HazardDetectionService;
  private hazards: HazardFeature[] = [];
  private isLoaded = false;
  private listeners: Array<(alerts: HazardAlert[]) => void> = [];
  private alertedHazards = new Set<string>();
  private lastLocation: Coordinates | null = null;
  private settings: HazardAvoidanceSettings;

  private constructor() {
    this.settings = this.getDefaultSettings();
    this.loadHazards();
  }

  public static getInstance(): HazardDetectionService {
    if (!HazardDetectionService.instance) {
      HazardDetectionService.instance = new HazardDetectionService();
    }
    return HazardDetectionService.instance;
  }

  private getDefaultSettings(): HazardAvoidanceSettings {
    return {
      avoidSpeedCameras: true,
      avoidRedLightCameras: true,
      avoidRoadworks: false,
      avoidAverageSpeedCameras: true,
      alertDistance: 500,
      voiceAlerts: true,
      visualAlerts: true
    };
  }

  public updateSettings(settings: HazardAvoidanceSettings): void {
    this.settings = settings;
  }

  private async loadHazards(): Promise<void> {
    try {
      const response = await fetch('/hazards.geojson');
      if (!response.ok) {
        throw new Error(`Failed to load hazards: ${response.statusText}`);
      }
      
      const geojson = await response.json();
      this.hazards = geojson.features || [];
      this.isLoaded = true;
      
      console.log(`Loaded ${this.hazards.length} hazards from GeoJSON`);
    } catch (error) {
      console.error('Error loading hazards:', error);
      this.hazards = [];
      this.isLoaded = true;
    }
  }

  public async checkProximity(currentLocation: Coordinates, speed?: number): Promise<HazardAlert[]> {
    if (!this.isLoaded) {
      await this.loadHazards();
    }

    this.lastLocation = currentLocation;
    const alerts: HazardAlert[] = [];
    const currentTime = Date.now();

    for (const hazard of this.hazards) {
      // Check if this hazard type should be monitored
      if (!this.shouldMonitorHazard(hazard)) {
        continue;
      }

      const distance = this.calculateDistance(currentLocation, hazard);
      
      // Only alert if within alert distance
      if (distance <= this.settings.alertDistance) {
        const bearing = this.calculateBearing(currentLocation, hazard);
        const timeToReach = speed ? (distance / (speed * 1000 / 3600)) : 0; // Convert speed to m/s
        
        const alert: HazardAlert = {
          hazard,
          distance,
          bearing,
          timeToReach,
          alertLevel: this.getAlertLevel(distance, hazard),
          message: this.generateAlertMessage(hazard, distance)
        };

        alerts.push(alert);

        // Mark as alerted to avoid spam
        const alertKey = `${hazard.properties.id}_${Math.floor(distance / 100)}`;
        if (!this.alertedHazards.has(alertKey)) {
          this.alertedHazards.add(alertKey);
          
          // Clean up old alerts after 5 minutes
          setTimeout(() => {
            this.alertedHazards.delete(alertKey);
          }, 5 * 60 * 1000);
        }
      }
    }

    // Sort by distance (closest first)
    alerts.sort((a, b) => a.distance - b.distance);

    // Notify listeners
    this.notifyListeners(alerts);

    return alerts;
  }

  private shouldMonitorHazard(hazard: HazardFeature): boolean {
    const type = hazard.properties.type;
    
    switch (type) {
      case 'speed_camera':
        return this.settings.avoidSpeedCameras;
      case 'red_light_camera':
        return this.settings.avoidRedLightCameras;
      case 'roadwork':
        return this.settings.avoidRoadworks;
      case 'average_speed_camera':
        return this.settings.avoidAverageSpeedCameras;
      default:
        return false;
    }
  }

  private calculateDistance(from: Coordinates, hazard: HazardFeature): number {
    if (hazard.geometry.type === 'Point') {
      const [lng, lat] = hazard.geometry.coordinates as number[];
      return this.haversineDistance(from.lat, from.lng, lat, lng);
    } else if (hazard.geometry.type === 'LineString') {
      // For line strings (like roadwork zones), find closest point
      const coordinates = hazard.geometry.coordinates as number[][];
      let minDistance = Infinity;
      
      for (const [lng, lat] of coordinates) {
        const distance = this.haversineDistance(from.lat, from.lng, lat, lng);
        minDistance = Math.min(minDistance, distance);
      }
      
      return minDistance;
    }
    
    return Infinity;
  }

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateBearing(from: Coordinates, hazard: HazardFeature): number {
    let toLat: number, toLng: number;
    
    if (hazard.geometry.type === 'Point') {
      [toLng, toLat] = hazard.geometry.coordinates as number[];
    } else {
      // For LineString, use first coordinate
      [toLng, toLat] = (hazard.geometry.coordinates as number[][])[0];
    }

    const dLng = this.toRadians(toLng - from.lng);
    const lat1 = this.toRadians(from.lat);
    const lat2 = this.toRadians(toLat);

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    const bearing = Math.atan2(y, x);
    return (bearing * 180 / Math.PI + 360) % 360;
  }

  private getAlertLevel(distance: number, hazard: HazardFeature): 'info' | 'warning' | 'critical' {
    const severity = hazard.properties.severity;
    
    if (distance < 100) {
      return 'critical';
    } else if (distance < 300) {
      return severity === 'high' ? 'critical' : 'warning';
    } else {
      return 'info';
    }
  }

  private generateAlertMessage(hazard: HazardFeature, distance: number): string {
    const type = hazard.properties.type;
    const name = hazard.properties.name;
    const distanceText = distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`;
    
    const typeMessages = {
      speed_camera: `Speed camera ahead in ${distanceText}`,
      red_light_camera: `Traffic light camera ahead in ${distanceText}`,
      roadwork: `Road works ahead in ${distanceText}`,
      average_speed_camera: `Average speed check zone ahead in ${distanceText}`
    };

    return typeMessages[type] || `${name} ahead in ${distanceText}`;
  }

  public getHazardsInArea(center: Coordinates, radius: number): HazardFeature[] {
    if (!this.isLoaded) {
      return [];
    }

    return this.hazards.filter(hazard => {
      const distance = this.calculateDistance(center, hazard);
      return distance <= radius;
    });
  }

  public getHazardsNearRoute(routeCoordinates: Coordinates[], bufferDistance: number = 200): HazardFeature[] {
    if (!this.isLoaded || !routeCoordinates.length) {
      return [];
    }

    const nearbyHazards: HazardFeature[] = [];

    for (const hazard of this.hazards) {
      let minDistance = Infinity;
      
      // Check distance to each point on the route
      for (const routePoint of routeCoordinates) {
        const distance = this.calculateDistance(routePoint, hazard);
        minDistance = Math.min(minDistance, distance);
      }

      if (minDistance <= bufferDistance) {
        nearbyHazards.push(hazard);
      }
    }

    return nearbyHazards;
  }

  public onHazardAlert(callback: (alerts: HazardAlert[]) => void): void {
    this.listeners.push(callback);
  }

  private notifyListeners(alerts: HazardAlert[]): void {
    this.listeners.forEach(callback => callback(alerts));
  }

  public getHazardIcon(type: string): string {
    const icons = {
      speed_camera: '📷',
      red_light_camera: '🚦',
      roadwork: '🚧',
      average_speed_camera: '📊'
    };
    return icons[type as keyof typeof icons] || '⚠️';
  }

  public getHazardColor(type: string, severity: string): string {
    const colors = {
      speed_camera: '#FFA500',
      red_light_camera: '#FF6B6B',
      roadwork: '#FFD700',
      average_speed_camera: '#87CEEB'
    };
    
    let baseColor = colors[type as keyof typeof colors] || '#666';
    
    // Adjust opacity based on severity
    if (severity === 'high') {
      return baseColor;
    } else if (severity === 'medium') {
      return baseColor + 'CC'; // 80% opacity
    } else {
      return baseColor + '99'; // 60% opacity
    }
  }

  public clearAlertHistory(): void {
    this.alertedHazards.clear();
  }

  public getLoadedHazardCount(): number {
    return this.hazards.length;
  }

  public isServiceReady(): boolean {
    return this.isLoaded;
  }
}

export default HazardDetectionService;
export type { HazardFeature, HazardAlert, Coordinates };
