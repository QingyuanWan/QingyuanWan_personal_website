/**
 * Resource Allocation Helpers
 *
 * Utilities for creating offscreen canvases, typed arrays, blur kernels,
 * color ramps, and loading fonts
 */

import type { Capabilities } from './types';

/**
 * Create an offscreen or regular canvas
 */
export function createCanvas(
  width: number,
  height: number,
  useOffscreen: boolean
): HTMLCanvasElement | OffscreenCanvas {
  if (useOffscreen && typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Create a Float32Array with optional initialization
 */
export function createFloatArray(size: number, fill?: number): Float32Array {
  const array = new Float32Array(size);
  if (fill !== undefined) {
    array.fill(fill);
  }
  return array;
}

/**
 * Create a Uint8ClampedArray with optional initialization
 */
export function createByteArray(size: number, fill?: number): Uint8ClampedArray {
  const array = new Uint8ClampedArray(size);
  if (fill !== undefined) {
    array.fill(fill);
  }
  return array;
}

/**
 * Generate a 1D Gaussian blur kernel (separable)
 */
export function createGaussianKernel(radius: number): Float32Array {
  const size = radius * 2 + 1;
  const kernel = new Float32Array(size);
  const sigma = radius / 3;
  const twoSigma2 = 2 * sigma * sigma;
  let sum = 0;

  for (let i = 0; i < size; i++) {
    const x = i - radius;
    const value = Math.exp(-(x * x) / twoSigma2);
    kernel[i] = value;
    sum += value;
  }

  // Normalize
  for (let i = 0; i < size; i++) {
    kernel[i] /= sum;
  }

  return kernel;
}

/**
 * Generate a Sobel kernel for edge detection / specular
 */
export function createSobelKernels(): { x: Float32Array; y: Float32Array } {
  return {
    x: new Float32Array([
      -1, 0, 1,
      -2, 0, 2,
      -1, 0, 1,
    ]),
    y: new Float32Array([
      -1, -2, -1,
       0,  0,  0,
       1,  2,  1,
    ]),
  };
}

/**
 * Generate a color ramp LUT (256 steps)
 */
export function createColorRampLUT(
  stops: Array<{ t: number; color: [number, number, number] }>
): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256 * 4); // RGBA

  for (let i = 0; i < 256; i++) {
    const t = i / 255;

    // Find surrounding stops
    let lower = stops[0];
    let upper = stops[stops.length - 1];

    for (let j = 0; j < stops.length - 1; j++) {
      if (t >= stops[j].t && t <= stops[j + 1].t) {
        lower = stops[j];
        upper = stops[j + 1];
        break;
      }
    }

    // Interpolate
    const localT = lower === upper ? 0 : (t - lower.t) / (upper.t - lower.t);

    const r = lower.color[0] + (upper.color[0] - lower.color[0]) * localT;
    const g = lower.color[1] + (upper.color[1] - lower.color[1]) * localT;
    const b = lower.color[2] + (upper.color[2] - lower.color[2]) * localT;

    lut[i * 4] = r;
    lut[i * 4 + 1] = g;
    lut[i * 4 + 2] = b;
    lut[i * 4 + 3] = 255;
  }

  return lut;
}

/**
 * Generate a small dither/noise table for banding reduction
 */
export function createDitherTable(size: number): Uint8ClampedArray {
  const table = new Uint8ClampedArray(size * size);

  for (let i = 0; i < size * size; i++) {
    // Simple random dither (-2 to +2)
    table[i] = Math.floor((Math.random() - 0.5) * 5) + 128;
  }

  return table;
}

/**
 * Preload fonts to prevent reflow
 */
export async function loadFont(fontFamily: string, weight: number = 400): Promise<void> {
  if (!document.fonts) {
    console.warn('[Resources] Font loading API not supported');
    return;
  }

  try {
    await document.fonts.load(`${weight} 16px ${fontFamily}`);
    console.log(`[Resources] Font loaded: ${fontFamily}`);
  } catch (error) {
    console.warn(`[Resources] Font load failed: ${fontFamily}`, error);
  }
}

/**
 * Detect device capabilities
 */
export function detectCapabilities(dprCap: number = 2): Capabilities {
  const dpr = Math.min(window.devicePixelRatio || 1, dprCap);

  const offscreenCanvas = typeof OffscreenCanvas !== 'undefined';
  const workers = typeof Worker !== 'undefined';
  const imageBitmap = typeof createImageBitmap !== 'undefined';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Simple performance tier detection
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as any).deviceMemory || 4; // GB

  let tier: 'low' | 'medium' | 'high' = 'medium';

  if (cores >= 8 && memory >= 8) {
    tier = 'high';
  } else if (cores <= 2 || memory < 4) {
    tier = 'low';
  }

  console.log('[Resources] Capabilities:', {
    dpr,
    offscreenCanvas,
    workers,
    imageBitmap,
    reducedMotion,
    tier,
    cores,
    memory,
  });

  return {
    dpr,
    offscreenCanvas,
    workers,
    imageBitmap,
    reducedMotion,
    tier,
  };
}

/**
 * Calculate responsive grid size for simulations
 */
export function calculateGridSize(
  containerWidth: number,
  containerHeight: number,
  maxCells: number = 300000,
  tier: 'low' | 'medium' | 'high' = 'medium'
): { width: number; height: number } {
  // Base resolution by tier
  const baseWidth = tier === 'high' ? 720 : tier === 'medium' ? 640 : 480;

  // Scale to aspect ratio
  const aspect = containerWidth / containerHeight;
  let simWidth = baseWidth;
  let simHeight = Math.round(baseWidth / aspect);

  // Cap total cells
  while (simWidth * simHeight > maxCells) {
    simWidth = Math.floor(simWidth * 0.9);
    simHeight = Math.floor(simHeight * 0.9);
  }

  console.log(`[Resources] Grid size: ${simWidth}x${simHeight} (${simWidth * simHeight} cells)`);

  return { width: simWidth, height: simHeight };
}

/**
 * Measure frame time for performance tuning
 */
export async function measureFrameTime(
  fn: () => void,
  samples: number = 60
): Promise<number> {
  const times: number[] = [];

  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    times.push(end - start);

    // Yield to browser
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  // Median frame time
  times.sort((a, b) => a - b);
  const median = times[Math.floor(samples / 2)];

  console.log(`[Resources] Median frame time: ${median.toFixed(2)}ms`);

  return median;
}

/**
 * Auto-downgrade quality based on performance
 */
export function autoDowngradeQuality(
  frameTime: number,
  currentWidth: number,
  currentHeight: number
): { width: number; height: number; iterations: number } {
  const targetFrameTime = 16.67; // 60fps

  if (frameTime < targetFrameTime) {
    // Performance is good
    return { width: currentWidth, height: currentHeight, iterations: 14 };
  }

  // Calculate downgrade factor
  const ratio = frameTime / targetFrameTime;

  if (ratio > 2) {
    // Very slow - reduce by 50%
    return {
      width: Math.floor(currentWidth * 0.7),
      height: Math.floor(currentHeight * 0.7),
      iterations: 10,
    };
  } else if (ratio > 1.5) {
    // Moderately slow - reduce by 25%
    return {
      width: Math.floor(currentWidth * 0.85),
      height: Math.floor(currentHeight * 0.85),
      iterations: 12,
    };
  }

  return { width: currentWidth, height: currentHeight, iterations: 14 };
}
