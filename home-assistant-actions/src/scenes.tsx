import { List, ActionPanel, Action, Icon, showToast, Toast } from "@vicinae/api";
import React, { useState, useEffect } from "react";
import { getStates, callService, getEntityName, HAEntity } from "./utils";

export default function Command() {
  const [scenes, setScenes] = useState<HAEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchScenes();
  }, []);

  const fetchScenes = async () => {
    try {
      setIsLoading(true);
      const states = await getStates();
      const sceneEntities = states.filter((e) => e.entity_id.startsWith("scene."));
      setScenes(sceneEntities);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch scenes",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const activateScene = async (entityId: string, name: string) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Activating scene...",
      });

      await callService("scene", "turn_on", entityId);

      await showToast({
        style: Toast.Style.Success,
        title: "Scene activated",
        message: name,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to activate scene",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search scenes..."
      navigationTitle="Activate Scenes"
    >
      {scenes.map((scene) => (
        <List.Item
          key={scene.entity_id}
          title={getEntityName(scene)}
          subtitle={scene.entity_id}
          icon={Icon.Stars}
          actions={
            <ActionPanel>
              <Action
                title="Activate Scene"
                icon={Icon.Play}
                onAction={() => activateScene(scene.entity_id, getEntityName(scene))}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={fetchScenes}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}