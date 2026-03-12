import { List, ActionPanel, Action, Icon, showToast, Toast } from "@vicinae/api";
import React, { useState, useEffect } from "react";
import { getStates, callService, getEntityName, HAEntity } from "./utils";

export default function Command() {
  const [scripts, setScripts] = useState<HAEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchScripts();
  }, []);

  const fetchScripts = async () => {
    try {
      setIsLoading(true);
      const states = await getStates();
      const scriptEntities = states.filter((e) => e.entity_id.startsWith("script."));
      setScripts(scriptEntities);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch scripts",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runScript = async (entityId: string, name: string) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Running script...",
      });

      await callService("script", "turn_on", entityId);

      await showToast({
        style: Toast.Style.Success,
        title: "Script executed",
        message: name,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to run script",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const stopScript = async (entityId: string, name: string) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Stopping script...",
      });

      await callService("script", "turn_off", entityId);

      await showToast({
        style: Toast.Style.Success,
        title: "Script stopped",
        message: name,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to stop script",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search scripts..."
      navigationTitle="Run Scripts"
    >
      {scripts.map((script) => (
        <List.Item
          key={script.entity_id}
          title={getEntityName(script)}
          subtitle={script.entity_id}
          icon={Icon.Code}
          accessories={[{ text: script.state }]}
          actions={
            <ActionPanel>
              <Action
                title="Run Script"
                icon={Icon.Play}
                onAction={() => runScript(script.entity_id, getEntityName(script))}
              />
              {script.state === "on" && (
                <Action
                  title="Stop Script"
                  icon={Icon.Stop}
                  onAction={() => stopScript(script.entity_id, getEntityName(script))}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                />
              )}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={fetchScripts}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}