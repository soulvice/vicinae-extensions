export interface WeatherCondition {
  code: string;
  description: string;
  icon: string;
  nerdIcon: string;
}

export interface CurrentWeather {
  location: string;
  region: string;
  country: string;
  temperature: number;
  feelsLike: number;
  condition: WeatherCondition;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: string;
  visibility: number;
  uvIndex: number;
  lastUpdated: string;
}

export interface DayForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  condition: WeatherCondition;
  chanceOfRain: number;
  sunrise: string;
  sunset: string;
  moonPhase: string;
  avgHumidity: number;
}

export interface WeatherData {
  current: CurrentWeather;
  forecast: DayForecast[];
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    localTime: string;
  };
}

export interface WeatherPreferences {
  location: string;
  discoveryMode: "auto" | "manual";
  enableCaching: boolean;
  cacheTimeout: string;
  forecastDays: string;
  units: "metric" | "imperial";
}

export interface CachedWeatherData {
  data: WeatherData;
  timestamp: number;
  location: string;
}