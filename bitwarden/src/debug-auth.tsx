import React, { useState, useEffect } from "react";
import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast
} from "@vicinae/api";
import { getBitwardenAPI } from "./utils";

export default function DebugAuth() {
  const [debugInfo, setDebugInfo] = useState<string>("Starting authentication debug...");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    runDebugTest();
  }, []);

  const runDebugTest = async () => {
    try {
      setIsLoading(true);
      let info = "# Bitwarden Authentication Debug\n\n";

      const api = getBitwardenAPI();

      info += "## Step 1: Testing API Connection\n";
      try {
        // Test basic connectivity by making a simple request
        const response = await fetch(`${(api as any).preferences.serverUrl}/api/config`);
        info += `- Server URL: ${(api as any).preferences.serverUrl}\n`;
        info += `- Config endpoint status: ${response.status}\n`;
        if (response.ok) {
          const config = await response.json();
          info += `- Server version: ${config.version || 'Unknown'}\n`;
          info += `- Server available: ✅\n\n`;
        } else {
          info += `- Server response: ${response.statusText}\n`;
          info += `- Server available: ❌\n\n`;
        }
      } catch (error) {
        info += `- Connection error: ${error}\n`;
        info += `- Server available: ❌\n\n`;
      }

      info += "## Step 2: Testing Authentication\n";
      info += `- Email: ${(api as any).preferences.email}\n`;
      info += `- Server URL: ${(api as any).preferences.serverUrl}\n`;
      info += `- Master Password: ${(api as any).preferences.masterPassword ? '[SET]' : '[NOT SET]'}\n`;
      try {
        await api.ensureAuthenticated();
        info += "- Authentication: ✅ Success\n";
        info += `- Method used: ${(api as any).lastSuccessfulAuthMethod || 'Unknown'}\n\n`;

        info += "## Step 3: Testing Sync\n";
        try {
          const syncData = await api.sync();
          info += `- Sync successful: ✅\n`;
          info += `- Ciphers found: ${syncData.ciphers?.length || 0}\n`;
          info += `- Folders found: ${syncData.folders?.length || 0}\n\n`;

          if (syncData.ciphers && syncData.ciphers.length > 0) {
            info += "## Sample Cipher Data\n";
            const sampleCipher = syncData.ciphers[0];
            info += `- First cipher name: "${sampleCipher.name}"\n`;
            info += `- First cipher type: ${sampleCipher.type}\n`;
            info += `- First cipher ID: ${sampleCipher.id}\n`;
          }
        } catch (syncError) {
          info += `- Sync failed: ❌\n`;
          info += `- Sync error: ${syncError}\n\n`;
        }
      } catch (authError) {
        info += `- Authentication failed: ❌\n`;
        info += `- Auth error: ${authError}\n\n`;
      }

      setDebugInfo(info);
      await showToast({
        style: Toast.Style.Success,
        title: "Debug complete",
        message: "Check the debug information"
      });
    } catch (error) {
      const errorInfo = `# Debug Error\n\n❌ **Error:** ${error}\n\n**Stack trace:**\n\`\`\`\n${error instanceof Error ? error.stack : 'No stack trace'}\n\`\`\``;
      setDebugInfo(errorInfo);
      await showToast({
        style: Toast.Style.Failure,
        title: "Debug failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={debugInfo}
      actions={
        <ActionPanel>
          <Action
            title="Run Debug Again"
            icon={Icon.ArrowClockwise}
            onAction={runDebugTest}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}