import React, { useState, useEffect } from "react";
import { Grid, ActionPanel, Action, Icon, showToast, Toast, getPreferenceValues, Detail } from "@vicinae/api";
import { fetchWeatherData, getWeatherIcon, formatDate, ForecastDay, clearWeatherCache } from "./utils";

interface Preferences {
  location: string;
  units: string;
  cacheTimeout: string;
  forecastDays: string;
}

export default function Command() {
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [location, setLocation] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getForecastDays = (): number => {
    try {
      const prefs = getPreferenceValues<Preferences>();
      return parseInt(prefs.forecastDays || "5");
    } catch (error) {
      return 5; // Default fallback
    }
  };

  useEffect(() => {
    loadForecast();
  }, []);

  const loadForecast = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await fetchWeatherData();
      setForecast(data.forecast);
      setLocation(data.current.location);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load forecast");
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <Grid
        columns={4}
        inset={Grid.Inset.Small}
        fit={Grid.Fit.FillParent}
      >
        <Grid.Item
          title="Error Loading Forecast"
          subtitle={error}
          content={Icon.XmarkCircle}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={loadForecast}
              />
              <Action
                title="Clear Cache & Retry"
                icon={Icon.Trash}
                onAction={async () => {
                  clearWeatherCache();
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Cache cleared",
                    message: "Retrying forecast..."
                  });
                  loadForecast();
                }}
              />
            </ActionPanel>
          }
        />
      </Grid>
    );
  }

  return (
    <Grid
      columns={4}
      inset={Grid.Inset.Small}
      fit={Grid.Fit.FillParent}
      isLoading={isLoading}
      navigationTitle={`Weather Forecast - ${location}`}
      searchBarPlaceholder="Search days..."
    >
      {forecast.slice(0, getForecastDays()).map((day, index) => (
        <Grid.Item
          key={day.date}
          title={formatDate(day.date)}
          subtitle={`${day.maxTemp} / ${day.minTemp}`}
          content={getWeatherIcon(day.condition)}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Details"
                icon={Icon.Eye}
                target={
                  <Detail
                    navigationTitle={`${formatDate(day.date)} Weather Details`}
                    markdown={`
# ${getWeatherIcon(day.condition)} ${formatDate(day.date)}

## ${day.condition}

---

## Temperature
- **High**: ${day.maxTemp}
- **Low**: ${day.minTemp}

## Precipitation
- **Chance of Rain**: ${day.chanceOfRain}

## Sun
- **Sunrise**: ${day.sunrise}
- **Sunset**: ${day.sunset}

---

*${day.date}*
                    `}
                    actions={
                      <ActionPanel>
                        <Action
                          title="Back to Forecast"
                          icon={Icon.ArrowLeft}
                          onAction={() => {}}
                        />
                      </ActionPanel>
                    }
                  />
                }
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={loadForecast}
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
                    message: "Weather cache cleared, refreshing forecast..."
                  });
                  loadForecast();
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}

      {forecast.length === 0 && !isLoading && (
        <Grid.Item
          title="No Forecast Available"
          subtitle="Unable to load weather forecast"
          content="🌤️"
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={loadForecast}
              />
            </ActionPanel>
          }
        />
      )}
    </Grid>
  );
}