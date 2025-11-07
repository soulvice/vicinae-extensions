// Core Pokemon Types
export interface Pokemon {
  id: number;
  name: string;
  height: number; // in decimeters
  weight: number; // in hectograms
  base_experience: number;
  order: number;
  sprites: PokemonSprites;
  types: PokemonType[];
  stats: PokemonStat[];
  abilities: PokemonAbility[];
  moves: PokemonMove[];
  species: PokemonSpecies;
  game_indices: GameIndex[];
}

export interface PokemonSprites {
  front_default: string | null;
  front_shiny: string | null;
  front_female: string | null;
  front_shiny_female: string | null;
  back_default: string | null;
  back_shiny: string | null;
  back_female: string | null;
  back_shiny_female: string | null;
  other: {
    dream_world: {
      front_default: string | null;
      front_female: string | null;
    };
    home: {
      front_default: string | null;
      front_female: string | null;
      front_shiny: string | null;
      front_shiny_female: string | null;
    };
    official_artwork: {
      front_default: string | null;
      front_shiny: string | null;
    };
  };
}

export interface PokemonType {
  slot: number;
  type: {
    name: string;
    url: string;
  };
}

export interface PokemonStat {
  base_stat: number;
  effort: number;
  stat: {
    name: string;
    url: string;
  };
}

export interface PokemonAbility {
  is_hidden: boolean;
  slot: number;
  ability: {
    name: string;
    url: string;
  };
}

export interface PokemonMove {
  move: {
    name: string;
    url: string;
  };
  version_group_details: {
    level_learned_at: number;
    move_learn_method: {
      name: string;
      url: string;
    };
    version_group: {
      name: string;
      url: string;
    };
  }[];
}

export interface PokemonSpecies {
  name: string;
  url: string;
  base_happiness: number;
  capture_rate: number;
  color: {
    name: string;
    url: string;
  };
  egg_groups: Array<{
    name: string;
    url: string;
  }>;
  evolution_chain: {
    url: string;
  };
  evolves_from_species: {
    name: string;
    url: string;
  } | null;
  flavor_text_entries: Array<{
    flavor_text: string;
    language: {
      name: string;
      url: string;
    };
    version: {
      name: string;
      url: string;
    };
  }>;
  generation: {
    name: string;
    url: string;
  };
  habitat: {
    name: string;
    url: string;
  } | null;
  growth_rate: {
    name: string;
    url: string;
  };
}

export interface GameIndex {
  game_index: number;
  version: {
    name: string;
    url: string;
  };
}

// Type Effectiveness
export interface TypeEffectiveness {
  double_damage_from: Type[];
  double_damage_to: Type[];
  half_damage_from: Type[];
  half_damage_to: Type[];
  no_damage_from: Type[];
  no_damage_to: Type[];
}

export interface Type {
  id: number;
  name: string;
  damage_relations: TypeEffectiveness;
  generation: {
    name: string;
    url: string;
  };
  move_damage_class: {
    name: string;
    url: string;
  } | null;
  pokemon: Array<{
    pokemon: {
      name: string;
      url: string;
    };
    slot: number;
  }>;
}

// Move Details
export interface Move {
  id: number;
  name: string;
  accuracy: number | null;
  effect_chance: number | null;
  pp: number;
  priority: number;
  power: number | null;
  damage_class: {
    name: string;
    url: string;
  };
  effect_entries: Array<{
    effect: string;
    language: {
      name: string;
      url: string;
    };
    short_effect: string;
  }>;
  flavor_text_entries: Array<{
    flavor_text: string;
    language: {
      name: string;
      url: string;
    };
    version_group: {
      name: string;
      url: string;
    };
  }>;
  generation: {
    name: string;
    url: string;
  };
  meta: {
    ailment: {
      name: string;
      url: string;
    };
    category: {
      name: string;
      url: string;
    };
    crit_rate: number;
    drain: number;
    flinch_chance: number;
    healing: number;
    max_hits: number | null;
    max_turns: number | null;
    min_hits: number | null;
    min_turns: number | null;
    stat_chance: number;
  };
  stat_changes: Array<{
    change: number;
    stat: {
      name: string;
      url: string;
    };
  }>;
  target: {
    name: string;
    url: string;
  };
  type: {
    name: string;
    url: string;
  };
}

// Ability Details
export interface Ability {
  id: number;
  name: string;
  is_main_series: boolean;
  generation: {
    name: string;
    url: string;
  };
  effect_entries: Array<{
    effect: string;
    language: {
      name: string;
      url: string;
    };
    short_effect: string;
  }>;
  flavor_text_entries: Array<{
    flavor_text: string;
    language: {
      name: string;
      url: string;
    };
    version_group: {
      name: string;
      url: string;
    };
  }>;
  pokemon: Array<{
    is_hidden: boolean;
    pokemon: {
      name: string;
      url: string;
    };
    slot: number;
  }>;
}

// Search and Listing Types
export interface PokemonListItem {
  name: string;
  url: string;
  id?: number;
}

export interface PokemonSearchResult {
  count: number;
  next: string | null;
  previous: string | null;
  results: PokemonListItem[];
}

// Extension Preferences
export interface PokedexPreferences {
  generation: string;
  showShinySprites: boolean;
  preferredSpriteStyle: "official_artwork" | "home" | "dream_world" | "default";
  showMoveDetails: boolean;
  enableCaching: boolean;
}

// GraphQL Response Types for PokéAPI v2 GraphQL
export interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: string[];
  }>;
}

export interface PokemonV2Response {
  pokemon_v2_pokemon: PokemonV2[];
}

export interface PokemonV2 {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  order: number;
  pokemon_v2_pokemontypes: Array<{
    slot: number;
    pokemon_v2_type: {
      id: number;
      name: string;
    };
  }>;
  pokemon_v2_pokemonstats: Array<{
    base_stat: number;
    effort: number;
    pokemon_v2_stat: {
      id: number;
      name: string;
    };
  }>;
  pokemon_v2_pokemonabilities: Array<{
    is_hidden: boolean;
    slot: number;
    pokemon_v2_ability: {
      id: number;
      name: string;
    };
  }>;
  pokemon_v2_pokemonmoves: Array<{
    level: number;
    pokemon_v2_move: {
      id: number;
      name: string;
      power: number | null;
      accuracy: number | null;
      pp: number;
      pokemon_v2_type: {
        name: string;
      };
      pokemon_v2_movedamageclass: {
        name: string;
      };
    };
    pokemon_v2_movelearnmethod: {
      name: string;
    };
  }>;
  pokemon_v2_pokemonspecy: {
    id: number;
    name: string;
    base_happiness: number;
    capture_rate: number;
    pokemon_v2_pokemoncolor: {
      name: string;
    };
    pokemon_v2_generation: {
      id: number;
      name: string;
    };
    pokemon_v2_pokemonspeciesflavortexts: Array<{
      flavor_text: string;
      pokemon_v2_language: {
        name: string;
      };
      pokemon_v2_version: {
        name: string;
      };
    }>;
  };
}

// Cached Data
export interface CachedPokemonData {
  data: Pokemon | PokemonV2;
  timestamp: number;
  pokemonName: string;
}

// Type effectiveness mapping for quick lookups
export interface TypeEffectivenessChart {
  [attackingType: string]: {
    [defendingType: string]: number; // 0, 0.5, 1, or 2
  };
}