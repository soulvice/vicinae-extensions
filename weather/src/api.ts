import { execSync } from "child_process";
import { WeatherData, WeatherPreferences, CachedWeatherData } from "./types";
import { getWeatherCondition, isNightTime } from "./icons";

export class WeatherAPI {
  private cacheFile = `${process.env.HOME}/.vicinae-weather-cache.json`;

  constructor(private preferences: WeatherPreferences) {}

  async getWeatherData(): Promise<WeatherData> {
    const location = await this.resolveLocation();

    // Check cache first if enabled
    if (this.preferences.enableCaching) {
      const cachedData = this.getCachedData(location);
      if (cachedData) {
        return cachedData;
      }
    }

    // Fetch fresh data from wttr.in
    const weatherData = await this.fetchFromWttr(location);

    // Cache the data if caching is enabled
    if (this.preferences.enableCaching) {
      this.setCachedData(location, weatherData);
    }

    return weatherData;
  }

  private async resolveLocation(): Promise<string> {
    if (this.preferences.location && this.preferences.location.trim() !== "") {
      return this.preferences.location;
    }

    if (this.preferences.discoveryMode === "auto") {
      try {
        // Use curl to get location from IP
        const locationResponse = execSync(
          "curl -s 'http://wttr.in/?format=%l'",
          { encoding: "utf-8", timeout: 10000 }
        ).trim();

        if (locationResponse && !locationResponse.includes("Unknown")) {
          return locationResponse;
        }
      } catch (error) {
        console.warn("Failed to auto-detect location:", error);
      }
    }

    // Fallback to a default location
    return "London";
  }

  private async fetchFromWttr(location: string): Promise<WeatherData> {
    try {
      // Get weather data in JSON format from wttr.in
      const response = execSync(
        `curl -s 'http://wttr.in/${encodeURIComponent(location)}?format=j1'`,
        { encoding: "utf-8", timeout: 15000 }
      );

      const data = JSON.parse(response);

      if (data.error) {
        throw new Error(`Weather service error: ${data.error[0]?.msg || "Unknown error"}`);
      }

      return this.transformWttrData(data, location);
    } catch (error) {
      throw new Error(`Failed to fetch weather data: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private transformWttrData(data: any, location: string): WeatherData {
    const current = data.current_condition?.[0];
    const forecast = data.weather;
    const locationInfo = data.nearest_area?.[0];

    // Validate required data exists
    if (!current || !forecast || !locationInfo) {
      throw new Error("Invalid weather data format received from service");
    }

    // Get current condition with night/day consideration
    const currentTime = new Date().toISOString();
    const todayForecast = forecast[0];
    const astronomy = todayForecast?.astronomy?.[0];
    const isNight = astronomy ? isNightTime(currentTime, astronomy.sunrise, astronomy.sunset) : false;

    // Ensure weatherCode exists
    const weatherCode = current.weatherCode || current.weathercode || current.WeatherCode;
    if (!weatherCode) {
      throw new Error("Weather condition code not found in response");
    }

    const currentCondition = getWeatherCondition(weatherCode, isNight);

    const weatherData: WeatherData = {
      current: {
        location: locationInfo.areaName?.[0]?.value || locationInfo.areaName || location,
        region: locationInfo.region?.[0]?.value || locationInfo.region || "",
        country: locationInfo.country?.[0]?.value || locationInfo.country || "",
        temperature: this.convertTemperature(parseInt(current.temp_C || current.tempC || "0")),
        feelsLike: this.convertTemperature(parseInt(current.FeelsLikeC || current.feelsLikeC || current.temp_C || "0")),
        condition: currentCondition,
        humidity: parseInt(current.humidity || "50"),
        pressure: parseInt(current.pressure || "1013"),
        windSpeed: this.convertWindSpeed(parseInt(current.windspeedKmph || current.windSpeedKmph || "0")),
        windDirection: current.winddir16Point || current.windDirection || "N",
        visibility: parseInt(current.visibility || "10"),
        uvIndex: parseInt(current.uvIndex || current.uv || "0"),
        lastUpdated: currentTime,
      },
      forecast: forecast.slice(0, parseInt(this.preferences.forecastDays)).map((day: any) => {
        const astronomy = day.astronomy?.[0];
        const hourly = day.hourly?.[12]; // Use midday data for daily summary

        // Get weather code from hourly data with fallback options
        const hourlyWeatherCode = hourly?.weatherCode || hourly?.weathercode || hourly?.WeatherCode;
        const condition = getWeatherCondition(hourlyWeatherCode || "113"); // Default to sunny

        return {
          date: day.date,
          maxTemp: this.convertTemperature(parseInt(day.maxtempC || day.maxTempC || "0")),
          minTemp: this.convertTemperature(parseInt(day.mintempC || day.minTempC || "0")),
          condition,
          chanceOfRain: parseInt(day.hourly?.[0]?.chanceofrain || day.hourly?.[0]?.chanceOfRain || "0"),
          sunrise: astronomy?.sunrise || "06:00 AM",
          sunset: astronomy?.sunset || "06:00 PM",
          moonPhase: astronomy?.moon_phase || astronomy?.moonPhase || "Unknown",
          avgHumidity: day.hourly?.length > 0 ? Math.round(
            day.hourly.reduce((sum: number, hour: any) => sum + parseInt(hour.humidity || "50"), 0) / day.hourly.length
          ) : 50,
        };
      }),
      location: {
        name: locationInfo.areaName?.[0]?.value || locationInfo.areaName || location,
        region: locationInfo.region?.[0]?.value || locationInfo.region || "",
        country: locationInfo.country?.[0]?.value || locationInfo.country || "",
        lat: parseFloat(locationInfo.latitude || locationInfo.lat || "0"),
        lon: parseFloat(locationInfo.longitude || locationInfo.lon || "0"),
        localTime: currentTime,
      },
    };

    return weatherData;
  }

  private convertTemperature(celsius: number): number {
    if (this.preferences.units === "imperial") {
      return Math.round((celsius * 9/5) + 32);
    }
    return celsius;
  }

  private convertWindSpeed(kmph: number): number {
    if (this.preferences.units === "imperial") {
      return Math.round(kmph * 0.621371); // Convert to mph
    }
    return kmph;
  }

  private getCachedData(location: string): WeatherData | null {
    try {
      const cacheData = execSync(`cat "${this.cacheFile}" 2>/dev/null || echo "{}"`, {
        encoding: "utf-8",
      });

      const cache: Record<string, CachedWeatherData> = JSON.parse(cacheData);
      const cached = cache[location.toLowerCase()];

      if (!cached) return null;

      const cacheAge = Date.now() - cached.timestamp;
      const maxAge = parseInt(this.preferences.cacheTimeout) * 60 * 1000; // Convert minutes to ms

      if (cacheAge > maxAge) {
        return null;
      }

      return cached.data;
    } catch (error) {
      console.warn("Failed to read cache:", error);
      return null;
    }
  }

  private setCachedData(location: string, data: WeatherData): void {
    try {
      let cache: Record<string, CachedWeatherData> = {};

      try {
        const existingCache = execSync(`cat "${this.cacheFile}" 2>/dev/null || echo "{}"`, {
          encoding: "utf-8",
        });
        cache = JSON.parse(existingCache);
      } catch {
        // Ignore error, use empty cache
      }

      cache[location.toLowerCase()] = {
        data,
        timestamp: Date.now(),
        location,
      };

      const cacheContent = JSON.stringify(cache, null, 2);
      execSync(`echo '${cacheContent}' > "${this.cacheFile}"`, { encoding: "utf-8" });
    } catch (error) {
      console.warn("Failed to write cache:", error);
    }
  }

  // Clear cache manually
  clearCache(): void {
    try {
      execSync(`rm -f "${this.cacheFile}"`, { encoding: "utf-8" });
    } catch (error) {
      console.warn("Failed to clear cache:", error);
    }
  }
}