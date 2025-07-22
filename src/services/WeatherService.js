import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

class WeatherService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.weatherCache = new Map();
    this.cacheDuration = 10 * 60 * 1000; // 10 minutes
    this.openWeatherMapApiKey = null; // Free tier available
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Load API key from storage or use free service
      await this.loadApiKey();
      this.isInitialized = true;
      console.log('WeatherService initialized successfully');
    } catch (error) {
      console.error('WeatherService initialization failed:', error);
      throw error;
    }
  }

  async loadApiKey() {
    try {
      const stored = await AsyncStorage.getItem('openWeatherMapApiKey');
      if (stored) {
        this.openWeatherMapApiKey = stored;
      }
      // If no API key, we'll use a fallback service or mock data
    } catch (error) {
      console.error('Error loading weather API key:', error);
    }
  }

  async getCurrentWeather(location) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const cacheKey = `current_${location.latitude}_${location.longitude}`;
    const cached = this.weatherCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }

    try {
      let weatherData;
      
      if (this.openWeatherMapApiKey) {
        weatherData = await this.fetchFromOpenWeatherMap(location, 'weather');
      } else {
        // Use free alternative or mock data
        weatherData = await this.fetchFromFreeService(location);
      }

      // Cache the result
      this.weatherCache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now(),
      });

      this.notifyListeners('weatherUpdated', { weather: weatherData, location });
      return weatherData;

    } catch (error) {
      console.error('Weather fetch error:', error);
      this.notifyListeners('weatherError', { error: error.message });
      return this.getMockWeatherData(location);
    }
  }

  async getWeatherForecast(location, days = 5) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const cacheKey = `forecast_${location.latitude}_${location.longitude}_${days}`;
    const cached = this.weatherCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }

    try {
      let forecastData;
      
      if (this.openWeatherMapApiKey) {
        forecastData = await this.fetchFromOpenWeatherMap(location, 'forecast');
      } else {
        forecastData = await this.getMockForecastData(location, days);
      }

      // Cache the result
      this.weatherCache.set(cacheKey, {
        data: forecastData,
        timestamp: Date.now(),
      });

      this.notifyListeners('forecastUpdated', { forecast: forecastData, location });
      return forecastData;

    } catch (error) {
      console.error('Forecast fetch error:', error);
      this.notifyListeners('forecastError', { error: error.message });
      return this.getMockForecastData(location, days);
    }
  }

  async fetchFromOpenWeatherMap(location, endpoint) {
    const url = `${this.baseUrl}/${endpoint}`;
    const params = {
      lat: location.latitude,
      lon: location.longitude,
      appid: this.openWeatherMapApiKey,
      units: 'metric',
    };

    const response = await axios.get(url, { params, timeout: 5000 });
    
    if (endpoint === 'weather') {
      return this.parseCurrentWeather(response.data);
    } else if (endpoint === 'forecast') {
      return this.parseForecast(response.data);
    }
  }

  async fetchFromFreeService(location) {
    // Use a free weather service like wttr.in
    try {
      const url = `https://wttr.in/${location.latitude},${location.longitude}?format=j1`;
      const response = await axios.get(url, { timeout: 5000 });
      return this.parseWttrData(response.data);
    } catch (error) {
      console.error('Free weather service error:', error);
      return this.getMockWeatherData(location);
    }
  }

  parseCurrentWeather(data) {
    return {
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      visibility: data.visibility / 1000, // Convert to km
      windSpeed: data.wind.speed,
      windDirection: data.wind.deg,
      cloudiness: data.clouds.all,
      condition: data.weather[0].main,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      sunrise: new Date(data.sys.sunrise * 1000),
      sunset: new Date(data.sys.sunset * 1000),
      location: data.name,
      timestamp: Date.now(),
      drivingConditions: this.assessDrivingConditions(data),
    };
  }

  parseForecast(data) {
    const forecast = data.list.map(item => ({
      timestamp: new Date(item.dt * 1000),
      temperature: Math.round(item.main.temp),
      condition: item.weather[0].main,
      description: item.weather[0].description,
      icon: item.weather[0].icon,
      windSpeed: item.wind.speed,
      precipitation: item.rain ? item.rain['3h'] || 0 : 0,
      drivingRisk: this.calculateDrivingRisk(item),
    }));

    return {
      location: data.city.name,
      forecast: forecast.slice(0, 40), // 5 days * 8 (3-hour intervals)
      timestamp: Date.now(),
    };
  }

  parseWttrData(data) {
    const current = data.current_condition[0];
    const weather = data.weather[0];
    
    return {
      temperature: parseInt(current.temp_C),
      feelsLike: parseInt(current.FeelsLikeC),
      humidity: parseInt(current.humidity),
      pressure: parseInt(current.pressure),
      visibility: parseInt(current.visibility),
      windSpeed: parseInt(current.windspeedKmph) / 3.6, // Convert to m/s
      windDirection: parseInt(current.winddirDegree),
      cloudiness: parseInt(current.cloudcover),
      condition: current.weatherDesc[0].value,
      description: current.weatherDesc[0].value,
      icon: this.mapWttrIcon(current.weatherCode),
      location: 'Current Location',
      timestamp: Date.now(),
      drivingConditions: this.assessDrivingConditionsFromWttr(current),
    };
  }

  assessDrivingConditions(data) {
    const conditions = [];
    let riskLevel = 'low';

    // Weather-based conditions
    const condition = data.weather[0].main.toLowerCase();
    if (['rain', 'drizzle'].includes(condition)) {
      conditions.push('wet_roads');
      riskLevel = 'medium';
    }
    if (['snow', 'sleet'].includes(condition)) {
      conditions.push('icy_roads');
      riskLevel = 'high';
    }
    if (condition === 'fog' || data.visibility < 1000) {
      conditions.push('low_visibility');
      riskLevel = 'high';
    }
    if (data.wind.speed > 10) {
      conditions.push('strong_winds');
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    // Temperature-based conditions
    if (data.main.temp <= 0) {
      conditions.push('freezing_conditions');
      riskLevel = 'high';
    }
    if (data.main.temp >= 35) {
      conditions.push('extreme_heat');
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    return {
      riskLevel,
      conditions,
      alerts: this.generateWeatherAlerts(conditions, data),
    };
  }

  assessDrivingConditionsFromWttr(current) {
    const conditions = [];
    let riskLevel = 'low';

    const desc = current.weatherDesc[0].value.toLowerCase();
    if (desc.includes('rain') || desc.includes('drizzle')) {
      conditions.push('wet_roads');
      riskLevel = 'medium';
    }
    if (desc.includes('snow') || desc.includes('sleet')) {
      conditions.push('icy_roads');
      riskLevel = 'high';
    }
    if (desc.includes('fog') || parseInt(current.visibility) < 1) {
      conditions.push('low_visibility');
      riskLevel = 'high';
    }

    return { riskLevel, conditions, alerts: [] };
  }

  calculateDrivingRisk(forecastItem) {
    let risk = 0;
    
    const condition = forecastItem.weather[0].main.toLowerCase();
    if (['rain', 'drizzle'].includes(condition)) risk += 2;
    if (['snow', 'sleet'].includes(condition)) risk += 4;
    if (condition === 'thunderstorm') risk += 3;
    if (forecastItem.wind.speed > 10) risk += 2;
    if (forecastItem.main.temp <= 0) risk += 3;

    if (risk >= 6) return 'high';
    if (risk >= 3) return 'medium';
    return 'low';
  }

  generateWeatherAlerts(conditions, data) {
    const alerts = [];

    if (conditions.includes('wet_roads')) {
      alerts.push({
        type: 'wet_roads',
        severity: 'medium',
        message: 'Wet road conditions detected. Reduce speed and increase following distance.',
      });
    }

    if (conditions.includes('icy_roads')) {
      alerts.push({
        type: 'icy_roads',
        severity: 'high',
        message: 'Icy conditions possible. Drive with extreme caution.',
      });
    }

    if (conditions.includes('low_visibility')) {
      alerts.push({
        type: 'low_visibility',
        severity: 'high',
        message: `Low visibility (${Math.round(data.visibility / 1000)}km). Use headlights and reduce speed.`,
      });
    }

    if (conditions.includes('strong_winds')) {
      alerts.push({
        type: 'strong_winds',
        severity: 'medium',
        message: `Strong winds (${Math.round(data.wind.speed)} m/s). Be aware of crosswinds.`,
      });
    }

    return alerts;
  }

  async getRouteWeather(routeCoordinates) {
    const weatherPoints = [];
    const samplePoints = this.sampleRoutePoints(routeCoordinates, 5); // Sample 5 points along route

    for (const point of samplePoints) {
      try {
        const weather = await this.getCurrentWeather(point);
        weatherPoints.push({
          location: point,
          weather,
          distance: point.distance || 0,
        });
      } catch (error) {
        console.error('Error getting weather for route point:', error);
      }
    }

    return {
      routeWeather: weatherPoints,
      overallRisk: this.calculateOverallRouteRisk(weatherPoints),
      alerts: this.generateRouteWeatherAlerts(weatherPoints),
    };
  }

  sampleRoutePoints(coordinates, count) {
    if (coordinates.length <= count) return coordinates;

    const step = Math.floor(coordinates.length / count);
    const sampled = [];

    for (let i = 0; i < count; i++) {
      const index = i * step;
      if (index < coordinates.length) {
        sampled.push(coordinates[index]);
      }
    }

    return sampled;
  }

  calculateOverallRouteRisk(weatherPoints) {
    const risks = weatherPoints.map(point => {
      const conditions = point.weather.drivingConditions;
      switch (conditions.riskLevel) {
        case 'high': return 3;
        case 'medium': return 2;
        case 'low': return 1;
        default: return 1;
      }
    });

    const avgRisk = risks.reduce((sum, risk) => sum + risk, 0) / risks.length;
    
    if (avgRisk >= 2.5) return 'high';
    if (avgRisk >= 1.5) return 'medium';
    return 'low';
  }

  generateRouteWeatherAlerts(weatherPoints) {
    const alerts = [];
    const seenAlertTypes = new Set();

    weatherPoints.forEach(point => {
      point.weather.drivingConditions.alerts.forEach(alert => {
        if (!seenAlertTypes.has(alert.type)) {
          alerts.push({
            ...alert,
            location: point.location,
            distance: point.distance,
          });
          seenAlertTypes.add(alert.type);
        }
      });
    });

    return alerts;
  }

  getMockWeatherData(location) {
    return {
      temperature: 22,
      feelsLike: 24,
      humidity: 65,
      pressure: 1013,
      visibility: 10,
      windSpeed: 3.5,
      windDirection: 180,
      cloudiness: 40,
      condition: 'Clouds',
      description: 'scattered clouds',
      icon: '03d',
      location: 'Current Location',
      timestamp: Date.now(),
      drivingConditions: {
        riskLevel: 'low',
        conditions: [],
        alerts: [],
      },
    };
  }

  getMockForecastData(location, days) {
    const forecast = [];
    const now = new Date();

    for (let i = 0; i < days * 8; i++) {
      const time = new Date(now.getTime() + i * 3 * 60 * 60 * 1000);
      forecast.push({
        timestamp: time,
        temperature: 20 + Math.random() * 10,
        condition: 'Clear',
        description: 'clear sky',
        icon: '01d',
        windSpeed: 2 + Math.random() * 5,
        precipitation: 0,
        drivingRisk: 'low',
      });
    }

    return {
      location: 'Current Location',
      forecast,
      timestamp: Date.now(),
    };
  }

  mapWttrIcon(weatherCode) {
    // Map wttr.in weather codes to OpenWeatherMap-style icons
    const codeMap = {
      '113': '01d', // Clear
      '116': '02d', // Partly cloudy
      '119': '03d', // Cloudy
      '122': '04d', // Overcast
      '143': '50d', // Mist
      '176': '10d', // Patchy rain
      '179': '13d', // Patchy snow
      '200': '11d', // Thundery outbreaks
    };
    return codeMap[weatherCode] || '01d';
  }

  // Listener management
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('WeatherService listener error:', error);
      }
    });
  }

  // Weather-based route recommendations
  getRouteRecommendations(weatherData, routeOptions) {
    const recommendations = [];

    if (weatherData.conditions.includes('rain') || weatherData.conditions.includes('snow')) {
      recommendations.push({
        type: 'route_adjustment',
        priority: 'high',
        message: 'Consider avoiding highways due to wet conditions',
        action: 'avoid_highways',
      });
    }

    if (weatherData.visibility < 1000) { // Less than 1km visibility
      recommendations.push({
        type: 'safety_warning',
        priority: 'high',
        message: 'Low visibility conditions detected. Drive carefully.',
        action: 'reduce_speed',
      });
    }

    if (weatherData.windSpeed > 50) { // Strong winds
      recommendations.push({
        type: 'vehicle_warning',
        priority: 'medium',
        message: 'Strong winds detected. High-profile vehicles should use caution.',
        action: 'wind_warning',
      });
    }

    return recommendations;
  }

  // Integration with voice announcements
  getWeatherAnnouncement(weatherData) {
    const temp = Math.round(weatherData.temperature);
    const condition = weatherData.conditions[0] || 'clear';

    let announcement = `Current weather: ${temp} degrees, ${condition}`;

    if (weatherData.conditions.includes('rain')) {
      announcement += '. Rain detected, drive safely.';
    } else if (weatherData.conditions.includes('snow')) {
      announcement += '. Snow conditions, reduce speed.';
    } else if (weatherData.windSpeed > 30) {
      announcement += '. Windy conditions ahead.';
    }

    return announcement;
  }

  destroy() {
    this.listeners = [];
    this.weatherCache.clear();
    this.isInitialized = false;
  }
}

export default new WeatherService();
