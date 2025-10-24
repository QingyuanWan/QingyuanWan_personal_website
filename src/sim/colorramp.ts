/**
 * Color Ramp Utilities
 *
 * Provides gradient color sampling for fluid dye injection.
 * Brand ramp: deep blue → magenta → light orange
 */

export type ColorRGB = [number, number, number];

export interface ColorRamp {
  sample(t: number): ColorRGB;
  sampleWithNoise(t: number, amount?: number): ColorRGB;
}

/**
 * Linear interpolation between two colors
 */
function lerpColor(a: ColorRGB, b: ColorRGB, t: number): ColorRGB {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): ColorRGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);

  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
}

/**
 * Create a multi-stop gradient ramp
 */
function createGradientRamp(stops: Array<{ t: number; color: string | ColorRGB }>): ColorRamp {
  // Normalize stops and convert to RGB
  const normalizedStops = stops
    .map(stop => ({
      t: Math.max(0, Math.min(1, stop.t)),
      color: typeof stop.color === 'string' ? hexToRgb(stop.color) : stop.color,
    }))
    .sort((a, b) => a.t - b.t);

  return {
    sample(t: number): ColorRGB {
      t = Math.max(0, Math.min(1, t));

      // Find surrounding stops
      let lower = normalizedStops[0];
      let upper = normalizedStops[normalizedStops.length - 1];

      for (let i = 0; i < normalizedStops.length - 1; i++) {
        if (t >= normalizedStops[i].t && t <= normalizedStops[i + 1].t) {
          lower = normalizedStops[i];
          upper = normalizedStops[i + 1];
          break;
        }
      }

      // Interpolate
      if (lower === upper) return lower.color;

      const localT = (t - lower.t) / (upper.t - lower.t);
      return lerpColor(lower.color, upper.color, localT);
    },

    sampleWithNoise(t: number, amount = 0.05): ColorRGB {
      // Add small random jitter to prevent banding
      const jittered = t + (Math.random() - 0.5) * amount;
      const [r, g, b] = this.sample(jittered);

      // Add tiny per-channel noise
      const noise = () => (Math.random() - 0.5) * 5;

      return [
        Math.max(0, Math.min(255, r + noise())),
        Math.max(0, Math.min(255, g + noise())),
        Math.max(0, Math.min(255, b + noise())),
      ];
    },
  };
}

/**
 * Brand color ramp: deep blue → magenta → light orange
 */
export function createBrandRamp(): ColorRamp {
  return createGradientRamp([
    { t: 0.0, color: '#0A1A3A' },  // Deep blue
    { t: 0.35, color: '#5BC0F8' }, // Brand blue
    { t: 0.65, color: '#FF1F7A' }, // Magenta
    { t: 1.0, color: '#FFB869' },  // Light orange
  ]);
}

/**
 * Sunset ramp: warm gradient
 */
export function createSunsetRamp(): ColorRamp {
  return createGradientRamp([
    { t: 0.0, color: '#1A237E' },  // Deep indigo
    { t: 0.3, color: '#E91E63' },  // Pink
    { t: 0.6, color: '#FF6F00' },  // Orange
    { t: 1.0, color: '#FFF176' },  // Yellow
  ]);
}

/**
 * Ocean ramp: cool blue/teal gradient
 */
export function createOceanRamp(): ColorRamp {
  return createGradientRamp([
    { t: 0.0, color: '#01579B' },  // Deep blue
    { t: 0.5, color: '#00BCD4' },  // Cyan
    { t: 1.0, color: '#4DD0E1' },  // Light cyan
  ]);
}

/**
 * Create ramp from preset name or custom stops
 */
export function createColorRamp(
  preset: 'brand' | 'sunset' | 'ocean' | Array<{ t: number; color: string | ColorRGB }>
): ColorRamp {
  if (preset === 'brand') return createBrandRamp();
  if (preset === 'sunset') return createSunsetRamp();
  if (preset === 'ocean') return createOceanRamp();
  return createGradientRamp(preset);
}
