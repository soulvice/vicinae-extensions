# Wallpaper Manager Extension

A Vicinae extension for managing wallpapers using the [awww](https://github.com/mrusme/awww) backend with a beautiful grid interface.

## Features

- **Grid Layout**: Browse wallpapers in a visual grid with configurable column count
- **Multiple Folders**: Support for multiple wallpaper folders (comma-separated in preferences)
- **AWWW Integration**: Uses awww backend for reliable wallpaper setting
- **Namespace Support**: Support for awww namespaces to run multiple daemon instances
- **Random Selection**: Instant random wallpaper setting
- **Image Preview**: Live preview of wallpapers in the grid
- **Search & Filter**: Search by name and filter by folder
- **Sorting**: Sort by name, size, or modification date
- **Post-Command**: Execute custom commands after wallpaper changes
- **File Operations**: Show in Finder, copy paths, and more

## Requirements

- [awww](https://github.com/mrusme/awww) - Wallpaper management backend

## Installation

1. Install awww:
   ```bash
   # Check awww installation instructions at:
   # https://github.com/mrusme/awww
   ```

2. Add this extension to your Vicinae extensions directory

3. Configure your preferences:
   - **Wallpaper Folders**: Comma-separated list of wallpaper directories
   - **AWWW Namespace**: Optional namespace for multiple awww instances
   - **Post-Wallpaper Command**: Optional command to run after setting wallpaper
   - **Image Extensions**: Supported image file extensions
   - **Grid Columns**: Number of columns in the grid (3-6)

## Usage

### Browse Wallpapers
- Use the "Browse Wallpapers" command to view all wallpapers in a grid
- Click any wallpaper to set it as your current wallpaper
- Use search to find specific wallpapers by name
- Filter by folder or sort by various criteria
- Toggle details view for wallpaper metadata

### Random Wallpaper
- Use the "Random Wallpaper" command for instant random wallpaper selection
- The wallpaper is automatically set and you'll see a preview
- Get statistics about your wallpaper collection

## Configuration

### Wallpaper Folders
Configure multiple wallpaper directories:
```
~/Pictures/Wallpapers, ~/Downloads/Wallpapers, /usr/share/pixmaps
```

### AWWW Namespace
Use namespaces to run multiple awww instances:
```bash
# Default instance
awww /path/to/wallpaper.jpg

# With namespace
awww -n myspace /path/to/wallpaper.jpg
```

### Post-Wallpaper Command
Execute commands after wallpaper changes:
```bash
# Notify when wallpaper changes
notify-send "Wallpaper changed to $WALLPAPER_PATH"

# Refresh desktop
xdotool key F5
```

## Supported Formats

Default supported image formats:
- JPG/JPEG
- PNG
- WebP
- BMP
- GIF

You can customize supported extensions in preferences.

## Keyboard Shortcuts

- **Cmd+R**: Refresh wallpapers / Get random wallpaper
- **Cmd+I**: Toggle details view
- **Cmd+F**: Show in Finder
- **Cmd+C**: Copy wallpaper path
- **Cmd+Shift+C**: Copy wallpaper name

## Troubleshooting

### awww not found
Make sure awww is installed and in your PATH:
```bash
which awww
awww --version
```

### No wallpapers found
1. Check that your wallpaper folders exist
2. Verify folder permissions
3. Ensure folders contain supported image formats
4. Check the extension logs for detailed error messages

### Permission denied
Ensure you have read permissions for wallpaper directories:
```bash
ls -la ~/Pictures/Wallpapers
```

## Development

The extension is built with:
- TypeScript
- React
- Vicinae API
- Grid layout for visual browsing
- Integration with awww backend

### File Structure
```
src/
├── types.ts        # TypeScript interfaces
├── api.ts          # AWWW integration and file management
├── browse.tsx      # Grid browse command
└── random.tsx      # Random wallpaper command
```

## License

MIT License - see package.json for details.