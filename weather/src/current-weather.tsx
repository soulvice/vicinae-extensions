import React, { useState, useEffect } from "react";
import { Detail, ActionPanel, Action, Icon, showToast, Toast } from "@vicinae/api";
import { fetchWeatherData, getWeatherIcon, CurrentWeather, clearWeatherCache } from "./utils";

export default function Command() {
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWeather();
  }, []);

  const loadWeather = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await fetchWeatherData();
      setWeather(data.current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load weather");
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <Detail
        markdown={`# ❌ Error\n\n${error}\n\nMake sure:\n- You have internet connection\n- curl is installed\n- Your location is set correctly in preferences`}
        actions={
          <ActionPanel>
            <Action 
              title="Retry" 
              icon={Icon.ArrowClockwise} 
              onAction={loadWeather} 
            />
          </ActionPanel>
        }
      />
    );
  }

  const markdown = weather
    ? `
# ${getWeatherIcon(weather.condition)} ${weather.location}

## Current Conditions

### ${weather.condition}

---

## Temperature
- **Current**: ${weather.temperature}
- **Feels Like**: ${weather.feelsLike}

## Details
- **Humidity**: ${weather.humidity}
- **Wind Speed**: ${weather.windSpeed}
- **Pressure**: ${weather.pressure}
- **Visibility**: ${weather.visibility}
- **UV Index**: ${weather.uvIndex}

---

*Data from wttr.in*
`
    : "# Loading...";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={loadWeather}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Clear Cache & Refresh"
            icon={Icon.Trash}
            onAction={async () => {
              clearWeatherCache();
              await showToast({
                style: Toast.Style.Success,
                title: "Cache cleared",
                message: "Weather cache cleared, refreshing..."
              });
              loadWeather();
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}