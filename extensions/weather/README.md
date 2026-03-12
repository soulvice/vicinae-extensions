# Weather Forecast Extension

A comprehensive weather extension for Vicinae that provides current conditions and multi-day forecasts using the free wttr.in service.

## Features

- 🌡️ **Current Weather**: Real-time temperature, humidity, wind, and atmospheric conditions
- 📅 **Multi-day Forecast**: 3-5 day weather predictions with detailed information
- 📍 **Smart Location**: Automatic location detection via IP or manual specification
- 💾 **Intelligent Caching**: Configurable caching to reduce API calls and improve performance
- 🌙 **Day/Night Icons**: Contextual weather icons using Nerd Fonts
- 🌡️ **Unit Preferences**: Metric (°C, km/h) or Imperial (°F, mph) units
- ⚡ **Fast Performance**: Optimized data fetching and caching

## Commands

### `forecast`
View a complete 3-5 day weather forecast with current conditions in a single, comprehensive view.

**Features:**
- Current weather conditions with detailed metrics
- Daily forecasts with high/low temperatures
- Rain probability, humidity, and astronomical data
- Sunrise/sunset and moon phase information

### `current`
Quick view of current weather conditions only.

**Features:**
- Current temperature and "feels like" temperature
- Wind speed and direction
- Humidity, pressure, and visibility
- UV index

### `settings`
Configure weather preferences and view cache status.

**Features:**
- Location and discovery mode configuration
- Cache management and status
- Settings validation and testing

## Configuration

Configure the extension through Vicinae's preference system:

### Location Settings

- **Location**: Specify your location or leave empty for auto-detection
  - City names: `London`, `New York`, `Tokyo`
  - City and country: `London, UK`, `Paris, France`
  - Coordinates: `40.7128,-74.0060` (latitude,longitude)
  - Airport codes: `JFK`, `LHR`, `CDG`

- **Location Discovery**: Choose how to determine location when not specified
  - **Automatic**: Uses IP geolocation (default)
  - **Manual**: Only uses specified location

### Display Preferences

- **Temperature Units**:
  - **Metric**: °C, km/h (default)
  - **Imperial**: °F, mph

- **Forecast Days**: Number of forecast days to display (3 or 5)

### Caching Options

- **Enable Caching**: Cache weather data for better performance (default: enabled)
- **Cache Timeout**: How long to cache data in minutes (default: 30 minutes)

## Weather Icons

The extension uses Nerd Font icons to provide visual weather representations:

- ☀️ `󰖙` Sunny/Clear
- ⛅ `󰖕` Partly Cloudy
- ☁️ `󰖐` Cloudy/Overcast
- 🌫️ `󰖑` Fog/Mist
- 🌧️ `󰖒` Light Rain
- 🌧️ `󰖖` Heavy Rain
- ❄️ `󰖘` Snow
- 🌨️ `󰼶` Heavy Snow
- ⛈️ `󰖓` Thunder/Lightning
- 🌙 `󰖔` Clear Night
- 🌙 `󰼱` Partly Cloudy Night

## Installation

1. Navigate to the weather extension directory:
   ```bash
   cd weather/
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

## Data Source

This extension uses [wttr.in](https://wttr.in/), a free weather service that provides:

- Current weather conditions
- Multi-day forecasts
- Global coverage
- No API key required
- ASCII weather reports
- JSON API support

## Caching

The extension implements intelligent caching to:

- **Reduce API calls**: Minimize requests to wttr.in
- **Improve performance**: Faster loading times
- **Offline resilience**: Show last known data when offline
- **Bandwidth efficiency**: Reduce data usage

Cache files are stored at `~/.vicinae-weather-cache.json` and automatically managed based on your timeout settings.

## Troubleshooting

### Common Issues

1. **"Unable to fetch weather data"**
   - Check your internet connection
   - Verify the location format is correct
   - Try clearing the cache and refreshing

2. **"Location not found"**
   - Use a more specific location name
   - Try using coordinates instead
   - Enable automatic location discovery

3. **Stale data**
   - Check cache timeout settings
   - Manually clear cache using the settings command
   - Refresh the weather data

### Command Line Testing

Test wttr.in directly:
```bash
# Test basic connectivity
curl "http://wttr.in/?format=j1"

# Test specific location
curl "http://wttr.in/London?format=j1"

# Test your auto-detected location
curl "http://wttr.in/?format=%l"
```

## Development

### Project Structure

```
weather/
├── src/
│   ├── api.ts          # wttr.in API integration
│   ├── types.ts        # TypeScript type definitions
│   ├── icons.ts        # Weather icon mappings
│   ├── forecast.tsx    # Main forecast command
│   ├── current.tsx     # Current weather command
│   └── settings.tsx    # Settings and configuration
├── package.json        # Extension manifest
├── tsconfig.json       # TypeScript configuration
└── README.md          # Documentation
```

### Adding New Features

1. **New Weather Metrics**: Add to the `WeatherData` interface in `types.ts`
2. **Additional Icons**: Update the `weatherConditions` mapping in `icons.ts`
3. **New Commands**: Create new `.tsx` files and add to `package.json` commands
4. **API Enhancements**: Extend the `WeatherAPI` class in `api.ts`

## License

MIT License - see the main repository for details.

## Acknowledgments

- **wttr.in** - Free weather service
- **Nerd Fonts** - Beautiful weather icons
- **Vicinae Platform** - Excellent extension framework