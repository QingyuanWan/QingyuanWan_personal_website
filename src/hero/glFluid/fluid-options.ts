/**
 * WebGL Fluid Simulation - Quality Presets & Ladder
 *
 * Based on techniques from:
 * - Pavel Dobryakov's WebGL Fluid Simulation (MIT)
 * - Jos Stam's "Real-Time Fluid Dynamics for Games"
 */

export type FluidTier = 'low' | 'med' | 'high';

export interface FluidOptions {
  simResolution: number;      // Internal grid resolution
  dyeResolution: number;      // Dye/color texture resolution
  pressureIterations: number; // Pressure solver iterations
  curl: number;               // Vorticity strength
  splatRadius: number;        // Splat size (normalized 0-1)
  splatForce: number;         // Splat velocity magnitude
  bloom: boolean;             // Enable bloom effect
  bloomStrength: number;      // Bloom intensity
  dissipation: number;        // Velocity dissipation (0.95-0.99)
  dyeDecay: number;           // Dye/color decay (0.95-0.99)
}

export const PRESETS: Record<FluidTier, FluidOptions> = {
  high: {
    simResolution: 256,
    dyeResolution: 512,
    pressureIterations: 14,
    curl: 30,
    splatRadius: 0.3,
    splatForce: 6000,
    bloom: true,
    bloomStrength: 0.25,
    dissipation: 0.98,
    dyeDecay: 0.97,
  },
  med: {
    simResolution: 192,
    dyeResolution: 384,
    pressureIterations: 12,
    curl: 20,
    splatRadius: 0.28,
    splatForce: 4800,
    bloom: true,
    bloomStrength: 0.20,
    dissipation: 0.97,
    dyeDecay: 0.96,
  },
  low: {
    simResolution: 128,
    dyeResolution: 256,
    pressureIterations: 10,
    curl: 14,
    splatRadius: 0.26,
    splatForce: 3600,
    bloom: false,
    bloomStrength: 0.0,
    dissipation: 0.96,
    dyeDecay: 0.95,
  },
};

/**
 * Quality ladder controller
 */
export class FluidQualityLadder {
  private currentTier: FluidTier = 'med';
  private frameTimes: number[] = [];
  private promotionTimer: number = 0;

  constructor() {
    // Load saved tier preference
    try {
      const saved = localStorage.getItem('fluidTier');
      if (saved && (saved === 'low' || saved === 'med' || saved === 'high')) {
        this.currentTier = saved;
      }
    } catch (e) {
      // Ignore
    }
  }

  getCurrentTier(): FluidTier {
    return this.currentTier;
  }

  getCurrentOptions(): FluidOptions {
    return PRESETS[this.currentTier];
  }

  addFrameTime(ms: number): void {
    this.frameTimes.push(ms);
    if (this.frameTimes.length > 30) {
      this.frameTimes.shift();
    }
  }

  /**
   * Check if tier should change based on performance
   * Returns new tier if changed, null otherwise
   */
  checkLadder(frameCount: number): FluidTier | null {
    if (this.frameTimes.length < 20) return null; // Need enough samples

    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;

    // Downshift if slow (>18ms = <55fps)
    if (avgFrameTime > 18 && this.currentTier !== 'low') {
      console.warn(`[FluidLadder] Slow performance (${avgFrameTime.toFixed(2)}ms), downshifting`);
      this.currentTier = this.currentTier === 'high' ? 'med' : 'low';
      this.frameTimes = [];
      this.promotionTimer = 0;
      this.saveTier();
      return this.currentTier;
    }

    // Upshift if fast (<12ms = >83fps) and stable for 5s
    if (avgFrameTime < 12 && this.currentTier !== 'high' && frameCount >= 300) {
      this.promotionTimer++;

      if (this.promotionTimer >= 300) { // ~5 seconds at 60fps
        console.log(`[FluidLadder] Fast performance (${avgFrameTime.toFixed(2)}ms), upshifting`);
        this.currentTier = this.currentTier === 'low' ? 'med' : 'high';
        this.frameTimes = [];
        this.promotionTimer = 0;
        this.saveTier();
        return this.currentTier;
      }
    } else {
      this.promotionTimer = 0;
    }

    return null;
  }

  private saveTier(): void {
    try {
      localStorage.setItem('fluidTier', this.currentTier);
    } catch (e) {
      // Ignore
    }
  }
}
