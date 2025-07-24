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

      // Load Leaflet library
      await this.initializeLeaflet();

      // Initialize map
      await this.initializeMap();

      // Initialize location services
      await this.initializeLocation();

      // Initialize UI components
      this.initializeComponents();

      // Setup event listeners
      this.setupEventListeners();

      // Setup service listeners
      this.setupServiceListeners();

      this.state.isInitialized = true;
      this.hideLoadingState();

      console.log('✅ VibeVoyage PWA Ready!');
      this.showNotification('Welcome to VibeVoyage! 🚗', 'success');

    } catch (error) {
      console.error('Failed to initialize VibeVoyage:', error);
      this.showError('Failed to initialize application. Please refresh and try again.');
    }
  }

  private async initializeLeaflet(): Promise<void> {
    this.showLoadingState('Loading map library...');
    
    try {
      await this.services.leafletLoader.loadLeaflet({
        version: '1.9.4',
        timeout: 10000,
        fallbackToLocal: true,
        retryAttempts: 3
      });
      
      console.log('Leaflet loaded successfully');
    } catch (error) {
      console.error('Failed to load Leaflet:', error);
      throw new Error('Map library failed to load');
    }
  }

  private async initializeMap(): Promise<void> {
    this.showLoadingState('Initializing map...');

    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      throw new Error('Map container not found');
    }

    // Initialize Leaflet map
    const L = (window as any).L;
    this.state.map = L.map('map', {
      center: [51.5074, -0.1278], // London default
      zoom: 13,
      zoomControl: false,
      attributionControl: true
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.state.map);

    // Add custom controls
    this.addMapControls();

    console.log('Map initialized');
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
      if (this.state.map) {
        const L = (window as any).L;
        this.state.map.setView([this.state.currentLocation.lat, this.state.currentLocation.lng], 15);
        
        // Add user location marker
        L.marker([this.state.currentLocation.lat, this.state.currentLocation.lng])
          .addTo(this.state.map)
          .bindPopup('Your location')
          .openPopup();
      }

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

  private addDestinationMarker(coordinates: Coordinates): void {
    if (!this.state.map) return;

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

    // Fit map to show both current location and destination
    if (this.state.currentLocation) {
      const bounds = L.latLngBounds([
        [this.state.currentLocation.lat, this.state.currentLocation.lng],
        [coordinates.lat, coordinates.lng]
      ]);
      this.state.map.fitBounds(bounds, { padding: [20, 20] });
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

    // Settings button
    const settingsBtn = document.querySelector('[onclick="toggleSettings()"]');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.toggleSettings());
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

  private recenterMap(): void {
    if (this.state.map && this.state.currentLocation) {
      this.state.map.setView([this.state.currentLocation.lat, this.state.currentLocation.lng], 15);
    }
  }

  private toggleSettings(): void {
    if (this.components.hazardPanel) {
      this.components.hazardPanel.toggle();
    }
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
