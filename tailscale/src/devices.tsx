import { useState, useEffect } from "react";
import { ActionPanel, Action, List, showToast, Toast, getPreferenceValues } from "@vicinae/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface TailscaleDevice {
  id: string;
  hostname: string;
  ipv4: string;
  ipv6: string;
  magicDNS: string;
  online: boolean;
  lastSeen: string;
  isCurrentDevice: boolean;
}

interface TailscaleStatus {
  Self: {
    ID: string;
    HostName: string;
    DNSName: string;
    TailscaleIPs: string[];
  };
  Peer: Record<string, {
    ID: string;
    HostName: string;
    DNSName: string;
    TailscaleIPs: string[];
    Online: boolean;
    LastSeen: string;
  }>;
}

interface Preferences {
  tailscalePath?: string;
}

export default function Command() {
  const [devices, setDevices] = useState<TailscaleDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const preferences = getPreferenceValues<Preferences>();

  const getTailscalePath = () => {
    return preferences.tailscalePath || "/Applications/Tailscale.app/Contents/MacOS/Tailscale";
  };

  const formatLastSeen = (lastSeenStr: string): string => {
    if (!lastSeenStr) return "Never";

    try {
      const lastSeen = new Date(lastSeenStr);
      const now = new Date();
      const diffMs = now.getTime() - lastSeen.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMinutes < 1) return "Just now";
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return lastSeen.toLocaleDateString();
    } catch {
      return "Unknown";
    }
  };

  const fetchDevices = async () => {
    try {
      setIsLoading(true);
      const tailscalePath = getTailscalePath();

      // Execute tailscale status --json
      const { stdout } = await execAsync(`"${tailscalePath}" status --json`);
      const status: TailscaleStatus = JSON.parse(stdout);

      const deviceList: TailscaleDevice[] = [];

      // Add current device
      if (status.Self) {
        deviceList.push({
          id: status.Self.ID,
          hostname: status.Self.HostName,
          ipv4: status.Self.TailscaleIPs?.find(ip => ip.includes(".")) || "",
          ipv6: status.Self.TailscaleIPs?.find(ip => ip.includes(":")) || "",
          magicDNS: status.Self.DNSName,
          online: true,
          lastSeen: "",
          isCurrentDevice: true,
        });
      }

      // Add peer devices
      if (status.Peer) {
        Object.values(status.Peer).forEach((peer) => {
          deviceList.push({
            id: peer.ID,
            hostname: peer.HostName,
            ipv4: peer.TailscaleIPs?.find(ip => ip.includes(".")) || "",
            ipv6: peer.TailscaleIPs?.find(ip => ip.includes(":")) || "",
            magicDNS: peer.DNSName,
            online: peer.Online,
            lastSeen: peer.LastSeen,
            isCurrentDevice: false,
          });
        });
      }

      setDevices(deviceList);
    } catch (error) {
      console.error("Failed to fetch devices:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch devices",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      await showToast({
        style: Toast.Style.Success,
        title: `${type} copied to clipboard`,
        message: text,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to copy to clipboard",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const getStatusIcon = (device: TailscaleDevice) => {
    if (device.isCurrentDevice) {
      return "🟢"; // Green circle for current device (always online)
    }
    return device.online ? "🟢" : "🔴"; // Green for online, red for offline
  };

  const getLastSeenText = (device: TailscaleDevice) => {
    if (device.isCurrentDevice) {
      return "This Device";
    }
    return formatLastSeen(device.lastSeen);
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search devices...">
      {devices.map((device) => (
        <List.Item
          key={device.id}
          icon={getStatusIcon(device)}
          title={device.hostname}
          subtitle={device.ipv4}
          accessoryTitle={getLastSeenText(device)}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Copy Address">
                {device.ipv4 && (
                  <Action
                    title="Copy IPv4"
                    onAction={() => copyToClipboard(device.ipv4, "IPv4")}
                    shortcut={{ modifiers: ["cmd"], key: "4" }}
                  />
                )}
                {device.ipv6 && (
                  <Action
                    title="Copy IPv6"
                    onAction={() => copyToClipboard(device.ipv6, "IPv6")}
                    shortcut={{ modifiers: ["cmd"], key: "6" }}
                  />
                )}
                {device.magicDNS && (
                  <Action
                    title="Copy Magic DNS"
                    onAction={() => copyToClipboard(device.magicDNS, "Magic DNS")}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                )}
              </ActionPanel.Section>
              <ActionPanel.Section title="Refresh">
                <Action
                  title="Refresh Devices"
                  onAction={fetchDevices}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}