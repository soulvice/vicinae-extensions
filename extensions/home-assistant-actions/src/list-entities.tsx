import { List, ActionPanel, Action, Icon, showToast, Toast, Color } from "@vicinae/api";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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

  // Debounce WebSocket updates to prevent input interruption
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Map<string, HAEntity>>(new Map());

  const debouncedUpdateEntities = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      const updates = Array.from(pendingUpdatesRef.current.entries());
      if (updates.length > 0) {
        setEntities(prev => {
          const newEntities = [...prev];
          updates.forEach(([entityId, updatedEntity]) => {
            const index = newEntities.findIndex(e => e.entity_id === entityId);
            if (index !== -1) {
              newEntities[index] = updatedEntity;
            }
          });
          return newEntities;
        });
        pendingUpdatesRef.current.clear();
      }
    }, 200); // 200ms debounce to prevent input interruption
  }, []);

  useEffect(() => {
    fetchEntities();

    // Subscribe to real-time updates with debouncing
    const unsubscribe = subscribeToAllEntityUpdates((updatedEntity) => {
      // Queue the update instead of applying immediately
      pendingUpdatesRef.current.set(updatedEntity.entity_id, updatedEntity);
      debouncedUpdateEntities();
      console.log(`Queued update for entity ${updatedEntity.entity_id} to state: ${updatedEntity.state}`);
    });

    return () => {
      unsubscribe();
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [debouncedUpdateEntities]);

  // Memoized fetch function to prevent unnecessary re-creation
  const fetchEntities = useCallback(async () => {
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
  }, []);

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

      // Update entity state using debounced method to prevent input interruption
      try {
        const freshEntity = await getFreshEntityState(entity.entity_id);
        // Add to pending updates instead of immediate state update
        pendingUpdatesRef.current.set(entity.entity_id, freshEntity);
        debouncedUpdateEntities();
      } catch (error) {
        console.error(`Failed to get fresh state for ${entity.entity_id}:`, error);
        // Only refresh all on error as fallback
        setTimeout(async () => {
          clearStatesCache();
          await fetchEntities();
        }, 500);
      }
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

      // Update entity state using debounced method to prevent input interruption
      try {
        const freshEntity = await getFreshEntityState(entity.entity_id);
        // Add to pending updates instead of immediate state update
        pendingUpdatesRef.current.set(entity.entity_id, freshEntity);
        debouncedUpdateEntities();
      } catch (error) {
        console.error(`Failed to get fresh state for ${entity.entity_id}:`, error);
        // Only refresh all on error as fallback
        setTimeout(async () => {
          clearStatesCache();
          await fetchEntities();
        }, 500);
      }
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

      // Update entity state using debounced method to prevent input interruption
      try {
        const freshEntity = await getFreshEntityState(entity.entity_id);
        // Add to pending updates instead of immediate state update
        pendingUpdatesRef.current.set(entity.entity_id, freshEntity);
        debouncedUpdateEntities();
      } catch (error) {
        console.error(`Failed to get fresh state for ${entity.entity_id}:`, error);
        // Only refresh all on error as fallback
        setTimeout(async () => {
          clearStatesCache();
          await fetchEntities();
        }, 500);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to turn off",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Memoized grouping and filtering to prevent unnecessary re-computations
  const filteredGroups = useMemo(() => {
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
    const filtered = Object.entries(groupedEntities).reduce((acc, [domain, domainEntities]) => {
      const filteredEntities = domainEntities.filter((entity) => {
        const entityName = getEntityName(entity).toLowerCase();
        const entityId = entity.entity_id.toLowerCase();
        const search = searchText.toLowerCase();
        return entityName.includes(search) || entityId.includes(search);
      });
      if (filteredEntities.length > 0) {
        acc[domain] = filteredEntities;
      }
      return acc;
    }, {} as Record<string, HAEntity[]>);

    return filtered;
  }, [entities, searchText]);

  const getStateIcon = (entity: HAEntity) => {
    if (entity.state === "on") return { source: Icon.CheckCircle, tintColor: Color.Green };
    if (entity.state === "off") return { source: Icon.Circle, tintColor: Color.SecondaryText };
    return Icon.Circle;
  };

  // Memoized search handler to prevent unnecessary re-renders
  const handleSearchTextChange = useCallback((newSearchText: string) => {
    setSearchText(newSearchText);
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
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