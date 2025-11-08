// Wallpaper Extension Types

export interface WallpaperFile {
  id: string;
  name: string;
  path: string;
  absolutePath: string;
  folder: string;
  extension: string;
  size: number;
  lastModified: Date;
  dimensions?: {
    width: number;
    height: number;
  };
}

export interface WallpaperFolder {
  path: string;
  absolutePath: string;
  exists: boolean;
  wallpaperCount: number;
}

export interface WallpaperPreferences {
  wallpaperFolders: string;
  awwwNamespace: string;
  postWallpaperCommand: string;
  imageExtensions: string;
  gridColumns: string;
}

export interface AwwwResponse {
  success: boolean;
  message?: string;
  error?: string;
  wallpaper?: string;
}

export interface WallpaperStats {
  totalWallpapers: number;
  totalFolders: number;
  validFolders: number;
  invalidFolders: string[];
  supportedExtensions: string[];
}

export interface SetWallpaperOptions {
  wallpaperPath: string;
  namespace?: string;
  postCommand?: string;
}

export interface WallpaperSearchOptions {
  query?: string;
  folder?: string;
  extension?: string;
  sortBy?: 'name' | 'size' | 'modified';
  sortOrder?: 'asc' | 'desc';
}