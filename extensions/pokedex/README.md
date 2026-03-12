# Pokédex Viewer Extension

A comprehensive Pokédex extension for Vicinae that provides detailed Pokémon information using the PokéAPI GraphQL endpoint with a beautiful split-view layout.

## Features

- 🔍 **Advanced Search**: Search Pokémon by name, number, or type
- 📖 **Browse Mode**: Browse all Pokémon with generation filtering
- 🎯 **Detailed View**: Split-layout with image on left, comprehensive stats on right
- 🎲 **Random Discovery**: Discover random Pokémon with history tracking
- 🎨 **Rich Visual Design**: High-quality sprites with multiple style options
- ⚡ **Type Effectiveness**: Complete strengths, weaknesses, and resistances
- 💾 **Smart Caching**: Configurable caching for improved performance
- 🌟 **Shiny Support**: Optional shiny sprite display
- 📊 **Complete Stats**: Base stats, abilities, moves, and physical attributes

## Commands

### `browse`
Browse the complete Pokédex with filtering options.

**Features:**
- Pagination with "Load More" functionality
- Generation filtering via preferences
- Type emoji indicators
- Quick access to detailed views
- Search functionality

### `pokemon`
View detailed information about a specific Pokémon with split-view layout.

**Features:**
- **Split Layout Design**: Image on left, stats on right as requested
- High-quality Pokémon sprites (official artwork, home, dream world, default)
- Complete base stats with visual progress bars
- Physical attributes (height, weight, experience)
- Abilities with descriptions
- Type effectiveness analysis (weaknesses, resistances, immunities, strengths)
- Move list with power, accuracy, PP, and learn methods
- Flavor text descriptions
- Quick access to external Pokémon databases

### `search`
Powerful search functionality with real-time results.

**Features:**
- Search by Pokémon name, number, or type
- Real-time search results
- Type-based filtering
- Random Pokémon discovery
- Search history and suggestions

### `random`
Discover random Pokémon with history tracking.

**Features:**
- Truly random Pokémon selection
- Quick stats overview
- Recent discovery history
- Fast access to detailed view

## Configuration

Configure the extension through Vicinae's preference system:

### Display Preferences

- **Generation Filter**: Filter Pokémon by specific generation or view all
  - All Generations (default)
  - Generation I (Kanto) through IX (Paldea)

- **Sprite Style**: Choose preferred sprite appearance
  - **Official Artwork**: High-quality official Pokémon artwork (default)
  - **Home Sprites**: Pokémon HOME style sprites
  - **Dream World**: Dream World artwork
  - **Default Sprites**: Classic game sprites

- **Show Shiny Sprites**: Display shiny versions when available

### Functionality Options

- **Show Move Details**: Display comprehensive move information including power, accuracy, and effects

- **Enable Caching**: Cache Pokémon data to improve performance and reduce API calls (default: enabled)

## Split-View Layout

The main Pokémon detail view features the requested split layout:

### Left Side (Image)
- High-quality Pokémon sprite
- Optional shiny form display
- Type indicators with emoji
- Pokémon description/flavor text

### Right Side (Stats & Information)
- **Base Stats**: Complete stat breakdown with visual progress bars
- **Physical Attributes**: Height, weight, base experience
- **Abilities**: All abilities with descriptions (hidden abilities marked)
- **Type Effectiveness**: Comprehensive damage calculations
- **Notable Moves**: Top moves with type, power, accuracy, and learn method

## Type System

### Type Indicators
Each Pokémon type is represented with distinctive emoji:

- ⚪ Normal • 🔥 Fire • 💧 Water • ⚡ Electric
- 🌿 Grass • ❄️ Ice • 👊 Fighting • ☠️ Poison
- 🌍 Ground • 🦅 Flying • 🔮 Psychic • 🐛 Bug
- ⛰️ Rock • 👻 Ghost • 🐉 Dragon • 🌑 Dark
- ⚔️ Steel • 🧚 Fairy

### Type Effectiveness
The extension calculates and displays:
- **Weaknesses**: Types that deal 2x damage
- **Resistances**: Types that deal 0.5x damage
- **Immunities**: Types that deal 0x damage
- **Strengths**: Types this Pokémon is strong against

## Data Source

This extension uses **PokéAPI GraphQL v1beta** endpoint:
- **Endpoint**: `https://beta.pokeapi.co/graphql/v1beta`
- **Coverage**: All generations of Pokémon
- **Data**: Complete Pokédex information, stats, moves, abilities
- **Images**: High-quality sprites from multiple sources
- **No API Key Required**: Free public access

### GraphQL Queries
The extension uses optimized GraphQL queries for:
- Pokémon searching and browsing
- Detailed individual Pokémon data
- Type relationships and effectiveness
- Move and ability information

## Installation

1. Navigate to the pokedex-viewer directory:
   ```bash
   cd pokedex-viewer/
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Development mode with hot reload:
   ```bash
   npm run dev
   ```

## Caching System

The extension implements intelligent caching:

### Cache Features
- **Automatic Management**: 24-hour cache validity
- **Location**: `~/.vicinae-pokedex-cache.json`
- **Scope**: Individual Pokémon data
- **Benefits**: Faster loading, reduced API calls, offline resilience

### Cache Control
- Enable/disable via preferences
- Manual cache clearing available
- Automatic cache expiration
- Smart cache invalidation

## Performance Optimizations

### Efficient Data Loading
- **Paginated Browsing**: Load 50 Pokémon at a time
- **Optimized GraphQL**: Only fetch required fields
- **Smart Image Loading**: Progressive image loading with fallbacks
- **Caching Strategy**: 24-hour cache with manual override

### Search Performance
- **Real-time Search**: Instant results as you type
- **Debounced Queries**: Prevent excessive API calls
- **Result Limiting**: Maximum 50 results per search
- **Type-ahead Support**: Search suggestions

## Development

### Project Structure

```
pokedex-viewer/
├── src/
│   ├── api.ts          # GraphQL API client with caching
│   ├── types.ts        # TypeScript interfaces
│   ├── browse.tsx      # Main browsing interface
│   ├── pokemon.tsx     # Detailed Pokémon view (split layout)
│   ├── search.tsx      # Search functionality
│   └── random.tsx      # Random Pokémon discovery
├── package.json        # Extension manifest with preferences
├── tsconfig.json       # TypeScript configuration
└── README.md          # Documentation
```

### Key Components

1. **PokeAPI Class**: Handles all GraphQL communications and caching
2. **Split-View Layout**: CSS flexbox implementation for left/right layout
3. **Type Effectiveness Calculator**: Real-time damage calculation system
4. **Smart Sprite Selection**: Multiple sprite source support
5. **Progressive Enhancement**: Graceful fallbacks for missing data

## External Resources

### Official Pokémon Sites
- **Bulbapedia**: Comprehensive Pokémon wiki
- **Pokémon Database**: Complete Pokédex with stats
- **Serebii**: Latest Pokémon news and data

### Image Sources
- **Official Artwork**: The Pokémon Company official art
- **Pokémon HOME**: Modern sprite style
- **Dream World**: Artistic sprite variants
- **Game Sprites**: Classic pixel art from games

## Troubleshooting

### Common Issues

1. **"Pokémon not found"**
   - Check spelling of Pokémon name
   - Try using Pokédex number instead
   - Ensure the Pokémon exists in selected generation

2. **Slow loading**
   - Enable caching in preferences
   - Check internet connection
   - Try clearing cache and refreshing

3. **Images not loading**
   - Try different sprite style in preferences
   - Check if shiny sprites are causing issues
   - Verify internet connectivity

### API Testing

Test the GraphQL endpoint directly:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"query": "{ pokemon_v2_pokemon(limit: 1) { name id } }"}' \
  https://beta.pokeapi.co/graphql/v1beta
```

## Contributing

When adding new features:
1. **New Pokémon Data**: Extend interfaces in `types.ts`
2. **Additional Views**: Create new `.tsx` components
3. **API Enhancements**: Extend the `PokeAPI` class
4. **UI Improvements**: Update existing components

## License

MIT License - see the main repository for details.

## Acknowledgments

- **PokéAPI**: Free RESTful API for Pokémon data
- **The Pokémon Company**: Original Pokémon designs and artwork
- **Vicinae Platform**: Excellent extension development framework
- **GraphQL**: Efficient data querying capabilities