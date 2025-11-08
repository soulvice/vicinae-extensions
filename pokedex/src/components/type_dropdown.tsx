import React from "react";
import { List, Grid } from "@vicinae/api";
import { TypeOption } from "../types";

interface TypeDropdownProps {
  type: "grid" | "list";
  command?: string;
  onSelectType: (type: string) => void;
}

export default function TypeDropdown({ type, command, onSelectType }: TypeDropdownProps) {
  const typeOptions: TypeOption[] = [
    { label: "All Types", value: "all" },
    { label: "⚪ Normal", value: "normal", emoji: "⚪" },
    { label: "🔥 Fire", value: "fire", emoji: "🔥" },
    { label: "💧 Water", value: "water", emoji: "💧" },
    { label: "⚡ Electric", value: "electric", emoji: "⚡" },
    { label: "🌿 Grass", value: "grass", emoji: "🌿" },
    { label: "🧊 Ice", value: "ice", emoji: "🧊" },
    { label: "👊 Fighting", value: "fighting", emoji: "👊" },
    { label: "☠️ Poison", value: "poison", emoji: "☠️" },
    { label: "🌍 Ground", value: "ground", emoji: "🌍" },
    { label: "🕊️ Flying", value: "flying", emoji: "🕊️" },
    { label: "🔮 Psychic", value: "psychic", emoji: "🔮" },
    { label: "🐛 Bug", value: "bug", emoji: "🐛" },
    { label: "🪨 Rock", value: "rock", emoji: "🪨" },
    { label: "👻 Ghost", value: "ghost", emoji: "👻" },
    { label: "🐉 Dragon", value: "dragon", emoji: "🐉" },
    { label: "🌑 Dark", value: "dark", emoji: "🌑" },
    { label: "⚙️ Steel", value: "steel", emoji: "⚙️" },
    { label: "🧚 Fairy", value: "fairy", emoji: "🧚" }
  ];

  const DropdownComponent = type === "grid" ? Grid.Dropdown : List.Dropdown;

  return (
    <DropdownComponent
      tooltip="Filter by Type"
      storeValue={true}
      onChange={(newValue) => {
        onSelectType(newValue || "all");
      }}
    >
      <DropdownComponent.Section title={command ? `${command} Types` : "Filter by Type"}>
        {typeOptions.map((option) => (
          <DropdownComponent.Item
            key={option.value}
            title={option.label}
            value={option.value}
          />
        ))}
      </DropdownComponent.Section>
    </DropdownComponent>
  );
}