import { execSync } from "child_process";
import {
  WallpaperFile,
  WallpaperFolder,
  WallpaperPreferences,
  AwwwResponse,
  WallpaperStats,
  SetWallpaperOptions,
  WallpaperSearchOptions
} from "./types";
import { resolve, extname, basename, dirname } from "path";
import { existsSync, statSync, readdirSync } from "fs";

export class WallpaperAPI {
  private preferences: WallpaperPreferences;

  constructor(preferences: WallpaperPreferences) {
    this.preferences = preferences;
  }

  /**
   * Get all configured wallpaper folders
   */
  getWallpaperFolders(): WallpaperFolder[] {
    const folderPaths = this.preferences.wallpaperFolders
      .split(',')
      .map(path => path.trim())
      .filter(path => path.length > 0);

    return folderPaths.map(path => {
      const expandedPath = this.expandPath(path);
      const absolutePath = resolve(expandedPath);
      const exists = existsSync(absolutePath);

      let wallpaperCount = 0;
      if (exists) {
        try {
          const files = readdirSync(absolutePath);
          wallpaperCount = files.filter(file => this.isImageFile(file)).length;
        } catch (error) {
          console.warn(`Failed to read directory ${absolutePath}:`, error);
        }
      }

      return {
        path,
        absolutePath,
        exists,
        wallpaperCount
      };
    });
  }

  /**
   * Get all wallpaper files from configured folders
   */
  async getWallpaperFiles(options: WallpaperSearchOptions = {}): Promise<WallpaperFile[]> {
    const folders = this.getWallpaperFolders();
    const wallpapers: WallpaperFile[] = [];

    for (const folder of folders) {
      if (!folder.exists) continue;

      try {
        const files = readdirSync(folder.absolutePath);

        for (const file of files) {
          if (!this.isImageFile(file)) continue;

          const filePath = resolve(folder.absolutePath, file);
          const stats = statSync(filePath);

          if (!stats.isFile()) continue;

          const wallpaper: WallpaperFile = {
            id: `${folder.path}/${file}`,
            name: basename(file, extname(file)),
            path: file,
            absolutePath: filePath,
            folder: folder.path,
            extension: extname(file).toLowerCase().slice(1),
            size: stats.size,
            lastModified: stats.mtime
          };

          // Apply filters
          if (options.query && !wallpaper.name.toLowerCase().includes(options.query.toLowerCase())) {
            continue;
          }
          if (options.folder && !wallpaper.folder.includes(options.folder)) {
            continue;
          }
          if (options.extension && wallpaper.extension !== options.extension) {
            continue;
          }

          wallpapers.push(wallpaper);
        }
      } catch (error) {
        console.warn(`Failed to read wallpapers from ${folder.absolutePath}:`, error);
      }
    }

    // Sort wallpapers
    if (options.sortBy) {
      wallpapers.sort((a, b) => {
        let comparison = 0;

        switch (options.sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'size':
            comparison = a.size - b.size;
            break;
          case 'modified':
            comparison = a.lastModified.getTime() - b.lastModified.getTime();
            break;
          default:
            comparison = a.name.localeCompare(b.name);
        }

        return options.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    return wallpapers;
  }

  /**
   * Get a random wallpaper file
   */
  async getRandomWallpaper(): Promise<WallpaperFile | null> {
    const wallpapers = await this.getWallpaperFiles();
    if (wallpapers.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * wallpapers.length);
    return wallpapers[randomIndex];
  }

  /**
   * Set wallpaper using awww img command
   */
  async setWallpaper(options: SetWallpaperOptions): Promise<AwwwResponse> {
    try {
      // Check if daemon is running first
      if (!this.isAwwwDaemonRunning()) {
        return {
          success: false,
          error: 'awww-daemon is not running. Please start awww-daemon first.',
          wallpaper: options.wallpaperPath
        };
      }

      // Construct awww img command
      let command = 'awww img';

      // Add namespace if specified
      const namespace = options.namespace || this.preferences.awwwNamespace;
      if (namespace && namespace.trim()) {
        command += ` -n "${namespace.trim()}"`;
      }

      // Add wallpaper path
      command += ` "${options.wallpaperPath}"`;

      console.log(`Setting wallpaper with command: ${command}`);

      // Execute awww img command
      const output = execSync(command, {
        encoding: 'utf-8',
        timeout: 10000 // 10 second timeout
      });

      // Execute post-command if specified
      const postCommand = options.postCommand || this.preferences.postWallpaperCommand;
      if (postCommand && postCommand.trim()) {
        try {
          execSync(postCommand.trim(), {
            encoding: 'utf-8',
            timeout: 5000 // 5 second timeout
          });
          console.log(`Post-command executed: ${postCommand}`);
        } catch (postError) {
          console.warn(`Post-command failed: ${postCommand}`, postError);
        }
      }

      return {
        success: true,
        message: 'Wallpaper set successfully',
        wallpaper: options.wallpaperPath
      };

    } catch (error) {
      console.error('Failed to set wallpaper:', error);

      // Provide more helpful error messages
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        if (error.message.includes('Command failed')) {
          errorMessage = 'Failed to set wallpaper. Make sure awww-daemon is running and the image file is valid.';
        } else if (error.message.includes('ENOENT')) {
          errorMessage = 'awww img command not found. Please install awww.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Wallpaper setting timed out. Check if awww-daemon is responsive.';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
        wallpaper: options.wallpaperPath
      };
    }
  }

  /**
   * Get wallpaper statistics
   */
  async getWallpaperStats(): Promise<WallpaperStats> {
    const folders = this.getWallpaperFolders();
    const wallpapers = await this.getWallpaperFiles();

    const validFolders = folders.filter(f => f.exists).length;
    const invalidFolders = folders.filter(f => !f.exists).map(f => f.path);
    const supportedExtensions = this.getSupportedExtensions();

    return {
      totalWallpapers: wallpapers.length,
      totalFolders: folders.length,
      validFolders,
      invalidFolders,
      supportedExtensions
    };
  }

  /**
   * Check if awww is available
   */
  isAwwwAvailable(): boolean {
    try {
      execSync('which awww', { encoding: 'utf-8' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if awww-daemon is running
   */
  isAwwwDaemonRunning(): boolean {
    try {
      // Use cross-platform approach - check if we can connect to the daemon
      // Look for socket files in runtime directory
      const runtimeDir = process.env.XDG_RUNTIME_DIR || '/tmp';
      const waylandDisplay = process.env.WAYLAND_DISPLAY || 'wayland-0';
      const files = require('fs').readdirSync(runtimeDir);
      return files.some((file: string) => file.startsWith(waylandDisplay+'-awww-daemon') && file.endsWith('.sock'));
    } catch {
      return false;
    }
  }

  /**
   * Get daemon status information
   */
  getDaemonStatus(): { isInstalled: boolean; isRunning: boolean; namespaces?: string[] } {
    const isInstalled = this.isAwwwAvailable();
    const isRunning = this.isAwwwDaemonRunning();

    // Try to get namespace information if running
    let namespaces: string[] = [];
    if (isRunning) {
      try {
        // Look for socket files to determine active namespaces using Node.js
        const runtimeDir = process.env.XDG_RUNTIME_DIR || '/tmp';
        const waylandDisplay = process.env.WAYLAND_DISPLAY || 'wayland-0';
        const files = require('fs').readdirSync(runtimeDir);
        const socketFiles = files.filter((file: string) =>
          file.startsWith(waylandDisplay+'-awww-daemon') && file.endsWith('.sock')
        );

        if (socketFiles.length > 0) {
          namespaces = socketFiles
            .map((socketFile: string) => {
              // Extract namespace from socket filename
              const match = socketFile.match(/awww-daemon\.(.+)\.sock$/);
              if (match) {
                return match[1];
              } else if (socketFile === (waylandDisplay+'awww-daemon.sock')) {
                return 'default';
              }
              return null;
            })
            .filter((ns: string | null): ns is string => ns !== null);
        }

        // If no sockets found but daemon is running, assume default namespace
        if (namespaces.length === 0) {
          namespaces = ['default'];
        }
      } catch {
        // If we can't detect namespaces but daemon is running, assume default
        namespaces = ['default'];
      }
    }

    return { isInstalled, isRunning, namespaces };
  }

  /**
   * Get image file URL for display
   */
  getImageUrl(wallpaper: WallpaperFile): string {
    // Return file:// URL for local file access
    return `file://${wallpaper.absolutePath}`;
  }

  /**
   * Private helper methods
   */
  private expandPath(path: string): string {
    // Expand ~ to home directory
    if (path.startsWith('~/')) {
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      return path.replace('~', homeDir);
    }
    return path;
  }

  private isImageFile(filename: string): boolean {
    const ext = extname(filename).toLowerCase().slice(1);
    return this.getSupportedExtensions().includes(ext);
  }

  private getSupportedExtensions(): string[] {
    return this.preferences.imageExtensions
      .split(',')
      .map(ext => ext.trim().toLowerCase())
      .filter(ext => ext.length > 0);
  }
}