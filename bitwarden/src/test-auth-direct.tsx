import React, { useState, useEffect } from "react";
import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast
} from "@vicinae/api";

export default function TestAuthDirect() {
  const [debugInfo, setDebugInfo] = useState<string>("Testing direct authentication...");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    runDirectAuthTest();
  }, []);

  const runDirectAuthTest = async () => {
    try {
      setIsLoading(true);
      let info = "# Direct Bitwarden Authentication Test\n\n";

      // Test raw authentication with direct API calls
      const serverUrl = "https://vault.w0lf.io";
      const email = "your-email@example.com"; // You'll need to set this
      const password = "your-password"; // You'll need to set this

      info += "## Configuration\n";
      info += `- Server: ${serverUrl}\n`;
      info += `- Email: ${email}\n`;
      info += `- Password: ${password ? '[SET]' : '[NOT SET]'}\n\n`;

      if (!email || !password || email === "your-email@example.com") {
        info += "❌ **Please update this file with your actual credentials for testing**\n\n";
        info += "Edit: `/home/dadmin/nix-config/florence_upgraded/modules/home/vicinae/extensions/bitwarden/src/test-auth-direct.tsx`\n\n";
        info += "Change the email and password variables to your actual values.\n";
        setDebugInfo(info);
        setIsLoading(false);
        return;
      }

      // Test different authentication methods
      const authMethods = [
        {
          name: "Raw Password",
          password: password
        },
        {
          name: "Basic Hash",
          password: await hashPasswordBasic(password, email)
        }
      ];

      for (const method of authMethods) {
        info += `## Testing: ${method.name}\n`;
        try {
          const result = await testAuthentication(serverUrl, email, method.password);
          info += `- ✅ Success with ${method.name}\n`;
          info += `- Access Token: ${result.access_token ? 'Received' : 'Not received'}\n`;
          info += `- Token Type: ${result.token_type || 'Unknown'}\n`;
          info += `- Expires In: ${result.expires_in || 'Unknown'} seconds\n\n`;
          break; // Stop on first success
        } catch (error) {
          info += `- ❌ Failed with ${method.name}\n`;
          info += `- Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`;
        }
      }

      setDebugInfo(info);
      await showToast({
        style: Toast.Style.Success,
        title: "Direct auth test complete",
        message: "Check the results"
      });
    } catch (error) {
      const errorInfo = `# Direct Auth Test Error\n\n❌ **Error:** ${error}\n\n**Stack:**\n\`\`\`\n${error instanceof Error ? error.stack : 'No stack trace'}\n\`\`\``;
      setDebugInfo(errorInfo);
      await showToast({
        style: Toast.Style.Failure,
        title: "Direct auth test failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  async function hashPasswordBasic(password: string, email: string): Promise<string> {
    const crypto = require('crypto');
    const emailLower = email.toLowerCase().trim();
    const key = crypto.pbkdf2Sync(password, emailLower, 100000, 32, 'sha256');
    return key.toString('base64');
  }

  async function testAuthentication(serverUrl: string, email: string, password: string) {
    const fetch = require('node-fetch');

    const authData = {
      grant_type: 'password',
      username: email,
      password: password,
      scope: 'api offline_access',
      client_id: 'web',
      deviceType: 0,
      deviceIdentifier: 'test-device-id',
      deviceName: 'Vicinae Test',
    };

    const formData = new URLSearchParams();
    Object.entries(authData).forEach(([key, value]) => {
      formData.append(key, value.toString());
    });

    const response = await fetch(`${serverUrl}/identity/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Vicinae-Test/1.0.0',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={debugInfo}
      actions={
        <ActionPanel>
          <Action
            title="Run Test Again"
            icon={Icon.ArrowClockwise}
            onAction={runDirectAuthTest}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}