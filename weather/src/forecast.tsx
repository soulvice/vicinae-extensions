import { List, ActionPanel, Action, Icon, getPreferenceValues, Color } from "@vicinae/api";
import React, { useState, useEffect, useCallback } from "react";
import { WeatherAPI } from "./api";
import { WeatherData, WeatherPreferences } from "./types";

export default function Command() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showingDetail, setShowingDetail] = useState(true);

  const preferences = getPreferenceValues<WeatherPreferences>();
  const weatherAPI = new WeatherAPI(preferences);

  const toggleDetails = useCallback(() => {
    setShowingDetail(!showingDetail);
  }, [showingDetail]);

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
    return "🌤️";
  };

  const getRainChanceLevel = (chance: number): string => {
    if (chance <= 20) return "☀️ Unlikely";
    if (chance <= 50) return "🌤️ Possible";
    if (chance <= 80) return "🌧️ Likely";
    return "☔ Very Likely";
  };

  // Weather detail component for selected day
  const WeatherDetail = ({ day, isToday = false }: { day: any; isToday?: boolean }) => {
    if (!weatherData) return null;

    const { current, location } = weatherData;
    const tempUnit = getTemperatureUnit();
    const windUnit = getWindSpeedUnit();
    const dayEmoji = getConditionEmoji(day.condition.description);
    const rainLevel = getRainChanceLevel(day.chanceOfRain);

    // If it's today, show current conditions, otherwise show forecast
    const displayData = isToday ? current : day;
    const temperature = isToday ? current.temperature : `${day.maxTemp}° / ${day.minTemp}°`;

    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label
              title="Location"
              text={`${location.name}, ${location.region}`}
              icon={{
                source: Icon.Globe,
                tintColor: Color.Blue,
              }}
            />
            <List.Item.Detail.Metadata.Label
              title="Date"
              text={isToday ? "Today" : formatDate(day.date)}
            />
            <List.Item.Detail.Metadata.Separator />

            <List.Item.Detail.Metadata.Label
              title="Temperature"
              text={`${temperature}${tempUnit}`}
              icon={{
                source: Icon.Temperature,
                tintColor: Color.Red,
              }}
            />

            <List.Item.Detail.Metadata.Label
              title="Condition"
              text={`${dayEmoji} ${displayData.condition.description}`}
              icon={{
                source: Icon.Cloud,
                tintColor: Color.Secondary,
              }}
            />

            {!isToday && (
              <List.Item.Detail.Metadata.Label
                title="Rain Chance"
                text={rainLevel}
                icon={{
                  source: Icon.Drop,
                  tintColor: Color.Blue,
                }}
              />
            )}

            <List.Item.Detail.Metadata.Separator />

            {isToday && (
              <>
                <List.Item.Detail.Metadata.Label
                  title="Feels Like"
                  text={`${current.feelsLike}${tempUnit}`}
                  icon={{
                    source: Icon.Person,
                    tintColor: Color.Orange,
                  }}
                />
                <List.Item.Detail.Metadata.Label
                  title="Wind Speed"
                  text={`${current.windSpeed} ${windUnit} ${current.windDirection}`}
                  icon={{
                    source: Icon.Wind,
                    tintColor: Color.Green,
                  }}
                />
                <List.Item.Detail.Metadata.Label
                  title="Humidity"
                  text={`${current.humidity}%`}
                  icon={{
                    source: Icon.Drop,
                    tintColor: Color.Blue,
                  }}
                />
                <List.Item.Detail.Metadata.Label
                  title="UV Index"
                  text={current.uvIndex.toString()}
                  icon={{
                    source: Icon.Sun,
                    tintColor: Color.Yellow,
                  }}
                />
              </>
            )}

            {!isToday && (
              <>
                <List.Item.Detail.Metadata.Label
                  title="Sunrise"
                  text={day.sunrise}
                  icon={{
                    source: Icon.Sun,
                    tintColor: Color.Yellow,
                  }}
                />
                <List.Item.Detail.Metadata.Label
                  title="Sunset"
                  text={day.sunset}
                  icon={{
                    source: Icon.Moon,
                    tintColor: Color.Purple,
                  }}
                />
                <List.Item.Detail.Metadata.Label
                  title="Humidity"
                  text={`${day.avgHumidity}%`}
                  icon={{
                    source: Icon.Drop,
                    tintColor: Color.Blue,
                  }}
                />
                <List.Item.Detail.Metadata.Label
                  title="Moon Phase"
                  text={day.moonPhase}
                  icon={{
                    source: Icon.Moon,
                    tintColor: Color.Purple,
                  }}
                />
              </>
            )}

            <List.Item.Detail.Metadata.Separator />

            <List.Item.Detail.Metadata.Label
              title="Last Updated"
              text={new Date(current.lastUpdated).toLocaleString()}
              icon={{
                source: Icon.Clock,
                tintColor: Color.Secondary,
              }}
            />
          </List.Item.Detail.Metadata>
        }
      />
    );
  };

  if (error) {
    return (
      <List>
        <List.Item
          title="🌩️ Weather Error"
          subtitle={error}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={fetchWeatherData}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!weatherData) {
    return <List isLoading={isLoading} searchBarPlaceholder="Loading weather data..." />;
  }

  const { current, forecast, location } = weatherData;
  const tempUnit = getTemperatureUnit();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search forecast days..."
      isShowingDetail={showingDetail}
      actions={
        <ActionPanel>
          <Action
            title="Refresh Weather"
            icon={Icon.ArrowClockwise}
            onAction={fetchWeatherData}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title={showingDetail ? "Hide Details" : "Show Details"}
            icon={showingDetail ? Icon.EyeDisabled : Icon.Eye}
            onAction={toggleDetails}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
          {preferences.enableCaching && (
            <Action
              title="Clear Cache"
              icon={Icon.Trash}
              onAction={clearCache}
              shortcut={{ modifiers: ["cmd"], key: "delete" }}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Weather Summary"
            content={`${current.condition.description} ${current.temperature}${tempUnit} in ${location.name}`}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    >
      {/* Current Weather (Today) */}
      <List.Item
        key="today"
        icon={getConditionEmoji(current.condition.description)}
        title="Today"
        subtitle={`${current.temperature}${tempUnit} • ${current.condition.description}`}
        accessories={!showingDetail ? [
          {
            text: `Feels ${current.feelsLike}${tempUnit}`,
            icon: {
              source: Icon.Person,
              tintColor: Color.Orange,
            }
          },
          {
            text: `${current.humidity}% humidity`,
            icon: {
              source: Icon.Drop,
              tintColor: Color.Blue,
            }
          },
        ] : undefined}
        detail={showingDetail ? <WeatherDetail day={current} isToday={true} /> : undefined}
        actions={
          <ActionPanel>
            <Action
              title={showingDetail ? "Hide Details" : "Show Details"}
              icon={showingDetail ? Icon.EyeDisabled : Icon.Eye}
              onAction={toggleDetails}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
            <Action
              title="Refresh Weather"
              icon={Icon.ArrowClockwise}
              onAction={fetchWeatherData}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <ActionPanel.Section title="Actions">
              <Action.CopyToClipboard
                title="Copy Current Weather"
                icon={Icon.Clipboard}
                content={`${current.condition.description} ${current.temperature}${tempUnit} in ${location.name}`}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.OpenInBrowser
                title="Open in Browser"
                icon={Icon.Globe}
                url={`https://wttr.in/${encodeURIComponent(location.name)}`}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />

      {/* Forecast Days */}
      {forecast.map((day, index) => {
        const dayEmoji = getConditionEmoji(day.condition.description);
        const rainLevel = getRainChanceLevel(day.chanceOfRain);
        const isToday = index === 0;
        const dayLabel = isToday ? "Tomorrow" : formatDate(day.date);

        return (
          <List.Item
            key={day.date}
            icon={dayEmoji}
            title={dayLabel}
            subtitle={`${day.maxTemp}° / ${day.minTemp}°${tempUnit} • ${day.condition.description}`}
            accessories={!showingDetail ? [
              {
                text: rainLevel,
                icon: {
                  source: Icon.Drop,
                  tintColor: Color.Blue,
                }
              },
              {
                text: `${day.avgHumidity}% humidity`,
                icon: {
                  source: Icon.Drop,
                  tintColor: Color.Secondary,
                }
              },
            ] : undefined}
            detail={showingDetail ? <WeatherDetail day={day} isToday={false} /> : undefined}
            actions={
              <ActionPanel>
                <Action
                  title={showingDetail ? "Hide Details" : "Show Details"}
                  icon={showingDetail ? Icon.EyeDisabled : Icon.Eye}
                  onAction={toggleDetails}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                />
                <Action
                  title="Refresh Weather"
                  icon={Icon.ArrowClockwise}
                  onAction={fetchWeatherData}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <ActionPanel.Section title="Actions">
                  <Action.CopyToClipboard
                    title="Copy Day Forecast"
                    icon={Icon.Clipboard}
                    content={`${dayLabel}: ${day.condition.description} ${day.maxTemp}° / ${day.minTemp}°${tempUnit}`}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    icon={Icon.Globe}
                    url={`https://wttr.in/${encodeURIComponent(location.name)}`}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}