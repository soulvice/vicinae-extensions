import { List, ActionPanel, Action, Icon, getPreferenceValues, Color } from "@vicinae/api";
import React, { useState, useEffect, useCallback } from "react";
import { PokeAPI } from "./api";
import { PokemonV2, PokedexPreferences } from "./types";

export default function Command() {
  const [pokemon, setPokemon] = useState<PokemonV2[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showingDetail, setShowingDetail] = useState(true);

  const preferences = getPreferenceValues<PokedexPreferences>();
  const pokeAPI = new PokeAPI(preferences);

  const ITEMS_PER_PAGE = 50;

  const toggleDetails = useCallback(() => {
    setShowingDetail(!showingDetail);
  }, [showingDetail]);

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
      setError(err instanceof Error ? err.message : "Failed to load Pokemon");
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

  // Pokemon detail component
  const PokemonDetail = ({ pokemon: poke }: { pokemon: PokemonV2 }) => {
    const types = poke.pokemon_v2_pokemontypes.map(t => t.pokemon_v2_type.name);
    const primaryType = types[0];
    const generation = poke.pokemon_v2_pokemonspecy?.pokemon_v2_generation;
    const flavorText = poke.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonspeciesflavortexts
      .find(text => text.pokemon_v2_language.name === "en")?.flavor_text
      .replace(/\f/g, ' ').replace(/\n/g, ' ') || "No description available";

    // Get stats
    const stats = poke.pokemon_v2_pokemonstats;
    const hp = stats.find(s => s.pokemon_v2_stat.name === "hp")?.base_stat || 0;
    const attack = stats.find(s => s.pokemon_v2_stat.name === "attack")?.base_stat || 0;
    const defense = stats.find(s => s.pokemon_v2_stat.name === "defense")?.base_stat || 0;
    const speed = stats.find(s => s.pokemon_v2_stat.name === "speed")?.base_stat || 0;

    // Get abilities
    const abilities = poke.pokemon_v2_pokemonabilities
      .sort((a, b) => a.slot - b.slot)
      .map(ability => {
        const name = formatPokemonName(ability.pokemon_v2_ability.name);
        return ability.is_hidden ? `${name} (Hidden)` : name;
      });

    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Name" text={formatPokemonName(poke.name)} />
            <List.Item.Detail.Metadata.Label title="Pokedex #" text={`#${poke.id.toString().padStart(3, "0")}`} />
            <List.Item.Detail.Metadata.Separator />

            <List.Item.Detail.Metadata.Label title="Type(s)" text={types.map(type =>
              `${getTypeEmoji(type)} ${type.toUpperCase()}`).join("  ")} />

            {generation && (
              <List.Item.Detail.Metadata.Label
                title="Generation"
                text={getGenerationName(generation.id)}
                icon={{
                  source: Icon.Globe,
                  tintColor: getTypeColor(primaryType),
                }}
              />
            )}

            <List.Item.Detail.Metadata.Label
              title="Height"
              text={`${(poke.height / 10).toFixed(1)} m`}
              icon={{
                source: Icon.Ruler,
                tintColor: Color.Secondary,
              }}
            />
            <List.Item.Detail.Metadata.Label
              title="Weight"
              text={`${(poke.weight / 10).toFixed(1)} kg`}
              icon={{
                source: Icon.BarChart,
                tintColor: Color.Secondary,
              }}
            />

            <List.Item.Detail.Metadata.Separator />

            <List.Item.Detail.Metadata.Label title="Base Stats" />
            <List.Item.Detail.Metadata.Label title="HP" text={hp.toString()} />
            <List.Item.Detail.Metadata.Label title="Attack" text={attack.toString()} />
            <List.Item.Detail.Metadata.Label title="Defense" text={defense.toString()} />
            <List.Item.Detail.Metadata.Label title="Speed" text={speed.toString()} />

            <List.Item.Detail.Metadata.Separator />

            <List.Item.Detail.Metadata.Label title="Abilities" text={abilities.join(", ")} />

            <List.Item.Detail.Metadata.Separator />

            <List.Item.Detail.Metadata.Label title="Description" text={flavorText} />
          </List.Item.Detail.Metadata>
        }
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Pokemon by name or number..."
      filtering={false}
      isShowingDetail={showingDetail}
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
      actions={
        <ActionPanel>
          <Action
            title="Load More Pokemon"
            icon={Icon.Plus}
            onAction={loadMore}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
          <Action
            title={showingDetail ? "Hide Details" : "Show Details"}
            icon={showingDetail ? Icon.EyeDisabled : Icon.Eye}
            onAction={toggleDetails}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={() => loadPokemon(0, true)}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
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
            const primaryType = types[0];
            const typeString = types.map(type => `${getTypeEmoji(type)} ${type.toUpperCase()}`).join(" • ");
            const generation = poke.pokemon_v2_pokemonspecy?.pokemon_v2_generation;

            return (
              <List.Item
                key={poke.id}
                title={formatPokemonName(poke.name)}
                subtitle={`#${poke.id.toString().padStart(3, "0")} • ${typeString}`}
                accessories={!showingDetail ? [
                  {
                    text: generation ? getGenerationName(generation.id) : "Unknown",
                    icon: {
                      source: Icon.Globe,
                      tintColor: getTypeColor(primaryType),
                    }
                  },
                  {
                    text: `${(poke.height / 10).toFixed(1)}m, ${(poke.weight / 10).toFixed(1)}kg`,
                    icon: {
                      source: Icon.BarChart,
                      tintColor: Color.Secondary,
                    }
                  },
                ] : undefined}
                icon={{
                  source: pokeAPI.getPokemonSpriteUrl(poke),
                  fallback: {
                    source: Icon.QuestionMark,
                    tintColor: getTypeColor(primaryType),
                  }
                }}
                detail={showingDetail ? <PokemonDetail pokemon={poke} /> : undefined}
                actions={
                  <ActionPanel>
                    <Action
                      title={showingDetail ? "Hide Details" : "Show Details"}
                      icon={showingDetail ? Icon.EyeDisabled : Icon.Eye}
                      onAction={toggleDetails}
                      shortcut={{ modifiers: ["cmd"], key: "i" }}
                    />
                    <ActionPanel.Section title="External Links">
                      <Action.OpenInBrowser
                        title="View on Pokemon Database"
                        icon={Icon.Globe}
                        url={`https://pokemondb.net/pokedex/${poke.name}`}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                      />
                      <Action.OpenInBrowser
                        title="View on Bulbapedia"
                        icon={Icon.Book}
                        url={`https://bulbapedia.bulbagarden.net/wiki/${formatPokemonName(poke.name).replace(" ", "_")}_(Pokemon)`}
                        shortcut={{ modifiers: ["cmd"], key: "b" }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Copy">
                      <Action.CopyToClipboard
                        title="Copy Name"
                        icon={Icon.Clipboard}
                        content={formatPokemonName(poke.name)}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Pokedex Info"
                        icon={Icon.Clipboard}
                        content={`#${poke.id} ${formatPokemonName(poke.name)} - ${types.join("/")}`}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Search">
                      <Action
                        title={`Search ${primaryType.toUpperCase()} Types`}
                        icon={Icon.MagnifyingGlass}
                        onAction={() => {
                          console.log(`Search for ${primaryType} type Pokemon`);
                        }}
                      />
                      <Action
                        title="Random Pokemon"
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
                  </ActionPanel>
                }
              />
            );
          })}

          {hasMore && !isLoading && (
            <List.Item
              title="Load More Pokemon"
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