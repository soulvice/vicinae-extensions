import React, { useState, useEffect, useCallback } from "react";
import { ActionPanel, Action, List, showToast, Toast, getPreferenceValues, Color, Icon } from "@vicinae/api";
import { execSync } from "child_process";

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
  MagicDNSSuffix: string;
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
  const [showingDetail, setShowingDetail] = useState(true);
  const preferences = getPreferenceValues<Preferences>();

  const toggleDetails = useCallback(() => {
    setShowingDetail(!showingDetail);
  }, [showingDetail]);

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

  const fetchDevices = async () => {
    try {
      setIsLoading(true);

      const tailscalePath = preferences.tailscalePath || "tailscale";
      // Execute tailscale status --json using nushell like other commands
      const stdout = await new Promise<string>((resolve, reject) => {
        try {
          const result = execSync(`nu -c '${tailscalePath} status --json'`, { encoding: "utf-8" });
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      const status: TailscaleStatus = JSON.parse(stdout);

      const deviceList: TailscaleDevice[] = [];
      const magicDnsSuffix = status.MagicDNSSuffix || "";

      // Add current device
      if (status.Self) {
        const displayHostname = getDisplayHostname(status.Self.HostName, status.Self.DNSName, magicDnsSuffix);
        deviceList.push({
          id: status.Self.ID,
          hostname: displayHostname,
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
          const displayHostname = getDisplayHostname(peer.HostName, peer.DNSName, magicDnsSuffix);
          deviceList.push({
            id: peer.ID,
            hostname: displayHostname,
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

  const formatMagicDNS = (magicDNS: string) => {
    const maxLength = 35;
    if (magicDNS.length <= maxLength) {
      return magicDNS;
    }

    // Try to break at a reasonable point (dot or dash)
    const breakPoints = ['.', '-'];
    for (const breakPoint of breakPoints) {
      const lastBreakIndex = magicDNS.lastIndexOf(breakPoint, maxLength - 3);
      if (lastBreakIndex > 15) { // Don't break too early
        return magicDNS.substring(0, lastBreakIndex + 1) + "...";
      }
    }

    // If no good break point, just truncate
    return magicDNS.substring(0, maxLength - 3) + "...";
  };

  // Device detail component
  const DeviceDetail = ({ device }: { device: TailscaleDevice }) => {
    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Hostname" text={device.hostname} />
            <List.Item.Detail.Metadata.Label title="Device ID" text={device.id} />
            <List.Item.Detail.Metadata.Separator />
            {device.ipv4 && (
              <List.Item.Detail.Metadata.Label title="IPv4 Address" text={device.ipv4} />
            )}
            {device.ipv6 && (
              <List.Item.Detail.Metadata.Label title="IPv6 Address" text={device.ipv6} />
            )}
            {device.magicDNS && (
              <List.Item.Detail.Metadata.Label title="Magic DNS" text={formatMagicDNS(device.magicDNS)} />
            )}
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label
              title="Status"
              text={device.isCurrentDevice ? "This Device" : (device.online ? "Online" : "Offline")}
              icon={{
                source: device.online ? Icon.CheckCircle : Icon.XMarkCircle,
                tintColor: device.online ? Color.Green : Color.Red,
              }}
            />
            {!device.isCurrentDevice && (
              <List.Item.Detail.Metadata.Label
                title="Last Seen"
                text={getLastSeenText(device)}
                icon={{
                  source: Icon.Clock,
                  tintColor: Color.Secondary,
                }}
              />
            )}
          </List.Item.Detail.Metadata>
        }
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search devices..."
      isShowingDetail={showingDetail}
      actions={
        <ActionPanel>
          <Action
            title="Refresh Devices"
            icon={Icon.ArrowClockwise}
            onAction={fetchDevices}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title={showingDetail ? "Hide Details" : "Show Details"}
            icon={showingDetail ? Icon.EyeDisabled : Icon.Eye}
            onAction={toggleDetails}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
        </ActionPanel>
      }
    >
      {devices.map((device) => (
        <List.Item
          key={device.id}
          icon={getStatusIcon(device)}
          title={device.hostname}
          //subtitle={device.ipv4}
          accessories={!showingDetail ? [
            {
              text: device.isCurrentDevice ?
                { value: "This Device", color: Color.Blue } :
                device.online ?
                  { value: "Online", color: Color.Green } :
                  { value: "Offline", color: Color.Red },
              icon: device.online ? Icon.CheckCircle : Icon.XMarkCircle,
            },
            !device.isCurrentDevice ? {
              text: getLastSeenText(device),
              icon: Icon.Clock,
            } : undefined,
          ].filter(Boolean) : undefined}
          detail={showingDetail ? <DeviceDetail device={device} /> : undefined}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Copy Address">
                {device.ipv4 && (
                  <Action.CopyToClipboard
                    title="Copy IPv4"
                    icon={Icon.Clipboard}
                    content={device.ipv4}
                    shortcut={{ modifiers: ["cmd"], key: "4" }}
                  />
                )}
                {device.ipv6 && (
                  <Action.CopyToClipboard
                    title="Copy IPv6"
                    icon={Icon.Clipboard}
                    content={device.ipv6}
                    shortcut={{ modifiers: ["cmd"], key: "6" }}
                  />
                )}
                {device.magicDNS && (
                  <Action.CopyToClipboard
                    title="Copy Magic DNS"
                    icon={Icon.Clipboard}
                    content={device.magicDNS}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                )}
              </ActionPanel.Section>
              <ActionPanel.Section title="View">
                <Action
                  title={showingDetail ? "Hide Details" : "Show Details"}
                  icon={showingDetail ? Icon.EyeDisabled : Icon.Eye}
                  onAction={toggleDetails}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                />
                <Action
                  title="Refresh Devices"
                  icon={Icon.ArrowClockwise}
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