import { List, ActionPanel, Action, Icon, showToast, Toast, getPreferenceValues } from "@vicinae/api";
import { callService } from "./utils";
import React from "react";

interface Preferences {
  haUrl: string;
  haToken: string;
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();

  const executeAction = async (
    domain: string,
    service: string,
    entityId: string | undefined,
    successMsg: string,
    data?: Record<string, any>
  ) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Executing...",
      });

      await callService(domain, service, entityId, data);

      await showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: successMsg,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <List searchBarPlaceholder="Search actions...">
      <List.Section title="All Controls">
        <List.Item
          title="Turn All Lights On"
          subtitle="Turn on all lights in the house"
          icon={Icon.LightBulb}
          actions={
            <ActionPanel>
              <Action
                title="Execute"
                icon={Icon.LightBulb}
                onAction={() =>
                  executeAction("light", "turn_on", "all", "All lights turned on")
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Turn All Lights Off"
          subtitle="Turn off all lights in the house"
          icon={Icon.LightBulbOff}
          actions={
            <ActionPanel>
              <Action
                title="Execute"
                icon={Icon.LightBulbOff}
                onAction={() =>
                  executeAction("light", "turn_off", "all", "All lights turned off")
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Turn All Switches Off"
          subtitle="Turn off all switches"
          icon={Icon.Plug}
          actions={
            <ActionPanel>
              <Action
                title="Execute"
                icon={Icon.Plug}
                onAction={() =>
                  executeAction("switch", "turn_off", "all", "All switches turned off")
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="System">
        <List.Item
          title="Reload Automations"
          subtitle="Reload all automation configurations"
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                onAction={() =>
                  executeAction("automation", "reload", undefined, "Automations reloaded")
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Reload Scripts"
          subtitle="Reload all script configurations"
          icon={Icon.Code}
          actions={
            <ActionPanel>
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                onAction={() =>
                  executeAction("script", "reload", undefined, "Scripts reloaded")
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Reload Scenes"
          subtitle="Reload all scene configurations"
          icon={Icon.Stars}
          actions={
            <ActionPanel>
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                onAction={() =>
                  executeAction("scene", "reload", undefined, "Scenes reloaded")
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Check Configuration"
          subtitle="Validate Home Assistant configuration"
          icon={Icon.CheckCircle}
          actions={
            <ActionPanel>
              <Action
                title="Check"
                icon={Icon.CheckCircle}
                onAction={() =>
                  executeAction(
                    "homeassistant",
                    "check_config",
                    undefined,
                    "Configuration checked"
                  )
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Notifications">
        <List.Item
          title="Send Persistent Notification"
          subtitle="Create a persistent notification in Home Assistant"
          icon={Icon.Bell}
          actions={
            <ActionPanel>
              <Action
                title="Send"
                icon={Icon.Bell}
                onAction={() =>
                  executeAction(
                    "persistent_notification",
                    "create",
                    undefined,
                    "Notification sent",
                    {
                      message: "Test notification from Vicinae",
                      title: "Vicinae",
                    }
                  )
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Dismiss All Notifications"
          subtitle="Clear all persistent notifications"
          icon={Icon.BellDisabled}
          actions={
            <ActionPanel>
              <Action
                title="Dismiss"
                icon={Icon.BellDisabled}
                onAction={() =>
                  executeAction(
                    "persistent_notification",
                    "dismiss",
                    "all",
                    "Notifications dismissed"
                  )
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Links">
        <List.Item
          title="Open Home Assistant"
          subtitle="Open Home Assistant web interface"
          icon={Icon.AppWindow}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open" url={prefs.haUrl} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}