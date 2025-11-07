import { List, ActionPanel, Action, Icon, getPreferenceValues } from "@vicinae/api";
import React, { useState, useEffect } from "react";
import { PokeAPI } from "./api";
import { PokemonV2, PokedexPreferences } from "./types";

export default function Command() {
  const [pokemon, setPokemon] = useState<PokemonV2[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const preferences = getPreferenceValues<PokedexPreferences>();
  const pokeAPI = new PokeAPI(preferences);

  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    loadPokemon(0, true);
  }, [preferences.generation]);

  const loadPokemon = async (pageNumber = 0, reset = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const offset = pageNumber * ITEMS_PER_PAGE;
      const newPokemon = await pokeAPI.browsePokemon(offset, ITEMS_PER_PAGE);

      if (reset) {
        setPokemon(newPokemon);
      } else {
        setPokemon(prev => [...prev, ...newPokemon]);
      }

      setHasMore(newPokemon.length === ITEMS_PER_PAGE);
      setPage(pageNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Pokémon");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      loadPokemon(page + 1, false);
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
      searchBarPlaceholder="Search Pokémon by name or number..."
      filtering={false}
      onSearchTextChange={(searchText) => {
        if (searchText.length > 2) {
          // Implement search functionality
          setIsLoading(true);
          pokeAPI.searchPokemon(searchText, 20)
            .then(results => {
              setPokemon(results);
              setHasMore(false);
              setIsLoading(false);
            })
            .catch(err => {
              setError(err.message);
              setIsLoading(false);
            });
        } else if (searchText.length === 0) {
          // Reset to browse mode
          loadPokemon(0, true);
        }
      }}
    >
      {error ? (
        <List.Item
          title="Error"
          subtitle={error}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={() => loadPokemon(0, true)}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
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
                        // Navigate to pokemon detail view
                        console.log(`View details for ${poke.name} (${poke.id})`);
                      }}
                    />
                    <ActionPanel.Section>
                      <Action
                        title="Search Similar Type"
                        icon={Icon.MagnifyingGlass}
                        onAction={() => {
                          const primaryType = types[0];
                          console.log(`Search for ${primaryType} type Pokemon`);
                        }}
                      />
                      <Action
                        title="Random Pokémon"
                        icon={Icon.Shuffle}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={() => {
                          pokeAPI.getRandomPokemon()
                            .then(randomPoke => {
                              console.log(`Random Pokemon: ${randomPoke.name}`);
                            })
                            .catch(console.error);
                        }}
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

          {hasMore && !isLoading && (
            <List.Item
              title="Load More Pokémon"
              icon={Icon.Plus}
              actions={
                <ActionPanel>
                  <Action
                    title="Load More"
                    icon={Icon.Plus}
                    onAction={loadMore}
                  />
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </List>
  );
}