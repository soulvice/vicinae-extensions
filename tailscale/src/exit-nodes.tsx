import { List, ActionPanel, Action, Icon, showToast, Toast } from "@vicinae/api";
import { execSync } from "child_process";
import React, { useState, useEffect } from "react";

interface ExitNode {
  id: string;
  hostname: string;
  ip: string;
  location: string;
  active: boolean;
}

export default function Command() {
  const [exitNodes, setExitNodes] = useState<ExitNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentNode, setCurrentNode] = useState<string>("None");

  useEffect(() => {
    fetchExitNodes();
  }, []);

  const fetchExitNodes = () => {
    try {
      setIsLoading(true);

      // Get status to find current exit node
      const statusOutput = execSync("nu -c 'tailscale status --json'", {
        encoding: "utf-8",
      });
      const statusData = JSON.parse(statusOutput);
      const activeExitNode = statusData.ExitNodeStatus?.TailscaleIPs?.[0] || null;

      // Parse peers for exit nodes
      const peers = statusData.Peer || {};
      const nodes: ExitNode[] = [];

      Object.entries(peers).forEach(([id, peer]: [string, any]) => {
        // Check if peer can be used as exit node
        if (peer.ExitNodeOption) {
          nodes.push({
            id,
            hostname: peer.HostName || "Unknown",
            ip: peer.TailscaleIPs?.[0] || "N/A",
            location: peer.Location?.Country || "Unknown",
            active: peer.TailscaleIPs?.[0] === activeExitNode,
          });
        }
      });

      setExitNodes(nodes);
      setCurrentNode(activeExitNode || "None");
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch exit nodes",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setExitNode = async (ip: string) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Setting exit node...",
      });

      execSync(`nu -c 'tailscale set --exit-node=${ip}'`, {
        encoding: "utf-8",
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Exit node set",
        message: `Now routing through ${ip}`,
      });

      fetchExitNodes();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to set exit node",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const clearExitNode = async () => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Clearing exit node...",
      });

      execSync("nu -c 'tailscale set --exit-node='", {
        encoding: "utf-8",
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Exit node cleared",
        message: "Using direct connection",
      });

      fetchExitNodes();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to clear exit node",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search exit nodes..."
      navigationTitle="Tailscale Exit Nodes"
    >
      <List.Section title={`Current: ${currentNode}`}>
        <List.Item
          title="Clear Exit Node"
          subtitle="Use direct connection"
          icon={Icon.XmarkCircle}
          accessories={[{ text: currentNode === "None" ? "Active" : "" }]}
          actions={
            <ActionPanel>
              <Action
                title="Clear Exit Node"
                icon={Icon.XmarkCircle}
                onAction={clearExitNode}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Available Exit Nodes">
        {exitNodes.map((node) => (
          <List.Item
            key={node.id}
            title={node.hostname}
            subtitle={node.location}
            accessories={[
              { text: node.ip },
              ...(node.active ? [{ text: "Active", icon: Icon.CheckCircle }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Set as Exit Node"
                  icon={Icon.Globe}
                  onAction={() => setExitNode(node.ip)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={fetchExitNodes}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
