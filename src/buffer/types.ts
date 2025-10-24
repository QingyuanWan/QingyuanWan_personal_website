/**
 * Buffer Manager Types
 *
 * Shared type definitions for the preloading and resource management system
 */

export type BufferTask = () => Promise<void> | void;

export interface EffectHooks {
  /** Allocate buffers (TypedArrays, canvases) during preload */
  allocate?: BufferTask;

  /** Compile kernels, color ramps, load assets */
  prepare?: BufferTask;

  /** Run N dry simulation steps to warm JIT */
  warmup?: (steps: number) => Promise<void> | void;

  /** Start visible animation after reveal */
  start?: () => void;

  /** Cleanup on unmount */
  destroy?: () => void;
}

export interface BufferUIOptions {
  /** Minimum display time in ms (default 600) */
  minMs?: number;

  /** Fade out duration in ms (default 300) */
  fadeMs?: number;

  /** Loading message text */
  label?: string;

  /** Show progress percentage */
  showProgress?: boolean;
}

export interface BufferFeatures {
  /** Use Web Workers if available */
  useWorker?: boolean;

  /** Use OffscreenCanvas if available */
  useOffscreen?: boolean;

  /** Cap device pixel ratio (default 2) */
  dprCap?: number;
}

export interface BufferMetrics {
  /** Report timing metrics */
  report?: (name: string, durationMs: number) => void;
}

export interface BufferOptions {
  /** UI configuration */
  ui?: BufferUIOptions;

  /** Number of warm-up steps (default 60) */
  warmupSteps?: number;

  /** Feature flags / capability detection */
  features?: BufferFeatures;

  /** Telemetry hooks */
  metrics?: BufferMetrics;
}

export interface Capabilities {
  /** Device pixel ratio (capped) */
  dpr: number;

  /** OffscreenCanvas supported */
  offscreenCanvas: boolean;

  /** Web Workers supported */
  workers: boolean;

  /** ImageBitmap supported */
  imageBitmap: boolean;

  /** Prefers reduced motion */
  reducedMotion: boolean;

  /** Performance tier (low, medium, high) */
  tier: 'low' | 'medium' | 'high';
}

export interface TaskProgress {
  name: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  duration?: number;
  error?: Error;
}

export interface BufferManager {
  /** Register a preload task */
  addTask(name: string, fn: BufferTask): void;

  /** Attach effect hooks */
  attachEffect(name: string, hooks: EffectHooks): void;

  /** Start preloading and warm-up */
  run(): Promise<void>;

  /** Skip preload and start immediately */
  fastPath(): void;

  /** Get current capabilities */
  getCapabilities(): Capabilities;

  /** Get task progress */
  getProgress(): TaskProgress[];

  /** Cleanup */
  destroy(): void;
}

export interface ResourceCache {
  /** Cached offscreen canvases */
  canvases: Map<string, HTMLCanvasElement | OffscreenCanvas>;

  /** Cached typed arrays */
  arrays: Map<string, Float32Array | Uint8ClampedArray>;

  /** Cached kernels/LUTs */
  kernels: Map<string, Float32Array>;

  /** Cached color ramps */
  ramps: Map<string, Uint8ClampedArray>;
}
