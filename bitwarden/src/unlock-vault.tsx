import { showToast, Toast, closeMainWindow } from "@vicinae/api";
import { getBitwardenAPI } from "./utils";

export default async function UnlockVault() {
  try {
    await closeMainWindow();

    await showToast({
      style: Toast.Style.Animated,
      title: "Unlocking vault...",
      message: "Authenticating with Vaultwarden"
    });

    const api = getBitwardenAPI();
    await api.ensureAuthenticated();

    // Test that we can access the vault by getting a count of items
    const items = await api.getCiphers();

    await showToast({
      style: Toast.Style.Success,
      title: "Vault unlocked",
      message: `Successfully authenticated. ${items.length} items available.`
    });

  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to unlock vault",
      message: error instanceof Error ? error.message : "Authentication failed"
    });
  }
}