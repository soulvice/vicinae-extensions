import { exec, execSync } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Type definitions
export type ResizeMode = "no" | "crop" | "fit" | "stretch";

// Helper function to convert camelCase to kebab-case
function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

// Base class with shared functionality
class AwwwBase {
  protected _img?: string;
  protected _namespace?: string;
  protected _outputs?: string;
  protected _action?: string;
  protected _all?: boolean;

  // Build the command string
  protected buildCommand(): string {
    const parts: string[] = ['awww', this._action!];
    
    // Add positional arguments first (img path, clear color)
    if (this._action === 'img' && this._img) {
      parts.push(this._img);
    }
    if (this._action === 'clear' && (this as any)._color) {
      parts.push((this as any)._color);
    }

    // Add flags
    Object.keys(this).forEach(key => {
      if (key.startsWith('_') && !['_action', '_img'].includes(key)) {
        const value = (this as any)[key];
        if (value === undefined) return;
        
        const flagName = toKebabCase(key.slice(1)); // Remove _ and convert to kebab-case
        
        if (typeof value === 'boolean' && value === true) {
          parts.push(`--${flagName}`);
        } else if (typeof value !== 'boolean') {
          parts.push(`--${flagName}`, String(value));
        }
      }
    });

    return parts.join(' ');
  }

  // Execute synchronously
  execSync(): Buffer {
    const command = this.buildCommand();
    console.log('Executing:', command);
    return execSync(command);
  }

  // Execute asynchronously
  async exec(): Promise<{ stdout: string; stderr: string }> {
    const command = this.buildCommand();
    console.log('Executing:', command);
    return execAsync(command);
  }

  // Get the command string without executing
  toString(): string {
    return this.buildCommand();
  }

  all(): this {
    this._all = true;
    return this;
  }

  namespace(ns: string): this {
    this._namespace = ns;
    return this;
  }
}

// Full builder for img command
class AwwwImgBuilder extends AwwwBase {
  protected _resize?: ResizeMode;
  protected _fillColor?: string;
  protected _filter?: string;
  protected _transitionType?: string;
  protected _transitionStep?: number;
  protected _transitionDuration?: number;
  protected _transitionFps?: number;
  protected _transitionAngle?: number;
  protected _transitionPos?: string;
  protected _transitionBezier?: string;
  protected _transitionWave?: string;
  protected _invertY?: boolean;

  outputs(outputs: string): this {
    this._outputs = outputs;
    return this;
  }

  resize(mode: ResizeMode): this {
    this._resize = mode;
    return this;
  }

  fillColor(color: string): this {
    this._fillColor = color;
    return this;
  }

  filter(filter: string): this {
    this._filter = filter;
    return this;
  }

  transitionType(type: string): this {
    this._transitionType = type;
    return this;
  }

  transitionStep(step: number): this {
    this._transitionStep = step;
    return this;
  }

  transitionDuration(duration: number): this {
    this._transitionDuration = duration;
    return this;
  }

  transitionFps(fps: number): this {
    this._transitionFps = fps;
    return this;
  }

  transitionAngle(angle: number): this {
    this._transitionAngle = angle;
    return this;
  }

  transitionPos(pos: string): this {
    this._transitionPos = pos;
    return this;
  }

  transitionBezier(bezier: string): this {
    this._transitionBezier = bezier;
    return this;
  }

  transitionWave(wave: string): this {
    this._transitionWave = wave;
    return this;
  }

  invertY(): this {
    this._invertY = true;
    return this;
  }
}

// Query builder (namespace, all, json)
class AwwwQueryBuilder extends AwwwBase {
  protected _json?: boolean;

  json(): this {
    this._json = true;
    return this;
  }
}

// Builder for clear and restore (outputs, namespace, all)
class AwwwClearRestoreBuilder extends AwwwBase {
  protected _color?: string;

  outputs(outputs: string): this {
    this._outputs = outputs;
    return this;
  }
}

// Main awww class with static constructor methods
export class awww {
  static img(path: string): AwwwImgBuilder {
    const builder = new AwwwImgBuilder();
    builder._action = "img";
    builder._img = path;
    return builder;
  }

  static query(): AwwwQueryBuilder {
    const builder = new AwwwQueryBuilder();
    builder._action = "query";
    return builder;
  }

  static clear(color: string = "000000ff"): AwwwClearRestoreBuilder {
    const builder = new AwwwClearRestoreBuilder();
    builder._action = "clear";
    (builder as any)._color = color;
    return builder;
  }

  static restore(): AwwwClearRestoreBuilder {
    const builder = new AwwwClearRestoreBuilder();
    builder._action = "restore";
    return builder;
  }
}