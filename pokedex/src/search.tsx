import { Grid, ActionPanel, Action, Icon, getPreferenceValues, Color } from "@vicinae/api";
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

  // Pokemon detail component - following Tailscale Devices pattern
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