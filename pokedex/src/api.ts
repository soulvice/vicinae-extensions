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

    return this.executeGraphQLQuery<PokemonV2Response>(searchQuery, variables)
      .then(response => response.pokemon_v2_pokemon);
  }

  async getPokemon(pokemonId: number | string): Promise<PokemonV2> {
    // Check cache first if enabled
    if (this.preferences.enableCaching) {
      const cachedData = this.getCachedPokemon(pokemonId.toString());
      if (cachedData) {
        return cachedData as PokemonV2;
      }
    }

    const query = `
      query GetPokemon($id: Int, $name: String) {
        pokemon_v2_pokemon(
          where: {
            _or: [
              { id: { _eq: $id } },
              { name: { _eq: $name } }
            ]
          },
          limit: 1
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
          pokemon_v2_pokemonstats {
            base_stat
            effort
            pokemon_v2_stat {
              id
              name
            }
          }
          pokemon_v2_pokemonabilities {
            is_hidden
            slot
            pokemon_v2_ability {
              id
              name
              pokemon_v2_abilityeffecttexts(
                where: { pokemon_v2_language: { name: { _eq: "en" } } }
                limit: 1
              ) {
                effect
                short_effect
              }
            }
          }
          pokemon_v2_pokemonmoves(
            limit: 50
            order_by: { level: asc }
          ) {
            level
            pokemon_v2_move {
              id
              name
              power
              accuracy
              pp
              pokemon_v2_type {
                name
              }
              pokemon_v2_movedamageclass {
                name
              }
              pokemon_v2_moveeffecttexts(
                where: { pokemon_v2_language: { name: { _eq: "en" } } }
                limit: 1
              ) {
                effect
                short_effect
              }
            }
            pokemon_v2_movelearnmethod {
              name
            }
          }
          pokemon_v2_pokemonspecy {
            id
            name
            base_happiness
            capture_rate
            pokemon_v2_pokemoncolor {
              name
            }
            pokemon_v2_generation {
              id
              name
            }
            pokemon_v2_pokemonspeciesflavortexts(
              where: {
                pokemon_v2_language: { name: { _eq: "en" } }
              }
              limit: 3
              order_by: { pokemon_v2_version: { id: desc } }
            ) {
              flavor_text
              pokemon_v2_language {
                name
              }
              pokemon_v2_version {
                name
              }
            }
          }
        }
      }
    `;

    const variables = isNaN(Number(pokemonId))
      ? { name: pokemonId.toString().toLowerCase(), id: null }
      : { id: Number(pokemonId), name: null };

    const response = await this.executeGraphQLQuery<PokemonV2Response>(query, variables);

    if (!response.pokemon_v2_pokemon.length) {
      throw new Error(`Pokémon '${pokemonId}' not found`);
    }

    const pokemon = response.pokemon_v2_pokemon[0];

    // Cache the data if caching is enabled
    if (this.preferences.enableCaching) {
      this.setCachedPokemon(pokemonId.toString(), pokemon);
    }

    return pokemon;
  }

  async getRandomPokemon(): Promise<PokemonV2> {
    const maxPokemonId = 1010; // Approximate current max Pokemon ID
    const randomId = Math.floor(Math.random() * maxPokemonId) + 1;
    return this.getPokemon(randomId);
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

    const response = await this.executeGraphQLQuery<PokemonV2Response>(query, variables);
    return response.pokemon_v2_pokemon;
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

      const result: GraphQLResponse<T> = JSON.parse(response);

      if (result.errors && result.errors.length > 0) {
        throw new Error(`GraphQL Error: ${result.errors[0].message}`);
      }

      return result.data;
    } catch (error) {
      throw new Error(`Failed to fetch Pokémon data: ${error instanceof Error ? error.message : "Unknown error"}`);
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