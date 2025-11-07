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
      setError(err instanceof Error ? err.message : "Failed to load Pokemon");
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

    // Create a true side-by-side layout with image on left and specs on right
    let markdown = `
# ${formatPokemonName(pokemon.name)} • #${pokemon.id.toString().padStart(3, "0")}

<table>
<tr>
<td width="200" style="vertical-align: top; text-align: center;">

![${pokemon.name}](${spriteUrl})

**🏷️ ${typeString}**

${preferences.showShinySprites ? `
---
**✨ SHINY FORM**

![Shiny ${pokemon.name}](${shinySpriteUrl})
` : ""}

</td>
<td width="400" style="vertical-align: top; padding-left: 20px;">

## 📋 BASIC INFORMATION

**Height:** ${formatHeight(pokemon.height)}
**Weight:** ${formatWeight(pokemon.weight)}
**Base Experience:** ${pokemon.base_experience || "Unknown"} XP

## 🔗 CLASSIFICATION

**Generation:** ${pokemon.pokemon_v2_pokemonspecy?.pokemon_v2_generation?.name?.replace('generation-', 'Gen ').toUpperCase() || 'Unknown'}
**Species Color:** ${pokemon.pokemon_v2_pokemonspecy?.pokemon_v2_pokemoncolor?.name?.toUpperCase() || 'Unknown'}

## 📖 POKÉDEX ENTRY

${flavorText}

</td>
</tr>
</table>

---

## 📊 BASE STATS

| Stat | Value | Distribution | Rating |
|------|:-----:|:------------:|:------:|`;

    // Add base stats with better visualization
    pokemon.pokemon_v2_pokemonstats.forEach(stat => {
      const statName = getStatName(stat.pokemon_v2_stat.name);
      const value = stat.base_stat;
      const percentage = Math.round((value / 255) * 100);
      // Create a more visual representation
      const bars = Math.floor(percentage / 5);
      const barDisplay = "█".repeat(bars) + "░".repeat(20 - bars);

      // Add color context based on stat quality
      let quality = "";
      if (percentage >= 80) quality = "🔥 Elite";
      else if (percentage >= 65) quality = "💪 Strong";
      else if (percentage >= 45) quality = "👍 Average";
      else quality = "📉 Weak";

      markdown += `
| **${statName}** | **${value}** | \`${barDisplay}\` ${percentage}% | ${quality} |`;
    });

    const totalStats = pokemon.pokemon_v2_pokemonstats.reduce((sum, stat) => sum + stat.base_stat, 0);

    markdown += `
| **TOTAL** | **${totalStats}** | | |

## 🎯 ABILITIES

`;

    // Add abilities in a more structured format
    const normalAbilities = pokemon.pokemon_v2_pokemonabilities.filter(a => !a.is_hidden);
    const hiddenAbilities = pokemon.pokemon_v2_pokemonabilities.filter(a => a.is_hidden);

    if (normalAbilities.length > 0) {
      markdown += `**Normal Abilities:**\n`;
      normalAbilities.forEach((ability, index) => {
        const abilityName = formatPokemonName(ability.pokemon_v2_ability.name);
        markdown += `${index + 1}. **${abilityName}**\n`;
      });
      markdown += `\n`;
    }

    if (hiddenAbilities.length > 0) {
      markdown += `**Hidden Abilities:**\n`;
      hiddenAbilities.forEach((ability) => {
        const abilityName = formatPokemonName(ability.pokemon_v2_ability.name);
        markdown += `🔒 **${abilityName}** *(Hidden)*\n`;
      });
      markdown += `\n`;
    }

    markdown += `
---

`;

    // Type effectiveness section with better organization
    if (typeEffectiveness) {
      markdown += `
## ⚔️ BATTLE EFFECTIVENESS

| Interaction | Types | Damage Multiplier |
|-------------|-------|:----------------:|`;

      if (typeEffectiveness.weaknesses.length > 0) {
        const weaknessTypes = typeEffectiveness.weaknesses.map(type => `${getTypeEmoji(type)} ${type}`).join(", ");
        markdown += `
| **🔴 Weak To** | ${weaknessTypes} | **2.0x** |`;
      }

      if (typeEffectiveness.resistances.length > 0) {
        const resistanceTypes = typeEffectiveness.resistances.map(type => `${getTypeEmoji(type)} ${type}`).join(", ");
        markdown += `
| **🟢 Resists** | ${resistanceTypes} | **0.5x** |`;
      }

      if (typeEffectiveness.immunities.length > 0) {
        const immunityTypes = typeEffectiveness.immunities.map(type => `${getTypeEmoji(type)} ${type}`).join(", ");
        markdown += `
| **🛡️ Immune To** | ${immunityTypes} | **0.0x** |`;
      }

      if (typeEffectiveness.strengths.length > 0) {
        const strengthTypes = typeEffectiveness.strengths.map(type => `${getTypeEmoji(type)} ${type}`).join(", ");
        markdown += `
| **💥 Strong Against** | ${strengthTypes} | **2.0x** |`;
      }

      markdown += `

`;
    }

    // Moves section (if enabled in preferences)
    if (preferences.showMoveDetails && pokemon.pokemon_v2_pokemonmoves.length > 0) {
      markdown += `
---

## 🥊 MOVESET

`;

      // Group moves by learn method
      const movesByMethod: Record<string, any[]> = {};
      pokemon.pokemon_v2_pokemonmoves.forEach(moveData => {
        const method = moveData.pokemon_v2_movelearnmethod.name;
        if (!movesByMethod[method]) movesByMethod[method] = [];
        movesByMethod[method].push(moveData);
      });

      // Show level-up moves first, then other methods
      const methodOrder = ['level-up', 'machine', 'tutor', 'egg'];

      methodOrder.forEach(method => {
        if (movesByMethod[method] && movesByMethod[method].length > 0) {
          const methodName = method === 'level-up' ? 'Level Up' :
                           method === 'machine' ? 'TM/TR' :
                           method === 'tutor' ? 'Move Tutor' :
                           method === 'egg' ? 'Egg Moves' : method;

          markdown += `
**${methodName}** (${movesByMethod[method].length} moves)

| Move | Type | Power | Acc | PP | Level |
|------|------|-------|-----|----|----|`;

          movesByMethod[method]
            .slice(0, 8) // Show first 8 moves per method
            .forEach(moveData => {
              const move = moveData.pokemon_v2_move;
              const moveName = formatPokemonName(move.name);
              const moveType = `${getTypeEmoji(move.pokemon_v2_type.name)} ${move.pokemon_v2_type.name}`;
              const power = move.power || "—";
              const accuracy = move.accuracy || "—";
              const pp = move.pp || "—";
              const level = moveData.level > 0 ? moveData.level : "—";

              markdown += `
| **${moveName}** | ${moveType} | ${power} | ${accuracy} | ${pp} | ${level} |`;
            });

          markdown += `

`;
        }
      });

      markdown += `
*Showing primary moves. Total moves available: ${pokemon.pokemon_v2_pokemonmoves.length}*

`;
    }

    return markdown;
  };

  const markdown = error
    ? `# ❌ Error\n\n${error}\n\nTry refreshing or check the Pokemon name/number.`
    : isLoading
    ? "# 🔍 Loading Pokemon...\n\nFetching Pokedex data..."
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
              title="Random Pokemon"
              icon={Icon.Shuffle}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => {
                pokeAPI.getRandomPokemon()
                  .then(randomPoke => loadPokemon(randomPoke.id.toString()))
                  .catch(console.error);
              }}
            />
            <Action
              title="Browse Pokedex"
              icon={Icon.List}
              onAction={() => {
                console.log("Navigate to browse");
              }}
            />
            <Action
              title="Search Pokemon"
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
                title="Copy Pokedex Entry"
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
                url={`https://bulbapedia.bulbagarden.net/wiki/${formatPokemonName(pokemon.name).replace(" ", "_")}_(Pokemon)`}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
              />
              <Action.OpenInBrowser
                title="View on Pokemon Database"
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