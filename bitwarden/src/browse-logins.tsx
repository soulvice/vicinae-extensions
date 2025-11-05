import React, { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  getPreferenceValues
} from "@vicinae/api";
import {
  getBitwardenAPI,
  VaultItem,
  ItemType,
  Folder,
  getDisplayUri,
  generateTOTP,
  getTOTPTimeRemaining,
  copyToClipboard,
  truncateText,
  Preferences
} from "./utils";

export default function BrowseLogins() {
  const [logins, setLogins] = useState<VaultItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filteredLogins, setFilteredLogins] = useState<VaultItem[]>([]);
  const [totpCodes, setTotpCodes] = useState<{ [key: string]: string }>({});
  const [timeRemaining, setTimeRemaining] = useState(30);

  const preferences = getPreferenceValues<Preferences>();
  const api = getBitwardenAPI();

  useEffect(() => {
    loadLoginItems();
  }, []);

  useEffect(() => {
    filterLogins();
  }, [searchText, logins]);

  useEffect(() => {
    // Update TOTP codes every second
    const interval = setInterval(() => {
      updateTotpCodes();
      setTimeRemaining(getTOTPTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [filteredLogins]);

  const loadLoginItems = async () => {
    try {
      setIsLoading(true);
      const [loginItems, folderList] = await Promise.all([
        api.getCiphersByType(ItemType.Login),
        api.getFolders()
      ]);
      setLogins(loginItems);
      setFolders(folderList);
      await showToast({
        style: Toast.Style.Success,
        title: "Login items loaded",
        message: `Found ${loginItems.length} login items`
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load login items",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterLogins = () => {
    if (!searchText.trim()) {
      setFilteredLogins(logins);
    } else {
      const searchLower = searchText.toLowerCase();
      const filtered = logins.filter(login => {
        return (
          login.name.toLowerCase().includes(searchLower) ||
          login.login?.username?.toLowerCase().includes(searchLower) ||
          login.login?.uris?.some(uri => uri.uri?.toLowerCase().includes(searchLower)) ||
          login.notes?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredLogins(filtered);
    }
  };

  const updateTotpCodes = () => {
    const newCodes: { [key: string]: string } = {};
    filteredLogins.forEach(login => {
      if (login.login?.totp) {
        const code = generateTOTP(login.login.totp);
        if (code) {
          newCodes[login.id] = code;
        }
      }
    });
    setTotpCodes(newCodes);
  };

  const copyPassword = async (login: VaultItem) => {
    if (!login.login?.password) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No password",
        message: "This login doesn't have a password"
      });
      return;
    }

    try {
      const timeout = parseInt(preferences.clipboardTimeout) || 30;
      await copyToClipboard(login.login.password, timeout);
      await showToast({
        style: Toast.Style.Success,
        title: "Password copied",
        message: `Will clear clipboard in ${timeout} seconds`
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Copy failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  const copyUsername = async (login: VaultItem) => {
    if (!login.login?.username) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No username",
        message: "This login doesn't have a username"
      });
      return;
    }

    try {
      await copyToClipboard(login.login.username);
      await showToast({
        style: Toast.Style.Success,
        title: "Username copied",
        message: login.login.username
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Copy failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  const copyTotpCode = async (login: VaultItem) => {
    const code = totpCodes[login.id];
    if (!code) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No TOTP",
        message: "This login doesn't have TOTP configured"
      });
      return;
    }

    try {
      await copyToClipboard(code);
      await showToast({
        style: Toast.Style.Success,
        title: "TOTP code copied",
        message: `${code} (${timeRemaining}s remaining)`
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Copy failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  const getFolderName = (folderId?: string): string => {
    if (!folderId) return "No Folder";
    const folder = folders.find(f => f.id === folderId);
    return folder ? folder.name : "Unknown Folder";
  };

  const getLoginSubtitle = (login: VaultItem): string => {
    const parts = [];

    if (login.login?.username) {
      parts.push(login.login.username);
    }

    const uri = getDisplayUri(login);
    if (uri) {
      parts.push(uri);
    }

    return parts.join(" • ") || "Login";
  };

  const getLoginAccessories = (login: VaultItem) => {
    const accessories = [];

    // Show TOTP code if available
    if (login.login?.totp && totpCodes[login.id]) {
      accessories.push({
        text: `${totpCodes[login.id]} (${timeRemaining}s)`,
        icon: Icon.Clock,
        iconTint: Color.Blue,
      });
    }

    // Show if login has password
    if (login.login?.password) {
      accessories.push({
        icon: Icon.Key,
        iconTint: Color.Green,
      });
    }

    // Show favorite status
    if (login.favorite) {
      accessories.push({
        icon: Icon.Star,
        iconTint: Color.Yellow,
      });
    }

    return accessories;
  };

  const getLoginActions = (login: VaultItem) => {
    const actions = [];

    if (login.login?.password) {
      actions.push(
        <Action
          key="copy-password"
          title="Copy Password"
          icon={Icon.Key}
          onAction={() => copyPassword(login)}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
      );
    }

    if (login.login?.username) {
      actions.push(
        <Action
          key="copy-username"
          title="Copy Username"
          icon={Icon.Person}
          onAction={() => copyUsername(login)}
          shortcut={{ modifiers: ["cmd"], key: "u" }}
        />
      );
    }

    if (login.login?.totp && totpCodes[login.id]) {
      actions.push(
        <Action
          key="copy-totp"
          title="Copy TOTP Code"
          icon={Icon.Clock}
          onAction={() => copyTotpCode(login)}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
        />
      );
    }

    if (login.login?.uris && login.login.uris.length > 0 && login.login.uris[0].uri) {
      actions.push(
        <Action.OpenInBrowser
          key="open-url"
          title="Open in Browser"
          url={login.login.uris[0].uri}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
      );
    }

    actions.push(
      <Action
        key="refresh"
        title="Refresh Logins"
        icon={Icon.ArrowClockwise}
        onAction={loadLoginItems}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    );

    return actions;
  };

  const groupLoginsByFolder = () => {
    const groups: { [key: string]: VaultItem[] } = {};

    filteredLogins.forEach(login => {
      const folderName = getFolderName(login.folderId);
      if (!groups[folderName]) {
        groups[folderName] = [];
      }
      groups[folderName].push(login);
    });

    // Sort groups by folder name, with "No Folder" last
    const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
      if (a === "No Folder") return 1;
      if (b === "No Folder") return -1;
      return a.localeCompare(b);
    });

    return sortedGroups;
  };

  const loginGroups = groupLoginsByFolder();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search login items..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Login Items"
    >
      {loginGroups.map(([folderName, folderLogins]) => (
        <List.Section
          key={folderName}
          title={folderName}
          subtitle={`${folderLogins.length} logins`}
        >
          {folderLogins
            .sort((a, b) => {
              // Favorites first, then alphabetical
              if (a.favorite && !b.favorite) return -1;
              if (!a.favorite && b.favorite) return 1;
              return a.name.localeCompare(b.name);
            })
            .map(login => (
              <List.Item
                key={login.id}
                title={login.name}
                subtitle={getLoginSubtitle(login)}
                icon={Icon.Key}
                accessories={getLoginAccessories(login)}
                actions={
                  <ActionPanel>
                    {getLoginActions(login)}
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}

      {!isLoading && filteredLogins.length === 0 && (
        <List.EmptyView
          title="No login items found"
          description={searchText ? `No login items match "${searchText}"` : "No login items in your vault"}
          icon={Icon.Key}
        />
      )}
    </List>
  );
}