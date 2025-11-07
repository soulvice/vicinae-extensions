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

  const buildMarkdown = () => {
    if (!weatherData) return "";

    const { current, location } = weatherData;
    const tempUnit = getTemperatureUnit();
    const windUnit = getWindSpeedUnit();

    return `
# ${current.condition.nerdIcon} Current Weather

## ${location.name}, ${location.region}
### ${location.country}

---

## ${current.condition.nerdIcon} ${current.condition.description}

### 🌡️ Temperature
- **Current**: ${current.temperature}${tempUnit}
- **Feels Like**: ${current.feelsLike}${tempUnit}

### 🌬️ Wind & Air
- **Wind**: ${current.windSpeed} ${windUnit} ${current.windDirection}
- **Humidity**: ${current.humidity}%
- **Pressure**: ${current.pressure} hPa
- **Visibility**: ${current.visibility} km

### ☀️ Other
- **UV Index**: ${current.uvIndex}

---

*Last updated: ${new Date(current.lastUpdated).toLocaleString()}*

*Coordinates: ${location.lat}, ${location.lon}*
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