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
  getItemIcon,
  getItemTypeLabel,
  getDisplayUri,
  generateTOTP,
  getTOTPTimeRemaining,
  copyToClipboard,
  Preferences
} from "./utils";

export default function SearchVault() {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filteredItems, setFilteredItems] = useState<VaultItem[]>([]);
  const [totpCodes, setTotpCodes] = useState<{ [key: string]: string }>({});
  const [timeRemaining, setTimeRemaining] = useState(30);

  const preferences = getPreferenceValues<Preferences>();
  const api = getBitwardenAPI();

  useEffect(() => {
    loadVaultItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [searchText, items]);

  useEffect(() => {
    // Update TOTP codes every second
    const interval = setInterval(() => {
      updateTotpCodes();
      setTimeRemaining(getTOTPTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [filteredItems]);

  const loadVaultItems = async () => {
    try {
      setIsLoading(true);
      const vaultItems = await api.getCiphers();
      setItems(vaultItems);
      await showToast({
        style: Toast.Style.Success,
        title: "Vault Loaded",
        message: `Found ${vaultItems.length} items`
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load vault",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterItems = () => {
    if (!searchText.trim()) {
      // Show recent/favorite items when no search
      const sortedItems = items
        .sort((a, b) => {
          // Favorites first, then by revision date
          if (a.favorite && !b.favorite) return -1;
          if (!a.favorite && b.favorite) return 1;
          return new Date(b.revisionDate).getTime() - new Date(a.revisionDate).getTime();
        })
        .slice(0, 20); // Limit to 20 items for performance
      setFilteredItems(sortedItems);
    } else {
      const searchLower = searchText.toLowerCase();
      const filtered = items.filter(item => {
        return (
          item.name.toLowerCase().includes(searchLower) ||
          item.login?.username?.toLowerCase().includes(searchLower) ||
          item.login?.uris?.some(uri => uri.uri?.toLowerCase().includes(searchLower)) ||
          item.notes?.toLowerCase().includes(searchLower) ||
          item.card?.cardholderName?.toLowerCase().includes(searchLower) ||
          item.card?.brand?.toLowerCase().includes(searchLower) ||
          item.identity?.firstName?.toLowerCase().includes(searchLower) ||
          item.identity?.lastName?.toLowerCase().includes(searchLower) ||
          item.identity?.company?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredItems(filtered);
    }
  };

  const updateTotpCodes = () => {
    const newCodes: { [key: string]: string } = {};
    filteredItems.forEach(item => {
      if (item.login?.totp) {
        const code = generateTOTP(item.login.totp);
        if (code) {
          newCodes[item.id] = code;
        }
      }
    });
    setTotpCodes(newCodes);
  };

  const copyPassword = async (item: VaultItem) => {
    if (!item.login?.password) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No password",
        message: "This item doesn't have a password"
      });
      return;
    }

    try {
      const timeout = parseInt(preferences.clipboardTimeout) || 30;
      await copyToClipboard(item.login.password, timeout);
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

  const copyUsername = async (item: VaultItem) => {
    if (!item.login?.username) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No username",
        message: "This item doesn't have a username"
      });
      return;
    }

    try {
      await copyToClipboard(item.login.username);
      await showToast({
        style: Toast.Style.Success,
        title: "Username copied",
        message: item.login.username
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Copy failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  const copyTotpCode = async (item: VaultItem) => {
    const code = totpCodes[item.id];
    if (!code) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No TOTP",
        message: "This item doesn't have TOTP configured"
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

  const copyCardNumber = async (item: VaultItem) => {
    if (!item.card?.number) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No card number",
        message: "This card doesn't have a number"
      });
      return;
    }

    try {
      const timeout = parseInt(preferences.clipboardTimeout) || 30;
      await copyToClipboard(item.card.number, timeout);
      await showToast({
        style: Toast.Style.Success,
        title: "Card number copied",
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

  const copyCardCode = async (item: VaultItem) => {
    if (!item.card?.code) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No security code",
        message: "This card doesn't have a security code"
      });
      return;
    }

    try {
      const timeout = parseInt(preferences.clipboardTimeout) || 30;
      await copyToClipboard(item.card.code, timeout);
      await showToast({
        style: Toast.Style.Success,
        title: "Security code copied",
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

  const getItemSubtitle = (item: VaultItem): string => {
    switch (item.type) {
      case ItemType.Login:
        const uri = getDisplayUri(item);
        const username = item.login?.username;
        if (uri && username) return `${username} • ${uri}`;
        if (username) return username;
        if (uri) return uri;
        return "Login";
      case ItemType.Card:
        const cardInfo = [];
        if (item.card?.brand) cardInfo.push(item.card.brand);
        if (item.card?.number) cardInfo.push(`****${item.card.number.slice(-4)}`);
        return cardInfo.join(" • ") || "Credit Card";
      case ItemType.SecureNote:
        return "Secure Note";
      case ItemType.Identity:
        const identityInfo = [];
        if (item.identity?.firstName) identityInfo.push(item.identity.firstName);
        if (item.identity?.lastName) identityInfo.push(item.identity.lastName);
        if (item.identity?.company) identityInfo.push(item.identity.company);
        return identityInfo.join(" ") || "Identity";
      default:
        return getItemTypeLabel(item.type);
    }
  };

  const getItemAccessories = (item: VaultItem) => {
    const accessories = [];

    // Show TOTP code if available
    if (item.login?.totp && totpCodes[item.id]) {
      accessories.push({
        text: `${totpCodes[item.id]} (${timeRemaining}s)`,
        icon: Icon.Clock,
      });
    }

    // Show favorite status
    if (item.favorite) {
      accessories.push({
        icon: Icon.Star,
        iconTint: Color.Yellow,
      });
    }

    // Show item type
    accessories.push({
      text: getItemTypeLabel(item.type),
      icon: getItemIcon(item.type),
    });

    return accessories;
  };

  const getItemActions = (item: VaultItem) => {
    const actions = [];

    // Login item actions
    if (item.type === ItemType.Login) {
      if (item.login?.password) {
        actions.push(
          <Action
            key="copy-password"
            title="Copy Password"
            icon={Icon.Key}
            onAction={() => copyPassword(item)}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        );
      }
      if (item.login?.username) {
        actions.push(
          <Action
            key="copy-username"
            title="Copy Username"
            icon={Icon.Person}
            onAction={() => copyUsername(item)}
            shortcut={{ modifiers: ["cmd"], key: "u" }}
          />
        );
      }
      if (item.login?.totp && totpCodes[item.id]) {
        actions.push(
          <Action
            key="copy-totp"
            title="Copy TOTP Code"
            icon={Icon.Clock}
            onAction={() => copyTotpCode(item)}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          />
        );
      }
      if (item.login?.uris && item.login.uris.length > 0 && item.login.uris[0].uri) {
        actions.push(
          <Action.OpenInBrowser
            key="open-url"
            title="Open in Browser"
            url={item.login.uris[0].uri}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        );
      }
    }

    // Card item actions
    if (item.type === ItemType.Card) {
      if (item.card?.number) {
        actions.push(
          <Action
            key="copy-card-number"
            title="Copy Card Number"
            icon={Icon.CreditCard}
            onAction={() => copyCardNumber(item)}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        );
      }
      if (item.card?.code) {
        actions.push(
          <Action
            key="copy-card-code"
            title="Copy Security Code"
            icon={Icon.Lock}
            onAction={() => copyCardCode(item)}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        );
      }
    }

    // Common actions
    actions.push(
      <Action
        key="refresh"
        title="Refresh Vault"
        icon={Icon.ArrowClockwise}
        onAction={loadVaultItems}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    );

    return actions;
  };

  const groupItemsByType = () => {
    const groups: { [key: string]: VaultItem[] } = {};

    filteredItems.forEach(item => {
      const typeLabel = getItemTypeLabel(item.type);
      if (!groups[typeLabel]) {
        groups[typeLabel] = [];
      }
      groups[typeLabel].push(item);
    });

    return groups;
  };

  const itemGroups = groupItemsByType();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search vault items..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Bitwarden Vault"
    >
      {!searchText.trim() && (
        <List.Section title="Recent & Favorites" subtitle={`${filteredItems.length} items`}>
          {filteredItems.map(item => (
            <List.Item
              key={item.id}
              title={item.name}
              subtitle={getItemSubtitle(item)}
              icon={getItemIcon(item.type)}
              accessories={getItemAccessories(item)}
              actions={
                <ActionPanel>
                  {getItemActions(item)}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {searchText.trim() && Object.entries(itemGroups).map(([typeLabel, typeItems]) => (
        <List.Section key={typeLabel} title={typeLabel} subtitle={`${typeItems.length} items`}>
          {typeItems.map(item => (
            <List.Item
              key={item.id}
              title={item.name}
              subtitle={getItemSubtitle(item)}
              icon={getItemIcon(item.type)}
              accessories={getItemAccessories(item)}
              actions={
                <ActionPanel>
                  {getItemActions(item)}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}

      {!isLoading && filteredItems.length === 0 && (
        <List.EmptyView
          title="No items found"
          description={searchText ? `No items match "${searchText}"` : "Your vault appears to be empty"}
          icon={Icon.MagnifyingGlass}
        />
      )}
    </List>
  );
}