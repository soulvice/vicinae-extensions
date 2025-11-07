import { Detail, ActionPanel, Action, Icon, getPreferenceValues } from "@vicinae/api";
import { execSync } from "child_process";
import React, { useState, useEffect } from "react";
import { WeatherAPI } from "./api";
import { WeatherPreferences } from "./types";

export default function Command() {
  const [cacheInfo, setCacheInfo] = useState<{
    exists: boolean;
    size?: string;
    entries?: number;
    lastModified?: string;
  }>({ exists: false });
  const [autoLocation, setAutoLocation] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const preferences = getPreferenceValues<WeatherPreferences>();
  const weatherAPI = new WeatherAPI(preferences);

  useEffect(() => {
    loadSettingsInfo();
  }, []);

  const loadSettingsInfo = async () => {
    setIsLoading(true);

    // Check cache file info
    try {
      const cacheFile = `${process.env.HOME}/.vicinae-weather-cache.json`;
      const stat = execSync(`stat "${cacheFile}" 2>/dev/null || echo "notfound"`, {
        encoding: "utf-8",
      });

      if (!stat.includes("notfound")) {
        const size = execSync(`du -h "${cacheFile}" | cut -f1`, { encoding: "utf-8" }).trim();
        const content = execSync(`cat "${cacheFile}" 2>/dev/null || echo "{}"`, {
          encoding: "utf-8",
        });

        try {
          const cache = JSON.parse(content);
          const entries = Object.keys(cache).length;
          const lastModified = execSync(`stat -c %y "${cacheFile}"`, {
            encoding: "utf-8",
          }).trim();

          setCacheInfo({
            exists: true,
            size,
            entries,
            lastModified: new Date(lastModified).toLocaleString(),
          });
        } catch {
          setCacheInfo({ exists: true, size });
        }
      } else {
        setCacheInfo({ exists: false });
      }
    } catch {
      setCacheInfo({ exists: false });
    }

    // Get auto-detected location
    if (preferences.discoveryMode === "auto") {
      try {
        const location = execSync("curl -s 'http://wttr.in/?format=%l'", {
          encoding: "utf-8",
          timeout: 5000,
        }).trim();
        setAutoLocation(location || "Unable to detect");
      } catch {
        setAutoLocation("Unable to detect");
      }
    }

    setIsLoading(false);
  };

  const clearCache = () => {
    weatherAPI.clearCache();
    loadSettingsInfo();
  };

  const testLocation = async () => {
    try {
      const testAPI = new WeatherAPI({ ...preferences, enableCaching: false });
      await testAPI.getWeatherData();
      // If successful, the user will see it worked
    } catch (error) {
      console.error("Location test failed:", error);
    }
  };

  const buildMarkdown = () => {
    return `
# ⚙️ Weather Settings

## 📍 Location Configuration

| Setting | Value |
|---------|-------|
| **Location** | ${preferences.location || "*Auto-detect*"} |
| **Discovery Mode** | ${preferences.discoveryMode === "auto" ? "🔄 Automatic" : "📝 Manual"} |
${preferences.discoveryMode === "auto" ? `| **Auto-detected** | ${autoLocation} |` : ""}

## 🎛️ Display Preferences

| Setting | Value |
|---------|-------|
| **Temperature Units** | ${preferences.units === "metric" ? "🌡️ Metric (°C)" : "🌡️ Imperial (°F)"} |
| **Forecast Days** | ${preferences.forecastDays} days |

## 💾 Cache Configuration

| Setting | Value |
|---------|-------|
| **Caching Enabled** | ${preferences.enableCaching ? "✅ Yes" : "❌ No"} |
| **Cache Timeout** | ${preferences.cacheTimeout} minutes |

${preferences.enableCaching ? `
### Cache Status
| Info | Value |
|------|-------|
| **Cache File Exists** | ${cacheInfo.exists ? "✅ Yes" : "❌ No"} |
${cacheInfo.exists ? `| **File Size** | ${cacheInfo.size || "Unknown"} |` : ""}
${cacheInfo.entries ? `| **Cached Locations** | ${cacheInfo.entries} |` : ""}
${cacheInfo.lastModified ? `| **Last Modified** | ${cacheInfo.lastModified} |` : ""}
` : ""}

---

## 🔧 Configuration Tips

### Location Format
- **City name**: \`London\`, \`New York\`, \`Tokyo\`
- **City, Country**: \`London, UK\`, \`Paris, France\`
- **Coordinates**: \`40.7128,-74.0060\` (latitude,longitude)
- **Airport codes**: \`JFK\`, \`LHR\`, \`CDG\`

### Discovery Modes
- **🔄 Automatic**: Uses your IP address to detect location
- **📝 Manual**: Only uses the location you specify

### Caching Benefits
- **⚡ Faster loading**: Avoids repeated API calls
- **🌐 Offline resilience**: Shows last known data when offline
- **📊 Reduced bandwidth**: Efficient for frequent checks

---

*To modify these settings, use the Vicinae preferences menu*
`;
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={buildMarkdown()}
      actions={
        <ActionPanel>
          <Action
            title="Refresh Settings Info"
            icon={Icon.ArrowClockwise}
            onAction={loadSettingsInfo}
          />
          <ActionPanel.Section>
            <Action
              title="Test Current Location"
              icon={Icon.MapPin}
              onAction={testLocation}
            />
            {preferences.enableCaching && cacheInfo.exists && (
              <Action
                title="Clear Weather Cache"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "delete" }}
                onAction={clearCache}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="View Current Weather"
              icon={Icon.Eye}
              onAction={() => {
                console.log("Navigate to current weather");
              }}
            />
            <Action
              title="View Forecast"
              icon={Icon.Calendar}
              onAction={() => {
                console.log("Navigate to forecast");
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="wttr.in Website"
              url="https://wttr.in/"
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}