/**
 * Pavel Dobryakov WebGL Fluid Simulation - Adapter
 *
 * Wraps the vendored PavelDoGreat code to work with our HeroEffect interface
 *
 * Original: https://github.com/PavelDoGreat/WebGL-Fluid-Simulation
 * License: MIT (see vendor/fluid-core.js)
 */

import { HeroEffect } from '../HeroEffect';
import type { FluidOptions } from './fluid-options';

export class PavelFluidAdapter implements HeroEffect {
  private canvas!: HTMLCanvasElement;
  private containerEl!: HTMLElement;
  private options: FluidOptions;

  private rafId: number | null = null;
  private isRunning = false;
  private frameCount = 0;
  private firstDrawResolve!: () => void;
  public firstDraw$: Promise<void>;

  // Vendored code state
  private fluidInstance: any = null;
  private hasAllocated = false;

  constructor(options: FluidOptions) {
    this.options = options;

    // Create firstDraw promise
    this.firstDraw$ = new Promise(resolve => {
      this.firstDrawResolve = resolve;
    });
  }

  async allocate(rootEl: HTMLElement): Promise<void> {
    if (this.hasAllocated) return;

    console.log('[PavelFluidAdapter] Allocating...');

    try {
      this.containerEl = rootEl;

      // Create canvas
      this.canvas = document.createElement('canvas');
      this.canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 0;
      `;
      rootEl.appendChild(this.canvas);

      // Size canvas with DPR cap
      this.resizeCanvas();

      // Initialize the vendored fluid simulation
      // The vendor code is in a script tag and runs immediately when loaded
      // We need to load and execute it in an isolated scope

      // For now, we'll use a dynamic import approach
      // This requires modifying the vendor code to export properly
      console.warn('[PavelFluidAdapter] Vendor code integration in progress...');
      console.warn('[PavelFluidAdapter] The vendor code (fluid-core.js) needs to be wrapped in a module export');
      console.warn('[PavelFluidAdapter] For now, falling back to simplified fluid');

      this.hasAllocated = true;
      console.log('[PavelFluidAdapter] ✓ Allocated');
    } catch (error) {
      console.error('[PavelFluidAdapter] Allocation failed:', error);
      throw error;
    }
  }

  async warmup(steps: number, onHeartbeat?: (i: number, total: number) => void): Promise<void> {
    console.log(`[PavelFluidAdapter] Warming up (${steps} steps)...`);

    // Simulate warmup frames
    for (let i = 0; i < steps; i++) {
      // In full implementation, this would call vendor update loop

      // Heartbeat every 5 steps
      if (i % 5 === 0 && onHeartbeat) {
        onHeartbeat(i, steps);
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
    }

    console.log('[PavelFluidAdapter] ✓ Warmup complete');
  }

  start(): void {
    if (this.isRunning) return;

    console.log('[PavelFluidAdapter] Starting render loop');
    this.isRunning = true;
    this.loop();
  }

  stop(): void {
    if (!this.isRunning) return;

    console.log('[PavelFluidAdapter] Stopping');
    this.isRunning = false;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  destroy(): void {
    console.log('[PavelFluidAdapter] Destroying');
    this.stop();

    // Remove canvas
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    this.fluidInstance = null;
  }

  // Private methods

  private resizeCanvas(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.0); // Cap at 2.0
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    // In full implementation, call vendor update/render
    this.render();

    // First draw
    if (this.frameCount === 0) {
      console.log('[PavelFluidAdapter] ✓ First draw');
      this.firstDrawResolve();
    }

    this.frameCount++;
    this.rafId = requestAnimationFrame(this.loop);
  };

  private render(): void {
    // Placeholder - in full implementation would call vendor render
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      // Simple placeholder gradient
      const gradient = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
      gradient.addColorStop(0, '#5BC0F8');
      gradient.addColorStop(0.5, '#A855F7');
      gradient.addColorStop(1, '#FF9F1C');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Add text overlay
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '20px monospace';
      ctx.fillText('Pavel Fluid Integration In Progress', 20, 40);
      ctx.fillText('Vendor code needs module wrapper', 20, 70);
    }
  }
}
