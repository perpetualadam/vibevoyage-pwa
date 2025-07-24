// Application type definitions

interface Location {
  lat: number;
  lng: number;
}

interface RouteData {
  distance: number;
  duration: number;
  type: string;
  coordinates?: [number, number][];
  legs?: Array<{
    steps: RouteStep[];
  }>;
}

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver?: {
    type: string;
    modifier?: string;
  };
}

interface Units {
  distance: 'metric' | 'imperial' | 'nautical';
  speed: 'kmh' | 'mph' | 'ms' | 'knots';
  temperature: 'celsius' | 'fahrenheit' | 'kelvin';
  fuel: 'liters' | 'gallons_us' | 'gallons_uk';
  pressure: 'bar' | 'psi' | 'kpa';
}

interface FuelPriceData {
  currency: string;
  symbol: string;
  price: number;
}

interface AddressSuggestion {
  type: string;
  main: string;
  details: string;
  lat: number;
  lng: number;
}

interface RouteProgress {
  currentIndex: number;
  distanceFromRoute: number;
  remainingDistance: number;
  estimatedTimeRemaining: number;
}

interface Hazard {
  type: string;
  icon: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  lat: number;
  lng: number;
  id: string;
}

type NotificationType = 'success' | 'error' | 'warning' | 'info';

declare global {
  class VibeVoyageApp {
    constructor();
    
    // Properties
    map: any;
    currentLocation: Location | null;
    destination: Location | null;
    routeData: RouteData | null;
    currentRoute: RouteData | null;
    units: Units;
    userCountry: string | null;
    userCurrency: string;
    fuelPrices: Record<string, FuelPriceData>;
    isNavigating: boolean;
    followMode: boolean;
    currentMapType: string;
    
    // Methods
    init(): Promise<void>;
    initMap(): void;
    getCurrentLocation(): Promise<void>;
    setDestination(location: Location): void;
    calculateRoute(): Promise<void>;
    startNavigation(): void;
    stopNavigation(): void;
    updateCarPosition(lat: number, lng: number, heading?: number): void;
    showNotification(message: string, type: NotificationType): void;
    formatDistance(meters: number): string;
    formatSpeed(kmh: number): string;
    handleAddressInput(inputType: string, query: string): Promise<void>;
    detectUserCountry(): Promise<void>;
    updateUnitDisplays(): void;
  }
}

export {};
