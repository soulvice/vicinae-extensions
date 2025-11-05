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
  formatCardNumber,
  copyToClipboard,
  Preferences
} from "./utils";

export default function BrowseCards() {
  const [cards, setCards] = useState<VaultItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filteredCards, setFilteredCards] = useState<VaultItem[]>([]);

  const preferences = getPreferenceValues<Preferences>();
  const api = getBitwardenAPI();

  useEffect(() => {
    loadCardItems();
  }, []);

  useEffect(() => {
    filterCards();
  }, [searchText, cards]);

  const loadCardItems = async () => {
    try {
      setIsLoading(true);
      const [cardItems, folderList] = await Promise.all([
        api.getCiphersByType(ItemType.Card),
        api.getFolders()
      ]);
      setCards(cardItems);
      setFolders(folderList);
      await showToast({
        style: Toast.Style.Success,
        title: "Card items loaded",
        message: `Found ${cardItems.length} card items`
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load card items",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterCards = () => {
    if (!searchText.trim()) {
      setFilteredCards(cards);
    } else {
      const searchLower = searchText.toLowerCase();
      const filtered = cards.filter(card => {
        return (
          card.name.toLowerCase().includes(searchLower) ||
          card.card?.cardholderName?.toLowerCase().includes(searchLower) ||
          card.card?.brand?.toLowerCase().includes(searchLower) ||
          card.card?.number?.includes(searchText) || // Exact match for numbers
          card.notes?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredCards(filtered);
    }
  };

  const copyCardNumber = async (card: VaultItem) => {
    if (!card.card?.number) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No card number",
        message: "This card doesn't have a number"
      });
      return;
    }

    try {
      const timeout = parseInt(preferences.clipboardTimeout) || 30;
      await copyToClipboard(card.card.number, timeout);
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

  const copyCardCode = async (card: VaultItem) => {
    if (!card.card?.code) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No security code",
        message: "This card doesn't have a security code"
      });
      return;
    }

    try {
      const timeout = parseInt(preferences.clipboardTimeout) || 30;
      await copyToClipboard(card.card.code, timeout);
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

  const copyCardholderName = async (card: VaultItem) => {
    if (!card.card?.cardholderName) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No cardholder name",
        message: "This card doesn't have a cardholder name"
      });
      return;
    }

    try {
      await copyToClipboard(card.card.cardholderName);
      await showToast({
        style: Toast.Style.Success,
        title: "Cardholder name copied",
        message: card.card.cardholderName
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Copy failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  const copyExpiryDate = async (card: VaultItem) => {
    if (!card.card?.expMonth || !card.card?.expYear) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No expiry date",
        message: "This card doesn't have an expiry date"
      });
      return;
    }

    try {
      const expiryDate = `${card.card.expMonth.padStart(2, '0')}/${card.card.expYear}`;
      await copyToClipboard(expiryDate);
      await showToast({
        style: Toast.Style.Success,
        title: "Expiry date copied",
        message: expiryDate
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

  const getCardSubtitle = (card: VaultItem): string => {
    const parts = [];

    if (card.card?.brand) {
      parts.push(card.card.brand);
    }

    if (card.card?.number) {
      parts.push(formatCardNumber(card.card.number));
    }

    if (card.card?.cardholderName) {
      parts.push(card.card.cardholderName);
    }

    return parts.join(" • ") || "Credit Card";
  };

  const getCardAccessories = (card: VaultItem) => {
    const accessories = [];

    // Show expiry date
    if (card.card?.expMonth && card.card?.expYear) {
      const expiryDate = `${card.card.expMonth.padStart(2, '0')}/${card.card.expYear}`;
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const expYear = parseInt(card.card.expYear);
      const expMonth = parseInt(card.card.expMonth);

      let isExpired = false;
      let isExpiringSoon = false;

      if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
        isExpired = true;
      } else if (expYear === currentYear && expMonth <= currentMonth + 3) {
        isExpiringSoon = true;
      }

      accessories.push({
        text: expiryDate,
        icon: Icon.Calendar,
        iconTint: isExpired ? Color.Red : isExpiringSoon ? Color.Orange : Color.SecondaryText,
      });
    }

    // Show if card has security code
    if (card.card?.code) {
      accessories.push({
        icon: Icon.Lock,
        iconTint: Color.Green,
      });
    }

    // Show favorite status
    if (card.favorite) {
      accessories.push({
        icon: Icon.Star,
        iconTint: Color.Yellow,
      });
    }

    return accessories;
  };

  const getCardActions = (card: VaultItem) => {
    const actions = [];

    if (card.card?.number) {
      actions.push(
        <Action
          key="copy-card-number"
          title="Copy Card Number"
          icon={Icon.CreditCard}
          onAction={() => copyCardNumber(card)}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
      );
    }

    if (card.card?.code) {
      actions.push(
        <Action
          key="copy-card-code"
          title="Copy Security Code"
          icon={Icon.Lock}
          onAction={() => copyCardCode(card)}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
        />
      );
    }

    if (card.card?.cardholderName) {
      actions.push(
        <Action
          key="copy-cardholder-name"
          title="Copy Cardholder Name"
          icon={Icon.Person}
          onAction={() => copyCardholderName(card)}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
      );
    }

    if (card.card?.expMonth && card.card?.expYear) {
      actions.push(
        <Action
          key="copy-expiry-date"
          title="Copy Expiry Date"
          icon={Icon.Calendar}
          onAction={() => copyExpiryDate(card)}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
        />
      );
    }

    actions.push(
      <Action
        key="refresh"
        title="Refresh Cards"
        icon={Icon.ArrowClockwise}
        onAction={loadCardItems}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    );

    return actions;
  };

  const groupCardsByFolder = () => {
    const groups: { [key: string]: VaultItem[] } = {};

    filteredCards.forEach(card => {
      const folderName = getFolderName(card.folderId);
      if (!groups[folderName]) {
        groups[folderName] = [];
      }
      groups[folderName].push(card);
    });

    // Sort groups by folder name, with "No Folder" last
    const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
      if (a === "No Folder") return 1;
      if (b === "No Folder") return -1;
      return a.localeCompare(b);
    });

    return sortedGroups;
  };

  const cardGroups = groupCardsByFolder();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search credit cards..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Credit Cards"
    >
      {cardGroups.map(([folderName, folderCards]) => (
        <List.Section
          key={folderName}
          title={folderName}
          subtitle={`${folderCards.length} cards`}
        >
          {folderCards
            .sort((a, b) => {
              // Favorites first, then alphabetical
              if (a.favorite && !b.favorite) return -1;
              if (!a.favorite && b.favorite) return 1;
              return a.name.localeCompare(b.name);
            })
            .map(card => (
              <List.Item
                key={card.id}
                title={card.name}
                subtitle={getCardSubtitle(card)}
                icon={Icon.CreditCard}
                accessories={getCardAccessories(card)}
                actions={
                  <ActionPanel>
                    {getCardActions(card)}
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}

      {!isLoading && filteredCards.length === 0 && (
        <List.EmptyView
          title="No credit cards found"
          description={searchText ? `No credit cards match "${searchText}"` : "No credit cards in your vault"}
          icon={Icon.CreditCard}
        />
      )}
    </List>
  );
}