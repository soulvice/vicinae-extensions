import React, { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast
} from "@vicinae/api";
import {
  generatePassword,
  PasswordOptions,
  copyToClipboard
} from "./utils";

interface PasswordPreset {
  name: string;
  description: string;
  options: PasswordOptions;
  icon: string;
}

const PASSWORD_PRESETS: PasswordPreset[] = [
  {
    name: "Strong Password",
    description: "16 characters with uppercase, lowercase, numbers, and symbols",
    options: {
      length: 16,
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSymbols: true,
      excludeSimilar: true,
      excludeAmbiguous: false,
    },
    icon: "Key",
  },
  {
    name: "Maximum Security",
    description: "32 characters with all character types",
    options: {
      length: 32,
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSymbols: true,
      excludeSimilar: true,
      excludeAmbiguous: true,
    },
    icon: "Shield",
  },
  {
    name: "Alphanumeric Only",
    description: "12 characters with letters and numbers only",
    options: {
      length: 12,
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSymbols: false,
      excludeSimilar: true,
      excludeAmbiguous: false,
    },
    icon: "Text",
  },
  {
    name: "PIN Code",
    description: "6 digit numeric code",
    options: {
      length: 6,
      includeUppercase: false,
      includeLowercase: false,
      includeNumbers: true,
      includeSymbols: false,
      excludeSimilar: false,
      excludeAmbiguous: false,
    },
    icon: "NumberSign",
  },
  {
    name: "Simple Password",
    description: "8 characters, easy to type",
    options: {
      length: 8,
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSymbols: false,
      excludeSimilar: true,
      excludeAmbiguous: true,
    },
    icon: "LockUnlocked",
  },
];

interface GeneratedPassword {
  password: string;
  preset: PasswordPreset;
  timestamp: Date;
}

export default function GeneratePassword() {
  const [generatedPasswords, setGeneratedPasswords] = useState<GeneratedPassword[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Generate initial passwords for all presets
    generateInitialPasswords();
  }, []);

  const generateInitialPasswords = async () => {
    setIsLoading(true);
    try {
      const passwords = PASSWORD_PRESETS.map(preset => ({
        password: generatePassword(preset.options),
        preset,
        timestamp: new Date(),
      }));
      setGeneratedPasswords(passwords);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to generate passwords",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const regeneratePassword = async (preset: PasswordPreset) => {
    try {
      const newPassword = generatePassword(preset.options);
      setGeneratedPasswords(prev =>
        prev.map(item =>
          item.preset.name === preset.name
            ? { ...item, password: newPassword, timestamp: new Date() }
            : item
        )
      );
      await showToast({
        style: Toast.Style.Success,
        title: "Password regenerated",
        message: `New ${preset.name.toLowerCase()} generated`
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Generation failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  const copyPassword = async (generatedPassword: GeneratedPassword) => {
    try {
      await copyToClipboard(generatedPassword.password);
      await showToast({
        style: Toast.Style.Success,
        title: "Password copied",
        message: `${generatedPassword.preset.name} copied to clipboard`
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Copy failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  const regenerateAllPasswords = async () => {
    setIsLoading(true);
    try {
      const passwords = PASSWORD_PRESETS.map(preset => ({
        password: generatePassword(preset.options),
        preset,
        timestamp: new Date(),
      }));
      setGeneratedPasswords(passwords);
      await showToast({
        style: Toast.Style.Success,
        title: "All passwords regenerated",
        message: `Generated ${passwords.length} new passwords`
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Generation failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (options: PasswordOptions): { label: string; color: Color } => {
    let score = 0;

    // Length score
    if (options.length >= 8) score += 1;
    if (options.length >= 12) score += 1;
    if (options.length >= 16) score += 1;

    // Character type score
    if (options.includeUppercase) score += 1;
    if (options.includeLowercase) score += 1;
    if (options.includeNumbers) score += 1;
    if (options.includeSymbols) score += 1;

    // Penalty for exclusions that reduce complexity
    if (options.excludeSimilar) score -= 0.5;
    if (options.excludeAmbiguous) score -= 0.5;

    if (score >= 6) return { label: "Very Strong", color: Color.Green };
    if (score >= 4) return { label: "Strong", color: Color.Blue };
    if (score >= 3) return { label: "Medium", color: Color.Orange };
    return { label: "Weak", color: Color.Red };
  };

  const getPasswordAccessories = (generatedPassword: GeneratedPassword) => {
    const accessories = [];

    // Show password length
    accessories.push({
      text: `${generatedPassword.password.length} chars`,
      icon: Icon.Text,
    });

    // Show strength
    const strength = getPasswordStrength(generatedPassword.preset.options);
    accessories.push({
      text: strength.label,
      icon: Icon.Shield,
      iconTint: strength.color,
    });

    return accessories;
  };

  const getPasswordActions = (generatedPassword: GeneratedPassword) => {
    return [
      <Action
        key="copy"
        title="Copy Password"
        icon={Icon.Clipboard}
        onAction={() => copyPassword(generatedPassword)}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />,
      <Action
        key="regenerate"
        title="Regenerate This Type"
        icon={Icon.ArrowClockwise}
        onAction={() => regeneratePassword(generatedPassword.preset)}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />,
      <Action
        key="regenerate-all"
        title="Regenerate All Passwords"
        icon={Icon.TwoArrowsClockwise}
        onAction={regenerateAllPasswords}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      />,
    ];
  };

  const formatCharacterTypes = (options: PasswordOptions): string => {
    const types = [];
    if (options.includeUppercase) types.push("A-Z");
    if (options.includeLowercase) types.push("a-z");
    if (options.includeNumbers) types.push("0-9");
    if (options.includeSymbols) types.push("symbols");

    let result = types.join(", ");

    const exclusions = [];
    if (options.excludeSimilar) exclusions.push("similar chars excluded");
    if (options.excludeAmbiguous) exclusions.push("ambiguous chars excluded");

    if (exclusions.length > 0) {
      result += ` (${exclusions.join(", ")})`;
    }

    return result;
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Password Generator"
      searchBarPlaceholder="Search password types..."
    >
      <List.Section title="Generated Passwords" subtitle="Click to copy, regenerate as needed">
        {generatedPasswords.map((genPassword, index) => (
          <List.Item
            key={`${genPassword.preset.name}-${index}`}
            title={genPassword.preset.name}
            subtitle={`${genPassword.password} • ${formatCharacterTypes(genPassword.preset.options)}`}
            icon={genPassword.preset.icon as keyof typeof Icon}
            accessories={getPasswordAccessories(genPassword)}
            actions={
              <ActionPanel>
                {getPasswordActions(genPassword)}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Password Types" subtitle="Available password generation presets">
        {PASSWORD_PRESETS.map((preset, index) => {
          const strength = getPasswordStrength(preset.options);
          return (
            <List.Item
              key={`preset-${index}`}
              title={preset.name}
              subtitle={preset.description}
              icon={preset.icon as keyof typeof Icon}
              accessories={[
                {
                  text: `${preset.options.length} chars`,
                  icon: Icon.Text,
                },
                {
                  text: strength.label,
                  icon: Icon.Shield,
                  iconTint: strength.color,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Generate This Type"
                    icon={Icon.Plus}
                    onAction={() => regeneratePassword(preset)}
                    shortcut={{ modifiers: ["cmd"], key: "g" }}
                  />
                  <Action
                    title="Regenerate All Passwords"
                    icon={Icon.TwoArrowsClockwise}
                    onAction={regenerateAllPasswords}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}