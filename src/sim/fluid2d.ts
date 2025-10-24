/**
 * Stable Fluids 2D Solver (Jos Stam style)
 *
 * Implements Navier-Stokes equations on a 2D grid:
 * - Velocity field (u, v)
 * - Pressure projection (divergence-free)
 * - Dye advection (RGB channels, 2 layers)
 * - External forces (cursor, drift, buoyancy)
 */

import type { ColorRGB } from './colorramp';

export interface FluidGrid {
  width: number;
  height: number;
  // Layer A (base - dark, viscous)
  uA: Float32Array;
  vA: Float32Array;
  dyeRA: Float32Array;
  dyeGA: Float32Array;
  dyeBA: Float32Array;
  // Layer B (top - lighter, more motion)
  uB: Float32Array;
  vB: Float32Array;
  dyeRB: Float32Array;
  dyeGB: Float32Array;
  dyeBB: Float32Array;
  // Pressure/divergence (shared)
  pressure: Float32Array;
  divergence: Float32Array;
  // Temp buffers
  tempU: Float32Array;
  tempV: Float32Array;
  tempDye: Float32Array;
}

export interface FluidParams {
  viscosityA: number;
  viscosityB: number;
  dyeDiffA: number;
  dyeDiffB: number;
  buoyancyB: number;
  driftB: [number, number];
  iterations: number;
  dt: number;
}

/**
 * Create fluid grid
 */
export function createFluidGrid(width: number, height: number): FluidGrid {
  const size = width * height;

  return {
    width,
    height,
    // Layer A
    uA: new Float32Array(size),
    vA: new Float32Array(size),
    dyeRA: new Float32Array(size),
    dyeGA: new Float32Array(size),
    dyeBA: new Float32Array(size),
    // Layer B
    uB: new Float32Array(size),
    vB: new Float32Array(size),
    dyeRB: new Float32Array(size),
    dyeGB: new Float32Array(size),
    dyeBB: new Float32Array(size),
    // Shared
    pressure: new Float32Array(size),
    divergence: new Float32Array(size),
    // Temp
    tempU: new Float32Array(size),
    tempV: new Float32Array(size),
    tempDye: new Float32Array(size),
  };
}

/**
 * Index calculation (row-major)
 */
function IX(x: number, y: number, w: number): number {
  return y * w + x;
}

/**
 * Set boundary conditions (zero velocity at edges)
 */
function setBoundary(field: Float32Array, w: number, h: number, type: 'horizontal' | 'vertical' | 'scalar') {
  // Left/right edges
  for (let y = 1; y < h - 1; y++) {
    field[IX(0, y, w)] = type === 'horizontal' ? -field[IX(1, y, w)] : field[IX(1, y, w)];
    field[IX(w - 1, y, w)] = type === 'horizontal' ? -field[IX(w - 2, y, w)] : field[IX(w - 2, y, w)];
  }

  // Top/bottom edges
  for (let x = 1; x < w - 1; x++) {
    field[IX(x, 0, w)] = type === 'vertical' ? -field[IX(x, 1, w)] : field[IX(x, 1, w)];
    field[IX(x, h - 1, w)] = type === 'vertical' ? -field[IX(x, h - 2, w)] : field[IX(x, h - 2, w)];
  }

  // Corners
  field[IX(0, 0, w)] = 0.5 * (field[IX(1, 0, w)] + field[IX(0, 1, w)]);
  field[IX(w - 1, 0, w)] = 0.5 * (field[IX(w - 2, 0, w)] + field[IX(w - 1, 1, w)]);
  field[IX(0, h - 1, w)] = 0.5 * (field[IX(1, h - 1, w)] + field[IX(0, h - 2, w)]);
  field[IX(w - 1, h - 1, w)] = 0.5 * (field[IX(w - 2, h - 1, w)] + field[IX(w - 1, h - 2, w)]);
}

/**
 * Diffuse field using Jacobi iteration
 */
function diffuse(
  output: Float32Array,
  input: Float32Array,
  diff: number,
  dt: number,
  w: number,
  h: number,
  iterations: number,
  boundaryType: 'horizontal' | 'vertical' | 'scalar'
) {
  const a = dt * diff * (w - 2) * (h - 2);

  // Copy input to output
  output.set(input);

  for (let iter = 0; iter < iterations; iter++) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = IX(x, y, w);
        output[idx] = (
          input[idx] +
          a * (
            output[IX(x - 1, y, w)] +
            output[IX(x + 1, y, w)] +
            output[IX(x, y - 1, w)] +
            output[IX(x, y + 1, w)]
          )
        ) / (1 + 4 * a);
      }
    }
    setBoundary(output, w, h, boundaryType);
  }
}

/**
 * Advect field using semi-Lagrangian method
 */
function advect(
  output: Float32Array,
  input: Float32Array,
  u: Float32Array,
  v: Float32Array,
  dt: number,
  w: number,
  h: number,
  boundaryType: 'horizontal' | 'vertical' | 'scalar'
) {
  const dt0 = dt * (w - 2);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = IX(x, y, w);

      // Backtrace
      let bx = x - dt0 * u[idx];
      let by = y - dt0 * v[idx];

      // Clamp to grid
      bx = Math.max(0.5, Math.min(w - 1.5, bx));
      by = Math.max(0.5, Math.min(h - 1.5, by));

      // Bilinear interpolation
      const i0 = Math.floor(bx);
      const i1 = i0 + 1;
      const j0 = Math.floor(by);
      const j1 = j0 + 1;

      const s1 = bx - i0;
      const s0 = 1 - s1;
      const t1 = by - j0;
      const t0 = 1 - t1;

      output[idx] =
        s0 * (t0 * input[IX(i0, j0, w)] + t1 * input[IX(i0, j1, w)]) +
        s1 * (t0 * input[IX(i1, j0, w)] + t1 * input[IX(i1, j1, w)]);
    }
  }

  setBoundary(output, w, h, boundaryType);
}

/**
 * Compute divergence of velocity field
 */
function computeDivergence(div: Float32Array, u: Float32Array, v: Float32Array, w: number, h: number) {
  const scale = -0.5 / Math.max(w, h);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = IX(x, y, w);
      div[idx] = scale * (
        u[IX(x + 1, y, w)] - u[IX(x - 1, y, w)] +
        v[IX(x, y + 1, w)] - v[IX(x, y - 1, w)]
      );
    }
  }

  setBoundary(div, w, h, 'scalar');
}

/**
 * Solve for pressure using Jacobi iteration
 */
function solvePressure(p: Float32Array, div: Float32Array, w: number, h: number, iterations: number) {
  p.fill(0);

  for (let iter = 0; iter < iterations; iter++) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = IX(x, y, w);
        p[idx] = (
          div[idx] +
          p[IX(x - 1, y, w)] +
          p[IX(x + 1, y, w)] +
          p[IX(x, y - 1, w)] +
          p[IX(x, y + 1, w)]
        ) / 4;
      }
    }
    setBoundary(p, w, h, 'scalar');
  }
}

/**
 * Subtract pressure gradient from velocity (make divergence-free)
 */
function subtractGradient(u: Float32Array, v: Float32Array, p: Float32Array, w: number, h: number) {
  const scale = 0.5 * Math.max(w, h);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = IX(x, y, w);
      u[idx] -= scale * (p[IX(x + 1, y, w)] - p[IX(x - 1, y, w)]);
      v[idx] -= scale * (p[IX(x, y + 1, w)] - p[IX(x, y - 1, w)]);
    }
  }

  setBoundary(u, w, h, 'horizontal');
  setBoundary(v, w, h, 'vertical');
}

/**
 * Project velocity field to be divergence-free
 */
function project(
  u: Float32Array,
  v: Float32Array,
  p: Float32Array,
  div: Float32Array,
  w: number,
  h: number,
  iterations: number
) {
  computeDivergence(div, u, v, w, h);
  solvePressure(p, div, w, h, iterations);
  subtractGradient(u, v, p, w, h);
}

/**
 * Step velocity field
 */
export function stepVelocity(
  grid: FluidGrid,
  params: FluidParams,
  layer: 'A' | 'B'
) {
  const { width: w, height: h } = grid;
  const visc = layer === 'A' ? params.viscosityA : params.viscosityB;
  const u = layer === 'A' ? grid.uA : grid.uB;
  const v = layer === 'A' ? grid.vA : grid.vB;

  // Diffuse
  diffuse(grid.tempU, u, visc, params.dt, w, h, params.iterations, 'horizontal');
  diffuse(grid.tempV, v, visc, params.dt, w, h, params.iterations, 'vertical');

  // Project (make divergence-free after diffusion)
  project(grid.tempU, grid.tempV, grid.pressure, grid.divergence, w, h, params.iterations);

  // Advect
  advect(u, grid.tempU, grid.tempU, grid.tempV, params.dt, w, h, 'horizontal');
  advect(v, grid.tempV, grid.tempU, grid.tempV, params.dt, w, h, 'vertical');

  // Project again (make divergence-free after advection)
  project(u, v, grid.pressure, grid.divergence, w, h, params.iterations);
}

/**
 * Step dye field
 */
export function stepDye(
  dye: Float32Array,
  u: Float32Array,
  v: Float32Array,
  diff: number,
  dt: number,
  w: number,
  h: number,
  iterations: number,
  temp: Float32Array
) {
  // Optional diffusion
  if (diff > 0) {
    diffuse(temp, dye, diff, dt, w, h, iterations, 'scalar');
    advect(dye, temp, u, v, dt, w, h, 'scalar');
  } else {
    advect(dye, dye, u, v, dt, w, h, 'scalar');
  }
}

/**
 * Add force to velocity field in a circular region
 */
export function addForce(
  u: Float32Array,
  v: Float32Array,
  x: number,
  y: number,
  fx: number,
  fy: number,
  radius: number,
  w: number,
  h: number
) {
  const r2 = radius * radius;

  const minX = Math.max(1, Math.floor(x - radius));
  const maxX = Math.min(w - 2, Math.ceil(x + radius));
  const minY = Math.max(1, Math.floor(y - radius));
  const maxY = Math.min(h - 2, Math.ceil(y + radius));

  for (let j = minY; j <= maxY; j++) {
    for (let i = minX; i <= maxX; i++) {
      const dx = i - x;
      const dy = j - y;
      const dist2 = dx * dx + dy * dy;

      if (dist2 < r2) {
        const falloff = 1 - Math.sqrt(dist2) / radius;
        const idx = IX(i, j, w);
        u[idx] += fx * falloff;
        v[idx] += fy * falloff;
      }
    }
  }
}

/**
 * Add dye to field in a circular region
 */
export function addDye(
  dye: Float32Array,
  x: number,
  y: number,
  amount: number,
  radius: number,
  w: number,
  h: number
) {
  const r2 = radius * radius;

  const minX = Math.max(1, Math.floor(x - radius));
  const maxX = Math.min(w - 2, Math.ceil(x + radius));
  const minY = Math.max(1, Math.floor(y - radius));
  const maxY = Math.min(h - 2, Math.ceil(y + radius));

  for (let j = minY; j <= maxY; j++) {
    for (let i = minX; i <= maxX; i++) {
      const dx = i - x;
      const dy = j - y;
      const dist2 = dx * dx + dy * dy;

      if (dist2 < r2) {
        const falloff = 1 - Math.sqrt(dist2) / radius;
        const idx = IX(i, j, w);
        dye[idx] = Math.min(255, dye[idx] + amount * falloff);
      }
    }
  }
}

/**
 * Add constant drift to velocity field
 */
export function addDrift(u: Float32Array, v: Float32Array, dx: number, dy: number, size: number) {
  for (let i = 0; i < size; i++) {
    u[i] += dx;
    v[i] += dy;
  }
}

/**
 * Add buoyancy force (lighter dye rises)
 */
export function addBuoyancy(
  v: Float32Array,
  dyeR: Float32Array,
  dyeG: Float32Array,
  dyeB: Float32Array,
  strength: number,
  w: number,
  h: number
) {
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = IX(x, y, w);
      // Average dye density (lighter = higher value)
      const density = (dyeR[idx] + dyeG[idx] + dyeB[idx]) / (3 * 255);
      // Upward force proportional to density
      v[idx] -= density * strength;
    }
  }
}
