/**
 * Composite Rendering
 *
 * Handles final rendering with bloom and feathering effects
 */

import type { ColorRamp } from './colorramp';
import type { FluidGrid } from './fluid2d';

export interface CompositeOptions {
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
  ramp: ColorRamp;
}

/**
 * Render fluid grid to canvas with compositing effects
 */
export function renderFluid(
  ctx: CanvasRenderingContext2D,
  grid: FluidGrid,
  options: CompositeOptions,
  canvasWidth: number,
  canvasHeight: number
) {
  const { width: gw, height: gh } = grid;

  // Create temporary canvas for layer rendering
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvasWidth;
  tempCanvas.height = canvasHeight;
  const tempCtx = tempCanvas.getContext('2d')!;

  // Clear main canvas
  ctx.fillStyle = '#1A1A1A'; // Dark charcoal background
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Render Layer A (base, dark)
  renderLayer(tempCtx, grid, 'A', options.ramp, canvasWidth, canvasHeight);
  ctx.globalAlpha = 0.6;
  ctx.drawImage(tempCanvas, 0, 0);

  // Render Layer B (top, interactive)
  tempCtx.clearRect(0, 0, canvasWidth, canvasHeight);
  renderLayer(tempCtx, grid, 'B', options.ramp, canvasWidth, canvasHeight);

  // Apply bloom if enabled
  if (options.bloom.enabled) {
    applyBloom(tempCtx, tempCanvas, options.bloom.strength, options.bloom.radius);
  }

  ctx.globalAlpha = 1.0;
  ctx.drawImage(tempCanvas, 0, 0);

  // Apply feathering at bottom
  if (options.feather.enabled) {
    applyFeather(ctx, canvasWidth, canvasHeight, options.feather.heightPx, options.feather.targetColor);
  }

  ctx.globalAlpha = 1.0;
}

/**
 * Render a single layer
 */
function renderLayer(
  ctx: CanvasRenderingContext2D,
  grid: FluidGrid,
  layer: 'A' | 'B',
  ramp: ColorRamp,
  canvasWidth: number,
  canvasHeight: number
) {
  const { width: gw, height: gh } = grid;
  const dyeR = layer === 'A' ? grid.dyeRA : grid.dyeRB;
  const dyeG = layer === 'A' ? grid.dyeGA : grid.dyeGB;
  const dyeB = layer === 'A' ? grid.dyeBA : grid.dyeBB;

  // Create ImageData for fast pixel manipulation
  const imageData = ctx.createImageData(canvasWidth, canvasHeight);
  const data = imageData.data;

  const scaleX = gw / canvasWidth;
  const scaleY = gh / canvasHeight;

  for (let y = 0; y < canvasHeight; y++) {
    for (let x = 0; x < canvasWidth; x++) {
      // Map canvas pixel to grid cell (bilinear sampling)
      const gx = x * scaleX;
      const gy = y * scaleY;

      const x0 = Math.floor(gx);
      const x1 = Math.min(x0 + 1, gw - 1);
      const y0 = Math.floor(gy);
      const y1 = Math.min(y0 + 1, gh - 1);

      const fx = gx - x0;
      const fy = gy - y0;

      // Bilinear interpolation for each channel
      const idx00 = y0 * gw + x0;
      const idx01 = y0 * gw + x1;
      const idx10 = y1 * gw + x0;
      const idx11 = y1 * gw + x1;

      const r =
        (1 - fx) * (1 - fy) * dyeR[idx00] +
        fx * (1 - fy) * dyeR[idx01] +
        (1 - fx) * fy * dyeR[idx10] +
        fx * fy * dyeR[idx11];

      const g =
        (1 - fx) * (1 - fy) * dyeG[idx00] +
        fx * (1 - fy) * dyeG[idx01] +
        (1 - fx) * fy * dyeG[idx10] +
        fx * fy * dyeG[idx11];

      const b =
        (1 - fx) * (1 - fy) * dyeB[idx00] +
        fx * (1 - fy) * dyeB[idx01] +
        (1 - fx) * fy * dyeB[idx10] +
        fx * fy * dyeB[idx11];

      // Map to color ramp
      const intensity = (r + g + b) / (3 * 255);
      const [cr, cg, cb] = ramp.sample(intensity);

      const pixelIdx = (y * canvasWidth + x) * 4;
      data[pixelIdx] = cr;
      data[pixelIdx + 1] = cg;
      data[pixelIdx + 2] = cb;
      data[pixelIdx + 3] = Math.min(255, r + g + b); // Alpha based on dye density
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply bloom effect (downsample + blur + composite)
 */
function applyBloom(
  ctx: CanvasRenderingContext2D,
  sourceCanvas: HTMLCanvasElement,
  strength: number,
  radius: number
) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  // Downsample
  const downW = Math.floor(w / 2);
  const downH = Math.floor(h / 2);
  const downCanvas = document.createElement('canvas');
  downCanvas.width = downW;
  downCanvas.height = downH;
  const downCtx = downCanvas.getContext('2d')!;
  downCtx.drawImage(sourceCanvas, 0, 0, downW, downH);

  // Blur (simple box blur)
  const blurred = boxBlur(downCtx, downW, downH, radius);

  // Composite back with screen blend
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = strength;
  ctx.drawImage(blurred, 0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1.0;
}

/**
 * Simple box blur
 */
function boxBlur(ctx: CanvasRenderingContext2D, w: number, h: number, radius: number): HTMLCanvasElement {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const output = new Uint8ClampedArray(data);

  const r = Math.floor(radius);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;

      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const idx = (ny * w + nx) * 4;
            rSum += data[idx];
            gSum += data[idx + 1];
            bSum += data[idx + 2];
            aSum += data[idx + 3];
            count++;
          }
        }
      }

      const idx = (y * w + x) * 4;
      output[idx] = rSum / count;
      output[idx + 1] = gSum / count;
      output[idx + 2] = bSum / count;
      output[idx + 3] = aSum / count;
    }
  }

  const blurredData = new ImageData(output, w, h);
  ctx.putImageData(blurredData, 0, 0);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const blurCtx = canvas.getContext('2d')!;
  blurCtx.putImageData(blurredData, 0, 0);

  return canvas;
}

/**
 * Apply bottom feather (gradient to target color)
 */
function applyFeather(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  heightPx: number,
  targetColor: string
) {
  const startY = h - heightPx;

  const gradient = ctx.createLinearGradient(0, startY, 0, h);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, targetColor);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, startY, w, heightPx);
}
