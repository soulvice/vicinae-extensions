
import { WPNamespace, WPAnimation, WPFilter } from "@/utils/types";
import { resolveAbsolutePath } from "@/utils/path";
import { getPreferenceValues } from "@vicinae/api";

interface RawPreferences {
  wallpapersPath: string,
  gridRows: string,
  transitionType: string,
  transitionDuration: string,
  transitionStep: string,
  transitionFPS: string,
  colorGenTool: string,
  daemonNamespace: string,
  toggleVicinaeSetting: boolean,
  showImageDetails: boolean,
  overviewFilter: string,
  postCommand: string,
};

export interface Preferences {
  wallpapersPath: string,
  gridRows: number,
  animation: WPAnimation,
  colorGenTool: string,
  nsWallpaper: WPNamespace,
  nsOverview: WPNamespace,
  overviewFilter: WPFilter,
  postCommand: string,
};

export default function getPrefs(): Readonly<Preferences> {
  const raw = getPreferenceValues<RawPreferences>();
  return {
    wallpapersPath: resolveAbsolutePath(raw.wallpapersPath),
    
    // Display
    gridRows: parsePositiveInt(raw.gridRows, 4),
    colorGenTool: sanitizeString(raw.colorGenTool) ?? "none",
    
    // Animation
    animation: {
      type: sanitizeString(raw.transitionType) ?? "wipe",
      duration: parsePositiveInt(raw.transitionDuration, 3),
      steps: parsePositiveInt(raw.transitionSteps, 90),
      fps: parsePositiveInt(raw.transitionFPS, 60)
    },
    
    // Namespaces
    nsWallpaper: { name: sanitizeString(raw.daemonNamespace) ?? "", isOverview: false },
    nsOverview: { name: sanitizeString(raw.overviewNamespace) ?? "", isOverview: true },

    // Pre & Post
    overviewFilter: { name: sanitizeString(raw.overviewFilter) ?? "none" },
    postCommand: sanitizeString(raw.postCommand) ?? ""
  };
}



// ========================================
function sanitizeString(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
}
