import React, { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon } from "@vicinae/api";
import { fetchWeatherData, getWeatherIcon, formatDate, WeatherData } from "./utils";

export default function Command() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
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
      setWeatherData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load weather");
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <List>
        <List.Item
          title="Error Loading Weather"
          subtitle={error}
          icon={Icon.XmarkCircle}
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
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={weatherData ? `Weather - ${weatherData.current.location}` : "Weather"}
      searchBarPlaceholder="Search..."
    >
      {weatherData && (
        <>
          <List.Section title="Current Weather">
            <List.Item
              title={`${getWeatherIcon(weatherData.current.condition)} ${weatherData.current.temperature}`}
              subtitle={weatherData.current.condition}
              accessories={[
                { text: `Feels like ${weatherData.current.feelsLike}` },
              ]}
              actions={
                <ActionPanel>
                  <Action 
                    title="Refresh" 
                    icon={Icon.ArrowClockwise} 
                    onAction={loadWeather}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title="Wind & Humidity"
              subtitle={`Wind: ${weatherData.current.windSpeed}`}
              accessories={[
                { text: `💧 ${weatherData.current.humidity}` },
              ]}
            />
            <List.Item
              title="Visibility & Pressure"
              subtitle={`Visibility: ${weatherData.current.visibility}`}
              accessories={[
                { text: weatherData.current.pressure },
              ]}
            />
          </List.Section>

          <List.Section title="3-Day Forecast">
            {weatherData.forecast.slice(0, 3).map((day) => (
              <List.Item
                key={day.date}
                title={formatDate(day.date)}
                subtitle={day.condition}
                icon={getWeatherIcon(day.condition)}
                accessories={[
                  { text: `${day.maxTemp} / ${day.minTemp}` },
                  { text: `💧 ${day.chanceOfRain}` },
                ]}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}