import React, { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  Detail
} from "@vicinae/api";
import {
  getBitwardenAPI,
  VaultItem,
  ItemType,
  Folder,
  truncateText,
  copyToClipboard
} from "./utils";

export default function BrowseNotes() {
  const [notes, setNotes] = useState<VaultItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filteredNotes, setFilteredNotes] = useState<VaultItem[]>([]);
  const [selectedNote, setSelectedNote] = useState<VaultItem | null>(null);
  const [showingDetail, setShowingDetail] = useState(false);

  const api = getBitwardenAPI();

  useEffect(() => {
    loadNoteItems();
  }, []);

  useEffect(() => {
    filterNotes();
  }, [searchText, notes]);

  const loadNoteItems = async () => {
    try {
      setIsLoading(true);
      const [noteItems, folderList] = await Promise.all([
        api.getCiphersByType(ItemType.SecureNote),
        api.getFolders()
      ]);
      setNotes(noteItems);
      setFolders(folderList);
      await showToast({
        style: Toast.Style.Success,
        title: "Secure notes loaded",
        message: `Found ${noteItems.length} secure notes`
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load secure notes",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterNotes = () => {
    if (!searchText.trim()) {
      setFilteredNotes(notes);
    } else {
      const searchLower = searchText.toLowerCase();
      const filtered = notes.filter(note => {
        return (
          note.name.toLowerCase().includes(searchLower) ||
          note.notes?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredNotes(filtered);
    }
  };

  const copyNoteContent = async (note: VaultItem) => {
    if (!note.notes) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No content",
        message: "This note doesn't have any content"
      });
      return;
    }

    try {
      await copyToClipboard(note.notes);
      await showToast({
        style: Toast.Style.Success,
        title: "Note content copied",
        message: "Content copied to clipboard"
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Copy failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  const copyNoteTitle = async (note: VaultItem) => {
    try {
      await copyToClipboard(note.name);
      await showToast({
        style: Toast.Style.Success,
        title: "Note title copied",
        message: note.name
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Copy failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  const viewNoteDetail = (note: VaultItem) => {
    setSelectedNote(note);
    setShowingDetail(true);
  };

  const getFolderName = (folderId?: string): string => {
    if (!folderId) return "No Folder";
    const folder = folders.find(f => f.id === folderId);
    return folder ? folder.name : "Unknown Folder";
  };

  const getNoteSubtitle = (note: VaultItem): string => {
    if (note.notes) {
      // Show first line or first 100 characters of the note content
      const firstLine = note.notes.split('\n')[0];
      return truncateText(firstLine, 100);
    }
    return "Empty note";
  };

  const getNoteAccessories = (note: VaultItem) => {
    const accessories = [];

    // Show word count for notes with content
    if (note.notes) {
      const wordCount = note.notes.trim().split(/\s+/).length;
      accessories.push({
        text: `${wordCount} words`,
        icon: Icon.Document,
      });
    }

    // Show favorite status
    if (note.favorite) {
      accessories.push({
        icon: Icon.Star,
        iconTint: Color.Yellow,
      });
    }

    return accessories;
  };

  const getNoteActions = (note: VaultItem) => {
    const actions = [];

    actions.push(
      <Action
        key="view-detail"
        title="View Full Note"
        icon={Icon.Eye}
        onAction={() => viewNoteDetail(note)}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />
    );

    if (note.notes) {
      actions.push(
        <Action
          key="copy-content"
          title="Copy Content"
          icon={Icon.Clipboard}
          onAction={() => copyNoteContent(note)}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
      );
    }

    actions.push(
      <Action
        key="copy-title"
        title="Copy Title"
        icon={Icon.Text}
        onAction={() => copyNoteTitle(note)}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
      />
    );

    actions.push(
      <Action
        key="refresh"
        title="Refresh Notes"
        icon={Icon.ArrowClockwise}
        onAction={loadNoteItems}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    );

    return actions;
  };

  const groupNotesByFolder = () => {
    const groups: { [key: string]: VaultItem[] } = {};

    filteredNotes.forEach(note => {
      const folderName = getFolderName(note.folderId);
      if (!groups[folderName]) {
        groups[folderName] = [];
      }
      groups[folderName].push(note);
    });

    // Sort groups by folder name, with "No Folder" last
    const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
      if (a === "No Folder") return 1;
      if (b === "No Folder") return -1;
      return a.localeCompare(b);
    });

    return sortedGroups;
  };

  const getNoteDetailMarkdown = (note: VaultItem): string => {
    const sections = [];

    sections.push(`# ${note.name}\n`);

    if (note.notes) {
      sections.push(`## Content\n\n${note.notes}\n`);
    } else {
      sections.push(`## Content\n\n*This note is empty.*\n`);
    }

    // Add metadata
    sections.push(`## Details\n`);
    sections.push(`- **Created:** ${new Date(note.creationDate).toLocaleString()}`);
    sections.push(`- **Modified:** ${new Date(note.revisionDate).toLocaleString()}`);
    sections.push(`- **Folder:** ${getFolderName(note.folderId)}`);
    if (note.favorite) {
      sections.push(`- **Favorite:** ⭐ Yes`);
    }

    return sections.join('\n');
  };

  if (showingDetail && selectedNote) {
    return (
      <Detail
        markdown={getNoteDetailMarkdown(selectedNote)}
        actions={
          <ActionPanel>
            <Action
              title="Back to Notes"
              icon={Icon.ArrowLeft}
              onAction={() => setShowingDetail(false)}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
            {selectedNote.notes && (
              <Action
                title="Copy Content"
                icon={Icon.Clipboard}
                onAction={() => copyNoteContent(selectedNote)}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            )}
            <Action
              title="Copy Title"
              icon={Icon.Text}
              onAction={() => copyNoteTitle(selectedNote)}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  const noteGroups = groupNotesByFolder();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search secure notes..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Secure Notes"
    >
      {noteGroups.map(([folderName, folderNotes]) => (
        <List.Section
          key={folderName}
          title={folderName}
          subtitle={`${folderNotes.length} notes`}
        >
          {folderNotes
            .sort((a, b) => {
              // Favorites first, then alphabetical
              if (a.favorite && !b.favorite) return -1;
              if (!a.favorite && b.favorite) return 1;
              return a.name.localeCompare(b.name);
            })
            .map(note => (
              <List.Item
                key={note.id}
                title={note.name}
                subtitle={getNoteSubtitle(note)}
                icon={Icon.Document}
                accessories={getNoteAccessories(note)}
                actions={
                  <ActionPanel>
                    {getNoteActions(note)}
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}

      {!isLoading && filteredNotes.length === 0 && (
        <List.EmptyView
          title="No secure notes found"
          description={searchText ? `No secure notes match "${searchText}"` : "No secure notes in your vault"}
          icon={Icon.Document}
        />
      )}
    </List>
  );
}