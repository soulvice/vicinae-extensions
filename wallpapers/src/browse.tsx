import { Grid, ActionPanel, Action, Icon, getPreferenceValues, Color, showToast, Toast } from "@vicinae/api";
import React, { useState, useEffect, useCallback } from "react";
import { WallpaperAPI } from "./api";
import { WallpaperFile, WallpaperPreferences, WallpaperFolder } from "./types";

export default function Command() {
  const [wallpapers, setWallpapers] = useState<WallpaperFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showingDetail, setShowingDetail] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "size" | "modified">("name");

  const preferences = getPreferenceValues<WallpaperPreferences>();
  const wallpaperAPI = new WallpaperAPI(preferences);
  const columns = parseInt(preferences.gridColumns) || 4;

  const toggleDetails = useCallback(() => {
    setShowingDetail(!showingDetail);
  }, [showingDetail]);

  useEffect(() => {
    loadWallpapers();
  }, [selectedFolder, sortBy]);

  const loadWallpapers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if awww is available
      if (!wallpaperAPI.isAwwwAvailable()) {
        setError("awww is not installed or not found in PATH. Please install awww to use this extension.");
        return;
      }

      const searchOptions = {
        folder: selectedFolder === "all" ? undefined : selectedFolder,
        sortBy,
        sortOrder: "asc" as const
      };

      const wallpaperFiles = await wallpaperAPI.getWallpaperFiles(searchOptions);
      setWallpapers(wallpaperFiles);

      if (wallpaperFiles.length === 0) {
        setError("No wallpapers found. Check your wallpaper folders in preferences.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load wallpapers");
    } finally {
      setIsLoading(false);
    }
  };

  const setWallpaper = async (wallpaper: WallpaperFile) => {
    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Setting wallpaper...",
        message: wallpaper.name
      });

      const result = await wallpaperAPI.setWallpaper({
        wallpaperPath: wallpaper.absolutePath
      });

      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = "Wallpaper set successfully";
        toast.message = wallpaper.name;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to set wallpaper";
        toast.message = result.error || "Unknown error";
      }
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to set wallpaper",
        message: err instanceof Error ? err.message : "Unknown error"
      });
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

  // Group wallpapers by folder for sections
  const wallpaperGroups = React.useMemo(() => {
    const grouped: { [folder: string]: WallpaperFile[] } = {};

    wallpapers.forEach(wallpaper => {
      const folderName = getFolderName(wallpaper.folder);
      if (!grouped[folderName]) {
        grouped[folderName] = [];
      }
      grouped[folderName].push(wallpaper);
    });

    return Object.entries(grouped)
      .map(([folderName, wallpaperList]) => ({
        folder: folderName,
        wallpapers: wallpaperList.sort((a, b) => a.name.localeCompare(b.name))
      }))
      .sort((a, b) => a.folder.localeCompare(b.folder));
  }, [wallpapers]);

  // Wallpaper detail component
  const WallpaperDetail = ({ wallpaper }: { wallpaper: WallpaperFile }) => {
    return (
      <Grid.Item.Detail
        metadata={
          <Grid.Item.Detail.Metadata>
            <Grid.Item.Detail.Metadata.Label title="Name" text={wallpaper.name} />
            <Grid.Item.Detail.Metadata.Label title="Filename" text={wallpaper.path} />
            <Grid.Item.Detail.Metadata.Separator />

            <Grid.Item.Detail.Metadata.Label title="Folder" text={wallpaper.folder} />
            <Grid.Item.Detail.Metadata.Label title="Extension" text={wallpaper.extension.toUpperCase()} />
            <Grid.Item.Detail.Metadata.Label title="Size" text={formatFileSize(wallpaper.size)} />

            <Grid.Item.Detail.Metadata.Separator />

            <Grid.Item.Detail.Metadata.Label
              title="Last Modified"
              text={wallpaper.lastModified.toLocaleDateString()}
            />
            <Grid.Item.Detail.Metadata.Label
              title="Full Path"
              text={wallpaper.absolutePath}
              icon={{
                source: Icon.Folder,
                tintColor: Color.Secondary,
              }}
            />
          </Grid.Item.Detail.Metadata>
        }
      />
    );
  };

  return (
    <Grid
      columns={columns}
      isLoading={isLoading}
      searchBarPlaceholder="Search wallpapers by name..."
      filtering={false}
      isShowingDetail={showingDetail}
      onSearchTextChange={(searchText) => {
        // Simple client-side search
        if (searchText.length > 0) {
          wallpaperAPI.getWallpaperFiles({ query: searchText, sortBy, sortOrder: "asc" })
            .then(results => setWallpapers(results))
            .catch(err => setError(err.message));
        } else {
          loadWallpapers();
        }
      }}
      actions={
        <ActionPanel>
          <Action
            title="Refresh Wallpapers"
            icon={Icon.ArrowClockwise}
            onAction={loadWallpapers}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title={showingDetail ? "Hide Details" : "Show Details"}
            icon={showingDetail ? Icon.EyeDisabled : Icon.Eye}
            onAction={toggleDetails}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
          <ActionPanel.Section title="Sort">
            <Action
              title="Sort by Name"
              icon={Icon.Text}
              onAction={() => setSortBy("name")}
            />
            <Action
              title="Sort by Size"
              icon={Icon.BarChart}
              onAction={() => setSortBy("size")}
            />
            <Action
              title="Sort by Modified"
              icon={Icon.Calendar}
              onAction={() => setSortBy("modified")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Random">
            <Action
              title="Random Wallpaper"
              icon={Icon.Shuffle}
              onAction={async () => {
                const randomWallpaper = await wallpaperAPI.getRandomWallpaper();
                if (randomWallpaper) {
                  await setWallpaper(randomWallpaper);
                } else {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "No wallpapers found",
                    message: "Check your wallpaper folders"
                  });
                }
              }}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {error ? (
        <Grid.Item
          content={Icon.ExclamationMark}
          title="Error"
          subtitle={error}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={loadWallpapers}
              />
              <Action.OpenInBrowser
                title="Install awww"
                icon={Icon.Globe}
                url="https://github.com/mrusme/awww"
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {wallpaperGroups.map((group) => (
            <Grid.Section key={group.folder} title={group.folder}>
              {group.wallpapers.map((wallpaper) => (
                <Grid.Item
                  key={wallpaper.id}
                  content={{
                    source: wallpaperAPI.getImageUrl(wallpaper),
                    fallback: {
                      source: Icon.Photo,
                      tintColor: Color.Secondary,
                    }
                  }}
                  title={wallpaper.name}
                  subtitle={`${wallpaper.extension.toUpperCase()} • ${formatFileSize(wallpaper.size)}`}
                  keywords={[wallpaper.name, wallpaper.folder, wallpaper.extension]}
                  detail={showingDetail ? <WallpaperDetail wallpaper={wallpaper} /> : undefined}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Set as Wallpaper"
                        icon={Icon.Desktop}
                        onAction={() => setWallpaper(wallpaper)}
                      />
                      <Action
                        title={showingDetail ? "Hide Details" : "Show Details"}
                        icon={showingDetail ? Icon.EyeDisabled : Icon.Eye}
                        onAction={toggleDetails}
                        shortcut={{ modifiers: ["cmd"], key: "i" }}
                      />
                      <ActionPanel.Section title="File Actions">
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
                        <Action.CopyToClipboard
                          title="Copy Name"
                          icon={Icon.Clipboard}
                          content={wallpaper.name}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="Filter">
                        <Action
                          title={`Show Only ${getFolderName(wallpaper.folder)}`}
                          icon={Icon.Folder}
                          onAction={() => setSelectedFolder(wallpaper.folder)}
                        />
                        <Action
                          title="Show All Folders"
                          icon={Icon.List}
                          onAction={() => setSelectedFolder("all")}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              ))}
            </Grid.Section>
          ))}
        </>
      )}
    </Grid>
  );
}