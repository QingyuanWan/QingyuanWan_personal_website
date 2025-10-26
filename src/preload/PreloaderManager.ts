/**
 * Preloader Manager
 *
 * Minimal site-wide preloader ("buffer") with lifecycle:
 * 1. Mount overlay immediately
 * 2. Pre-allocate heavy things (canvases, arrays, kernels, fonts)
 * 3. Warm-up: Run ~60 invisible frames to JIT-warm & fill caches
 * 4. Reveal: Enforce min display time, fade out, then start visible loops
 *
 * This is a warm-up, not a video buffer - like top studios do.
 */

export interface PreloadTask {
  name: string;
  allocate?: () => void | Promise<void>; // Pre-allocate resources
  prepare?: () => void | Promise<void>; // Prepare/configure
  warmup?: (steps: number) => void | Promise<void>; // Run invisible frames
  start?: () => void; // Start visible rendering
  destroy?: () => void; // Cleanup
}

export interface PreloaderOptions {
  minShowMs?: number; // Minimum time to show overlay (600-900ms)
  fadeMs?: number; // Fade out duration (300ms)
  warmupSteps?: number; // Number of warm-up frames (60)
  backgroundColor?: string; // Overlay background color
  ringColor?: string; // Loading ring color
  textColor?: string; // Text color
  text?: string; // Loading text
}

const DEFAULT_OPTIONS: Required<PreloaderOptions> = {
  minShowMs: 700,
  fadeMs: 300,
  warmupSteps: 60,
  backgroundColor: '#E8E6E0',
  ringColor: '#A855F7',
  textColor: '#1A1A1A',
  text: 'preparing&',
};

export class PreloaderManager {
  private options: Required<PreloaderOptions>;
  private tasks: Map<string, PreloadTask> = new Map();
  private overlay: HTMLDivElement | null = null;
  private ring: HTMLDivElement | null = null;
  private label: HTMLDivElement | null = null;
  private startTime: number = 0;
  private isRunning: boolean = false;

  constructor(userOptions: PreloaderOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...userOptions };
  }

  /**
   * Add a preload task
   */
  addTask(name: string, task: PreloadTask): void {
    this.tasks.set(name, { ...task, name });
    console.log(`[Preloader] Added task: ${name}`);
  }

  /**
   * Run preloader lifecycle
   */
  async run(): Promise<void> {
    if (this.isRunning) {
      console.warn('[Preloader] Already running');
      return;
    }

    this.isRunning = true;
    this.startTime = performance.now();

    try {
      // 1. Mount overlay
      this.mountOverlay();

      // 2. Allocate resources
      await this.allocatePhase();

      // 3. Prepare
      await this.preparePhase();

      // 4. Warm-up
      await this.warmupPhase();

      // 5. Ensure minimum display time
      await this.enforceMinShowTime();

      // 6. Fade out overlay
      await this.fadeOut();

      // 7. Start visible rendering
      this.startPhase();

      // 8. Remove overlay
      this.unmountOverlay();

      const totalTime = performance.now() - this.startTime;
      console.log(`[Preloader] Complete in ${totalTime.toFixed(2)}ms`);
    } catch (error) {
      console.error('[Preloader] Error:', error);
      this.unmountOverlay();
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Destroy all tasks and cleanup
   */
  destroy(): void {
    this.tasks.forEach((task) => {
      if (task.destroy) {
        task.destroy();
      }
    });

    this.tasks.clear();
    this.unmountOverlay();
  }

  // Private methods

  private mountOverlay(): void {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Adopt existing overlay from index.html (if present)
    const existing = document.getElementById('preloader-overlay');
    if (existing) {
      this.overlay = existing as HTMLDivElement;
      this.ring = existing.querySelector('.preloader-ring') as HTMLDivElement;
      this.label = existing.querySelector('.preloader-label') as HTMLDivElement;
      console.log('[Preloader] Adopted existing overlay from HTML');
      return;
    }

    // Fallback: Create overlay dynamically (if index.html doesn't have it)
    this.overlay = document.createElement('div');
    this.overlay.setAttribute('role', 'status');
    this.overlay.setAttribute('aria-live', 'polite');
    this.overlay.setAttribute('aria-label', 'Loading application');
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: ${this.options.backgroundColor};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      transition: opacity ${this.options.fadeMs}ms ease;
      opacity: 1;
    `;

    // Create loading ring
    this.ring = document.createElement('div');
    this.ring.style.cssText = `
      width: 48px;
      height: 48px;
      border: 3px solid ${this.options.ringColor}33;
      border-top-color: ${this.options.ringColor};
      border-radius: 50%;
      animation: ${prefersReducedMotion ? 'none' : 'preloader-spin 1s linear infinite'};
      margin-bottom: 16px;
    `;

    // Create label
    this.label = document.createElement('div');
    this.label.textContent = this.options.text;
    this.label.style.cssText = `
      color: ${this.options.textColor};
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0.05em;
    `;

    this.overlay.appendChild(this.ring);
    this.overlay.appendChild(this.label);

    // Add keyframes for spin animation
    if (!prefersReducedMotion && !document.getElementById('preloader-keyframes')) {
      const style = document.createElement('style');
      style.id = 'preloader-keyframes';
      style.textContent = `
        @keyframes preloader-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(this.overlay);
    console.log('[Preloader] Overlay mounted');
  }

  private async allocatePhase(): Promise<void> {
    console.log('[Preloader] Allocate phase...');
    const start = performance.now();

    for (const [name, task] of this.tasks) {
      if (task.allocate) {
        console.log(`[Preloader] Allocating: ${name}`);
        await task.allocate();
      }
    }

    const duration = performance.now() - start;
    console.log(`[Preloader] Allocate complete in ${duration.toFixed(2)}ms`);
  }

  private async preparePhase(): Promise<void> {
    console.log('[Preloader] Prepare phase...');
    const start = performance.now();

    for (const [name, task] of this.tasks) {
      if (task.prepare) {
        console.log(`[Preloader] Preparing: ${name}`);
        await task.prepare();
      }
    }

    const duration = performance.now() - start;
    console.log(`[Preloader] Prepare complete in ${duration.toFixed(2)}ms`);
  }

  private async warmupPhase(): Promise<void> {
    console.log(`[Preloader] Warm-up phase (${this.options.warmupSteps} steps)...`);
    const start = performance.now();

    for (const [name, task] of this.tasks) {
      if (task.warmup) {
        console.log(`[Preloader] Warming up: ${name}`);
        await task.warmup(this.options.warmupSteps);
      }
    }

    const duration = performance.now() - start;
    console.log(`[Preloader] Warm-up complete in ${duration.toFixed(2)}ms`);
  }

  private async enforceMinShowTime(): Promise<void> {
    const elapsed = performance.now() - this.startTime;
    const remaining = this.options.minShowMs - elapsed;

    if (remaining > 0) {
      console.log(`[Preloader] Waiting ${remaining.toFixed(2)}ms to meet min show time`);
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
  }

  private async fadeOut(): Promise<void> {
    if (!this.overlay) return;

    console.log(`[Preloader] Fading out (${this.options.fadeMs}ms)...`);

    // Use CSS class for fade (respects inline critical CSS transition)
    this.overlay.classList.add('fade-out');

    await new Promise((resolve) => setTimeout(resolve, this.options.fadeMs));
  }

  private startPhase(): void {
    console.log('[Preloader] Start phase...');

    for (const [name, task] of this.tasks) {
      if (task.start) {
        console.log(`[Preloader] Starting: ${name}`);
        task.start();
      }
    }
  }

  private unmountOverlay(): void {
    if (this.overlay) {
      if (this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
        console.log('[Preloader] ✓ Overlay removed from DOM');
      }
      this.overlay = null;
      this.ring = null;
      this.label = null;
    }

    // Also try to remove by ID in case reference was lost
    const existingOverlay = document.getElementById('preloader-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
      console.log('[Preloader] ✓ Removed existing overlay by ID');
    }
  }
}

/**
 * Create and run preloader (convenience function)
 */
export async function runPreloader(
  tasks: Array<{ name: string; task: PreloadTask }>,
  options?: PreloaderOptions
): Promise<void> {
  const manager = new PreloaderManager(options);

  tasks.forEach(({ name, task }) => {
    manager.addTask(name, task);
  });

  await manager.run();
}
