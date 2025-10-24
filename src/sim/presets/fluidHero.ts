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
  glass: {
    enabled: boolean;
    radius: number; // Corner radius
    padding: number; // Inset from edges
    innerShadow: boolean;
    edgeHighlight: boolean;
  };

  // Accessibility
  reducedMotion: boolean;
}

/**
 * Desktop preset (lava-lamp in glass)
 */
export const DESKTOP_PRESET: FluidOptions = {
  simWidth: 640,
  simHeight: 360,
  dt: 1 / 60,
  iterations: 14,

  // Layer A: Dark, viscous base (depth)
  viscosityA: 0.003,
  dyeDiffA: 0.0002,

  // Layer B: Medium viscosity top layer (interactive)
  viscosityB: 0.0012,
  dyeDiffB: 0.0002,
  buoyancyB: 0, // No buoyancy - internal flow only
  driftB: [0.06, 0.0], // Gentle lateral drift

  // Cursor stirring
  cursorRadius: 60,
  cursorForce: 48,
  cursorDye: [92, 192, 248], // Brand blue

  ramp: createBrandRamp(),

  // Subtle bloom (lava-lamp glow)
  bloom: {
    enabled: true,
    strength: 0.12,
    radius: 8,
  },

  // No feather (contained in glass)
  feather: {
    enabled: false,
    heightPx: 0,
    targetColor: '#E8E6E0',
  },

  // Glass container
  glass: {
    enabled: true,
    radius: 24,
    padding: 0,
    innerShadow: true,
    edgeHighlight: true,
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

  // Thicker viscosity for performance
  viscosityA: 0.004,
  dyeDiffA: 0.0001,

  viscosityB: 0.0015,
  dyeDiffB: 0.00015,
  buoyancyB: 0, // No buoyancy
  driftB: [0.04, 0.0], // Slower drift

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
    enabled: false,
    heightPx: 0,
    targetColor: '#E8E6E0',
  },

  // Glass container (enabled on mobile too)
  glass: {
    enabled: true,
    radius: 20,
    padding: 0,
    innerShadow: true,
    edgeHighlight: false, // Disabled for performance
  },

  reducedMotion: false,
};

/**
 * Reduced motion preset (minimal animation)
 */
export const REDUCED_MOTION_PRESET: Partial<FluidOptions> = {
  iterations: 10,
  driftB: [0.02, 0], // Minimal drift
  cursorForce: 0,
  buoyancyB: 0,
  bloom: {
    enabled: false,
    strength: 0,
    radius: 0,
  },
  glass: {
    enabled: true,
    radius: 24,
    padding: 0,
    innerShadow: true,
    edgeHighlight: true,
  },
  reducedMotion: true,
};

/**
 * Gravity-only preset (lava lamp at rest - no cursor interaction)
 * REDUCED RESOLUTION: Lower particle count to prevent explosion
 */
export const GRAVITY_LAYERS_PRESET: FluidOptions = {
  simWidth: 480,  // Reduced from 640 (75% resolution)
  simHeight: 270, // Reduced from 360 (75% resolution)
  dt: 1 / 60,
  iterations: 12, // Reduced from 14 for performance

  // Layer A: Heavy base (sinks)
  viscosityA: 0.005, // Slightly increased viscosity for stability
  dyeDiffA: 0.00008, // Reduced diffusion

  // Layer B: Light top (rises)
  viscosityB: 0.003, // Slightly increased viscosity for stability
  dyeDiffB: 0.00008, // Reduced diffusion
  buoyancyB: 0.12, // Reduced from 0.15 for gentler motion
  driftB: [0.02, 0], // Minimal drift for interest

  // No cursor interaction
  cursorRadius: 0,
  cursorForce: 0,
  cursorDye: [0, 0, 0],

  ramp: createBrandRamp(),

  // No bloom for clean look
  bloom: {
    enabled: false,
    strength: 0,
    radius: 0,
  },

  // No feather (contained in glass)
  feather: {
    enabled: false,
    heightPx: 0,
    targetColor: '#E8E6E0',
  },

  // Glass container with soft edges
  glass: {
    enabled: true,
    radius: 24,
    padding: 0,
    innerShadow: true,
    edgeHighlight: true,
  },

  reducedMotion: false,
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

/**
 * Get gravity-only preset (no interaction)
 */
export function getGravityPreset(): FluidOptions {
  const isMobile = window.innerWidth < 768;

  let preset = { ...GRAVITY_LAYERS_PRESET };

  if (isMobile) {
    preset.simWidth = 320;  // Further reduced for mobile
    preset.simHeight = 180; // Further reduced for mobile
    preset.iterations = 8;  // Reduced iterations for performance
    preset.glass.edgeHighlight = false; // Performance
  }

  return preset;
}
