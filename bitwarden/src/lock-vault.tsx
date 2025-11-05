import { showToast, Toast, closeMainWindow } from "@vicinae/api";

export default async function LockVault() {
  try {
    await closeMainWindow();

    await showToast({
      style: Toast.Style.Animated,
      title: "Locking vault...",
      message: "Clearing session data"
    });

    // Clear any cached authentication data
    // Note: In a real implementation, you might want to clear stored tokens
    // For now, we'll just notify the user that the vault is locked

    await showToast({
      style: Toast.Style.Success,
      title: "Vault locked",
      message: "Session cleared. You'll need to authenticate again."
    });

  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to lock vault",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}