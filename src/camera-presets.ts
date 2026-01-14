/**
 * Camera Preset System
 *
 * Manages saving and loading camera positions for quick scene navigation
 * Presets are stored in-memory and can optionally be persisted to localStorage
 */

export interface CameraPreset {
  name: string;
  position: [number, number, number];
  lookAt?: [number, number, number];
  fov?: number;
  near?: number;
  far?: number;
  timestamp?: number;
  description?: string;
}

export interface CameraPresetCollection {
  presets: Record<string, CameraPreset>;
  lastModified: number;
}

/**
 * In-memory preset storage
 * Will be synced with browser-side storage via WebSocket
 */
class CameraPresetManager {
  private presets: Map<string, CameraPreset> = new Map();

  /**
   * Save a camera preset
   */
  savePreset(preset: CameraPreset): void {
    preset.timestamp = Date.now();
    this.presets.set(preset.name, preset);
  }

  /**
   * Load a camera preset by name
   */
  loadPreset(name: string): CameraPreset | undefined {
    return this.presets.get(name);
  }

  /**
   * List all available presets
   */
  listPresets(): CameraPreset[] {
    return Array.from(this.presets.values()).sort((a, b) =>
      (b.timestamp || 0) - (a.timestamp || 0)
    );
  }

  /**
   * Delete a preset
   */
  deletePreset(name: string): boolean {
    return this.presets.delete(name);
  }

  /**
   * Import presets from JSON
   */
  importPresets(data: CameraPresetCollection): void {
    for (const [name, preset] of Object.entries(data.presets)) {
      this.presets.set(name, preset);
    }
  }

  /**
   * Export presets to JSON
   */
  exportPresets(): CameraPresetCollection {
    const presets: Record<string, CameraPreset> = {};
    for (const [name, preset] of this.presets) {
      presets[name] = preset;
    }
    return {
      presets,
      lastModified: Date.now()
    };
  }

  /**
   * Clear all presets
   */
  clear(): void {
    this.presets.clear();
  }
}

// Singleton instance
export const cameraPresets = new CameraPresetManager();

/**
 * Default presets for common viewpoints
 */
export const DEFAULT_PRESETS: CameraPreset[] = [
  {
    name: 'overhead',
    position: [0, 50, 0],
    lookAt: [0, 0, 0],
    description: 'Top-down orthographic-style view'
  },
  {
    name: 'front',
    position: [0, 5, 20],
    lookAt: [0, 0, 0],
    description: 'Front view of scene origin'
  },
  {
    name: 'side',
    position: [20, 5, 0],
    lookAt: [0, 0, 0],
    description: 'Side view of scene origin'
  },
  {
    name: 'perspective',
    position: [15, 10, 15],
    lookAt: [0, 0, 0],
    fov: 50,
    description: 'Diagonal perspective view'
  },
  {
    name: 'closeup',
    position: [3, 2, 3],
    lookAt: [0, 0, 0],
    fov: 35,
    description: 'Close-up view for detail inspection'
  },
  {
    name: 'wideangle',
    position: [30, 15, 30],
    lookAt: [0, 0, 0],
    fov: 75,
    description: 'Wide-angle scene overview'
  }
];

// Load default presets on initialization
DEFAULT_PRESETS.forEach(preset => cameraPresets.savePreset(preset));
