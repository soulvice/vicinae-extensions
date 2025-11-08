import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface Monitor {
  id: number;
  name: string;
  description: string;
}

export async function getMonitors(compositor: string): Promise<Monitor[]> {
    if (compositor === "niri") return await getNiriMonitors();
    else if (compositor === "hyprland") return await getHyprlandMonitors();
    else {
        console.error("Failed to get monitors, unknown compositor");
        return [];
    }
}

export async function getNiriMonitors(): Promise<Monitor[]> {
    try {
        const { stdout } = await execAsync("niri msg --json outputs");
        const monitors = JSON.parse(stdout);
        return Object.values(monitors).map((m: any) => ({
            id: m.name,
            name: m.name,
            description: m.make
        }));
    } catch (error) {
        console.error("Failed to get monitors:", error);
        return [];
    }
}

export async function getHyprlandMonitors(): Promise<Monitor[]> {
  try {
    const { stdout } = await execAsync("hyprctl monitors -j");
    const monitors = JSON.parse(stdout);
    return monitors.map((m: any) => ({
      id: m.id,
      name: m.name,
      description: m.description || m.name,
    }));
  } catch (error) {
    console.error("Failed to get monitors:", error);
    return [];
  }
}