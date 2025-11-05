import { List, ActionPanel, Action, Icon, showToast, Toast } from "@vicinae/api";
import { execSync } from "child_process";
import React from "react";

export default function Command() {
  const executeCommand = async (command: string, successMsg: string) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Executing...",
      });

      execSync(`nu -c '${command}'`, { encoding: "utf-8" });

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
      <List.Section title="Connection">
        <List.Item
          title="Connect to Tailscale"
          subtitle="Start VPN connection"
          icon={Icon.Plug}
          actions={
            <ActionPanel>
              <Action
                title="Connect"
                icon={Icon.CheckCircle}
                onAction={() => executeCommand("tailscale up", "Connected to Tailscale")}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Disconnect from Tailscale"
          subtitle="Stop VPN connection"
          icon={Icon.Eject}
          actions={
            <ActionPanel>
              <Action
                title="Disconnect"
                icon={Icon.XmarkCircle}
                onAction={() => executeCommand("tailscale down", "Disconnected from Tailscale")}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Exit Nodes">
        <List.Item
          title="Clear Exit Node"
          subtitle="Use direct connection"
          icon={Icon.Globe}
          actions={
            <ActionPanel>
              <Action
                title="Clear"
                icon={Icon.Trash}
                onAction={() =>
                  executeCommand("tailscale set --exit-node=", "Exit node cleared")
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Use Suggested Exit Node"
          subtitle="Automatically select best exit node"
          icon={Icon.TwoPersons}
          actions={
            <ActionPanel>
              <Action
                title="Use Suggested"
                icon={Icon.Stars}
                onAction={() =>
                  executeCommand(
                    "tailscale set --exit-node-allow-lan-access",
                    "Using suggested exit node"
                  )
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Advanced">
        <List.Item
          title="Force Reauthentication"
          subtitle="Login again to Tailscale"
          icon={Icon.Key}
          actions={
            <ActionPanel>
              <Action
                title="Reauthenticate"
                icon={Icon.LockUnlocked}
                onAction={() =>
                  executeCommand(
                    "tailscale up --force-reauth",
                    "Reauthentication initiated"
                  )
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Accept Routes"
          subtitle="Accept subnet routes from other nodes"
          icon={Icon.Network}
          actions={
            <ActionPanel>
              <Action
                title="Accept Routes"
                icon={Icon.CheckCircle}
                onAction={() =>
                  executeCommand(
                    "tailscale up --accept-routes",
                    "Now accepting routes"
                  )
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Open Admin Console"
          subtitle="Open Tailscale web admin"
          icon={Icon.AppWindow}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Console"
                url="https://login.tailscale.com/admin"
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
