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

      // Helper function to get display hostname
      const getDisplayHostname = (hostname: string, dnsName: string, magicDnsSuffix: string): string => {
        if (hostname === "localhost" && dnsName && magicDnsSuffix) {
          // Remove the trailing dot from DNSName if present
          const cleanDnsName = dnsName.endsWith('.') ? dnsName.slice(0, -1) : dnsName;
          // Remove the MagicDNS suffix to get just the hostname part
          if (cleanDnsName.endsWith(magicDnsSuffix)) {
            return cleanDnsName.substring(0, cleanDnsName.length - magicDnsSuffix.length - 1); // -1 for the dot
          }
        }
        return hostname;
      };

      // Parse the status
      const connected = statusData.BackendState === "Running";
      const rawHostname = statusData.Self?.HostName || "Unknown";
      const dnsName = statusData.Self?.DNSName || "";
      const magicDnsSuffix = statusData.MagicDNSSuffix || "";
      const hostname = getDisplayHostname(rawHostname, dnsName, magicDnsSuffix);
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
