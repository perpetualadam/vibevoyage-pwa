/**
 * Units and Cost Service
 * Handles distance/speed units and fuel cost calculations with country-based pricing
 */

interface UnitsSettings {
  distance: 'km' | 'miles';
  speed: 'kmh' | 'mph';
  fuel: 'mpg' | 'l100km';
  currency: string;
  country: string;
}

interface FuelPrices {
  petrol: number;
  diesel: number;
  electric: number; // per kWh
  currency: string;
  lastUpdated: string;
}

interface VehicleProfile {
  type: 'petrol' | 'diesel' | 'electric' | 'hybrid';
  efficiency: number; // MPG or L/100km or kWh/100km
  tankSize?: number; // liters or kWh
  co2PerKm: number; // grams
}

interface JourneyCost {
  distance: number;
  fuelCost: number;
  co2Emissions: number;
  fuelUsed: number;
  currency: string;
  breakdown: {
    baseCost: number;
    tollCosts?: number;
    parkingCosts?: number;
  };
}

class UnitsAndCostService {
  private static instance: UnitsAndCostService;
  private settings: UnitsSettings;
  private fuelPrices: Map<string, FuelPrices> = new Map();
  private vehicleProfile: VehicleProfile;
  private storageKey = 'vibevoyage_units_settings';
  private pricesKey = 'vibevoyage_fuel_prices';

  // Country-specific fuel price data (approximate values in local currency)
  private defaultFuelPrices: Record<string, FuelPrices> = {
    'GB': {
      petrol: 1.45, // £ per liter
      diesel: 1.52,
      electric: 0.28, // £ per kWh
      currency: 'GBP',
      lastUpdated: new Date().toISOString()
    },
    'US': {
      petrol: 3.50, // $ per gallon
      diesel: 3.80,
      electric: 0.13, // $ per kWh
      currency: 'USD',
      lastUpdated: new Date().toISOString()
    },
    'DE': {
      petrol: 1.65, // € per liter
      diesel: 1.55,
      electric: 0.32, // € per kWh
      currency: 'EUR',
      lastUpdated: new Date().toISOString()
    },
    'FR': {
      petrol: 1.68, // € per liter
      diesel: 1.58,
      electric: 0.18, // € per kWh
      currency: 'EUR',
      lastUpdated: new Date().toISOString()
    },
    'CA': {
      petrol: 1.35, // CAD per liter
      diesel: 1.42,
      electric: 0.12, // CAD per kWh
      currency: 'CAD',
      lastUpdated: new Date().toISOString()
    },
    'AU': {
      petrol: 1.55, // AUD per liter
      diesel: 1.65,
      electric: 0.25, // AUD per kWh
      currency: 'AUD',
      lastUpdated: new Date().toISOString()
    }
  };

  private constructor() {
    this.settings = this.loadSettings();
    this.vehicleProfile = this.loadVehicleProfile();
    this.loadFuelPrices();
  }

  public static getInstance(): UnitsAndCostService {
    if (!UnitsAndCostService.instance) {
      UnitsAndCostService.instance = new UnitsAndCostService();
    }
    return UnitsAndCostService.instance;
  }

  private loadSettings(): UnitsSettings {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return { ...this.getDefaultSettings(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load units settings:', error);
    }
    return this.getDefaultSettings();
  }

  private getDefaultSettings(): UnitsSettings {
    // Detect country from locale
    const locale = navigator.language || 'en-US';
    const country = locale.split('-')[1] || 'US';
    
    // Set defaults based on country
    if (country === 'US') {
      return {
        distance: 'miles',
        speed: 'mph',
        fuel: 'mpg',
        currency: 'USD',
        country: 'US'
      };
    } else {
      return {
        distance: 'km',
        speed: 'kmh',
        fuel: 'l100km',
        currency: 'EUR',
        country: 'GB'
      };
    }
  }

  private loadVehicleProfile(): VehicleProfile {
    try {
      const stored = localStorage.getItem('vibevoyage_vehicle_profile');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load vehicle profile:', error);
    }
    
    return {
      type: 'petrol',
      efficiency: this.settings.fuel === 'mpg' ? 35 : 7.0, // 35 MPG or 7L/100km
      tankSize: 50,
      co2PerKm: 120
    };
  }

  private loadFuelPrices(): void {
    try {
      const stored = localStorage.getItem(this.pricesKey);
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([country, prices]) => {
          this.fuelPrices.set(country, prices as FuelPrices);
        });
      }
    } catch (error) {
      console.warn('Failed to load fuel prices:', error);
    }

    // Load default prices for missing countries
    Object.entries(this.defaultFuelPrices).forEach(([country, prices]) => {
      if (!this.fuelPrices.has(country)) {
        this.fuelPrices.set(country, prices);
      }
    });
  }

  public convertDistance(distance: number, from: 'km' | 'miles', to: 'km' | 'miles'): number {
    if (from === to) return distance;
    
    if (from === 'km' && to === 'miles') {
      return distance * 0.621371;
    } else if (from === 'miles' && to === 'km') {
      return distance * 1.60934;
    }
    
    return distance;
  }

  public convertSpeed(speed: number, from: 'kmh' | 'mph', to: 'kmh' | 'mph'): number {
    if (from === to) return speed;
    
    if (from === 'kmh' && to === 'mph') {
      return speed * 0.621371;
    } else if (from === 'mph' && to === 'kmh') {
      return speed * 1.60934;
    }
    
    return speed;
  }

  public formatDistance(distanceKm: number): string {
    const distance = this.convertDistance(distanceKm, 'km', this.settings.distance);
    const unit = this.settings.distance;
    
    if (distance < 1) {
      const meters = distance * (unit === 'km' ? 1000 : 5280);
      const meterUnit = unit === 'km' ? 'm' : 'ft';
      return `${Math.round(meters)} ${meterUnit}`;
    } else if (distance < 10) {
      return `${distance.toFixed(1)} ${unit}`;
    } else {
      return `${Math.round(distance)} ${unit}`;
    }
  }

  public formatSpeed(speedKmh: number): string {
    const speed = this.convertSpeed(speedKmh, 'kmh', this.settings.speed);
    const unit = this.settings.speed;
    return `${Math.round(speed)} ${unit}`;
  }

  public calculateJourneyCost(distanceKm: number, routeOptions?: {
    tollRoads?: boolean;
    parkingRequired?: boolean;
    estimatedParkingHours?: number;
  }): JourneyCost {
    const prices = this.fuelPrices.get(this.settings.country) || this.defaultFuelPrices['GB'];
    
    let fuelUsed: number;
    let fuelPrice: number;
    
    // Calculate fuel consumption based on vehicle type and efficiency
    switch (this.vehicleProfile.type) {
      case 'petrol':
        fuelPrice = prices.petrol;
        if (this.settings.fuel === 'mpg') {
          // Convert MPG to L/100km for calculation
          const l100km = 235.214 / this.vehicleProfile.efficiency;
          fuelUsed = (distanceKm / 100) * l100km;
        } else {
          fuelUsed = (distanceKm / 100) * this.vehicleProfile.efficiency;
        }
        break;
        
      case 'diesel':
        fuelPrice = prices.diesel;
        if (this.settings.fuel === 'mpg') {
          const l100km = 235.214 / this.vehicleProfile.efficiency;
          fuelUsed = (distanceKm / 100) * l100km;
        } else {
          fuelUsed = (distanceKm / 100) * this.vehicleProfile.efficiency;
        }
        break;
        
      case 'electric':
        fuelPrice = prices.electric;
        fuelUsed = (distanceKm / 100) * this.vehicleProfile.efficiency; // kWh
        break;
        
      case 'hybrid':
        // Assume 70% petrol, 30% electric efficiency
        const petrolUsed = (distanceKm / 100) * this.vehicleProfile.efficiency * 0.7;
        const electricUsed = (distanceKm / 100) * (this.vehicleProfile.efficiency * 0.3);
        fuelUsed = petrolUsed + electricUsed;
        fuelPrice = (prices.petrol * 0.7) + (prices.electric * 0.3);
        break;
        
      default:
        fuelUsed = (distanceKm / 100) * 7.0; // Default 7L/100km
        fuelPrice = prices.petrol;
    }

    const baseCost = fuelUsed * fuelPrice;
    let tollCosts = 0;
    let parkingCosts = 0;

    // Estimate toll costs (very rough estimates)
    if (routeOptions?.tollRoads) {
      tollCosts = distanceKm * 0.05; // Rough estimate: 5 cents per km
    }

    // Estimate parking costs
    if (routeOptions?.parkingRequired) {
      const hours = routeOptions.estimatedParkingHours || 2;
      const hourlyRate = this.getParkingRate();
      parkingCosts = hours * hourlyRate;
    }

    const totalCost = baseCost + tollCosts + parkingCosts;
    const co2Emissions = distanceKm * this.vehicleProfile.co2PerKm;

    return {
      distance: distanceKm,
      fuelCost: totalCost,
      co2Emissions,
      fuelUsed,
      currency: prices.currency,
      breakdown: {
        baseCost,
        tollCosts: tollCosts > 0 ? tollCosts : undefined,
        parkingCosts: parkingCosts > 0 ? parkingCosts : undefined
      }
    };
  }

  private getParkingRate(): number {
    // Rough parking rates per hour by country
    const rates: Record<string, number> = {
      'GB': 2.50, // £2.50/hour
      'US': 3.00, // $3.00/hour
      'DE': 2.00, // €2.00/hour
      'FR': 2.20, // €2.20/hour
      'CA': 2.50, // CAD 2.50/hour
      'AU': 3.50  // AUD 3.50/hour
    };
    
    return rates[this.settings.country] || 2.00;
  }

  public formatCost(cost: number, currency?: string): string {
    const curr = currency || this.settings.currency;
    
    const formatters: Record<string, Intl.NumberFormat> = {
      'GBP': new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }),
      'USD': new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
      'EUR': new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR' }),
      'CAD': new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }),
      'AUD': new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' })
    };
    
    const formatter = formatters[curr] || formatters['USD'];
    return formatter.format(cost);
  }

  public formatFuelEfficiency(efficiency: number): string {
    if (this.settings.fuel === 'mpg') {
      return `${efficiency.toFixed(1)} MPG`;
    } else {
      return `${efficiency.toFixed(1)} L/100km`;
    }
  }

  public updateSettings(newSettings: Partial<UnitsSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  public updateVehicleProfile(profile: Partial<VehicleProfile>): void {
    this.vehicleProfile = { ...this.vehicleProfile, ...profile };
    this.saveVehicleProfile();
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save units settings:', error);
    }
  }

  private saveVehicleProfile(): void {
    try {
      localStorage.setItem('vibevoyage_vehicle_profile', JSON.stringify(this.vehicleProfile));
    } catch (error) {
      console.warn('Failed to save vehicle profile:', error);
    }
  }

  public getSettings(): UnitsSettings {
    return { ...this.settings };
  }

  public getVehicleProfile(): VehicleProfile {
    return { ...this.vehicleProfile };
  }

  public getFuelPrices(country?: string): FuelPrices | null {
    const countryCode = country || this.settings.country;
    return this.fuelPrices.get(countryCode) || null;
  }

  public async updateFuelPrices(country: string): Promise<void> {
    // In a real implementation, this would fetch from an API
    // For now, we'll just refresh the timestamp
    const prices = this.fuelPrices.get(country);
    if (prices) {
      prices.lastUpdated = new Date().toISOString();
      this.fuelPrices.set(country, prices);
    }
  }
}

export default UnitsAndCostService;
export type { UnitsSettings, VehicleProfile, JourneyCost, FuelPrices };
