import { Action, ActionPanel, Detail, Icon, getPreferenceValues, showToast, Toast } from "@vicinae/api";
import React, { useState, useEffect } from "react";
import { WallpaperAPI } from "./api";
import { WallpaperFile, WallpaperPreferences } from "./types";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [wallpaper, setWallpaper] = useState<WallpaperFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSettingWallpaper, setIsSettingWallpaper] = useState(false);

  const preferences = getPreferenceValues<WallpaperPreferences>();
  const wallpaperAPI = new WallpaperAPI(preferences);

  useEffect(() => {
    setRandomWallpaper();
  }, []);

  const setRandomWallpaper = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if awww is available
      if (!wallpaperAPI.isAwwwAvailable()) {
        setError("awww is not installed or not found in PATH. Please install awww to use this extension.");
        return;
      }

      const randomWallpaper = await wallpaperAPI.getRandomWallpaper();

      if (!randomWallpaper) {
        setError("No wallpapers found in configured folders. Please check your preferences.");
        return;
      }

      setWallpaper(randomWallpaper);

      // Automatically set the wallpaper
      setIsSettingWallpaper(true);

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Setting random wallpaper...",
        message: randomWallpaper.name
      });

      const result = await wallpaperAPI.setWallpaper({
        wallpaperPath: randomWallpaper.absolutePath
      });

      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = "Random wallpaper set successfully";
        toast.message = randomWallpaper.name;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to set wallpaper";
        toast.message = result.error || "Unknown error";
        setError(result.error || "Failed to set wallpaper");
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get random wallpaper";
      setError(errorMessage);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to set random wallpaper",
        message: errorMessage
      });
    } finally {
      setIsLoading(false);
      setIsSettingWallpaper(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getFolderName = (folderPath: string): string => {
    return folderPath.split('/').pop() || folderPath;
  };

  const getWallpaperStats = async () => {
    try {
      const stats = await wallpaperAPI.getWallpaperStats();
      return `Found ${stats.totalWallpapers} wallpapers in ${stats.validFolders} folders`;
    } catch {
      return "Unable to get wallpaper statistics";
    }
  };

  const markdown = wallpaper
    ? `
# Random Wallpaper Set Successfully

![Wallpaper](${wallpaperAPI.getImageUrl(wallpaper)})

## Wallpaper Details

- **Name**: ${wallpaper.name}
- **Folder**: ${getFolderName(wallpaper.folder)}
- **Size**: ${formatFileSize(wallpaper.size)}
- **Extension**: ${wallpaper.extension.toUpperCase()}
- **Modified**: ${wallpaper.lastModified.toLocaleDateString()}

**Path**: \`${wallpaper.absolutePath}\`

${isSettingWallpaper ? "Setting wallpaper..." : "Wallpaper has been set successfully!"}
`
    : error
    ? `
# Random Wallpaper Failed

❌ **Error**: ${error}

## Troubleshooting

1. Make sure **awww** is installed and in your PATH
2. Check that your wallpaper folders exist and contain image files
3. Verify folder permissions allow reading files

### Install awww

You can install awww from: https://codeberg.org/LGFae/awww
`
    : `
# Setting Random Wallpaper...

🔄 Loading random wallpaper from your configured folders...
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Get Another Random Wallpaper"
            icon={Icon.Shuffle}
            onAction={setRandomWallpaper}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          {wallpaper && (
            <>
              <ActionPanel.Section title="Current Wallpaper">
                <Action
                  title="Set This Wallpaper Again"
                  icon={Icon.Desktop}
                  onAction={async () => {
                    if (wallpaper) {
                      setIsSettingWallpaper(true);
                      try {
                        const result = await wallpaperAPI.setWallpaper({
                          wallpaperPath: wallpaper.absolutePath
                        });

                        if (result.success) {
                          await showToast({
                            style: Toast.Style.Success,
                            title: "Wallpaper set successfully",
                            message: wallpaper.name
                          });
                        } else {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: "Failed to set wallpaper",
                            message: result.error || "Unknown error"
                          });
                        }
                      } catch (err) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to set wallpaper",
                          message: err instanceof Error ? err.message : "Unknown error"
                        });
                      } finally {
                        setIsSettingWallpaper(false);
                      }
                    }
                  }}
                />
                <Action.ShowInFinder
                  title="Show in Finder"
                  path={wallpaper.absolutePath}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                />
                <Action.CopyToClipboard
                  title="Copy Path"
                  icon={Icon.Clipboard}
                  content={wallpaper.absolutePath}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel.Section>
            </>
          )}
          <ActionPanel.Section title="Help">
            <Action.OpenInBrowser
              title="Install awww"
              icon={Icon.Globe}
              url="https://codeberg.org/LGFae/awww"
            />
            <Action
              title="Show Statistics"
              icon={Icon.BarChart}
              onAction={async () => {
                const statsMessage = await getWallpaperStats();
                await showToast({
                  style: Toast.Style.Success,
                  title: "Wallpaper Statistics",
                  message: statsMessage
                });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}