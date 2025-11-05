import React, { useState, useEffect } from "react";
import { Grid, ActionPanel, Action, Icon, showToast, Toast } from "@vicinae/api";
import {
  getStates,
  callService,
  getDomain,
  getEntityName,
  getEntityIcon,
  getFavoriteEntities,
  HAEntity,
  clearStatesCache,
  subscribeToAllEntityUpdates,
  getFreshEntityState
} from "./utils";

export default function Command() {
  const [entities, setEntities] = useState<HAEntity[]>([]);
  const [favoriteEntityIds, setFavoriteEntityIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
    setFavoriteEntityIds(getFavoriteEntities());

    // Subscribe to real-time updates
    const unsubscribe = subscribeToAllEntityUpdates((updatedEntity) => {
      setEntities(prev => {
        const updated = prev.map(entity =>
          entity.entity_id === updatedEntity.entity_id ? updatedEntity : entity
        );
        console.log(`Updated entity ${updatedEntity.entity_id} to state: ${updatedEntity.state}`);
        return updated;
      });
    });

    return unsubscribe;
  }, []);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const allEntities = await getStates();
      const favoriteIds = getFavoriteEntities();

      if (favoriteIds.length === 0) {
        // If no favorites configured, show all controllable entities
        const controllableEntities = allEntities.filter(entity => {
          const domain = getDomain(entity.entity_id);
          return ['light', 'switch', 'scene', 'script', 'automation', 'climate', 'cover', 'fan', 'media_player'].includes(domain);
        });
        setEntities(controllableEntities.slice(0, 20)); // Limit to 20 for performance
      } else {
        // Filter entities by favorites
        const favoriteEntities = allEntities.filter(entity =>
          favoriteIds.includes(entity.entity_id)
        );
        setEntities(favoriteEntities);
      }

      setFavoriteEntityIds(favoriteIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEntity = async (entity: HAEntity) => {
    const domain = getDomain(entity.entity_id);
    let service = "";
    let targetState = "";

    switch (domain) {
      case "light":
      case "switch":
      case "fan":
        service = entity.state === "on" ? "turn_off" : "turn_on";
        targetState = entity.state === "on" ? "off" : "on";
        break;
      case "scene":
        service = "turn_on";
        targetState = "activated";
        break;
      case "script":
        service = "turn_on";
        targetState = "executed";
        break;
      case "automation":
        service = entity.state === "on" ? "turn_off" : "turn_on";
        targetState = entity.state === "on" ? "off" : "on";
        break;
      case "cover":
        service = entity.state === "open" ? "close_cover" : "open_cover";
        targetState = entity.state === "open" ? "closed" : "open";
        break;
      case "media_player":
        service = entity.state === "playing" ? "media_pause" : "media_play";
        targetState = entity.state === "playing" ? "paused" : "playing";
        break;
      default:
        await showToast({
          style: Toast.Style.Failure,
          title: "Not Controllable",
          message: `Cannot control ${domain} entities`,
        });
        return;
    }

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Updating...",
        message: `Turning ${getEntityName(entity)} ${targetState}`,
      });

      await callService(domain, service, entity.entity_id);

      // Clear cache immediately to force fresh data
      clearStatesCache();

      await showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: `${getEntityName(entity)} ${targetState}`,
      });

      // Immediately get fresh state for this specific entity
      try {
        const freshEntity = await getFreshEntityState(entity.entity_id);
        setEntities(prev => prev.map(e =>
          e.entity_id === entity.entity_id ? freshEntity : e
        ));
      } catch (error) {
        console.error(`Failed to get fresh state for ${entity.entity_id}:`, error);
      }

      // Also refresh the entire dashboard after a short delay
      setTimeout(async () => {
        clearStatesCache();
        await loadDashboard();
      }, 1000);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const getEntityStateText = (entity: HAEntity): string => {
    const domain = getDomain(entity.entity_id);

    switch (domain) {
      case "sensor":
        const unit = entity.attributes.unit_of_measurement || "";
        return `${entity.state}${unit}`;
      case "binary_sensor":
        return entity.state === "on" ? "Active" : "Inactive";
      case "climate":
        const temp = entity.attributes.temperature || entity.state;
        const targetTemp = entity.attributes.target_temp_high || entity.attributes.target_temp_low || "";
        return targetTemp ? `${temp}° → ${targetTemp}°` : `${temp}°`;
      default:
        return entity.state.charAt(0).toUpperCase() + entity.state.slice(1);
    }
  };

  const isControllable = (entity: HAEntity): boolean => {
    const domain = getDomain(entity.entity_id);
    return ['light', 'switch', 'scene', 'script', 'automation', 'climate', 'cover', 'fan', 'media_player'].includes(domain);
  };

  if (error) {
    return (
      <Grid
        columns={4}
        inset={Grid.Inset.Small}
        fit={Grid.Fit.FillParent}
      >
        <Grid.Item
          title="Error Loading Dashboard"
          subtitle={error}
          content={Icon.XmarkCircle}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={loadDashboard}
              />
              <Action
                title="Clear Cache & Retry"
                icon={Icon.Trash}
                onAction={async () => {
                  clearStatesCache();
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Cache cleared",
                    message: "Retrying dashboard..."
                  });
                  loadDashboard();
                }}
              />
            </ActionPanel>
          }
        />
      </Grid>
    );
  }

  const navigationTitle = favoriteEntityIds.length > 0
    ? `Dashboard (${favoriteEntityIds.length} favorites)`
    : "Dashboard (Top 20 entities)";

  return (
    <Grid
      columns={4}
      inset={Grid.Inset.Small}
      fit={Grid.Fit.FillParent}
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Search entities..."
    >
      {entities.map((entity) => (
        <Grid.Item
          key={entity.entity_id}
          title={getEntityName(entity)}
          subtitle={getEntityStateText(entity)}
          content={getEntityIcon(entity)}
          actions={
            <ActionPanel>
              {isControllable(entity) && (
                <Action
                  title={`Toggle ${getEntityName(entity)}`}
                  icon={Icon.Switch}
                  onAction={() => toggleEntity(entity)}
                />
              )}
              <Action
                title="View Details"
                icon={Icon.Eye}
                onAction={() => showToast({
                  style: Toast.Style.Success,
                  title: getEntityName(entity),
                  message: `State: ${entity.state}\nLast Changed: ${new Date(entity.last_changed).toLocaleString()}`,
                })}
              />
              <Action
                title="Refresh Dashboard"
                icon={Icon.ArrowClockwise}
                onAction={loadDashboard}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action
                title="Clear Cache & Refresh"
                icon={Icon.Trash}
                onAction={async () => {
                  clearStatesCache();
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Cache cleared",
                    message: "Refreshing dashboard..."
                  });
                  loadDashboard();
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}

      {entities.length === 0 && !isLoading && (
        <Grid.Item
          title="No Entities Found"
          subtitle={favoriteEntityIds.length > 0
            ? "Check your favorite entities in preferences"
            : "No controllable entities found"}
          content="🏠"
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={loadDashboard}
              />
            </ActionPanel>
          }
        />
      )}
    </Grid>
  );
}