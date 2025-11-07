import { execSync } from "child_process";
import {
  PokemonV2,
  PokemonV2Response,
  GraphQLResponse,
  CachedPokemonData,
  PokedexPreferences,
  TypeEffectivenessChart
} from "./types";

export class PokeAPI {
  private readonly baseUrl = "https://beta.pokeapi.co/graphql/v1beta";
  private readonly restBaseUrl = "https://pokeapi.co/api/v2";
  private cacheFile = `${process.env.HOME}/.vicinae-pokedex-cache.json`;

  constructor(private preferences: PokedexPreferences) {}

  async searchPokemon(query: string, limit = 20): Promise<PokemonV2[]> {
    const searchQuery = `
      query SearchPokemon($search: String!, $limit: Int!) {
        pokemon_v2_pokemon(
          where: {
            _or: [
              { name: { _ilike: $search } },
              { id: { _eq: $search } }
            ]
          },
          limit: $limit,
          order_by: { id: asc }
        ) {
          id
          name
          height
          weight
          base_experience
          order
          pokemon_v2_pokemontypes {
            slot
            pokemon_v2_type {
              id
              name
            }
          }
          pokemon_v2_pokemonspecy {
            pokemon_v2_generation {
              id
              name
            }
          }
        }
      }
    `;

    const variables = {
      search: isNaN(Number(query)) ? `%${query}%` : Number(query),
      limit
    };

    try {
      const response = await this.executeGraphQLQuery<PokemonV2Response>(searchQuery, variables);
      return response.pokemon_v2_pokemon.filter(pokemon =>
        pokemon && pokemon.name && pokemon.id
      );
    } catch (error) {
      console.warn('Search failed:', error);
      return []; // Return empty array on search failure
    }
  }

  async getPokemon(pokemonId: number | string): Promise<PokemonV2> {
    // Check cache first if enabled
    if (this.preferences.enableCaching) {
      const cachedData = this.getCachedPokemon(pokemonId.toString());
      if (cachedData) {
        return cachedData as PokemonV2;
      }
    }

    try {
      // Use REST API instead of GraphQL for more reliability
      const pokemonUrl = `${this.restBaseUrl}/pokemon/${pokemonId.toString().toLowerCase()}`;
      const speciesUrl = `${this.restBaseUrl}/pokemon-species/${pokemonId.toString().toLowerCase()}`;

      // Fetch pokemon basic data
      const pokemonResponse = execSync(`curl -s "${pokemonUrl}"`, {
        encoding: "utf-8",
        timeout: 15000
      });

      if (!pokemonResponse || pokemonResponse.trim() === '') {
        throw new Error('Empty response from Pokemon API');
      }

      let pokemonData;
      try {
        pokemonData = JSON.parse(pokemonResponse);
      } catch (parseError) {
        // Handle HTML "Not Found" responses
        if (pokemonResponse.includes('Not Found')) {
          throw new Error(`Pokemon '${pokemonId}' not found`);
        }
        throw new Error('Invalid JSON response from Pokemon API');
      }

      if (pokemonData.detail === 'Not found.') {
        throw new Error(`Pokemon '${pokemonId}' not found`);
      }

      // Fetch species data for additional info
      let speciesData = null;
      try {
        const speciesResponse = execSync(`curl -s "${speciesUrl}"`, {
          encoding: "utf-8",
          timeout: 10000
        });
        if (speciesResponse && speciesResponse.trim() !== '') {
          speciesData = JSON.parse(speciesResponse);
        }
      } catch (error) {
        console.warn('Failed to fetch species data, using basic Pokemon data only');
      }

      // Convert REST API format to our PokemonV2 format
      const pokemon: PokemonV2 = {
        id: pokemonData.id,
        name: pokemonData.name,
        height: pokemonData.height,
        weight: pokemonData.weight,
        base_experience: pokemonData.base_experience || 0,
        order: pokemonData.order || pokemonData.id,
        pokemon_v2_pokemontypes: pokemonData.types.map((type: any) => ({
          slot: type.slot,
          pokemon_v2_type: {
            id: 0, // REST API doesn't provide type ID easily
            name: type.type.name
          }
        })),
        pokemon_v2_pokemonstats: pokemonData.stats.map((stat: any) => ({
          base_stat: stat.base_stat,
          effort: stat.effort,
          pokemon_v2_stat: {
            id: 0, // REST API doesn't provide stat ID easily
            name: stat.stat.name
          }
        })),
        pokemon_v2_pokemonabilities: pokemonData.abilities.map((ability: any) => ({
          is_hidden: ability.is_hidden,
          slot: ability.slot,
          pokemon_v2_ability: {
            id: 0, // REST API doesn't provide ability ID easily
            name: ability.ability.name
          }
        })),
        pokemon_v2_pokemonmoves: pokemonData.moves.slice(0, 50).map((moveData: any) => ({
          level: moveData.version_group_details[0]?.level_learned_at || 0,
          pokemon_v2_move: {
            id: 0, // REST API doesn't provide move ID easily
            name: moveData.move.name,
            power: null, // Would need additional API call
            accuracy: null, // Would need additional API call
            pp: null, // Would need additional API call
            pokemon_v2_type: {
              name: "unknown" // Would need additional API call
            },
            pokemon_v2_movedamageclass: {
              name: "unknown" // Would need additional API call
            }
          },
          pokemon_v2_movelearnmethod: {
            name: moveData.version_group_details[0]?.move_learn_method.name || "unknown"
          }
        })),
        pokemon_v2_pokemonspecy: {
          id: speciesData?.id || pokemonData.id,
          name: speciesData?.name || pokemonData.name,
          base_happiness: speciesData?.base_happiness || 50,
          capture_rate: speciesData?.capture_rate || 45,
          pokemon_v2_pokemoncolor: {
            name: speciesData?.color?.name || "unknown"
          },
          pokemon_v2_generation: {
            id: speciesData?.generation?.url?.match(/\/(\d+)\/$/)?.[1] ?
                parseInt(speciesData.generation.url.match(/\/(\d+)\/$/)[1]) : 1,
            name: speciesData?.generation?.name || "generation-i"
          }
        }
      };

      // Validate pokemon data
      if (!pokemon.name || !pokemon.id) {
        throw new Error(`Invalid Pokemon data received for ${pokemonId}`);
      }

      // Ensure required nested data exists
      if (!pokemon.pokemon_v2_pokemontypes || pokemon.pokemon_v2_pokemontypes.length === 0) {
        throw new Error(`Pokemon ${pokemon.name} has no type information`);
      }

      // Cache the data if caching is enabled
      if (this.preferences.enableCaching) {
        this.setCachedPokemon(pokemonId.toString(), pokemon);
      }

      return pokemon;

    } catch (error) {
      throw new Error(`Failed to fetch Pokemon data: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async getRandomPokemon(): Promise<PokemonV2> {
    let attempts = 0;
    const maxAttempts = 5; // Prevent infinite loops

    // Define generation ranges to improve success rate
    const generationRanges = [
      { min: 1, max: 151 },     // Gen 1 (Kanto)
      { min: 152, max: 251 },   // Gen 2 (Johto)
      { min: 252, max: 386 },   // Gen 3 (Hoenn)
      { min: 387, max: 493 },   // Gen 4 (Sinnoh)
      { min: 494, max: 649 },   // Gen 5 (Unova)
      { min: 650, max: 721 },   // Gen 6 (Kalos)
      { min: 722, max: 809 },   // Gen 7 (Alola)
      { min: 810, max: 905 }    // Gen 8 (Galar) - conservative upper limit
    ];

    while (attempts < maxAttempts) {
      try {
        // If user specified generation preference, use that range
        let randomId;
        if (this.preferences.generation !== "all" && !isNaN(Number(this.preferences.generation))) {
          const genIndex = Number(this.preferences.generation) - 1;
          if (genIndex >= 0 && genIndex < generationRanges.length) {
            const range = generationRanges[genIndex];
            randomId = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
          } else {
            // Fallback to Gen 1 if invalid generation
            randomId = Math.floor(Math.random() * 151) + 1;
          }
        } else {
          // Random from all generations, but be more conservative
          const range = generationRanges[Math.floor(Math.random() * generationRanges.length)];
          randomId = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
        }

        return await this.getPokemon(randomId);
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          // As last resort, try a known safe Pokemon (Pikachu)
          try {
            console.warn("Falling back to Pikachu as random Pokemon");
            return await this.getPokemon(25);
          } catch (fallbackError) {
            throw new Error("Failed to get random Pokemon after multiple attempts");
          }
        }
        console.warn(`Attempt ${attempts} failed for random Pokemon, trying again...`);
      }
    }

    throw new Error("Failed to get random Pokemon");
  }

  async browsePokemon(offset = 0, limit = 50): Promise<PokemonV2[]> {
    let whereClause = "";

    if (this.preferences.generation !== "all") {
      const genId = parseInt(this.preferences.generation);
      whereClause = `where: { pokemon_v2_pokemonspecy: { pokemon_v2_generation: { id: { _eq: ${genId} } } } }`;
    }

    const query = `
      query BrowsePokemon($offset: Int!, $limit: Int!) {
        pokemon_v2_pokemon(
          ${whereClause}
          offset: $offset
          limit: $limit
          order_by: { id: asc }
        ) {
          id
          name
          pokemon_v2_pokemontypes {
            slot
            pokemon_v2_type {
              id
              name
            }
          }
          pokemon_v2_pokemonspecy {
            pokemon_v2_generation {
              id
              name
            }
          }
        }
      }
    `;

    const variables = { offset, limit };

    try {
      const response = await this.executeGraphQLQuery<PokemonV2Response>(query, variables);
      return response.pokemon_v2_pokemon.filter(pokemon =>
        pokemon && pokemon.name && pokemon.id
      );
    } catch (error) {
      console.warn('Browse failed:', error);
      return []; // Return empty array on browse failure
    }
  }

  async getTypeEffectiveness(types: string[]): Promise<{ weaknesses: string[]; strengths: string[]; immunities: string[]; resistances: string[] }> {
    // This would typically require additional API calls to get type relationships
    // For now, we'll use a simplified hardcoded type chart
    const typeChart = this.getTypeEffectivenessChart();

    const weaknesses = new Set<string>();
    const resistances = new Set<string>();
    const immunities = new Set<string>();
    const strengths = new Set<string>();

    for (const defendingType of types) {
      for (const [attackingType, effectiveness] of Object.entries(typeChart)) {
        const typeEffectiveness = typeChart[attackingType]?.[defendingType] || 1;

        if (typeEffectiveness === 2) {
          weaknesses.add(attackingType);
        } else if (typeEffectiveness === 0.5) {
          resistances.add(attackingType);
        } else if (typeEffectiveness === 0) {
          immunities.add(attackingType);
        }
      }
    }

    // Calculate strengths (what this Pokemon is strong against)
    for (const pokemonType of types) {
      if (typeChart[pokemonType]) {
        for (const [defendingType, effectiveness] of Object.entries(typeChart[pokemonType])) {
          if (effectiveness === 2) {
            strengths.add(defendingType);
          }
        }
      }
    }

    return {
      weaknesses: Array.from(weaknesses),
      strengths: Array.from(strengths),
      immunities: Array.from(immunities),
      resistances: Array.from(resistances)
    };
  }

  getPokemonSpriteUrl(pokemon: PokemonV2, shiny = false): string {
    const pokemonId = pokemon.id;
    const { preferredSpriteStyle, showShinySprites } = this.preferences;
    const useShiny = shiny || showShinySprites;

    // Build sprite URLs based on preference
    switch (preferredSpriteStyle) {
      case "official_artwork":
        return useShiny
          ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${pokemonId}.png`
          : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;

      case "home":
        return useShiny
          ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/shiny/${pokemonId}.png`
          : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${pokemonId}.png`;

      case "dream_world":
        return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/${pokemonId}.svg`;

      default:
        return useShiny
          ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`
          : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
    }
  }

  private async executeGraphQLQuery<T>(query: string, variables: any = {}): Promise<T> {
    try {
      const payload = JSON.stringify({
        query: query.trim(),
        variables
      });

      const curlCommand = `curl -s -X POST -H "Content-Type: application/json" -d '${payload.replace(/'/g, "'\\''")}' ${this.baseUrl}`;

      const response = execSync(curlCommand, {
        encoding: "utf-8",
        timeout: 15000
      });

      if (!response || response.trim() === '') {
        throw new Error('Empty response from GraphQL server');
      }

      let result: GraphQLResponse<T>;
      try {
        result = JSON.parse(response);
      } catch (parseError) {
        throw new Error(`Invalid JSON response from GraphQL server: ${response.substring(0, 200)}`);
      }

      if (result.errors && result.errors.length > 0) {
        const error = result.errors[0];
        // Handle specific GraphQL error types
        if (error.message.includes('null value')) {
          throw new Error(`GraphQL Error: Unexpected null value for type 'String'. Try getting another random pokemon.`);
        }
        throw new Error(`GraphQL Error: ${error.message}`);
      }

      if (!result.data) {
        throw new Error('No data returned from GraphQL query');
      }

      return result.data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('GraphQL Error:')) {
        throw error; // Re-throw GraphQL errors as-is
      }
      throw new Error(`Failed to fetch Pokemon data: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private getCachedPokemon(pokemonName: string): PokemonV2 | null {
    try {
      const cacheData = execSync(`cat "${this.cacheFile}" 2>/dev/null || echo "{}"`, {
        encoding: "utf-8",
      });

      const cache: Record<string, CachedPokemonData> = JSON.parse(cacheData);
      const cached = cache[pokemonName.toLowerCase()];

      if (!cached) return null;

      // Check if cache is still valid (24 hours)
      const cacheAge = Date.now() - cached.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (cacheAge > maxAge) {
        return null;
      }

      return cached.data as PokemonV2;
    } catch (error) {
      console.warn("Failed to read cache:", error);
      return null;
    }
  }

  private setCachedPokemon(pokemonName: string, data: PokemonV2): void {
    try {
      let cache: Record<string, CachedPokemonData> = {};

      try {
        const existingCache = execSync(`cat "${this.cacheFile}" 2>/dev/null || echo "{}"`, {
          encoding: "utf-8",
        });
        cache = JSON.parse(existingCache);
      } catch {
        // Ignore error, use empty cache
      }

      cache[pokemonName.toLowerCase()] = {
        data,
        timestamp: Date.now(),
        pokemonName
      };

      const cacheContent = JSON.stringify(cache, null, 2);
      execSync(`echo '${cacheContent.replace(/'/g, "'\\''")}' > "${this.cacheFile}"`, { encoding: "utf-8" });
    } catch (error) {
      console.warn("Failed to write cache:", error);
    }
  }

  clearCache(): void {
    try {
      execSync(`rm -f "${this.cacheFile}"`, { encoding: "utf-8" });
    } catch (error) {
      console.warn("Failed to clear cache:", error);
    }
  }

  private getTypeEffectivenessChart(): TypeEffectivenessChart {
    // Simplified type effectiveness chart - in a real app, this would be fetched from the API
    return {
      normal: { rock: 0.5, ghost: 0, steel: 0.5 },
      fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
      water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
      electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
      grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
      ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
      fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
      poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
      ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
      flying: { electric: 0.5, grass: 2, ice: 0.5, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
      psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
      bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
      rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
      ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
      dragon: { dragon: 2, steel: 0.5, fairy: 0 },
      dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
      steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
      fairy: { fire: 0.5, poison: 0.5, fighting: 2, dragon: 2, dark: 2, steel: 0.5 }
    };
  }
}