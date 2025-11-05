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
  const [lights, setLights] = useState<HAEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLights();

    // Subscribe to real-time updates for lights
    const unsubscribe = subscribeToAllEntityUpdates((updatedEntity) => {
      if (updatedEntity.entity_id.startsWith("light.")) {
        setLights(prev => prev.map(light =>
          light.entity_id === updatedEntity.entity_id ? updatedEntity : light
        ));
        console.log(`Updated light ${updatedEntity.entity_id} to state: ${updatedEntity.state}`);
      }
    });

    return unsubscribe;
  }, []);

  const fetchLights = async () => {
    try {
      setIsLoading(true);
      const states = await getStates();
      const lightEntities = states.filter((e) => e.entity_id.startsWith("light."));
      setLights(lightEntities);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch lights",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLight = async (entityId: string) => {
    try {
      await callService("light", "toggle", entityId);

      // Clear cache immediately to force fresh data
      clearStatesCache();

      await showToast({
        style: Toast.Style.Success,
        title: "Light toggled",
      });

      // Immediately get fresh state for this specific light
      try {
        const freshEntity = await getFreshEntityState(entityId);
        setLights(prev => prev.map(light =>
          light.entity_id === entityId ? freshEntity : light
        ));
      } catch (error) {
        console.error(`Failed to get fresh state for ${entityId}:`, error);
      }

      // Also refresh the entire list after a short delay
      setTimeout(async () => {
        clearStatesCache();
        await fetchLights();
      }, 1000);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle light",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const setBrightness = async (entityId: string, brightness: number) => {
    try {
      await callService("light", "turn_on", entityId, { brightness });

      // Clear cache immediately to force fresh data
      clearStatesCache();

      await showToast({
        style: Toast.Style.Success,
        title: "Brightness set",
        message: `${Math.round((brightness / 255) * 100)}%`,
      });

      // Immediately get fresh state for this specific light
      try {
        const freshEntity = await getFreshEntityState(entityId);
        setLights(prev => prev.map(light =>
          light.entity_id === entityId ? freshEntity : light
        ));
      } catch (error) {
        console.error(`Failed to get fresh state for ${entityId}:`, error);
      }

      // Also refresh the entire list after a short delay
      setTimeout(async () => {
        clearStatesCache();
        await fetchLights();
      }, 1000);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to set brightness",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const getStateIcon = (light: HAEntity) => {
    if (light.state === "on") return { source: Icon.LightBulb, tintColor: Color.Yellow };
    return { source: Icon.LightBulb, tintColor: Color.SecondaryText };
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search lights..."
      navigationTitle="Control Lights"
    >
      {lights.map((light) => {
        const brightness = light.attributes.brightness;
        const brightnessPercent = brightness ? Math.round((brightness / 255) * 100) : 0;

        return (
          <List.Item
            key={light.entity_id}
            title={getEntityName(light)}
            subtitle={light.entity_id}
            icon={getStateIcon(light)}
            accessories={[
              ...(light.state === "on" && brightness
                ? [{ text: `${brightnessPercent}%` }]
                : []),
              { text: light.state },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Toggle"
                  icon={Icon.Switch}
                  onAction={() => toggleLight(light.entity_id)}
                />
                {light.state === "on" && (
                  <>
                    <Action
                      title="25% Brightness"
                      icon={Icon.LightBulb}
                      onAction={() => setBrightness(light.entity_id, 64)}
                      shortcut={{ modifiers: ["cmd"], key: "1" }}
                    />
                    <Action
                      title="50% Brightness"
                      icon={Icon.LightBulb}
                      onAction={() => setBrightness(light.entity_id, 128)}
                      shortcut={{ modifiers: ["cmd"], key: "2" }}
                    />
                    <Action
                      title="75% Brightness"
                      icon={Icon.LightBulb}
                      onAction={() => setBrightness(light.entity_id, 192)}
                      shortcut={{ modifiers: ["cmd"], key: "3" }}
                    />
                    <Action
                      title="100% Brightness"
                      icon={Icon.LightBulb}
                      onAction={() => setBrightness(light.entity_id, 255)}
                      shortcut={{ modifiers: ["cmd"], key: "4" }}
                    />
                  </>
                )}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={fetchLights}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}