/**
 * Fluid Hero Preset Configuration
 *
 * Default parameters tuned for hero background performance and aesthetics
 */

import type { ColorRamp } from '../colorramp';
import { createBrandRamp } from '../colorramp';

export interface FluidOptions {
  // Simulation grid
  simWidth: number;
  simHeight: number;
  dt: number;
  iterations: number;

  // Layer A (base - dark, viscous)
  viscosityA: number;
  dyeDiffA: number;

  // Layer B (top - lighter, interactive)
  viscosityB: number;
  dyeDiffB: number;
  buoyancyB: number;
  driftB: [number, number];

  // Cursor interaction
  cursorRadius: number;
  cursorForce: number;
  cursorDye: [number, number, number];

  // Visual
  ramp: ColorRamp;
  bloom: {
    enabled: boolean;
    strength: number;
    radius: number;
  };
  feather: {
    enabled: boolean;
    heightPx: number;
    targetColor: string;
  };

  // Accessibility
  reducedMotion: boolean;
}

/**
 * Desktop preset (high quality)
 */
export const DESKTOP_PRESET: FluidOptions = {
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
  cursorDye: [92, 192, 248], // Brand blue

  ramp: createBrandRamp(),

  bloom: {
    enabled: true,
    strength: 0.18,
    radius: 10,
  },

  feather: {
    enabled: true,
    heightPx: 160,
    targetColor: '#E8C69B', // Sand color
  },

  reducedMotion: false,
};

/**
 * Mobile preset (optimized for performance)
 */
export const MOBILE_PRESET: FluidOptions = {
  simWidth: 448,
  simHeight: 252,
  dt: 1 / 60,
  iterations: 10,

  viscosityA: 0.004,
  dyeDiffA: 0.0002,

  viscosityB: 0.0008,
  dyeDiffB: 0.00005,
  buoyancyB: 0.08,
  driftB: [0.06, 0.0],

  cursorRadius: 48,
  cursorForce: 36,
  cursorDye: [92, 192, 248],

  ramp: createBrandRamp(),

  bloom: {
    enabled: false, // Disabled on mobile for performance
    strength: 0,
    radius: 0,
  },

  feather: {
    enabled: true,
    heightPx: 120,
    targetColor: '#E8C69B',
  },

  reducedMotion: false,
};

/**
 * Reduced motion preset (minimal animation)
 */
export const REDUCED_MOTION_PRESET: Partial<FluidOptions> = {
  iterations: 8,
  driftB: [0, 0],
  cursorForce: 0,
  buoyancyB: 0,
  bloom: {
    enabled: false,
    strength: 0,
    radius: 0,
  },
  reducedMotion: true,
};

/**
 * Get appropriate preset based on device
 */
export function getDefaultPreset(): FluidOptions {
  const isMobile = window.innerWidth < 768;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let preset = isMobile ? { ...MOBILE_PRESET } : { ...DESKTOP_PRESET };

  if (prefersReducedMotion) {
    preset = { ...preset, ...REDUCED_MOTION_PRESET };
  }

  return preset;
}
