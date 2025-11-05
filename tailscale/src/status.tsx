import { Detail, ActionPanel, Action, Icon } from "@vicinae/api";
import { execSync } from "child_process";
import React, { useState, useEffect } from "react";

interface TailscaleStatus {
  connected: boolean;
  hostname: string;
  tailscaleIP: string;
  exitNode: string;
  peers: number;
  version: string;
}

export default function Command() {
  const [status, setStatus] = useState<TailscaleStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if tailscale is running using nushell
      const statusOutput = execSync("nu -c 'tailscale status --json'", {
        encoding: "utf-8",
      });

      const statusData = JSON.parse(statusOutput);

      // Parse the status
      const connected = statusData.BackendState === "Running";
      const hostname = statusData.Self?.HostName || "Unknown";
      const tailscaleIP = statusData.Self?.TailscaleIPs?.[0] || "N/A";
      const exitNode = statusData.ExitNodeStatus?.TailscaleIPs?.[0] || "None";
      const peers = Object.keys(statusData.Peer || {}).length;

      // Get version
      const versionOutput = execSync("nu -c 'tailscale version'", {
        encoding: "utf-8",
      }).trim();

      setStatus({
        connected,
        hostname,
        tailscaleIP,
        exitNode,
        peers,
        version: versionOutput,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch Tailscale status");
    } finally {
      setIsLoading(false);
    }
  };

  const markdown = status
    ? `
# Tailscale Status

## Connection
- **Status**: ${status.connected ? "🟢 Connected" : "🔴 Disconnected"}
- **Hostname**: ${status.hostname}
- **IP Address**: ${status.tailscaleIP}

## Network
- **Exit Node**: ${status.exitNode}
- **Connected Peers**: ${status.peers}

## System
- **Version**: ${status.version}
`
    : error
    ? `# Error\n\n${error}`
    : "# Loading...";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchStatus} />
          {status?.connected ? (
            <Action
              title="Disconnect"
              icon={Icon.XmarkCircle}
              onAction={() => {
                execSync("nu -c 'tailscale down'");
                fetchStatus();
              }}
            />
          ) : (
            <Action
              title="Connect"
              icon={Icon.CheckCircle}
              onAction={() => {
                execSync("nu -c 'tailscale up'");
                fetchStatus();
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
