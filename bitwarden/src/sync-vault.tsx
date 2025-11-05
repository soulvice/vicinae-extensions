import { showToast, Toast, closeMainWindow } from "@vicinae/api";
import { getBitwardenAPI } from "./utils";

export default async function SyncVault() {
  try {
    await closeMainWindow();

    await showToast({
      style: Toast.Style.Animated,
      title: "Syncing vault...",
      message: "Fetching latest data from server"
    });

    const api = getBitwardenAPI();

    // Ensure we're authenticated first
    await api.ensureAuthenticated();

    // Perform sync operation
    const syncData = await api.sync();

    const itemCount = syncData.ciphers.length;
    const folderCount = syncData.folders.length;

    await showToast({
      style: Toast.Style.Success,
      title: "Vault synchronized",
      message: `Updated: ${itemCount} items, ${folderCount} folders`
    });

  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Sync failed",
      message: error instanceof Error ? error.message : "Failed to sync with server"
    });
  }
}