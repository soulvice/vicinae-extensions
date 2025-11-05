import { List, ActionPanel, Action, Icon, showToast, Toast, Color } from "@vicinae/api";
import React, { useState, useEffect } from "react";
import {
  getStates,
  callService,
  getEntityName,
  getDomain,
  HAEntity,
  clearStatesCache,
  getFreshEntityState,
  subscribeToAllEntityUpdates
} from "./utils";

export default function Command() {
  const [entities, setEntities] = useState<HAEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    fetchEntities();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToAllEntityUpdates((updatedEntity) => {
      setEntities(prev => prev.map(entity =>
        entity.entity_id === updatedEntity.entity_id ? updatedEntity : entity
      ));
      console.log(`Updated entity ${updatedEntity.entity_id} to state: ${updatedEntity.state}`);
    });

    return unsubscribe;
  }, []);

  const fetchEntities = async () => {
    try {
      setIsLoading(true);
      const states = await getStates();
      setEntities(states);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch entities",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEntity = async (entity: HAEntity) => {
    try {
      const domain = getDomain(entity.entity_id);

      await showToast({
        style: Toast.Style.Animated,
        title: "Toggling...",
      });

      await callService(domain, "toggle", entity.entity_id);

      // Clear cache immediately to force fresh data
      clearStatesCache();

      await showToast({
        style: Toast.Style.Success,
        title: "Toggled",
        message: getEntityName(entity),
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

      // Also refresh the entire list after a short delay
      setTimeout(async () => {
        clearStatesCache();
        await fetchEntities();
      }, 1000);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const turnOn = async (entity: HAEntity) => {
    try {
      const domain = getDomain(entity.entity_id);
      await callService(domain, "turn_on", entity.entity_id);

      // Clear cache immediately to force fresh data
      clearStatesCache();

      await showToast({
        style: Toast.Style.Success,
        title: "Turned on",
        message: getEntityName(entity),
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

      // Also refresh the entire list after a short delay
      setTimeout(async () => {
        clearStatesCache();
        await fetchEntities();
      }, 1000);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to turn on",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const turnOff = async (entity: HAEntity) => {
    try {
      const domain = getDomain(entity.entity_id);
      await callService(domain, "turn_off", entity.entity_id);

      // Clear cache immediately to force fresh data
      clearStatesCache();

      await showToast({
        style: Toast.Style.Success,
        title: "Turned off",
        message: getEntityName(entity),
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

      // Also refresh the entire list after a short delay
      setTimeout(async () => {
        clearStatesCache();
        await fetchEntities();
      }, 1000);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to turn off",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Group entities by domain
  const groupedEntities = entities.reduce((acc, entity) => {
    const domain = getDomain(entity.entity_id);
    if (!acc[domain]) {
      acc[domain] = [];
    }
    acc[domain].push(entity);
    return acc;
  }, {} as Record<string, HAEntity[]>);

  // Filter based on search
  const filteredGroups = Object.entries(groupedEntities).reduce((acc, [domain, entities]) => {
    const filtered = entities.filter((entity) =>
      getEntityName(entity).toLowerCase().includes(searchText.toLowerCase()) ||
      entity.entity_id.toLowerCase().includes(searchText.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[domain] = filtered;
    }
    return acc;
  }, {} as Record<string, HAEntity[]>);

  const getStateIcon = (entity: HAEntity) => {
    if (entity.state === "on") return { source: Icon.CheckCircle, tintColor: Color.Green };
    if (entity.state === "off") return { source: Icon.Circle, tintColor: Color.SecondaryText };
    return Icon.Circle;
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search entities..."
      navigationTitle="Home Assistant Entities"
    >
      {Object.entries(filteredGroups).map(([domain, entities]) => (
        <List.Section key={domain} title={domain.toUpperCase()}>
          {entities.map((entity) => (
            <List.Item
              key={entity.entity_id}
              title={getEntityName(entity)}
              subtitle={entity.entity_id}
              icon={getStateIcon(entity)}
              accessories={[{ text: entity.state }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Toggle"
                    icon={Icon.Switch}
                    onAction={() => toggleEntity(entity)}
                  />
                  <Action
                    title="Turn On"
                    icon={Icon.CheckCircle}
                    onAction={() => turnOn(entity)}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action
                    title="Turn Off"
                    icon={Icon.XmarkCircle}
                    onAction={() => turnOff(entity)}
                    shortcut={{ modifiers: ["cmd"], key: "x" }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={fetchEntities}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}