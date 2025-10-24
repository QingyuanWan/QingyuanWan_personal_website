/**
 * Gaussian Blur Utilities
 *
 * Separable blur (horizontal + vertical passes) for metaball field smoothing.
 */

export interface BlurKernel {
  weights: Float32Array;
  radius: number;
}

/**
 * Generate Gaussian blur kernel
 * @param radius - Blur radius (typically 6-12 for metaballs)
 */
export function createGaussianKernel(radius: number): BlurKernel {
  const size = radius * 2 + 1;
  const weights = new Float32Array(size);
  const sigma = radius / 3;
  const twoSigmaSquare = 2 * sigma * sigma;

  let sum = 0;

  for (let i = 0; i < size; i++) {
    const x = i - radius;
    weights[i] = Math.exp(-(x * x) / twoSigmaSquare);
    sum += weights[i];
  }

  // Normalize
  for (let i = 0; i < size; i++) {
    weights[i] /= sum;
  }

  return { weights, radius };
}

/**
 * Apply horizontal blur pass
 */
export function blurHorizontal(
  src: ImageData,
  dst: ImageData,
  kernel: BlurKernel,
  width: number,
  height: number
): void {
  const { weights, radius } = kernel;
  const srcData = src.data;
  const dstData = dst.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;

      for (let k = -radius; k <= radius; k++) {
        const sx = Math.max(0, Math.min(width - 1, x + k));
        const idx = (y * width + sx) * 4;
        sum += srcData[idx + 3] * weights[k + radius]; // Alpha channel
      }

      const dstIdx = (y * width + x) * 4;
      dstData[dstIdx + 3] = sum;
    }
  }
}

/**
 * Apply vertical blur pass
 */
export function blurVertical(
  src: ImageData,
  dst: ImageData,
  kernel: BlurKernel,
  width: number,
  height: number
): void {
  const { weights, radius } = kernel;
  const srcData = src.data;
  const dstData = dst.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;

      for (let k = -radius; k <= radius; k++) {
        const sy = Math.max(0, Math.min(height - 1, y + k));
        const idx = (sy * width + x) * 4;
        sum += srcData[idx + 3] * weights[k + radius]; // Alpha channel
      }

      const dstIdx = (y * width + x) * 4;
      dstData[dstIdx + 3] = sum;
    }
  }
}

/**
 * Full separable blur (both passes)
 */
export function applyBlur(
  imageData: ImageData,
  tempData: ImageData,
  kernel: BlurKernel,
  width: number,
  height: number
): void {
  // Horizontal pass: imageData → tempData
  blurHorizontal(imageData, tempData, kernel, width, height);

  // Vertical pass: tempData → imageData
  blurVertical(tempData, imageData, kernel, width, height);
}
