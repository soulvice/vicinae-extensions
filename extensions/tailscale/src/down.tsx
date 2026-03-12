import { showToast, Toast, closeMainWindow } from "@vicinae/api";
import { execSync } from "child_process";
import React from "react";

export default async function Command() {
  try {
    await closeMainWindow();
    await showToast({
      style: Toast.Style.Animated,
      title: "Disconnecting from Tailscale...",
    });

    execSync("nu -c 'tailscale down'", { encoding: "utf-8" });

    await showToast({
      style: Toast.Style.Success,
      title: "Disconnected from Tailscale",
      message: "VPN connection closed",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to disconnect",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
