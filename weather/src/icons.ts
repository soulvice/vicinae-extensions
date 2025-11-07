import { WeatherCondition } from "./types";

// Nerd Font weather icons mapping for wttr.in condition codes
export const weatherConditions: Record<string, WeatherCondition> = {
  // Clear/Sunny
  "113": {
    code: "113",
    description: "Sunny",
    icon: "☀️",
    nerdIcon: "󰖙", // nf-md-weather_sunny
  },
  "116": {
    code: "116",
    description: "Partly cloudy",
    icon: "⛅",
    nerdIcon: "󰖕", // nf-md-weather_partly_cloudy
  },

  // Cloudy
  "119": {
    code: "119",
    description: "Cloudy",
    icon: "☁️",
    nerdIcon: "󰖐", // nf-md-weather_cloudy
  },
  "122": {
    code: "122",
    description: "Overcast",
    icon: "☁️",
    nerdIcon: "󰖐", // nf-md-weather_cloudy
  },

  // Mist/Fog
  "143": {
    code: "143",
    description: "Mist",
    icon: "🌫️",
    nerdIcon: "󰖑", // nf-md-weather_fog
  },
  "248": {
    code: "248",
    description: "Fog",
    icon: "🌫️",
    nerdIcon: "󰖑", // nf-md-weather_fog
  },

  // Light Rain
  "176": {
    code: "176",
    description: "Patchy rain possible",
    icon: "🌦️",
    nerdIcon: "󰖗", // nf-md-weather_partly_rainy
  },
  "263": {
    code: "263",
    description: "Patchy light drizzle",
    icon: "🌧️",
    nerdIcon: "󰖒", // nf-md-weather_rainy
  },
  "266": {
    code: "266",
    description: "Light drizzle",
    icon: "🌧️",
    nerdIcon: "󰖒", // nf-md-weather_rainy
  },
  "293": {
    code: "293",
    description: "Patchy light rain",
    icon: "🌧️",
    nerdIcon: "󰖒", // nf-md-weather_rainy
  },
  "296": {
    code: "296",
    description: "Light rain",
    icon: "🌧️",
    nerdIcon: "󰖒", // nf-md-weather_rainy
  },

  // Moderate Rain
  "299": {
    code: "299",
    description: "Moderate rain at times",
    icon: "🌧️",
    nerdIcon: "󰖖", // nf-md-weather_pouring
  },
  "302": {
    code: "302",
    description: "Moderate rain",
    icon: "🌧️",
    nerdIcon: "󰖖", // nf-md-weather_pouring
  },

  // Heavy Rain
  "305": {
    code: "305",
    description: "Heavy rain at times",
    icon: "🌧️",
    nerdIcon: "󰖖", // nf-md-weather_pouring
  },
  "308": {
    code: "308",
    description: "Heavy rain",
    icon: "🌧️",
    nerdIcon: "󰖖", // nf-md-weather_pouring
  },
  "311": {
    code: "311",
    description: "Light freezing rain",
    icon: "🌧️",
    nerdIcon: "󰖖", // nf-md-weather_pouring
  },
  "314": {
    code: "314",
    description: "Moderate or heavy freezing rain",
    icon: "🌧️",
    nerdIcon: "󰖖", // nf-md-weather_pouring
  },

  // Snow
  "179": {
    code: "179",
    description: "Patchy snow possible",
    icon: "❄️",
    nerdIcon: "󰖘", // nf-md-weather_snowy
  },
  "227": {
    code: "227",
    description: "Blowing snow",
    icon: "🌨️",
    nerdIcon: "󰼶", // nf-md-weather_snowy_heavy
  },
  "230": {
    code: "230",
    description: "Blizzard",
    icon: "🌨️",
    nerdIcon: "󰼶", // nf-md-weather_snowy_heavy
  },
  "323": {
    code: "323",
    description: "Patchy light snow",
    icon: "🌨️",
    nerdIcon: "󰖘", // nf-md-weather_snowy
  },
  "326": {
    code: "326",
    description: "Light snow",
    icon: "🌨️",
    nerdIcon: "󰖘", // nf-md-weather_snowy
  },
  "329": {
    code: "329",
    description: "Patchy moderate snow",
    icon: "🌨️",
    nerdIcon: "󰼶", // nf-md-weather_snowy_heavy
  },
  "332": {
    code: "332",
    description: "Moderate snow",
    icon: "🌨️",
    nerdIcon: "󰼶", // nf-md-weather_snowy_heavy
  },
  "335": {
    code: "335",
    description: "Patchy heavy snow",
    icon: "🌨️",
    nerdIcon: "󰼶", // nf-md-weather_snowy_heavy
  },
  "338": {
    code: "338",
    description: "Heavy snow",
    icon: "🌨️",
    nerdIcon: "󰼶", // nf-md-weather_snowy_heavy
  },

  // Sleet
  "182": {
    code: "182",
    description: "Patchy sleet possible",
    icon: "🌨️",
    nerdIcon: "󰙿", // nf-md-weather_hail
  },
  "317": {
    code: "317",
    description: "Light sleet",
    icon: "🌨️",
    nerdIcon: "󰙿", // nf-md-weather_hail
  },
  "320": {
    code: "320",
    description: "Moderate or heavy sleet",
    icon: "🌨️",
    nerdIcon: "󰙿", // nf-md-weather_hail
  },

  // Thunder
  "200": {
    code: "200",
    description: "Thundery outbreaks possible",
    icon: "⛈️",
    nerdIcon: "󰖓", // nf-md-weather_lightning
  },
  "386": {
    code: "386",
    description: "Patchy light rain with thunder",
    icon: "⛈️",
    nerdIcon: "󰖓", // nf-md-weather_lightning
  },
  "389": {
    code: "389",
    description: "Moderate or heavy rain with thunder",
    icon: "⛈️",
    nerdIcon: "󰖓", // nf-md-weather_lightning
  },
  "392": {
    code: "392",
    description: "Patchy light snow with thunder",
    icon: "⛈️",
    nerdIcon: "󰖓", // nf-md-weather_lightning
  },
  "395": {
    code: "395",
    description: "Moderate or heavy snow with thunder",
    icon: "⛈️",
    nerdIcon: "󰖓", // nf-md-weather_lightning
  },
};

// Night time variations for clear/partly cloudy conditions
export const nightConditions: Record<string, WeatherCondition> = {
  "113": {
    code: "113",
    description: "Clear",
    icon: "🌙",
    nerdIcon: "󰖔", // nf-md-weather_night
  },
  "116": {
    code: "116",
    description: "Partly cloudy",
    icon: "🌙",
    nerdIcon: "󰼱", // nf-md-weather_night_partly_cloudy
  },
};

export function getWeatherCondition(code: string, isNight = false): WeatherCondition {
  // Use night variations for clear/partly cloudy if it's night time
  if (isNight && nightConditions[code]) {
    return nightConditions[code];
  }

  // Return the condition or a default if not found
  return weatherConditions[code] || {
    code,
    description: "Unknown",
    icon: "❓",
    nerdIcon: "󰼯", // nf-md-weather_cloudy_alert
  };
}

// Helper function to determine if it's night time based on current time and sunrise/sunset
export function isNightTime(currentTime: string, sunrise?: string, sunset?: string): boolean {
  if (!sunrise || !sunset) {
    // Fallback: assume night between 6 PM and 6 AM
    const hour = new Date(currentTime).getHours();
    return hour >= 18 || hour < 6;
  }

  const current = new Date(currentTime);
  const sunriseTime = new Date(`${current.toDateString()} ${sunrise}`);
  const sunsetTime = new Date(`${current.toDateString()} ${sunset}`);

  return current < sunriseTime || current > sunsetTime;
}