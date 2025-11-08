import { Grid, ActionPanel, Action, Icon, getPreferenceValues, Color } from "@vicinae/api";
import PokemonDetail from "./pokemon";
import React, { useState, useEffect, useCallback } from "react";
import { PokeAPI } from "./api";
import { PokemonV2, PokedexPreferences } from "./types";
import TypeDropdown from "./components/type_dropdown";

export default function Command() {
  const [pokemon, setPokemon] = useState<PokemonV2[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showingDetail, setShowingDetail] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");

  const preferences = getPreferenceValues<PokedexPreferences>();
  const pokeAPI = new PokeAPI(preferences);

  const toggleDetails = useCallback(() => {
    setShowingDetail(!showingDetail);
  }, [showingDetail]);

  const performSearch = useCallback(async (query: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const results = await pokeAPI.searchPokemon(query, 50, selectedType);
      setPokemon(results);

      if (results.length === 0) {
        setError("No Pokemon found matching your search");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setPokemon([]);
    } finally {
      setIsLoading(false);
    }
  }, [pokeAPI, selectedType]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchText.length > 0 && !isLoading) {
        performSearch(searchText);
      } else if (searchText.length === 0) {
        setPokemon([]);
        setError(null);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchText, selectedType, isLoading, performSearch]);

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


  return (
    <Grid
      columns={4}
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by Pokemon name, number, or type..."
      filtering={false}
      isShowingDetail={showingDetail}
      searchBarAccessory={<TypeDropdown type="grid" command="Search" onSelectType={setSelectedType} />}
      actions={
        <ActionPanel>
          <Action
            title={showingDetail ? "Hide Details" : "Show Details"}
            icon={showingDetail ? Icon.EyeDisabled : Icon.Eye}
            onAction={toggleDetails}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
          <Action
            title="Random Pokemon"
            icon={Icon.Shuffle}
            onAction={() => {
              pokeAPI.getRandomPokemon()
                .then(randomPoke => {
                  setSearchText(randomPoke.name);
                })
                .catch(console.error);
            }}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Clear Search"
            icon={Icon.Trash}
            onAction={() => setSearchText("")}
            shortcut={{ modifiers: ["cmd"], key: "delete" }}
          />
        </ActionPanel>
      }
    >
      <Grid.EmptyView
        title="Search Pokedex"
        description="Enter a Pokemon name, Pokedex number, or type to search"
        icon={Icon.MagnifyingGlass}
        actions={
          <ActionPanel>
            <Action
              title="Random Pokemon"
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
              title="Clear Filter"
              icon={Icon.XMark}
              onAction={() => setSelectedType("all")}
            />
          </ActionPanel>
        }
      />

      {error && (
        <Grid.Item
          content={Icon.ExclamationMark}
          title="No Results"
          subtitle={error}
          actions={
            <ActionPanel>
              <Action
                title="Try Different Search"
                icon={Icon.MagnifyingGlass}
                onAction={() => setSearchText("")}
              />
              <Action
                title="Random Pokemon"
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
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  icon={Icon.Eye}
                  target={<PokemonDetail pokemonId={poke.id.toString()} />}
                  shortcut={{ modifiers: ["cmd"], key: "enter" }}
                />
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
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}