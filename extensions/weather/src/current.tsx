import { Detail, ActionPanel, Action, Icon, getPreferenceValues } from "@vicinae/api";
import React, { useState, useEffect } from "react";
import { WeatherAPI } from "./api";
import { WeatherData, WeatherPreferences } from "./types";

export default function Command() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const preferences = getPreferenceValues<WeatherPreferences>();
  const weatherAPI = new WeatherAPI(preferences);

  useEffect(() => {
    fetchWeatherData();
  }, []);

  const fetchWeatherData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await weatherAPI.getWeatherData();
      setWeatherData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch weather data");
    } finally {
      setIsLoading(false);
    }
  };

  const getTemperatureUnit = () => {
    return preferences.units === "imperial" ? "°F" : "°C";
  };

  const getWindSpeedUnit = () => {
    return preferences.units === "imperial" ? "mph" : "km/h";
  };

  const getConditionEmoji = (condition: string): string => {
    const conditionMap: Record<string, string> = {
      "clear": "☀️",
      "sunny": "☀️",
      "partly cloudy": "⛅",
      "cloudy": "☁️",
      "overcast": "☁️",
      "mist": "🌫️",
      "fog": "🌫️",
      "rain": "🌧️",
      "drizzle": "🌦️",
      "snow": "❄️",
      "thunderstorm": "⛈️",
      "sleet": "🌨️",
      "hail": "🌨️",
      "wind": "💨",
      "tornado": "🌪️"
    };

    const lowerCondition = condition.toLowerCase();
    for (const [key, emoji] of Object.entries(conditionMap)) {
      if (lowerCondition.includes(key)) {
        return emoji;
      }
    }
    return current.condition.nerdIcon || "🌤️";
  };

  const getTemperatureColor = (temp: number): string => {
    const tempF = preferences.units === "imperial" ? temp : (temp * 9/5) + 32;
    if (tempF >= 90) return "🔥"; // Very hot
    if (tempF >= 75) return "🌡️"; // Warm
    if (tempF >= 60) return "🟡"; // Mild
    if (tempF >= 40) return "🔵"; // Cool
    return "❄️"; // Cold
  };

  const getUVLevel = (uvIndex: number): string => {
    if (uvIndex <= 2) return "🟢 Low";
    if (uvIndex <= 5) return "🟡 Moderate";
    if (uvIndex <= 7) return "🟠 High";
    if (uvIndex <= 10) return "🔴 Very High";
    return "🟣 Extreme";
  };

  const buildMarkdown = () => {
    if (!weatherData) return "";

    const { current, location } = weatherData;
    const tempUnit = getTemperatureUnit();
    const windUnit = getWindSpeedUnit();
    const conditionEmoji = getConditionEmoji(current.condition.description);
    const tempColor = getTemperatureColor(current.temperature);
    const uvLevel = getUVLevel(current.uvIndex);

    return `
# ${conditionEmoji} ${location.name}
## ${current.condition.description} • ${tempColor} ${current.temperature}${tempUnit}

---

### 🌡️ TEMPERATURE

| | Current | Feels Like |
|:---:|:---:|:---:|
| **Value** | **${current.temperature}${tempUnit}** | ${current.feelsLike}${tempUnit} |

---

### 🌬️ WIND & ATMOSPHERE

| Metric | Value | Status |
|--------|:-----:|:------:|
| **Wind Speed** | ${current.windSpeed} ${windUnit} | ${current.windSpeed >= 15 ? "💨 Breezy" : "🍃 Calm"} |
| **Direction** | ${current.windDirection} | 🧭 |
| **Pressure** | ${current.pressure} hPa | ${current.pressure >= 1013 ? "📈 High" : "📉 Low"} |
| **Visibility** | ${current.visibility} km | ${current.visibility >= 10 ? "👁️ Clear" : "🌫️ Limited"} |

---

### 💧 HUMIDITY & UV

| Metric | Value | Level |
|--------|:-----:|:-----:|
| **Humidity** | ${current.humidity}% | ${current.humidity >= 70 ? "💧 High" : current.humidity >= 40 ? "💦 Normal" : "🏜️ Low"} |
| **UV Index** | ${current.uvIndex} | ${uvLevel} |

---

### 📍 LOCATION INFO

**${location.region}, ${location.country}**
Coordinates: ${location.lat}°, ${location.lon}°
*Updated: ${new Date(current.lastUpdated).toLocaleString()}*
`;
  };

  const markdown = error
    ? `# 🌩️ Weather Error\n\n${error}\n\nTry refreshing or checking your internet connection.`
    : isLoading
    ? "# 🌤️ Loading Current Weather...\n\nFetching current conditions..."
    : buildMarkdown();

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Refresh Weather"
            icon={Icon.ArrowClockwise}
            onAction={fetchWeatherData}
          />
          <ActionPanel.Section>
            <Action
              title="View Full Forecast"
              icon={Icon.Calendar}
              onAction={() => {
                console.log("Navigate to forecast");
              }}
            />
            <Action
              title="Weather Settings"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd"], key: "," }}
              onAction={() => {
                console.log("Navigate to weather settings");
              }}
            />
          </ActionPanel.Section>
          {weatherData && (
            <ActionPanel.Section>
              <Action.CopyToClipboard
                title="Copy Temperature"
                content={`${weatherData.current.temperature}${getTemperatureUnit()}`}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
              <Action.CopyToClipboard
                title="Copy Weather Summary"
                content={`${weatherData.current.condition.description} ${weatherData.current.temperature}${getTemperatureUnit()} in ${weatherData.location.name}`}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.OpenInBrowser
                title="Open in Browser"
                url={`https://wttr.in/${encodeURIComponent(weatherData.location.name)}`}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}