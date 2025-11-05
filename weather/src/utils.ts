import { getPreferenceValues } from "@vicinae/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Preferences {
  location: string;
  units: "metric" | "imperial";
  cacheTimeout: string;
  forecastDays: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Simple cache manager for weather extension
class WeatherCacheManager {
  private cache = new Map<string, CacheEntry<any>>();

  getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  setCached<T>(key: string, data: T, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds
    });
  }

  clearCache(keyPattern?: string): void {
    if (keyPattern) {
      const regex = new RegExp(keyPattern);
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}

// Singleton instance
let weatherCacheManager: WeatherCacheManager | null = null;

function getWeatherCacheManager(): WeatherCacheManager {
  if (!weatherCacheManager) {
    weatherCacheManager = new WeatherCacheManager();
  }
  return weatherCacheManager;
}

export interface CurrentWeather {
  location: string;
  temperature: string;
  feelsLike: string;
  condition: string;
  humidity: string;
  windSpeed: string;
  pressure: string;
  visibility: string;
  uvIndex: string;
}

export interface ForecastDay {
  date: string;
  maxTemp: string;
  minTemp: string;
  condition: string;
  chanceOfRain: string;
  sunrise: string;
  sunset: string;
}

export interface WeatherData {
  current: CurrentWeather;
  forecast: ForecastDay[];
}

function getWeatherConfig() {
  try {
    const prefs = getPreferenceValues<Preferences>();
    return {
      location: prefs.location || "",
      units: prefs.units || "metric",
      cacheTimeout: parseInt(prefs.cacheTimeout || "300"),
      forecastDays: parseInt(prefs.forecastDays || "5")
    };
  } catch (error) {
    console.warn('Failed to get weather preferences, using defaults:', error);
    return {
      location: "",
      units: "metric" as const,
      cacheTimeout: 300,
      forecastDays: 5
    };
  }
}

function getLocation(): string {
  return getWeatherConfig().location;
}

function getUnits(): string {
  return getWeatherConfig().units === "imperial" ? "u" : "m";
}

export async function fetchWeatherData(): Promise<WeatherData> {
  const config = getWeatherConfig();
  const cacheManager = getWeatherCacheManager();

  // Create cache key based on location and units
  const location = getLocation();
  const units = getUnits();
  const cacheKey = `weather:${location}:${units}`;

  // Try to get cached data first
  const cachedData = cacheManager.getCached<WeatherData>(cacheKey);
  if (cachedData) {
    console.log('Using cached weather data');
    return cachedData;
  }

  try {
    console.log('Fetching fresh weather data');
    const locationParam = location ? encodeURIComponent(location) : "";

    // Fetch weather data using curl via nushell with timeout
    const forecastDays = config.forecastDays;
    const url = `wttr.in/${locationParam}?format=j1&${units}&days=${forecastDays}`;
    const command = `nu -c 'curl -s --max-time 10 --connect-timeout 5 "${url}"'`;

    const { stdout: output } = await execAsync(command, {
      encoding: "utf-8",
      timeout: 15000 // 15 second timeout for the entire operation
    });

    if (!output || output.trim() === '') {
      throw new Error('Empty response from weather service');
    }

    const data = JSON.parse(output);

    // Parse current weather
    const currentCondition = data.current_condition[0];
    const current: CurrentWeather = {
      location: data.nearest_area?.[0]?.areaName?.[0]?.value || location || "Unknown",
      temperature: `${currentCondition.temp_C}°C` + (getUnits() === "u" ? ` (${currentCondition.temp_F}°F)` : ""),
      feelsLike: `${currentCondition.FeelsLikeC}°C` + (getUnits() === "u" ? ` (${currentCondition.FeelsLikeF}°F)` : ""),
      condition: currentCondition.weatherDesc[0].value,
      humidity: `${currentCondition.humidity}%`,
      windSpeed: `${currentCondition.windspeedKmph} km/h`,
      pressure: `${currentCondition.pressure} mb`,
      visibility: `${currentCondition.visibility} km`,
      uvIndex: currentCondition.uvIndex,
    };

    // Parse forecast
    const forecast: ForecastDay[] = data.weather.map((day: any) => ({
      date: day.date,
      maxTemp: `${day.maxtempC}°C` + (getUnits() === "u" ? ` (${day.maxtempF}°F)` : ""),
      minTemp: `${day.mintempC}°C` + (getUnits() === "u" ? ` (${day.mintempF}°F)` : ""),
      condition: day.hourly[4]?.weatherDesc[0]?.value || "Unknown",
      chanceOfRain: `${day.hourly[4]?.chanceofrain || 0}%`,
      sunrise: day.astronomy[0]?.sunrise || "N/A",
      sunset: day.astronomy[0]?.sunset || "N/A",
    }));

    const weatherData = { current, forecast };

    // Cache the result
    cacheManager.setCached(cacheKey, weatherData, config.cacheTimeout);
    console.log(`Weather data cached for ${config.cacheTimeout} seconds`);

    return weatherData;
  } catch (error) {
    console.error('Weather fetch error:', error);

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error('Weather service timed out. Please check your internet connection and try again.');
      } else if (error.message.includes('JSON')) {
        throw new Error('Invalid response from weather service. The service might be temporarily unavailable.');
      } else if (error.message.includes('Empty response')) {
        throw new Error('No data received from weather service. Please check your location settings.');
      } else {
        throw new Error(`Weather service error: ${error.message}`);
      }
    }

    throw new Error('Unknown error occurred while fetching weather data');
  }
}

// Function to clear weather cache manually
export function clearWeatherCache(): void {
  getWeatherCacheManager().clearCache('weather:');
}

export function getWeatherIcon(condition: string): string {
  const conditionLower = condition.toLowerCase();
  
  if (conditionLower.includes("sunny") || conditionLower.includes("clear")) {
    return "☀️";
  } else if (conditionLower.includes("partly cloudy")) {
    return "⛅";
  } else if (conditionLower.includes("cloudy") || conditionLower.includes("overcast")) {
    return "☁️";
  } else if (conditionLower.includes("rain") || conditionLower.includes("drizzle")) {
    return "🌧️";
  } else if (conditionLower.includes("thunder") || conditionLower.includes("storm")) {
    return "⛈️";
  } else if (conditionLower.includes("snow")) {
    return "❄️";
  } else if (conditionLower.includes("mist") || conditionLower.includes("fog")) {
    return "🌫️";
  } else if (conditionLower.includes("wind")) {
    return "💨";
  }
  
  return "🌤️";
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return "Tomorrow";
  } else {
    return date.toLocaleDateString("en-US", { 
      weekday: "long", 
      month: "short", 
      day: "numeric" 
    });
  }
}