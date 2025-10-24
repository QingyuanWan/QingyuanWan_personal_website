/**
 * Buffer Manager - Core preloading and warm-up system
 *
 * Orchestrates resource allocation, effect warm-up, and reveal choreography
 */

import type {
  BufferManager,
  BufferOptions,
  BufferTask,
  EffectHooks,
  Capabilities,
  TaskProgress,
  ResourceCache,
} from './types';
import { detectCapabilities } from './resources';

const DEFAULT_OPTIONS: Required<BufferOptions> = {
  ui: {
    minMs: 600,
    fadeMs: 300,
    label: 'Preparing experience...',
    showProgress: true,
  },
  warmupSteps: 60,
  features: {
    useWorker: true,
    useOffscreen: true,
    dprCap: 2,
  },
  metrics: {
    report: (name, ms) => console.log(`[Metrics] ${name}: ${ms.toFixed(2)}ms`),
  },
};

export function createBufferManager(userOptions?: BufferOptions): BufferManager {
  console.log('[BufferManager] Initializing');

  const options = {
    ui: { ...DEFAULT_OPTIONS.ui, ...userOptions?.ui },
    warmupSteps: userOptions?.warmupSteps ?? DEFAULT_OPTIONS.warmupSteps,
    features: { ...DEFAULT_OPTIONS.features, ...userOptions?.features },
    metrics: userOptions?.metrics ?? DEFAULT_OPTIONS.metrics,
  };

  // Detect capabilities
  const capabilities = detectCapabilities(options.features.dprCap!);

  // Adjust for reduced motion
  if (capabilities.reducedMotion) {
    options.warmupSteps = 0;
    options.ui.minMs = 300;
    console.log('[BufferManager] Reduced motion detected - skipping warm-up');
  }

  // State
  const tasks = new Map<string, BufferTask>();
  const effects = new Map<string, EffectHooks>();
  const progress: TaskProgress[] = [];
  const cache: ResourceCache = {
    canvases: new Map(),
    arrays: new Map(),
    kernels: new Map(),
    ramps: new Map(),
  };

  let destroyed = false;
  let startTime = 0;

  /**
   * Run a task with timing
   */
  async function runTask(name: string, fn: BufferTask): Promise<void> {
    const taskProgress: TaskProgress = {
      name,
      status: 'running',
    };
    progress.push(taskProgress);

    console.log(`[BufferManager] Running task: ${name}`);
    const start = performance.now();

    try {
      await fn();
      const duration = performance.now() - start;

      taskProgress.status = 'complete';
      taskProgress.duration = duration;

      if (options.metrics.report) {
        options.metrics.report(name, duration);
      }

      console.log(`[BufferManager] Task complete: ${name} (${duration.toFixed(2)}ms)`);
    } catch (error) {
      taskProgress.status = 'error';
      taskProgress.error = error as Error;

      console.error(`[BufferManager] Task failed: ${name}`, error);
      throw error;
    }
  }

  /**
   * Run all allocation tasks
   */
  async function allocate(): Promise<void> {
    console.log('[BufferManager] Allocating resources');

    // Run all registered tasks
    for (const [name, fn] of tasks) {
      await runTask(name, fn);
    }

    // Run effect allocate hooks
    for (const [name, hooks] of effects) {
      if (hooks.allocate) {
        await runTask(`${name}:allocate`, hooks.allocate);
      }
    }
  }

  /**
   * Run all prepare tasks
   */
  async function prepare(): Promise<void> {
    console.log('[BufferManager] Preparing effects');

    for (const [name, hooks] of effects) {
      if (hooks.prepare) {
        await runTask(`${name}:prepare`, hooks.prepare);
      }
    }
  }

  /**
   * Run warm-up loops
   */
  async function warmup(): Promise<void> {
    if (options.warmupSteps === 0) {
      console.log('[BufferManager] Skipping warm-up');
      return;
    }

    console.log(`[BufferManager] Warming up (${options.warmupSteps} steps)`);
    const start = performance.now();

    for (const [name, hooks] of effects) {
      if (hooks.warmup) {
        await runTask(`${name}:warmup`, () => hooks.warmup!(options.warmupSteps));
      }
    }

    const duration = performance.now() - start;
    console.log(`[BufferManager] Warm-up complete (${duration.toFixed(2)}ms)`);

    // Auto-downgrade check
    const avgFrameTime = duration / options.warmupSteps;
    if (avgFrameTime > 20) {
      console.warn(`[BufferManager] Slow warm-up detected (${avgFrameTime.toFixed(2)}ms/frame)`);
      // Effects should handle downgrade via capabilities.tier
    }
  }

  /**
   * Start all effects
   */
  function start(): void {
    console.log('[BufferManager] Starting effects');

    for (const [name, hooks] of effects) {
      if (hooks.start) {
        hooks.start();
        console.log(`[BufferManager] Started effect: ${name}`);
      }
    }
  }

  /**
   * Main run sequence
   */
  async function run(): Promise<void> {
    if (destroyed) {
      console.warn('[BufferManager] Already destroyed');
      return;
    }

    startTime = performance.now();
    console.log('[BufferManager] Starting preload sequence');

    try {
      // Phase 1: Allocate
      await allocate();

      // Phase 2: Prepare
      await prepare();

      // Phase 3: Warm up
      await warmup();

      // Phase 4: Wait for minimum UI time
      const elapsed = performance.now() - startTime;
      const remaining = options.ui.minMs! - elapsed;

      if (remaining > 0) {
        console.log(`[BufferManager] Waiting ${remaining.toFixed(0)}ms for min display time`);
        await new Promise(resolve => setTimeout(resolve, remaining));
      }

      // Phase 5: Start effects
      start();

      const totalTime = performance.now() - startTime;
      console.log(`[BufferManager] Preload complete (${totalTime.toFixed(2)}ms)`);

      if (options.metrics.report) {
        options.metrics.report('total-preload', totalTime);
      }
    } catch (error) {
      console.error('[BufferManager] Preload failed', error);
      // Fallback: start anyway but degraded
      start();
    }
  }

  /**
   * Fast path - skip preload
   */
  function fastPath(): void {
    console.log('[BufferManager] Fast path - skipping preload');
    start();
  }

  /**
   * Cleanup
   */
  function destroy(): void {
    if (destroyed) return;

    console.log('[BufferManager] Destroying');
    destroyed = true;

    // Destroy effects
    for (const [name, hooks] of effects) {
      if (hooks.destroy) {
        hooks.destroy();
        console.log(`[BufferManager] Destroyed effect: ${name}`);
      }
    }

    // Clear caches
    cache.canvases.clear();
    cache.arrays.clear();
    cache.kernels.clear();
    cache.ramps.clear();

    tasks.clear();
    effects.clear();
    progress.length = 0;
  }

  // Public API
  return {
    addTask(name: string, fn: BufferTask) {
      if (destroyed) {
        console.warn('[BufferManager] Cannot add task - already destroyed');
        return;
      }

      console.log(`[BufferManager] Registered task: ${name}`);
      tasks.set(name, fn);
    },

    attachEffect(name: string, hooks: EffectHooks) {
      if (destroyed) {
        console.warn('[BufferManager] Cannot attach effect - already destroyed');
        return;
      }

      console.log(`[BufferManager] Attached effect: ${name}`);
      effects.set(name, hooks);
    },

    run,
    fastPath,

    getCapabilities() {
      return capabilities;
    },

    getProgress() {
      return [...progress];
    },

    destroy,
  };
}

/**
 * Singleton instance for easy access
 */
let globalManager: BufferManager | null = null;

export function getGlobalManager(): BufferManager | null {
  return globalManager;
}

export function setGlobalManager(manager: BufferManager): void {
  if (globalManager) {
    console.warn('[BufferManager] Replacing existing global manager');
    globalManager.destroy();
  }
  globalManager = manager;
}

export function clearGlobalManager(): void {
  if (globalManager) {
    globalManager.destroy();
    globalManager = null;
  }
}
