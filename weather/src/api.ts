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
    const current = data.current_condition[0];
    const forecast = data.weather;
    const locationInfo = data.nearest_area[0];

    // Get current condition with night/day consideration
    const currentTime = new Date().toISOString();
    const todayForecast = forecast[0];
    const astronomy = todayForecast.astronomy[0];
    const isNight = isNightTime(currentTime, astronomy.sunrise, astronomy.sunset);

    const currentCondition = getWeatherCondition(current.weatherCode, isNight);

    const weatherData: WeatherData = {
      current: {
        location: locationInfo.areaName[0].value,
        region: locationInfo.region[0].value,
        country: locationInfo.country[0].value,
        temperature: this.convertTemperature(parseInt(current.temp_C)),
        feelsLike: this.convertTemperature(parseInt(current.FeelsLikeC)),
        condition: currentCondition,
        humidity: parseInt(current.humidity),
        pressure: parseInt(current.pressure),
        windSpeed: this.convertWindSpeed(parseInt(current.windspeedKmph)),
        windDirection: current.winddir16Point,
        visibility: parseInt(current.visibility),
        uvIndex: parseInt(current.uvIndex),
        lastUpdated: currentTime,
      },
      forecast: forecast.slice(0, parseInt(this.preferences.forecastDays)).map((day: any) => {
        const astronomy = day.astronomy[0];
        const hourly = day.hourly[12]; // Use midday data for daily summary
        const condition = getWeatherCondition(hourly.weatherCode);

        return {
          date: day.date,
          maxTemp: this.convertTemperature(parseInt(day.maxtempC)),
          minTemp: this.convertTemperature(parseInt(day.mintempC)),
          condition,
          chanceOfRain: parseInt(day.hourly[0].chanceofrain || "0"),
          sunrise: astronomy.sunrise,
          sunset: astronomy.sunset,
          moonPhase: astronomy.moon_phase,
          avgHumidity: Math.round(
            day.hourly.reduce((sum: number, hour: any) => sum + parseInt(hour.humidity), 0) / day.hourly.length
          ),
        };
      }),
      location: {
        name: locationInfo.areaName[0].value,
        region: locationInfo.region[0].value,
        country: locationInfo.country[0].value,
        lat: parseFloat(locationInfo.latitude),
        lon: parseFloat(locationInfo.longitude),
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