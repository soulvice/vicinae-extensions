import os from "os";
import path from "path";

export function expandHomePath(input: string): string {
  if (!input) {
    return os.homedir();
  }

  if (input === "~") {
    return os.homedir();
  }

  if (input.startsWith("~/")) {
    return path.join(os.homedir(), input.slice(2));
  }

  if (input.startsWith("$HOME")) {
    return path.join(os.homedir(), input.slice(5));
  }

  return input;
}

export function resolveAbsolutePath(input: string): string {
  const expanded = expandHomePath(input);
  return path.resolve(expanded);
}
