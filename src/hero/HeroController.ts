/**
 * Hero Controller
 *
 * Orchestrates hero visual mode selection, preloader lifecycle,
 * reveal guard, and fallback behavior.
 */

import type { HeroEffect } from './HeroEffect';
import type { PreloaderManager } from '../preload/PreloaderManager';

export type VisualMode = 'glFluid' | 'threeBands' | 'metaballs' | 'dot';

export interface HeroControllerOptions {
  mode: VisualMode;
  rootElement: HTMLElement;
  preloader: PreloaderManager;
  warmupSteps?: number;
  revealGuardMs?: number;
  onModeChange?: (mode: VisualMode) => void;
  onFirstDraw?: () => void;
  debug?: boolean;
}

export class HeroController {
  private options: HeroControllerOptions;
  private currentEffect: HeroEffect | null = null;
  private revealGuardTimer: number | null = null;
  private currentMode: VisualMode;

  constructor(options: HeroControllerOptions) {
    this.options = {
      warmupSteps: 60,
      revealGuardMs: 2000,
      debug: false,
      ...options,
    };
    this.currentMode = options.mode;
  }

  async initialize(): Promise<void> {
    const { mode, preloader, warmupSteps, debug } = this.options;

    console.log(`[HeroController] Initializing with mode: ${mode}`);

    try {
      // Create effect for current mode
      this.currentEffect = await this.createEffect(mode);

      // Add preloader task
      preloader.addTask(`hero-${mode}`, {
        allocate: async () => {
          if (debug) console.log(`[HeroController] Allocating ${mode}...`);
          await this.currentEffect!.allocate(this.options.rootElement);
        },
        warmup: async (steps) => {
          if (debug) console.log(`[HeroController] Warming up ${mode} (${steps} steps)...`);
          await this.currentEffect!.warmup(steps || warmupSteps!, (i, total) => {
            if (debug && i % 10 === 0) {
              console.log(`[HeroController] Warmup progress: ${i}/${total}`);
            }
          });
        },
        start: () => {
          if (debug) console.log(`[HeroController] Starting ${mode}...`);
          this.currentEffect!.start();
          this.setupRevealGuard();
        },
      });

      // Wait for first draw
      this.currentEffect.firstDraw$.then(() => {
        console.log(`[HeroController] ✓ First draw for ${mode}`);
        this.cancelRevealGuard();
        if (this.options.onFirstDraw) {
          this.options.onFirstDraw();
        }
      });

      console.log(`[HeroController] ✓ Initialized ${mode}`);
    } catch (error) {
      console.error(`[HeroController] Failed to initialize ${mode}:`, error);
      await this.fallbackToDot();
    }
  }

  destroy(): void {
    console.log('[HeroController] Destroying');

    this.cancelRevealGuard();

    if (this.currentEffect) {
      this.currentEffect.destroy();
      this.currentEffect = null;
    }
  }

  // Private methods

  private async createEffect(mode: VisualMode): Promise<HeroEffect> {
    switch (mode) {
      case 'glFluid': {
        const { FluidHero } = await import('./glFluid/FluidHero');
        return new FluidHero();
      }
      case 'threeBands': {
        // Placeholder for Phase 2
        throw new Error('threeBands mode not yet implemented');
      }
      case 'metaballs': {
        // Use existing metaballs (would need adapter)
        throw new Error('metaballs adapter not yet created');
      }
      case 'dot': {
        // Use existing dot panel (would need adapter)
        throw new Error('dot adapter not yet created');
      }
      default:
        throw new Error(`Unknown mode: ${mode}`);
    }
  }

  private setupRevealGuard(): void {
    const { revealGuardMs, debug } = this.options;

    if (!revealGuardMs) return;

    if (debug) {
      console.log(`[HeroController] Starting reveal guard (${revealGuardMs}ms)`);
    }

    this.revealGuardTimer = window.setTimeout(() => {
      console.warn(`[HeroController] ⚠️ Reveal guard timeout - no first draw after ${revealGuardMs}ms`);
      this.fallbackToDot();
    }, revealGuardMs);
  }

  private cancelRevealGuard(): void {
    if (this.revealGuardTimer !== null) {
      if (this.options.debug) {
        console.log('[HeroController] ✓ Reveal guard canceled (first draw received)');
      }
      clearTimeout(this.revealGuardTimer);
      this.revealGuardTimer = null;
    }
  }

  private async fallbackToDot(): Promise<void> {
    console.warn('[HeroController] Falling back to dot mode');

    this.cancelRevealGuard();

    // Destroy current effect
    if (this.currentEffect) {
      this.currentEffect.destroy();
      this.currentEffect = null;
    }

    // Switch to dot mode
    this.currentMode = 'dot';

    if (this.options.onModeChange) {
      this.options.onModeChange('dot');
    }

    // Note: Actual fallback rendering would happen in App.tsx
    // This just signals the mode change
  }
}
