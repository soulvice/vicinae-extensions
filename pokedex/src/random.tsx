import { Detail, ActionPanel, Action, Icon, getPreferenceValues } from "@vicinae/api";
import React, { useState, useEffect } from "react";
import { PokeAPI } from "./api";
import { PokemonV2, PokedexPreferences } from "./types";

export default function Command() {
  const [pokemon, setPokemon] = useState<PokemonV2 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<PokemonV2[]>([]);

  const preferences = getPreferenceValues<PokedexPreferences>();
  const pokeAPI = new PokeAPI(preferences);

  useEffect(() => {
    loadRandomPokemon();
  }, []);

  const loadRandomPokemon = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const randomPokemon = await pokeAPI.getRandomPokemon();
      setPokemon(randomPokemon);

      // Add to history (keep last 10)
      setHistory(prev => {
        const newHistory = [randomPokemon, ...prev.filter(p => p.id !== randomPokemon.id)];
        return newHistory.slice(0, 10);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load random Pokémon");
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

  const buildMarkdown = (): string => {
    if (!pokemon) return "";

    const types = pokemon.pokemon_v2_pokemontypes.map(t => t.pokemon_v2_type.name);
    const typeString = types.map(type => `${getTypeEmoji(type)} **${type.toUpperCase()}**`).join(" ");

    const generation = pokemon.pokemon_v2_pokemonspecy?.pokemon_v2_generation;
    const flavorText = pokemon.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonspeciesflavortexts?.[0]?.flavor_text
      ?.replace(/\n|\f/g, " ")
      ?.replace(/\s+/g, " ") || "No description available.";

    const spriteUrl = pokeAPI.getPokemonSpriteUrl(pokemon);

    let markdown = `
# 🎲 Random Pokémon

## ${formatPokemonName(pokemon.name)}
### Pokédex #${pokemon.id.toString().padStart(3, "0")}

![${pokemon.name}](${spriteUrl})

### ${typeString}

> ${flavorText}

---

## Quick Stats

| Attribute | Value |
|-----------|-------|
| **Height** | ${formatHeight(pokemon.height)} |
| **Weight** | ${formatWeight(pokemon.weight)} |
| **Generation** | ${generation ? generation.name.replace("generation-", "").toUpperCase() : "Unknown"} |
| **Base Experience** | ${pokemon.base_experience || "Unknown"} XP |

## Base Stats Summary

`;

    // Add quick stats overview
    const stats = pokemon.pokemon_v2_pokemonstats;
    const totalStats = stats.reduce((sum, stat) => sum + stat.base_stat, 0);

    stats.forEach(stat => {
      const statName = stat.pokemon_v2_stat.name;
      const displayName = statName === "hp" ? "HP" :
                          statName === "attack" ? "Attack" :
                          statName === "defense" ? "Defense" :
                          statName === "special-attack" ? "Sp. Attack" :
                          statName === "special-defense" ? "Sp. Defense" :
                          statName === "speed" ? "Speed" : statName;

      markdown += `**${displayName}**: ${stat.base_stat}  `;
    });

    markdown += `

**Total Base Stats**: ${totalStats}

`;

    // Show abilities
    if (pokemon.pokemon_v2_pokemonabilities.length > 0) {
      markdown += `
## Abilities

`;

      pokemon.pokemon_v2_pokemonabilities.forEach(ability => {
        const abilityName = formatPokemonName(ability.pokemon_v2_ability.name);
        const isHidden = ability.is_hidden ? " *(Hidden Ability)*" : "";

        markdown += `• **${abilityName}**${isHidden}
`;
      });

      markdown += "\n";
    }

    // Show recent history
    if (history.length > 1) {
      markdown += `
---

## 📖 Recent Random Pokémon

`;

      history.slice(1, 6).forEach((historyPoke, index) => {
        const historyTypes = historyPoke.pokemon_v2_pokemontypes.map(t => t.pokemon_v2_type.name);
        const historyTypeString = historyTypes.map(type => getTypeEmoji(type)).join("");

        markdown += `${index + 2}. **#${historyPoke.id} ${formatPokemonName(historyPoke.name)}** ${historyTypeString}
`;
      });
    }

    return markdown;
  };

  const markdown = error
    ? `# 🎲 Random Pokémon Error\n\n${error}\n\nTry getting another random Pokémon.`
    : isLoading
    ? "# 🎲 Getting Random Pokémon...\n\nFinding a surprise Pokémon for you!"
    : buildMarkdown();

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Get Another Random Pokémon"
            icon={Icon.Shuffle}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={loadRandomPokemon}
          />
          {pokemon && (
            <Action
              title="View Full Details"
              icon={Icon.Eye}
              onAction={() => {
                console.log(`View full details for ${pokemon.name} (${pokemon.id})`);
              }}
            />
          )}
          <ActionPanel.Section>
            <Action
              title="Search Pokédex"
              icon={Icon.MagnifyingGlass}
              onAction={() => {
                console.log("Navigate to search");
              }}
            />
            <Action
              title="Browse Pokédex"
              icon={Icon.List}
              onAction={() => {
                console.log("Navigate to browse");
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
                content={`#${pokemon.id} ${formatPokemonName(pokemon.name)}`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
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
            </ActionPanel.Section>
          )}
          {history.length > 1 && (
            <ActionPanel.Section title="Recent Random Pokémon">
              {history.slice(1, 4).map((historyPoke) => (
                <Action
                  key={historyPoke.id}
                  title={`#${historyPoke.id} ${formatPokemonName(historyPoke.name)}`}
                  icon={Icon.Eye}
                  onAction={() => {
                    console.log(`View ${historyPoke.name} from history`);
                  }}
                />
              ))}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}