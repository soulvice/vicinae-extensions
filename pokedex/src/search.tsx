import { List, ActionPanel, Action, Icon, getPreferenceValues } from "@vicinae/api";
import React, { useState, useEffect } from "react";
import { PokeAPI } from "./api";
import { PokemonV2, PokedexPreferences } from "./types";

export default function Command() {
  const [pokemon, setPokemon] = useState<PokemonV2[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const preferences = getPreferenceValues<PokedexPreferences>();
  const pokeAPI = new PokeAPI(preferences);

  useEffect(() => {
    if (searchText.length > 0) {
      performSearch(searchText);
    } else {
      setPokemon([]);
      setError(null);
    }
  }, [searchText]);

  const performSearch = async (query: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const results = await pokeAPI.searchPokemon(query, 50);
      setPokemon(results);

      if (results.length === 0) {
        setError("No Pokémon found matching your search");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setPokemon([]);
    } finally {
      setIsLoading(false);
    }
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

  const formatPokemonName = (name: string): string => {
    return name
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getGenerationName = (genId: number): string => {
    const generations: Record<number, string> = {
      1: "Kanto",
      2: "Johto",
      3: "Hoenn",
      4: "Sinnoh",
      5: "Unova",
      6: "Kalos",
      7: "Alola",
      8: "Galar",
      9: "Paldea"
    };

    return generations[genId] || `Gen ${genId}`;
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by Pokémon name, number, or type..."
      filtering={false}
    >
      <List.EmptyView
        title="Search Pokédex"
        description="Enter a Pokémon name, Pokédex number, or type to search"
        icon={Icon.MagnifyingGlass}
        actions={
          <ActionPanel>
            <Action
              title="Random Pokémon"
              icon={Icon.Shuffle}
              onAction={() => {
                pokeAPI.getRandomPokemon()
                  .then(randomPoke => {
                    setSearchText(randomPoke.name);
                  })
                  .catch(console.error);
              }}
            />
            <Action
              title="Browse All Pokémon"
              icon={Icon.List}
              onAction={() => {
                console.log("Navigate to browse");
              }}
            />
          </ActionPanel>
        }
      />

      {error && (
        <List.Item
          title="No Results"
          subtitle={error}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action
                title="Try Different Search"
                icon={Icon.MagnifyingGlass}
                onAction={() => setSearchText("")}
              />
              <Action
                title="Random Pokémon"
                icon={Icon.Shuffle}
                onAction={() => {
                  pokeAPI.getRandomPokemon()
                    .then(randomPoke => {
                      setSearchText(randomPoke.name);
                    })
                    .catch(console.error);
                }}
              />
            </ActionPanel>
          }
        />
      )}

      {pokemon.map((poke) => {
        const types = poke.pokemon_v2_pokemontypes.map(t => t.pokemon_v2_type.name);
        const typeString = types.map(type => `${getTypeEmoji(type)} ${type}`).join(" ");
        const generation = poke.pokemon_v2_pokemonspecy?.pokemon_v2_generation;

        return (
          <List.Item
            key={poke.id}
            title={`#${poke.id.toString().padStart(3, "0")} ${formatPokemonName(poke.name)}`}
            subtitle={typeString}
            accessories={[
              {
                text: generation ? getGenerationName(generation.id) : "Unknown",
              },
            ]}
            icon={{
              source: pokeAPI.getPokemonSpriteUrl(poke),
              fallback: Icon.QuestionMark,
            }}
            actions={
              <ActionPanel>
                <Action
                  title="View Details"
                  icon={Icon.Eye}
                  onAction={() => {
                    console.log(`View details for ${poke.name} (${poke.id})`);
                  }}
                />
                <ActionPanel.Section>
                  <Action
                    title="Search Similar Type"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => {
                      const primaryType = types[0];
                      setSearchText(primaryType);
                    }}
                  />
                  <Action
                    title="Random Pokémon"
                    icon={Icon.Shuffle}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => {
                      pokeAPI.getRandomPokemon()
                        .then(randomPoke => {
                          setSearchText(randomPoke.name);
                        })
                        .catch(console.error);
                    }}
                  />
                  <Action
                    title="Clear Search"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd"], key: "delete" }}
                    onAction={() => setSearchText("")}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Name"
                    content={formatPokemonName(poke.name)}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Pokédex Number"
                    content={`#${poke.id}`}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="View on Bulbapedia"
                    url={`https://bulbapedia.bulbagarden.net/wiki/${formatPokemonName(poke.name).replace(" ", "_")}_(Pokémon)`}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                  />
                  <Action.OpenInBrowser
                    title="View on Pokémon Database"
                    url={`https://pokemondb.net/pokedex/${poke.name}`}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}