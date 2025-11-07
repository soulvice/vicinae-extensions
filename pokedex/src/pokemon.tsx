import { Detail, ActionPanel, Action, Icon, getPreferenceValues } from "@vicinae/api";
import React, { useState, useEffect } from "react";
import { PokeAPI } from "./api";
import { PokemonV2, PokedexPreferences } from "./types";

interface PokemonDetailProps {
  pokemonId?: string;
}

export default function Command({ pokemonId = "1" }: PokemonDetailProps) {
  const [pokemon, setPokemon] = useState<PokemonV2 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeEffectiveness, setTypeEffectiveness] = useState<{
    weaknesses: string[];
    strengths: string[];
    immunities: string[];
    resistances: string[];
  } | null>(null);

  const preferences = getPreferenceValues<PokedexPreferences>();
  const pokeAPI = new PokeAPI(preferences);

  useEffect(() => {
    loadPokemon(pokemonId);
  }, [pokemonId]);

  const loadPokemon = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const pokemonData = await pokeAPI.getPokemon(id);
      setPokemon(pokemonData);

      // Load type effectiveness
      const types = pokemonData.pokemon_v2_pokemontypes.map(t => t.pokemon_v2_type.name);
      const effectiveness = await pokeAPI.getTypeEffectiveness(types);
      setTypeEffectiveness(effectiveness);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Pokémon");
    } finally {
      setIsLoading(false);
    }
  };

  const formatPokemonName = (name: string): string => {
    return name
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getTypeColor = (typeName: string): string => {
    const typeColors: Record<string, string> = {
      normal: "#A8A878",
      fire: "#F08030",
      water: "#6890F0",
      electric: "#F8D030",
      grass: "#78C850",
      ice: "#98D8D8",
      fighting: "#C03028",
      poison: "#A040A0",
      ground: "#E0C068",
      flying: "#A890F0",
      psychic: "#F85888",
      bug: "#A8B820",
      rock: "#B8A038",
      ghost: "#705898",
      dragon: "#7038F8",
      dark: "#705848",
      steel: "#B8B8D0",
      fairy: "#EE99AC"
    };

    return typeColors[typeName] || "#68A090";
  };

  const getTypeEmoji = (typeName: string): string => {
    const typeEmojis: Record<string, string> = {
      normal: "⚪",
      fire: "🔥",
      water: "💧",
      electric: "⚡",
      grass: "🌿",
      ice: "❄️",
      fighting: "👊",
      poison: "☠️",
      ground: "🌍",
      flying: "🦅",
      psychic: "🔮",
      bug: "🐛",
      rock: "⛰️",
      ghost: "👻",
      dragon: "🐉",
      dark: "🌑",
      steel: "⚔️",
      fairy: "🧚"
    };

    return typeEmojis[typeName] || "❓";
  };

  const formatHeight = (height: number): string => {
    const meters = height / 10;
    const feet = Math.floor(meters * 3.28084);
    const inches = Math.round((meters * 3.28084 - feet) * 12);
    return `${meters}m (${feet}'${inches.toString().padStart(2, "0")}")`;
  };

  const formatWeight = (weight: number): string => {
    const kg = weight / 10;
    const lbs = Math.round(kg * 2.20462);
    return `${kg}kg (${lbs} lbs)`;
  };

  const getStatName = (statName: string): string => {
    const statNames: Record<string, string> = {
      hp: "HP",
      attack: "Attack",
      defense: "Defense",
      "special-attack": "Sp. Attack",
      "special-defense": "Sp. Defense",
      speed: "Speed"
    };

    return statNames[statName] || statName;
  };

  const buildMarkdown = (): string => {
    if (!pokemon) return "";

    const types = pokemon.pokemon_v2_pokemontypes.map(t => t.pokemon_v2_type.name);
    const typeString = types.map(type => `${getTypeEmoji(type)} **${type.toUpperCase()}**`).join(" ");

    const flavorText = pokemon.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonspeciesflavortexts?.[0]?.flavor_text
      ?.replace(/\n|\f/g, " ")
      ?.replace(/\s+/g, " ") || "No description available.";

    const spriteUrl = pokeAPI.getPokemonSpriteUrl(pokemon);
    const shinySpriteUrl = pokeAPI.getPokemonSpriteUrl(pokemon, true);

    // Split view: Image on left, stats on right
    let markdown = `
# ${formatPokemonName(pokemon.name)}
## Pokédex #${pokemon.id.toString().padStart(3, "0")}

<div style="display: flex; gap: 20px;">

<!-- LEFT SIDE: IMAGE -->
<div style="flex: 1; text-align: center;">

![${pokemon.name}](${spriteUrl})

${preferences.showShinySprites ? `
### ✨ Shiny Form
![Shiny ${pokemon.name}](${shinySpriteUrl})
` : ""}

### ${typeString}

> ${flavorText}

</div>

<!-- RIGHT SIDE: STATS -->
<div style="flex: 1;">

## 📊 Base Stats

| Stat | Value | Bar |
|------|-------|-----|`;

    // Add base stats
    pokemon.pokemon_v2_pokemonstats.forEach(stat => {
      const statName = getStatName(stat.pokemon_v2_stat.name);
      const value = stat.base_stat;
      const percentage = Math.round((value / 255) * 100);
      const barFill = "█".repeat(Math.floor(percentage / 5));
      const barEmpty = "░".repeat(20 - Math.floor(percentage / 5));

      markdown += `
| **${statName}** | ${value} | \`${barFill}${barEmpty}\` ${percentage}% |`;
    });

    const totalStats = pokemon.pokemon_v2_pokemonstats.reduce((sum, stat) => sum + stat.base_stat, 0);

    markdown += `
| **TOTAL** | **${totalStats}** | |

## 📏 Physical

| Attribute | Value |
|-----------|-------|
| **Height** | ${formatHeight(pokemon.height)} |
| **Weight** | ${formatWeight(pokemon.weight)} |
| **Base Experience** | ${pokemon.base_experience || "Unknown"} XP |

## 🎯 Abilities

`;

    // Add abilities
    pokemon.pokemon_v2_pokemonabilities.forEach(ability => {
      const abilityName = formatPokemonName(ability.pokemon_v2_ability.name);
      const isHidden = ability.is_hidden ? " *(Hidden)*" : "";
      const effect = ability.pokemon_v2_ability.pokemon_v2_abilityeffecttexts?.[0]?.short_effect || "No description available.";

      markdown += `
**${abilityName}**${isHidden}
${effect}

`;
    });

    markdown += `
</div>
</div>

---

`;

    // Type effectiveness section
    if (typeEffectiveness) {
      markdown += `
## ⚔️ Type Effectiveness

`;

      if (typeEffectiveness.weaknesses.length > 0) {
        markdown += `
**Weak to** (2x damage):
${typeEffectiveness.weaknesses.map(type => `${getTypeEmoji(type)} ${type}`).join(", ")}

`;
      }

      if (typeEffectiveness.resistances.length > 0) {
        markdown += `
**Resists** (0.5x damage):
${typeEffectiveness.resistances.map(type => `${getTypeEmoji(type)} ${type}`).join(", ")}

`;
      }

      if (typeEffectiveness.immunities.length > 0) {
        markdown += `
**Immune to** (0x damage):
${typeEffectiveness.immunities.map(type => `${getTypeEmoji(type)} ${type}`).join(", ")}

`;
      }

      if (typeEffectiveness.strengths.length > 0) {
        markdown += `
**Strong against** (2x damage):
${typeEffectiveness.strengths.map(type => `${getTypeEmoji(type)} ${type}`).join(", ")}

`;
      }
    }

    // Moves section (if enabled in preferences)
    if (preferences.showMoveDetails && pokemon.pokemon_v2_pokemonmoves.length > 0) {
      markdown += `
---

## 🥊 Notable Moves

| Move | Type | Power | Accuracy | PP | Learn Method |
|------|------|-------|----------|----|----|`;

      // Show top 10 most recent moves
      pokemon.pokemon_v2_pokemonmoves
        .slice(0, 10)
        .forEach(moveData => {
          const move = moveData.pokemon_v2_move;
          const moveName = formatPokemonName(move.name);
          const moveType = `${getTypeEmoji(move.pokemon_v2_type.name)} ${move.pokemon_v2_type.name}`;
          const power = move.power || "—";
          const accuracy = move.accuracy || "—";
          const pp = move.pp;
          const learnMethod = moveData.pokemon_v2_movelearnmethod.name;
          const level = moveData.level > 0 ? ` (Lv.${moveData.level})` : "";

          markdown += `
| **${moveName}** | ${moveType} | ${power} | ${accuracy}% | ${pp} | ${learnMethod}${level} |`;
        });

      markdown += `

*Showing first 10 moves. Total moves: ${pokemon.pokemon_v2_pokemonmoves.length}*
`;
    }

    return markdown;
  };

  const markdown = error
    ? `# ❌ Error\n\n${error}\n\nTry refreshing or check the Pokémon name/number.`
    : isLoading
    ? "# 🔍 Loading Pokémon...\n\nFetching Pokédex data..."
    : buildMarkdown();

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={() => loadPokemon(pokemonId)}
          />
          <ActionPanel.Section>
            <Action
              title="Random Pokémon"
              icon={Icon.Shuffle}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => {
                pokeAPI.getRandomPokemon()
                  .then(randomPoke => loadPokemon(randomPoke.id.toString()))
                  .catch(console.error);
              }}
            />
            <Action
              title="Browse Pokédex"
              icon={Icon.List}
              onAction={() => {
                console.log("Navigate to browse");
              }}
            />
            <Action
              title="Search Pokémon"
              icon={Icon.MagnifyingGlass}
              onAction={() => {
                console.log("Navigate to search");
              }}
            />
          </ActionPanel.Section>
          {pokemon && (
            <ActionPanel.Section>
              <Action.CopyToClipboard
                title="Copy Name"
                content={formatPokemonName(pokemon.name)}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Pokédex Entry"
                content={`#${pokemon.id} ${formatPokemonName(pokemon.name)} - ${pokemon.pokemon_v2_pokemontypes.map(t => t.pokemon_v2_type.name).join("/")}`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Image URL"
                content={pokeAPI.getPokemonSpriteUrl(pokemon)}
                shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
              />
            </ActionPanel.Section>
          )}
          {pokemon && (
            <ActionPanel.Section>
              <Action.OpenInBrowser
                title="View on Bulbapedia"
                url={`https://bulbapedia.bulbagarden.net/wiki/${formatPokemonName(pokemon.name).replace(" ", "_")}_(Pokémon)`}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
              />
              <Action.OpenInBrowser
                title="View on Pokémon Database"
                url={`https://pokemondb.net/pokedex/${pokemon.name}`}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
              <Action.OpenInBrowser
                title="View on Serebii"
                url={`https://serebii.net/pokemon/${pokemon.name}`}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}