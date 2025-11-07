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

  const clearCache = () => {
    weatherAPI.clearCache();
    fetchWeatherData();
  };

  const getTemperatureUnit = () => {
    return preferences.units === "imperial" ? "°F" : "°C";
  };

  const getWindSpeedUnit = () => {
    return preferences.units === "imperial" ? "mph" : "km/h";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric"
    });
  };

  const buildMarkdown = () => {
    if (!weatherData) return "";

    const { current, forecast, location } = weatherData;
    const tempUnit = getTemperatureUnit();
    const windUnit = getWindSpeedUnit();

    let markdown = `
# ${current.condition.nerdIcon} Weather Forecast

## ${location.name}, ${location.region}, ${location.country}

### Current Conditions
${current.condition.nerdIcon} **${current.condition.description}**

| Metric | Value |
|--------|-------|
| 🌡️ Temperature | **${current.temperature}${tempUnit}** (feels like ${current.feelsLike}${tempUnit}) |
| 💧 Humidity | ${current.humidity}% |
| 🌬️ Wind | ${current.windSpeed} ${windUnit} ${current.windDirection} |
| 🔽 Pressure | ${current.pressure} hPa |
| 👁️ Visibility | ${current.visibility} km |
| ☀️ UV Index | ${current.uvIndex} |

---

### ${forecast.length}-Day Forecast

`;

    forecast.forEach((day, index) => {
      const isToday = index === 0;
      const dayLabel = isToday ? "Today" : formatDate(day.date);

      markdown += `
#### ${day.condition.nerdIcon} ${dayLabel}
**${day.condition.description}**

| | |
|---|---|
| 🌡️ High/Low | **${day.maxTemp}${tempUnit}** / ${day.minTemp}${tempUnit} |
| 🌧️ Rain Chance | ${day.chanceOfRain}% |
| 💧 Humidity | ${day.avgHumidity}% |
| 🌅 Sunrise | ${day.sunrise} |
| 🌇 Sunset | ${day.sunset} |
| 🌙 Moon | ${day.moonPhase} |

`;
    });

    markdown += `
---

*Last updated: ${new Date(current.lastUpdated).toLocaleString()}*
`;

    if (preferences.enableCaching) {
      markdown += `\n*Cache timeout: ${preferences.cacheTimeout} minutes*`;
    }

    return markdown;
  };

  const markdown = error
    ? `# 🌩️ Weather Error\n\n${error}\n\nTry refreshing or checking your internet connection.`
    : isLoading
    ? "# 🌤️ Loading Weather Data...\n\nFetching current conditions and forecast..."
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
          {preferences.enableCaching && (
            <Action
              title="Clear Cache & Refresh"
              icon={Icon.Trash}
              shortcut={{ modifiers: ["cmd"], key: "delete" }}
              onAction={clearCache}
            />
          )}
          <ActionPanel.Section>
            <Action
              title="View Current Weather Only"
              icon={Icon.Eye}
              onAction={() => {
                // This would navigate to current weather command
                console.log("Navigate to current weather");
              }}
            />
            <Action
              title="Weather Settings"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd"], key: "," }}
              onAction={() => {
                // This would navigate to settings command
                console.log("Navigate to weather settings");
              }}
            />
          </ActionPanel.Section>
          {weatherData && (
            <ActionPanel.Section>
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