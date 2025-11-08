import { Grid, ActionPanel, Action, Icon, getPreferenceValues, Color } from "@vicinae/api";
import React, { useState, useEffect, useCallback } from "react";
import { PokeAPI } from "./api";
import { PokemonV2, PokedexPreferences, GenerationGroup } from "./types";
import TypeDropdown from "./components/type_dropdown";

export default function Command() {
  const [pokemon, setPokemon] = useState<PokemonV2[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showingDetail, setShowingDetail] = useState(true);

  const preferences = getPreferenceValues<PokedexPreferences>();
  const pokeAPI = new PokeAPI(preferences);

  const ITEMS_PER_PAGE = 50;

  const toggleDetails = useCallback(() => {
    setShowingDetail(!showingDetail);
  }, [showingDetail]);

  useEffect(() => {
    loadPokemon(0, true);
  }, [preferences.generation, selectedType]);

  const loadPokemon = async (pageNumber = 0, reset = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const offset = pageNumber * ITEMS_PER_PAGE;
      const newPokemon = await pokeAPI.browsePokemon(offset, ITEMS_PER_PAGE, selectedType);

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
      1: "Generation I - Kanto",
      2: "Generation II - Johto",
      3: "Generation III - Hoenn",
      4: "Generation IV - Sinnoh",
      5: "Generation V - Unova",
      6: "Generation VI - Kalos",
      7: "Generation VII - Alola",
      8: "Generation VIII - Galar",
      9: "Generation IX - Paldea"
    };

    return generations[genId] || `Generation ${genId}`;
  };

  const groupPokemonByGeneration = (pokemonList: PokemonV2[]): GenerationGroup[] => {
    const grouped: { [key: number]: PokemonV2[] } = {};

    pokemonList.forEach(poke => {
      const genId = poke.pokemon_v2_pokemonspecy?.pokemon_v2_generation?.id || 0;
      if (!grouped[genId]) {
        grouped[genId] = [];
      }
      grouped[genId].push(poke);
    });

    return Object.entries(grouped)
      .map(([genId, pokeList]) => ({
        generation: parseInt(genId),
        title: getGenerationName(parseInt(genId)),
        pokemon: pokeList.sort((a, b) => a.id - b.id)
      }))
      .sort((a, b) => a.generation - b.generation);
  };

  // Pokemon detail component
  const PokemonDetail = ({ pokemon: poke }: { pokemon: PokemonV2 }) => {
    const types = poke.pokemon_v2_pokemontypes.map(t => t.pokemon_v2_type.name);
    const primaryType = types[0];
    const generation = poke.pokemon_v2_pokemonspecy?.pokemon_v2_generation;

    // Safe flavor text access with proper null checking
    const flavorText = poke.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonspeciesflavortexts
      ?.find(text => text.pokemon_v2_language.name === "en")?.flavor_text
      ?.replace(/\f/g, ' ')?.replace(/\n/g, ' ') || "Click to view full details in Pokemon command";

    // Get stats with null checking
    const stats = poke.pokemon_v2_pokemonstats || [];
    const hp = stats.find(s => s.pokemon_v2_stat.name === "hp")?.base_stat || null;
    const attack = stats.find(s => s.pokemon_v2_stat.name === "attack")?.base_stat || null;
    const defense = stats.find(s => s.pokemon_v2_stat.name === "defense")?.base_stat || null;
    const speed = stats.find(s => s.pokemon_v2_stat.name === "speed")?.base_stat || null;

    // Get abilities with null checking
    const abilities = (poke.pokemon_v2_pokemonabilities || [])
      .sort((a, b) => a.slot - b.slot)
      .map(ability => {
        const name = formatPokemonName(ability.pokemon_v2_ability.name);
        return ability.is_hidden ? `${name} (Hidden)` : name;
      });

    return (
      <Grid.Item.Detail
        metadata={
          <Grid.Item.Detail.Metadata>
            <Grid.Item.Detail.Metadata.Label title="Name" text={formatPokemonName(poke.name)} />
            <Grid.Item.Detail.Metadata.Label title="Pokedex #" text={`#${poke.id.toString().padStart(3, "0")}`} />
            <Grid.Item.Detail.Metadata.Separator />

            <Grid.Item.Detail.Metadata.Label title="Type(s)" text={types.map(type =>
              `${getTypeEmoji(type)} ${type.toUpperCase()}`).join("  ")} />

            {generation && (
              <Grid.Item.Detail.Metadata.Label
                title="Generation"
                text={getGenerationName(generation.id)}
                icon={{
                  source: Icon.Globe,
                  tintColor: getTypeColor(primaryType),
                }}
              />
            )}

            {poke.height != null && (
              <Grid.Item.Detail.Metadata.Label
                title="Height"
                text={`${(poke.height / 10).toFixed(1)} m`}
                icon={{
                  source: Icon.Ruler,
                  tintColor: Color.Secondary,
                }}
              />
            )}
            {poke.weight != null && (
              <Grid.Item.Detail.Metadata.Label
                title="Weight"
                text={`${(poke.weight / 10).toFixed(1)} kg`}
                icon={{
                  source: Icon.BarChart,
                  tintColor: Color.Secondary,
                }}
              />
            )}

            {(hp !== null || attack !== null || defense !== null || speed !== null) && (
              <>
                <Grid.Item.Detail.Metadata.Separator />
                <Grid.Item.Detail.Metadata.Label title="Base Stats" />
                {hp !== null && <Grid.Item.Detail.Metadata.Label title="HP" text={hp.toString()} />}
                {attack !== null && <Grid.Item.Detail.Metadata.Label title="Attack" text={attack.toString()} />}
                {defense !== null && <Grid.Item.Detail.Metadata.Label title="Defense" text={defense.toString()} />}
                {speed !== null && <Grid.Item.Detail.Metadata.Label title="Speed" text={speed.toString()} />}
              </>
            )}

            {abilities.length > 0 && (
              <>
                <Grid.Item.Detail.Metadata.Separator />
                <Grid.Item.Detail.Metadata.Label title="Abilities" text={abilities.join(", ")} />
              </>
            )}

            <Grid.Item.Detail.Metadata.Separator />

            <Grid.Item.Detail.Metadata.Label title="Description" text={flavorText} />
          </Grid.Item.Detail.Metadata>
        }
      />
    );
  };

  const generationGroups = groupPokemonByGeneration(pokemon);

  return (
    <Grid
      columns={4}
      isLoading={isLoading}
      searchBarPlaceholder="Search Pokemon by name or number..."
      filtering={false}
      isShowingDetail={showingDetail}
      searchBarAccessory={<TypeDropdown type="grid" command="Pokemon" onSelectType={setSelectedType} />}
      onSearchTextChange={(searchText) => {
        if (searchText.length > 2) {
          // Implement search functionality
          setIsLoading(true);
          pokeAPI.searchPokemon(searchText, 20, selectedType)
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
        <Grid.Item
          content={Icon.ExclamationMark}
          title="Error"
          subtitle={error}
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
          {generationGroups.map((group) => (
            <Grid.Section key={group.generation} title={group.title}>
              {group.pokemon.map((poke) => {
                const types = poke.pokemon_v2_pokemontypes.map(t => t.pokemon_v2_type.name);
                const primaryType = types[0];

                return (
                  <Grid.Item
                    key={poke.id}
                    content={{
                      source: pokeAPI.getPokemonSpriteUrl(poke),
                      fallback: {
                        source: Icon.QuestionMark,
                        tintColor: getTypeColor(primaryType),
                      }
                    }}
                    title={formatPokemonName(poke.name)}
                    subtitle={`#${poke.id.toString().padStart(3, "0")}`}
                    keywords={[poke.id.toString(), poke.name, ...types]}
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
                        <ActionPanel.Section title="Filter">
                          <Action
                            title={`Filter ${primaryType.charAt(0).toUpperCase() + primaryType.slice(1)} Types`}
                            icon={Icon.MagnifyingGlass}
                            onAction={() => {
                              setSelectedType(primaryType);
                            }}
                          />
                          <Action
                            title="Clear Filter"
                            icon={Icon.XMark}
                            onAction={() => {
                              setSelectedType("all");
                            }}
                          />
                        </ActionPanel.Section>
                        <ActionPanel.Section title="Actions">
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
            </Grid.Section>
          ))}

          {hasMore && !isLoading && (
            <Grid.Item
              content={Icon.Plus}
              title="Load More Pokemon"
              subtitle="Click to load more"
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
    </Grid>
  );
}