import { showToast, Toast, closeMainWindow } from "@vicinae/api";
import { execSync } from "child_process";
import React from "react";

export default async function Command() {
  try {
    await closeMainWindow();
    await showToast({
      style: Toast.Style.Animated,
      title: "Connecting to Tailscale...",
    });

    execSync("nu -c 'tailscale up'", { encoding: "utf-8" });

    await showToast({
      style: Toast.Style.Success,
      title: "Connected to Tailscale",
      message: "VPN connection established",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to connect",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
