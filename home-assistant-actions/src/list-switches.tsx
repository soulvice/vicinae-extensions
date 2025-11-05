import { List, ActionPanel, Action, Icon, showToast, Toast, Color } from "@vicinae/api";
import React, { useState, useEffect } from "react";
import {
  getStates,
  callService,
  getEntityName,
  HAEntity,
  clearStatesCache,
  getFreshEntityState,
  subscribeToAllEntityUpdates
} from "./utils";

export default function Command() {
  const [switches, setSwitches] = useState<HAEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSwitches();

    // Subscribe to real-time updates for switches
    const unsubscribe = subscribeToAllEntityUpdates((updatedEntity) => {
      if (updatedEntity.entity_id.startsWith("switch.") || updatedEntity.entity_id.startsWith("plug.")) {
        setSwitches(prev => prev.map(switchEntity =>
          switchEntity.entity_id === updatedEntity.entity_id ? updatedEntity : switchEntity
        ));
        console.log(`Updated switch ${updatedEntity.entity_id} to state: ${updatedEntity.state}`);
      }
    });

    return unsubscribe;
  }, []);

  const fetchSwitches = async () => {
    try {
      setIsLoading(true);
      const states = await getStates();
      const switchEntities = states.filter(
        (e) => e.entity_id.startsWith("switch.") || e.entity_id.startsWith("plug.")
      );
      setSwitches(switchEntities);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch switches",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSwitch = async (entity: HAEntity) => {
    try {
      const domain = entity.entity_id.split(".")[0];
      await callService(domain, "toggle", entity.entity_id);

      // Clear cache immediately to force fresh data
      clearStatesCache();

      await showToast({
        style: Toast.Style.Success,
        title: "Switch toggled",
        message: getEntityName(entity),
      });

      // Immediately get fresh state for this specific switch
      try {
        const freshEntity = await getFreshEntityState(entity.entity_id);
        setSwitches(prev => prev.map(switchEntity =>
          switchEntity.entity_id === entity.entity_id ? freshEntity : switchEntity
        ));
      } catch (error) {
        console.error(`Failed to get fresh state for ${entity.entity_id}:`, error);
      }

      // Also refresh the entire list after a short delay
      setTimeout(async () => {
        clearStatesCache();
        await fetchSwitches();
      }, 1000);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle switch",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const turnOn = async (entity: HAEntity) => {
    try {
      const domain = entity.entity_id.split(".")[0];
      await callService(domain, "turn_on", entity.entity_id);
      
      await showToast({
        style: Toast.Style.Success,
        title: "Turned on",
        message: getEntityName(entity),
      });

      fetchSwitches();
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
      const domain = entity.entity_id.split(".")[0];
      await callService(domain, "turn_off", entity.entity_id);
      
      await showToast({
        style: Toast.Style.Success,
        title: "Turned off",
        message: getEntityName(entity),
      });

      fetchSwitches();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to turn off",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const getStateIcon = (switchEntity: HAEntity) => {
    if (switchEntity.state === "on") return { source: Icon.Plug, tintColor: Color.Green };
    return { source: Icon.Plug, tintColor: Color.SecondaryText };
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search switches..."
      navigationTitle="Control Switches"
    >
      {switches.map((switchEntity) => (
        <List.Item
          key={switchEntity.entity_id}
          title={getEntityName(switchEntity)}
          subtitle={switchEntity.entity_id}
          icon={getStateIcon(switchEntity)}
          accessories={[{ text: switchEntity.state }]}
          actions={
            <ActionPanel>
              <Action
                title="Toggle"
                icon={Icon.Switch}
                onAction={() => toggleSwitch(switchEntity)}
              />
              <Action
                title="Turn On"
                icon={Icon.CheckCircle}
                onAction={() => turnOn(switchEntity)}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action
                title="Turn Off"
                icon={Icon.XmarkCircle}
                onAction={() => turnOff(switchEntity)}
                shortcut={{ modifiers: ["cmd"], key: "x" }}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={fetchSwitches}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}