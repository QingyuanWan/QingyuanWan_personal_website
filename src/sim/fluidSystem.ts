/**
 * Fluid System - Main controller
 *
 * Integrates fluid solver, rendering, global cursor, and RAF loop
 */

import type { GlobalCursor } from '../cursor/globalCursor';
import { toSim } from '../cursor/coordinates';
import type { FluidOptions } from './presets/fluidHero';
import { createFluidGrid, stepVelocity, stepDye, addForce, addDye, addDrift, addBuoyancy } from './fluid2d';
import type { FluidGrid } from './fluid2d';
import { renderFluid } from './composite';
import { createRAFController } from './raf';
import type { RAFController } from './raf';

export interface FluidSystem {
  resize(): void;
  setOptions(partial: Partial<FluidOptions>): void;
  inject(x: number, y: number, color: [number, number, number], strength: number): void;
  destroy(): void;
}

export function createFluid(
  container: HTMLElement,
  cursor: GlobalCursor,
  userOptions: Partial<FluidOptions> = {}
): FluidSystem {
  console.log('[FluidSystem] Creating fluid system');

  // Canvas setup
  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  `;
  container.style.position = container.style.position || 'relative';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d', { alpha: false })!;

  // Merge options with defaults
  let options: FluidOptions = {
    simWidth: 640,
    simHeight: 360,
    dt: 1 / 60,
    iterations: 14,
    viscosityA: 0.003,
    dyeDiffA: 0.0003,
    viscosityB: 0.0006,
    dyeDiffB: 0.0001,
    buoyancyB: 0.12,
    driftB: [0.08, 0.0],
    cursorRadius: 64,
    cursorForce: 48,
    cursorDye: [92, 192, 248],
    ramp: userOptions.ramp!,
    bloom: {
      enabled: true,
      strength: 0.18,
      radius: 10,
    },
    feather: {
      enabled: true,
      heightPx: 160,
      targetColor: '#E8C69B',
    },
    reducedMotion: false,
    ...userOptions,
  };

  // Fluid grid
  let grid: FluidGrid = createFluidGrid(options.simWidth, options.simHeight);

  // Initialize with some base dye for Layer A
  for (let i = 0; i < grid.width * grid.height; i++) {
    grid.dyeRA[i] = 10;
    grid.dyeGA[i] = 26;
    grid.dyeBA[i] = 58; // Dark blue
  }

  // RAF controller
  let rafController: RAFController;

  // Simulation step
  function update(dt: number) {
    if (options.reducedMotion) return; // Skip simulation in reduced motion

    const params = {
      viscosityA: options.viscosityA,
      viscosityB: options.viscosityB,
      dyeDiffA: options.dyeDiffA,
      dyeDiffB: options.dyeDiffB,
      buoyancyB: options.buoyancyB,
      driftB: options.driftB,
      iterations: options.iterations,
      dt: options.dt,
    };

    // Add lateral drift to Layer B
    if (options.driftB[0] !== 0 || options.driftB[1] !== 0) {
      addDrift(grid.uB, grid.vB, options.driftB[0], options.driftB[1], grid.width * grid.height);
    }

    // Cursor interaction (Layer B only)
    const cursorState = cursor.getState();
    if (cursorState.insideSectionId === 'hero' && cursorState.speed > 0.1) {
      // Convert viewport coordinates to simulation space
      const simPos = toSim(
        cursorState.clientX,
        cursorState.clientY,
        container,
        grid.width,
        grid.height
      );

      // Velocity direction from cursor
      const speedScale = Math.min(cursorState.speed / 10, 1);
      const fx = cursorState.vx * options.cursorForce * speedScale;
      const fy = cursorState.vy * options.cursorForce * speedScale;

      // Add force to velocity
      addForce(grid.uB, grid.vB, simPos.x, simPos.y, fx, fy, options.cursorRadius, grid.width, grid.height);

      // Add dye
      const [r, g, b] = options.ramp.sampleWithNoise(Math.random(), 0.1);
      addDye(grid.dyeRB, simPos.x, simPos.y, r, options.cursorRadius * 0.8, grid.width, grid.height);
      addDye(grid.dyeGB, simPos.x, simPos.y, g, options.cursorRadius * 0.8, grid.width, grid.height);
      addDye(grid.dyeBB, simPos.x, simPos.y, b, options.cursorRadius * 0.8, grid.width, grid.height);
    }

    // Add buoyancy to Layer B
    if (options.buoyancyB > 0) {
      addBuoyancy(grid.vB, grid.dyeRB, grid.dyeGB, grid.dyeBB, options.buoyancyB, grid.width, grid.height);
    }

    // Step velocity fields
    stepVelocity(grid, params, 'A');
    stepVelocity(grid, params, 'B');

    // Step dye fields
    stepDye(grid.dyeRA, grid.uA, grid.vA, params.dyeDiffA, params.dt, grid.width, grid.height, params.iterations, grid.tempDye);
    stepDye(grid.dyeGA, grid.uA, grid.vA, params.dyeDiffA, params.dt, grid.width, grid.height, params.iterations, grid.tempDye);
    stepDye(grid.dyeBA, grid.uA, grid.vA, params.dyeDiffA, params.dt, grid.width, grid.height, params.iterations, grid.tempDye);

    stepDye(grid.dyeRB, grid.uB, grid.vB, params.dyeDiffB, params.dt, grid.width, grid.height, params.iterations, grid.tempDye);
    stepDye(grid.dyeGB, grid.uB, grid.vB, params.dyeDiffB, params.dt, grid.width, grid.height, params.iterations, grid.tempDye);
    stepDye(grid.dyeBB, grid.uB, grid.vB, params.dyeDiffB, params.dt, grid.width, grid.height, params.iterations, grid.tempDye);
  }

  // Render frame
  function render() {
    renderFluid(ctx, grid, {
      bloom: options.bloom,
      feather: options.feather,
      ramp: options.ramp,
    }, canvas.width, canvas.height);
  }

  // Resize handler
  function resize() {
    const rect = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.scale(dpr, dpr);

    console.log('[FluidSystem] Resized:', rect.width, 'x', rect.height);
  }

  // Initialize
  resize();
  window.addEventListener('resize', resize);

  // Start RAF loop
  rafController = createRAFController({
    dt: options.dt,
    maxSubSteps: 3,
    onUpdate: update,
    onRender: render,
  });

  rafController.start();
  console.log('[FluidSystem] Started');

  // Public API
  return {
    resize,

    setOptions(partial: Partial<FluidOptions>) {
      options = { ...options, ...partial };
      console.log('[FluidSystem] Options updated:', partial);
    },

    inject(x: number, y: number, color: [number, number, number], strength: number) {
      // Map to sim space
      const rect = container.getBoundingClientRect();
      const simX = (x / rect.width) * grid.width;
      const simY = (y / rect.height) * grid.height;

      const radius = options.cursorRadius * 0.8;
      addDye(grid.dyeRB, simX, simY, color[0] * strength, radius, grid.width, grid.height);
      addDye(grid.dyeGB, simX, simY, color[1] * strength, radius, grid.width, grid.height);
      addDye(grid.dyeBB, simX, simY, color[2] * strength, radius, grid.width, grid.height);
    },

    destroy() {
      console.log('[FluidSystem] Destroying');
      rafController.destroy();
      window.removeEventListener('resize', resize);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    },
  };
}
