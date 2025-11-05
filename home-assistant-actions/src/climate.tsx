import React, { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast, Color } from "@vicinae/api";
import {
  getStates,
  callService,
  getEntityName,
  HAEntity,
  clearStatesCache,
  getFreshEntityState,
  subscribeToAllEntityUpdates
} from "./utils";

interface ClimateEntity extends HAEntity {
  attributes: {
    friendly_name?: string;
    temperature?: number;
    target_temp_high?: number;
    target_temp_low?: number;
    current_temperature?: number;
    hvac_modes?: string[];
    preset_modes?: string[];
    hvac_mode?: string;
    preset_mode?: string;
    fan_modes?: string[];
    fan_mode?: string;
    humidity?: number;
    target_humidity?: number;
    min_temp?: number;
    max_temp?: number;
    [key: string]: any;
  };
}

export default function Command() {
  const [climates, setClimates] = useState<ClimateEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchClimates();

    // Subscribe to real-time updates for climate entities
    const unsubscribe = subscribeToAllEntityUpdates((updatedEntity) => {
      if (updatedEntity.entity_id.startsWith("climate.")) {
        setClimates(prev => prev.map(climate =>
          climate.entity_id === updatedEntity.entity_id ? updatedEntity as ClimateEntity : climate
        ));
        console.log(`Updated climate ${updatedEntity.entity_id} to state: ${updatedEntity.state}`);
      }
    });

    return unsubscribe;
  }, []);

  const fetchClimates = async () => {
    try {
      setIsLoading(true);
      const states = await getStates();
      const climateEntities = states.filter((e) => e.entity_id.startsWith("climate.")) as ClimateEntity[];
      setClimates(climateEntities);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch climate entities",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setTemperature = async (entity: ClimateEntity, temperature: number) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Setting temperature...",
      });

      await callService("climate", "set_temperature", entity.entity_id, {
        temperature: temperature
      });

      // Clear cache immediately to force fresh data
      clearStatesCache();

      await showToast({
        style: Toast.Style.Success,
        title: "Temperature set",
        message: `${getEntityName(entity)}: ${temperature}°`,
      });

      // Immediately get fresh state for this specific climate entity
      try {
        const freshEntity = await getFreshEntityState(entity.entity_id);
        setClimates(prev => prev.map(climate =>
          climate.entity_id === entity.entity_id ? freshEntity as ClimateEntity : climate
        ));
      } catch (error) {
        console.error(`Failed to get fresh state for ${entity.entity_id}:`, error);
      }

      // Also refresh the entire list after a short delay
      setTimeout(async () => {
        clearStatesCache();
        await fetchClimates();
      }, 1000);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to set temperature",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const setHvacMode = async (entity: ClimateEntity, mode: string) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Setting HVAC mode...",
      });

      await callService("climate", "set_hvac_mode", entity.entity_id, {
        hvac_mode: mode
      });

      // Clear cache immediately to force fresh data
      clearStatesCache();

      await showToast({
        style: Toast.Style.Success,
        title: "HVAC mode set",
        message: `${getEntityName(entity)}: ${mode}`,
      });

      // Immediately get fresh state for this specific climate entity
      try {
        const freshEntity = await getFreshEntityState(entity.entity_id);
        setClimates(prev => prev.map(climate =>
          climate.entity_id === entity.entity_id ? freshEntity as ClimateEntity : climate
        ));
      } catch (error) {
        console.error(`Failed to get fresh state for ${entity.entity_id}:`, error);
      }

      // Also refresh the entire list after a short delay
      setTimeout(async () => {
        clearStatesCache();
        await fetchClimates();
      }, 1000);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to set HVAC mode",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const setPresetMode = async (entity: ClimateEntity, preset: string) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Setting preset mode...",
      });

      await callService("climate", "set_preset_mode", entity.entity_id, {
        preset_mode: preset
      });

      // Clear cache immediately to force fresh data
      clearStatesCache();

      await showToast({
        style: Toast.Style.Success,
        title: "Preset mode set",
        message: `${getEntityName(entity)}: ${preset}`,
      });

      // Immediately get fresh state for this specific climate entity
      try {
        const freshEntity = await getFreshEntityState(entity.entity_id);
        setClimates(prev => prev.map(climate =>
          climate.entity_id === entity.entity_id ? freshEntity as ClimateEntity : climate
        ));
      } catch (error) {
        console.error(`Failed to get fresh state for ${entity.entity_id}:`, error);
      }

      // Also refresh the entire list after a short delay
      setTimeout(async () => {
        clearStatesCache();
        await fetchClimates();
      }, 1000);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to set preset mode",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const getClimateIcon = (entity: ClimateEntity) => {
    const hvacMode = entity.attributes.hvac_mode || entity.state;
    switch (hvacMode) {
      case "heat":
        return { source: Icon.Flame, tintColor: Color.Red };
      case "cool":
        return { source: Icon.Snowflake, tintColor: Color.Blue };
      case "heat_cool":
      case "auto":
        return { source: Icon.TwoArrowsClockwise, tintColor: Color.Green };
      case "fan_only":
        return { source: Icon.Wind, tintColor: Color.Secondary };
      case "dry":
        return { source: Icon.Drop, tintColor: Color.Orange };
      case "off":
        return { source: Icon.Power, tintColor: Color.SecondaryText };
      default:
        return { source: Icon.Temperature, tintColor: Color.Primary };
    }
  };

  const getTemperatureDisplay = (entity: ClimateEntity): string => {
    const currentTemp = entity.attributes.current_temperature;
    const targetTemp = entity.attributes.temperature;
    const targetHigh = entity.attributes.target_temp_high;
    const targetLow = entity.attributes.target_temp_low;

    let display = "";

    if (currentTemp !== undefined) {
      display += `${currentTemp}°`;
    }

    if (targetTemp !== undefined) {
      display += ` → ${targetTemp}°`;
    } else if (targetHigh !== undefined && targetLow !== undefined) {
      display += ` → ${targetLow}°-${targetHigh}°`;
    }

    return display || entity.state;
  };

  const getTemperatureActions = (entity: ClimateEntity): React.ReactElement[] => {
    const actions: React.ReactElement[] = [];
    const currentTemp = entity.attributes.temperature || entity.attributes.current_temperature || 20;
    const minTemp = entity.attributes.min_temp || 7;
    const maxTemp = entity.attributes.max_temp || 35;

    // Temperature adjustment actions
    actions.push(
      <Action
        key="temp-down"
        title="Temperature -1°"
        icon={Icon.Minus}
        onAction={() => setTemperature(entity, Math.max(minTemp, currentTemp - 1))}
        shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
      />,
      <Action
        key="temp-up"
        title="Temperature +1°"
        icon={Icon.Plus}
        onAction={() => setTemperature(entity, Math.min(maxTemp, currentTemp + 1))}
        shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
      />
    );

    return actions;
  };

  const getHvacModeActions = (entity: ClimateEntity): React.ReactElement[] => {
    const actions: React.ReactElement[] = [];
    const hvacModes = entity.attributes.hvac_modes || [];

    hvacModes.forEach((mode, index) => {
      let icon = Icon.Circle;
      switch (mode) {
        case "heat":
          icon = Icon.Flame;
          break;
        case "cool":
          icon = Icon.Snowflake;
          break;
        case "heat_cool":
        case "auto":
          icon = Icon.TwoArrowsClockwise;
          break;
        case "fan_only":
          icon = Icon.Wind;
          break;
        case "dry":
          icon = Icon.Drop;
          break;
        case "off":
          icon = Icon.Power;
          break;
      }

      actions.push(
        <Action
          key={`hvac-${mode}`}
          title={`Set Mode: ${mode.replace(/_/g, ' ').toUpperCase()}`}
          icon={icon}
          onAction={() => setHvacMode(entity, mode)}
        />
      );
    });

    return actions;
  };

  const getPresetModeActions = (entity: ClimateEntity): React.ReactElement[] => {
    const actions: React.ReactElement[] = [];
    const presetModes = entity.attributes.preset_modes || [];

    presetModes.forEach((preset) => {
      actions.push(
        <Action
          key={`preset-${preset}`}
          title={`Preset: ${preset.replace(/_/g, ' ').toUpperCase()}`}
          icon={Icon.Gear}
          onAction={() => setPresetMode(entity, preset)}
        />
      );
    });

    return actions;
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Climate Control"
      searchBarPlaceholder="Search climate entities..."
    >
      {climates.map((entity) => (
        <List.Item
          key={entity.entity_id}
          title={getEntityName(entity)}
          subtitle={`${entity.attributes.hvac_mode || entity.state} • ${getTemperatureDisplay(entity)}`}
          icon={getClimateIcon(entity)}
          accessories={[
            entity.attributes.humidity ? { text: `💧 ${entity.attributes.humidity}%` } : {},
          ].filter(acc => Object.keys(acc).length > 0)}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Temperature">
                {getTemperatureActions(entity)}
              </ActionPanel.Section>

              <ActionPanel.Section title="HVAC Mode">
                {getHvacModeActions(entity)}
              </ActionPanel.Section>

              {entity.attributes.preset_modes && entity.attributes.preset_modes.length > 0 && (
                <ActionPanel.Section title="Preset Mode">
                  {getPresetModeActions(entity)}
                </ActionPanel.Section>
              )}

              <ActionPanel.Section title="General">
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={fetchClimates}
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
                      message: "Refreshing climate entities..."
                    });
                    fetchClimates();
                  }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}

      {climates.length === 0 && !isLoading && (
        <List.Item
          title="No Climate Entities Found"
          subtitle="No thermostats or HVAC systems found in Home Assistant"
          icon={Icon.Temperature}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={fetchClimates}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}