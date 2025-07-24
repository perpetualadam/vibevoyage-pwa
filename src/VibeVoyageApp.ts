/**
 * VibeVoyage PWA - Enhanced Main Application
 * Integrates all new TypeScript services for complete navigation functionality
 */

import LeafletLoaderService from './services/LeafletLoaderService';
import GeocodingService from './services/GeocodingService';
import HazardDetectionService from './services/HazardDetectionService';
import VoiceNavigationService from './services/VoiceNavigationService';
import NavigationService from './services/NavigationService';
import UnitsAndCostService from './services/UnitsAndCostService';
import BackupMapService from './services/BackupMapService';
import HazardAvoidancePanel from './components/HazardAvoidancePanel';

import type { SearchSuggestion } from './services/GeocodingService';
import type { Coordinates, HazardAlert } from './services/HazardDetectionService';
import type { NavigationState } from './services/NavigationService';
import type { JourneyCost } from './services/UnitsAndCostService';

interface AppState {
  isInitialized: boolean;
  currentLocation: Coordinates | null;
  destination: Coordinates | null;
  isNavigating: boolean;
  map: any;
  backupMap: BackupMapService | null;
  isUsingBackupMap: boolean;
  route: any;
  hazardAlerts: HazardAlert[];
}

class VibeVoyageApp {
  private state: AppState;
  private services: {
    leafletLoader: LeafletLoaderService;
    geocoding: GeocodingService;
    hazardDetection: HazardDetectionService;
    voiceNavigation: VoiceNavigationService;
    navigation: NavigationService;
    unitsAndCost: UnitsAndCostService;
  };
  private components: {
    hazardPanel: HazardAvoidancePanel | null;
  };
  private watchId: number | null = null;

  constructor() {
    this.state = {
      isInitialized: false,
      currentLocation: null,
      destination: null,
      isNavigating: false,
      map: null,
      backupMap: null,
      isUsingBackupMap: false,
      route: null,
      hazardAlerts: []
    };

    this.services = {
      leafletLoader: LeafletLoaderService.getInstance(),
      geocoding: GeocodingService.getInstance(),
      hazardDetection: HazardDetectionService.getInstance(),
      voiceNavigation: VoiceNavigationService.getInstance(),
      navigation: NavigationService.getInstance(),
      unitsAndCost: UnitsAndCostService.getInstance()
    };

    this.components = {
      hazardPanel: null
    };

    this.init();
  }

  private async init(): Promise<void> {
    try {
      console.log('🌟 VibeVoyage PWA Starting...');

      // Show loading state
      this.showLoadingState('Initializing application...');

      // Initialize UI components first for better UX
      this.initializeComponents();

      // Setup event listeners
      this.setupEventListeners();

      // Setup service listeners
      this.setupServiceListeners();

      try {
        // Load Leaflet library with timeout
        await this.initializeLeaflet();
      } catch (error) {
        console.warn('Leaflet initialization failed, will use backup map:', error);
        this.state.isUsingBackupMap = true;
      }

      try {
        // Initialize map (will use backup if needed)
        await this.initializeMap();
      } catch (error) {
        console.error('Map initialization failed:', error);
        this.showNotification('Map loading failed. Using simplified interface.', 'warning');
      }

      try {
        // Initialize location services
        await this.initializeLocation();
      } catch (error) {
        console.warn('Location services failed:', error);
        this.showNotification('Location access denied. Some features may be limited.', 'warning');
      }

      this.state.isInitialized = true;
      this.hideLoadingState();

      console.log('✅ VibeVoyage PWA Ready!');
      this.showNotification('Welcome to VibeVoyage! 🚗', 'success');

    } catch (error) {
      console.error('Failed to initialize VibeVoyage:', error);
      this.showError('Failed to initialize application. Using limited functionality.');

      // Still mark as initialized to allow basic functionality
      this.state.isInitialized = true;
      this.hideLoadingState();
    }
  }

  private async initializeLeaflet(): Promise<void> {
    this.showLoadingState('Loading map library...');

    try {
      // Try to load Leaflet with a shorter timeout
      await Promise.race([
        this.services.leafletLoader.loadLeaflet({
          version: '1.9.4',
          timeout: 5000, // Reduced timeout
          fallbackToLocal: true,
          retryAttempts: 2 // Reduced retry attempts
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Leaflet loading timeout')), 8000)
        )
      ]);

      console.log('Leaflet loaded successfully');
    } catch (error) {
      console.warn('Failed to load Leaflet, will use backup map:', error);
      this.state.isUsingBackupMap = true;
      // Don't throw error, continue with backup map
    }
  }

  private async initializeMap(): Promise<void> {
    this.showLoadingState('Initializing map...');

    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      throw new Error('Map container not found');
    }

    if (this.state.isUsingBackupMap) {
      // Use backup map
      await this.initializeBackupMap();
    } else {
      // Try to use Leaflet
      try {
        await this.initializeLeafletMap();
      } catch (error) {
        console.warn('Leaflet map initialization failed, falling back to backup map:', error);
        this.state.isUsingBackupMap = true;
        await this.initializeBackupMap();
      }
    }

    console.log(`Map initialized (${this.state.isUsingBackupMap ? 'backup' : 'Leaflet'})`);
  }

  private async initializeLeafletMap(): Promise<void> {
    const L = (window as any).L;
    if (!L) {
      throw new Error('Leaflet not available');
    }

    this.state.map = L.map('map', {
      center: [51.5074, -0.1278], // London default
      zoom: 13,
      zoomControl: false,
      attributionControl: true
    });

    // Add tile layer with timeout
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      timeout: 5000
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Tile loading timeout'));
      }, 10000);

      tileLayer.on('load', () => {
        clearTimeout(timeout);
        resolve(void 0);
      });

      tileLayer.on('tileerror', () => {
        console.warn('Some tiles failed to load');
        // Don't reject, just continue
      });

      tileLayer.addTo(this.state.map);

      // Resolve after a short delay even if not all tiles loaded
      setTimeout(() => {
        clearTimeout(timeout);
        resolve(void 0);
      }, 3000);
    });

    // Add custom controls
    this.addMapControls();
  }

  private async initializeBackupMap(): Promise<void> {
    this.state.backupMap = BackupMapService.getInstance();
    await this.state.backupMap.initializeBackupMap('map');

    // Show backup map notification
    this.showNotification('Using lightweight map mode for faster loading', 'info');
  }

  private async initializeLocation(): Promise<void> {
    this.showLoadingState('Getting your location...');

    try {
      const position = await this.getCurrentPosition();
      this.state.currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      // Center map on user location
      this.centerMapOnLocation(this.state.currentLocation, 15);
      this.addUserLocationMarker(this.state.currentLocation);

      // Start watching position
      this.startLocationTracking();

      console.log('Location services initialized');
    } catch (error) {
      console.warn('Location access denied or failed:', error);
      this.showNotification('Location access denied. Some features may be limited.', 'warning');
    }
  }

  private initializeComponents(): void {
    // Initialize hazard avoidance panel
    const hazardContainer = document.getElementById('hazardAvoidanceContainer');
    if (hazardContainer) {
      this.components.hazardPanel = new HazardAvoidancePanel('hazardAvoidanceContainer');
    }

    // Initialize address input handlers
    this.initializeAddressInputs();
  }

  private initializeAddressInputs(): void {
    const fromInput = document.getElementById('fromInput') as HTMLInputElement;
    const toInput = document.getElementById('toInput') as HTMLInputElement;

    if (fromInput) {
      this.setupAddressInput(fromInput, 'from');
    }

    if (toInput) {
      this.setupAddressInput(toInput, 'to');
    }
  }

  private setupAddressInput(input: HTMLInputElement, type: 'from' | 'to'): void {
    let debounceTimer: number;

    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const query = target.value.trim();

      clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(async () => {
        if (query.length >= 3) {
          await this.showAddressSuggestions(query, type);
        } else {
          this.hideAddressSuggestions(type);
        }
      }, 300);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleAddressSearch(input.value, type);
      }
    });
  }

  private async showAddressSuggestions(query: string, type: 'from' | 'to'): Promise<void> {
    try {
      const suggestions = await this.services.geocoding.getSuggestions(query, this.state.currentLocation || undefined);
      this.renderAddressSuggestions(suggestions, type);
    } catch (error) {
      console.error('Failed to get address suggestions:', error);
    }
  }

  private renderAddressSuggestions(suggestions: SearchSuggestion[], type: 'from' | 'to'): void {
    const containerId = type === 'from' ? 'fromSuggestions' : 'toSuggestions';
    const container = document.getElementById(containerId);
    
    if (!container) return;

    if (suggestions.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.innerHTML = suggestions.map(suggestion => `
      <div class="suggestion-item" data-lat="${suggestion.coordinates.lat}" data-lng="${suggestion.coordinates.lng}">
        <div class="suggestion-main">${suggestion.short_name}</div>
        <div class="suggestion-details">${suggestion.display_name}</div>
      </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        const lat = parseFloat(item.getAttribute('data-lat') || '0');
        const lng = parseFloat(item.getAttribute('data-lng') || '0');
        this.selectAddress({ lat, lng }, type);
        container.style.display = 'none';
      });
    });

    container.style.display = 'block';
  }

  private hideAddressSuggestions(type: 'from' | 'to'): void {
    const containerId = type === 'from' ? 'fromSuggestions' : 'toSuggestions';
    const container = document.getElementById(containerId);
    if (container) {
      container.style.display = 'none';
    }
  }

  private async handleAddressSearch(query: string, type: 'from' | 'to'): Promise<void> {
    try {
      const suggestions = await this.services.geocoding.search(query, { limit: 1 });
      if (suggestions.length > 0) {
        this.selectAddress(suggestions[0].coordinates, type);
      } else {
        this.showNotification('Address not found', 'error');
      }
    } catch (error) {
      console.error('Address search failed:', error);
      this.showNotification('Address search failed', 'error');
    }
  }

  private selectAddress(coordinates: Coordinates, type: 'from' | 'to'): void {
    if (type === 'from') {
      // For 'from', we could update the starting point
      console.log('From address selected:', coordinates);
    } else {
      this.state.destination = coordinates;
      this.addDestinationMarker(coordinates);
      this.enableNavigationButton();
    }
  }

  private enableNavigationButton(): void {
    const navButton = document.getElementById('navigateBtn') as HTMLButtonElement;
    if (navButton) {
      navButton.disabled = false;
      navButton.textContent = '🚗 Start Navigation';
    }
  }

  private setupEventListeners(): void {
    // Navigation button
    const navButton = document.getElementById('navigateBtn');
    if (navButton) {
      navButton.addEventListener('click', () => this.startNavigation());
    }

    // Map controls
    const recenterBtn = document.getElementById('recenterBtn');
    if (recenterBtn) {
      recenterBtn.addEventListener('click', () => this.recenterMap());
    }

    // Location button
    const locationBtn = document.querySelector('[onclick="getCurrentLocation()"]');
    if (locationBtn) {
      locationBtn.removeAttribute('onclick');
      locationBtn.addEventListener('click', () => this.handleLocationButtonClick());
    }

    // Settings button
    const settingsBtn = document.querySelector('[onclick="toggleSettings()"]');
    if (settingsBtn) {
      settingsBtn.removeAttribute('onclick');
      settingsBtn.addEventListener('click', () => this.toggleSettings());
    }

    // Hazard settings button
    const hazardBtn = document.getElementById('hazardSettingsBtn');
    if (hazardBtn) {
      hazardBtn.removeAttribute('onclick');
      hazardBtn.addEventListener('click', () => this.toggleHazardSettings());
    }
  }

  private setupServiceListeners(): void {
    // Navigation state changes
    this.services.navigation.onStateChange((state: NavigationState) => {
      this.handleNavigationStateChange(state);
    });

    // Hazard alerts
    this.services.hazardDetection.onHazardAlert((alerts: HazardAlert[]) => {
      this.state.hazardAlerts = alerts;
      this.displayHazardAlerts(alerts);
    });

    // Hazard avoidance settings changes
    if (this.components.hazardPanel) {
      this.components.hazardPanel.onSettingsChange((settings) => {
        this.services.hazardDetection.updateSettings(settings);
      });
    }
  }

  private async startNavigation(): Promise<void> {
    if (!this.state.currentLocation || !this.state.destination) {
      this.showNotification('Please set a destination first', 'error');
      return;
    }

    try {
      this.showLoadingState('Calculating route...');

      // Calculate route (simplified - in real implementation, use OSRM)
      const route = await this.calculateRoute(this.state.currentLocation, this.state.destination);
      
      if (route) {
        this.services.navigation.startNavigation(route);
        this.state.isNavigating = true;
        this.showNotification('Navigation started!', 'success');
      }

      this.hideLoadingState();
    } catch (error) {
      console.error('Failed to start navigation:', error);
      this.showNotification('Failed to calculate route', 'error');
      this.hideLoadingState();
    }
  }

  private async calculateRoute(from: Coordinates, to: Coordinates): Promise<any> {
    // Simplified route calculation - in real implementation, use OSRM API
    return {
      distance: 5000, // 5km
      duration: 600,  // 10 minutes
      geometry: [from, to], // Simplified
      legs: [{
        distance: 5000,
        duration: 600,
        steps: [{
          instruction: 'Head north',
          maneuver: 'depart',
          distance: 5000,
          duration: 600,
          geometry: [from, to],
          mode: 'driving',
          driving_side: 'left',
          weight: 600,
          intersections: []
        }]
      }],
      weight_name: 'duration',
      weight: 600
    };
  }

  private handleNavigationStateChange(state: NavigationState): void {
    // Update UI based on navigation state
    console.log('Navigation state changed:', state);
    
    if (state.isNavigating) {
      this.showNavigationPanel(state);
    } else {
      this.hideNavigationPanel();
    }
  }

  private showNavigationPanel(state: NavigationState): void {
    // Show navigation UI
    console.log('Showing navigation panel');
  }

  private hideNavigationPanel(): void {
    // Hide navigation UI
    console.log('Hiding navigation panel');
  }

  private displayHazardAlerts(alerts: HazardAlert[]): void {
    // Display hazard alerts on map and UI
    alerts.forEach(alert => {
      console.log('Hazard alert:', alert.message);
    });
  }

  private startLocationTracking(): void {
    if (navigator.geolocation) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          this.state.currentLocation = newLocation;
          
          // Update navigation service
          this.services.navigation.updateLocation(
            newLocation,
            position.coords.speed || undefined,
            position.coords.heading || undefined
          );
        },
        (error) => {
          console.error('Location tracking error:', error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 5000
        }
      );
    }
  }

  private getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      });
    });
  }

  private centerMapOnLocation(location: Coordinates, zoom: number = 15): void {
    if (this.state.isUsingBackupMap && this.state.backupMap) {
      this.state.backupMap.setCenter(location.lat, location.lng);
      this.state.backupMap.setZoom(zoom);
    } else if (this.state.map) {
      this.state.map.setView([location.lat, location.lng], zoom);
    }
  }

  private addUserLocationMarker(location: Coordinates): void {
    if (this.state.isUsingBackupMap && this.state.backupMap) {
      this.state.backupMap.setUserLocation(location.lat, location.lng);
    } else if (this.state.map) {
      const L = (window as any).L;

      // Remove existing user markers
      this.state.map.eachLayer((layer: any) => {
        if (layer.options && layer.options.isUserLocation) {
          this.state.map.removeLayer(layer);
        }
      });

      // Add new user location marker
      L.marker([location.lat, location.lng], { isUserLocation: true })
        .addTo(this.state.map)
        .bindPopup('Your current location')
        .openPopup();
    }
  }

  private addDestinationMarker(coordinates: Coordinates): void {
    if (this.state.isUsingBackupMap && this.state.backupMap) {
      this.state.backupMap.setDestination(coordinates.lat, coordinates.lng);
    } else if (this.state.map) {
      const L = (window as any).L;

      // Remove existing destination marker
      this.state.map.eachLayer((layer: any) => {
        if (layer.options && layer.options.isDestination) {
          this.state.map.removeLayer(layer);
        }
      });

      // Add new destination marker
      L.marker([coordinates.lat, coordinates.lng], { isDestination: true })
        .addTo(this.state.map)
        .bindPopup('Destination')
        .openPopup();
    }

    // Fit map to show both current location and destination
    if (this.state.currentLocation) {
      this.fitMapToBounds(this.state.currentLocation, coordinates);
    }
  }

  private fitMapToBounds(location1: Coordinates, location2: Coordinates): void {
    if (this.state.isUsingBackupMap && this.state.backupMap) {
      // For backup map, just center between the two points
      const centerLat = (location1.lat + location2.lat) / 2;
      const centerLng = (location1.lng + location2.lng) / 2;
      this.state.backupMap.setCenter(centerLat, centerLng);

      // Calculate appropriate zoom based on distance
      const distance = this.calculateDistance(location1, location2);
      let zoom = 13;
      if (distance < 1000) zoom = 15;
      else if (distance < 5000) zoom = 13;
      else if (distance < 20000) zoom = 11;
      else zoom = 9;

      this.state.backupMap.setZoom(zoom);
    } else if (this.state.map) {
      const L = (window as any).L;
      const bounds = L.latLngBounds([
        [location1.lat, location1.lng],
        [location2.lat, location2.lng]
      ]);
      this.state.map.fitBounds(bounds, { padding: [20, 20] });
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

  private recenterMap(): void {
    if (this.state.currentLocation) {
      this.centerMapOnLocation(this.state.currentLocation, 15);
    }
  }

  private async handleLocationButtonClick(): Promise<void> {
    try {
      this.showNotification('Getting your location...', 'info');

      const position = await this.getCurrentPosition();
      this.state.currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      // Update map if available
      this.centerMapOnLocation(this.state.currentLocation, 15);
      this.addUserLocationMarker(this.state.currentLocation);

      this.showNotification('Location updated!', 'success');
    } catch (error) {
      console.error('Failed to get location:', error);
      this.showNotification('Failed to get location. Please check permissions.', 'error');
    }
  }

  private toggleSettings(): void {
    // Create a general settings panel
    this.showGeneralSettings();
  }

  private toggleHazardSettings(): void {
    if (this.components.hazardPanel) {
      this.components.hazardPanel.toggle();
    } else {
      // Initialize hazard panel if not already done
      const container = document.getElementById('hazardAvoidanceContainer');
      if (container) {
        this.components.hazardPanel = new HazardAvoidancePanel('hazardAvoidanceContainer');
        this.components.hazardPanel.show();

        // Setup listener for settings changes
        this.components.hazardPanel.onSettingsChange((settings) => {
          this.services.hazardDetection.updateSettings(settings);
        });
      }
    }
  }

  private showGeneralSettings(): void {
    // Create a simple settings modal
    const existingModal = document.getElementById('generalSettingsModal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'generalSettingsModal';
    modal.innerHTML = `
      <div class="settings-modal-overlay" onclick="this.parentElement.remove()">
        <div class="settings-modal-content" onclick="event.stopPropagation()">
          <div class="settings-header">
            <h3>⚙️ Settings</h3>
            <button class="close-btn" onclick="this.closest('.settings-modal-overlay').parentElement.remove()">✕</button>
          </div>
          <div class="settings-body">
            <div class="setting-item">
              <button class="setting-btn" onclick="document.getElementById('hazardAvoidanceContainer').style.display='block'">
                🚨 Hazard Avoidance Settings
              </button>
            </div>
            <div class="setting-item">
              <button class="setting-btn" onclick="alert('Voice settings coming soon!')">
                🔊 Voice Settings
              </button>
            </div>
            <div class="setting-item">
              <button class="setting-btn" onclick="alert('Unit settings coming soon!')">
                📏 Units & Measurements
              </button>
            </div>
            <div class="setting-item">
              <button class="setting-btn" onclick="alert('Map settings coming soon!')">
                🗺️ Map Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add styles
    const styles = `
      <style>
        .settings-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        .settings-modal-content {
          background: #1a1a1a;
          border-radius: 12px;
          padding: 20px;
          max-width: 400px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          border: 1px solid #333;
        }
        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          color: #00FF88;
        }
        .close-btn {
          background: none;
          border: none;
          color: #ccc;
          font-size: 20px;
          cursor: pointer;
          padding: 5px;
          border-radius: 50%;
        }
        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .setting-item {
          margin-bottom: 10px;
        }
        .setting-btn {
          width: 100%;
          padding: 15px;
          background: #333;
          border: 1px solid #555;
          border-radius: 8px;
          color: #fff;
          cursor: pointer;
          text-align: left;
          font-size: 14px;
          transition: all 0.2s;
        }
        .setting-btn:hover {
          background: #444;
          border-color: #00FF88;
        }
      </style>
    `;

    modal.innerHTML = styles + modal.innerHTML;
    document.body.appendChild(modal);
  }

  private addMapControls(): void {
    // Map controls are already in HTML, just ensure they work
    console.log('Map controls added');
  }

  private showLoadingState(message: string): void {
    const placeholder = document.getElementById('mapPlaceholder');
    if (placeholder) {
      placeholder.innerHTML = `
        <div class="icon">⏳</div>
        <div>${message}</div>
        <div class="spinner"></div>
      `;
      placeholder.style.display = 'flex';
    }
  }

  private hideLoadingState(): void {
    const placeholder = document.getElementById('mapPlaceholder');
    if (placeholder) {
      placeholder.style.display = 'none';
    }
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Hide and remove notification
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
  }

  private showError(message: string): void {
    this.showNotification(message, 'error');
    this.hideLoadingState();
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new VibeVoyageApp();
});

export default VibeVoyageApp;
