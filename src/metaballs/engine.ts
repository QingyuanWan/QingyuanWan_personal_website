/**
 * Metaballs Engine
 *
 * Offscreen-buffer pipeline:
 * 1. Stamp: Draw circles to offscreen buffer
 * 2. Blur: Gaussian blur for smooth blending
 * 3. Threshold: Convert to binary mask
 * 4. Colorize: Apply brand gradient
 * 5. Upscale: Draw to display canvas
 *
 * Based on:
 * - https://varun.ca/metaballs/
 * - https://www.clicktorelease.com/blog/metaballs-in-canvas/
 */

export interface MetaballsOptions {
  simWidth: number;         // Offscreen buffer width
  simHeight: number;        // Offscreen buffer height
  bandCount: number;        // Number of horizontal bands
  blurRadius: number;       // Gaussian blur radius
  threshold: number;        // Binary threshold (0-255)
  damping: number;          // Physics damping (0.96-0.985)
  flowSpeed: number;        // Horizontal drift speed (0.3-0.8)
  verticalSpeed: number;    // Vertical movement speed
  wobbleAmount: number;     // Height wobble amount (0-0.05)
  rectMinWidth: number;     // Min rectangle width (normalized)
  rectMaxWidth: number;     // Max rectangle width (normalized)
  rectRounding: number;     // Corner rounding radius
  separationForce: number;  // Force to separate overlapping bands
  colorRamp: Array<[number, number, number]>; // RGB gradient stops
}

export interface QualityTier {
  name: string;
  simWidth: number;
  simHeight: number;
  bandCount: number;
  blurRadius: number;
}

const QUALITY_TIERS: QualityTier[] = [
  { name: 'high', simWidth: 480, simHeight: 270, bandCount: 4, blurRadius: 20 },
  { name: 'medium', simWidth: 320, simHeight: 180, bandCount: 3, blurRadius: 15 },
  { name: 'low', simWidth: 240, simHeight: 135, bandCount: 3, blurRadius: 10 },
];

interface SoftRect {
  x: number;        // Center X (normalized 0-1)
  y: number;        // Center Y (normalized 0-1)
  width: number;    // Width (normalized)
  height: number;   // Height (normalized)
  rounding: number; // Corner rounding
}

interface Band {
  corridorMin: number;    // Y min (0-1)
  corridorMax: number;    // Y max (0-1)
  centerY: number;        // Current center Y
  vy: number;             // Vertical velocity
  flowX: number;          // Horizontal flow offset
  baseHeight: number;     // Base corridor height
  wobblePhase: number;    // Phase for height wobble
  rects: SoftRect[];      // 1-3 soft rectangles
  colorStart: number;     // Gradient range start (0-1)
  colorEnd: number;       // Gradient range end (0-1)
}

export class MetaballsEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private offscreen: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;

  private options: MetaballsOptions;
  private currentTier: number = 0;

  private bands: Band[] = [];

  private rafId: number | null = null;
  private isRunning: boolean = false;
  private frameCount: number = 0;
  private frameTimes: number[] = [];
  private lastFrameTime: number = 0;

  private hasDrawnFirstFrame: boolean = false;
  private onFirstDraw?: () => void;
  private onHeartbeat?: (phase: string, step?: number, total?: number) => void;

  constructor(canvas: HTMLCanvasElement, options: Partial<MetaballsOptions> = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    // Create offscreen canvas
    this.offscreen = document.createElement('canvas');
    const offscreenCtx = this.offscreen.getContext('2d', { alpha: false, willReadFrequently: true });
    if (!offscreenCtx) throw new Error('Failed to get offscreen context');
    this.offscreenCtx = offscreenCtx;

    // Start with medium tier (tier 1) for first visit, will auto-promote if fast
    // Check localStorage for saved tier preference
    let savedTier = 1; // Default to medium
    try {
      const saved = localStorage.getItem('metaballs-tier');
      if (saved !== null) {
        savedTier = parseInt(saved, 10);
        if (savedTier < 0 || savedTier >= QUALITY_TIERS.length) {
          savedTier = 1;
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    this.currentTier = savedTier;
    const tier = QUALITY_TIERS[savedTier];
    this.options = {
      simWidth: options.simWidth ?? tier.simWidth,
      simHeight: options.simHeight ?? tier.simHeight,
      bandCount: options.bandCount ?? tier.bandCount,
      blurRadius: options.blurRadius ?? tier.blurRadius,
      threshold: options.threshold ?? 128,
      damping: options.damping ?? 0.98,
      flowSpeed: options.flowSpeed ?? 0.5,
      verticalSpeed: options.verticalSpeed ?? 0.0008,
      wobbleAmount: options.wobbleAmount ?? 0.02,
      rectMinWidth: options.rectMinWidth ?? 0.3,
      rectMaxWidth: options.rectMaxWidth ?? 0.7,
      rectRounding: options.rectRounding ?? 40,
      separationForce: options.separationForce ?? 0.0002,
      colorRamp: options.colorRamp ?? [
        [92, 192, 248],   // Blue (top)
        [168, 85, 247],   // Purple (middle)
        [255, 159, 28],   // Orange (bottom)
      ],
    };

    this.offscreen.width = this.options.simWidth;
    this.offscreen.height = this.options.simHeight;

    console.log('[MetaballsEngine] Created', this.options);
  }

  /**
   * Allocate resources (create bands)
   */
  async allocate(): Promise<boolean> {
    console.log('[MetaballsEngine] Allocating...');

    try {
      const { bandCount, rectMinWidth, rectMaxWidth, rectRounding, colorRamp } = this.options;

      // Divide screen into corridors
      const corridorHeight = 1 / bandCount;

      for (let i = 0; i < bandCount; i++) {
        const corridorMin = i * corridorHeight;
        const corridorMax = (i + 1) * corridorHeight;
        const centerY = (corridorMin + corridorMax) / 2;

        // Create 1-3 soft rectangles for this band
        const rectCount = 1 + Math.floor(Math.random() * 3); // 1, 2, or 3
        const rects: SoftRect[] = [];

        for (let j = 0; j < rectCount; j++) {
          rects.push({
            x: Math.random(), // Random X position
            y: 0, // Relative to band center (will be offset in render)
            width: rectMinWidth + Math.random() * (rectMaxWidth - rectMinWidth),
            height: corridorHeight * 0.8, // 80% of corridor height
            rounding: rectRounding,
          });
        }

        // Assign gradient range: bottom band = orange (0.7-1.0), top band = blue (0.0-0.3)
        const colorStart = (bandCount - 1 - i) / (bandCount - 1); // Invert: 1 at bottom, 0 at top
        const colorEnd = colorStart + 0.3; // Range of 0.3 in gradient space

        this.bands.push({
          corridorMin,
          corridorMax,
          centerY,
          vy: (Math.random() - 0.5) * this.options.verticalSpeed,
          flowX: Math.random() * Math.PI * 2, // Random phase
          baseHeight: corridorHeight,
          wobblePhase: Math.random() * Math.PI * 2,
          rects,
          colorStart: Math.max(0, Math.min(1, colorStart)),
          colorEnd: Math.max(0, Math.min(1, colorEnd)),
        });
      }

      console.log(`[MetaballsEngine] ✓ Allocated ${bandCount} bands`);
      return true;
    } catch (error) {
      console.error('[MetaballsEngine] Allocation failed:', error);
      return false;
    }
  }

  /**
   * Warm-up (run N invisible frames to JIT-compile)
   */
  async warmup(steps: number): Promise<void> {
    console.log(`[MetaballsEngine] Warming up ${steps} steps...`);

    const startTime = performance.now();

    for (let i = 0; i < steps; i++) {
      this.step();

      // Emit heartbeat every 10 steps
      if (i % 10 === 0) {
        if (this.onHeartbeat) {
          this.onHeartbeat('warmup:hb', i, steps);
        }
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }

    const elapsed = performance.now() - startTime;
    const avgFrameTime = elapsed / steps;

    console.log(`[MetaballsEngine] ✓ Warmup complete (${avgFrameTime.toFixed(2)}ms/frame)`);

    // Check if we should downshift quality
    if (avgFrameTime > 20 && this.currentTier < QUALITY_TIERS.length - 1) {
      console.warn(`[MetaballsEngine] Slow warmup (${avgFrameTime.toFixed(2)}ms), downshifting quality`);
      this.setQualityTier(this.currentTier + 1);
    }
  }

  /**
   * Start render loop
   */
  start(onFirstDraw?: () => void, onHeartbeat?: (phase: string, step?: number, total?: number) => void): void {
    if (this.isRunning) return;

    console.log('[MetaballsEngine] Starting render loop');
    this.isRunning = true;
    this.hasDrawnFirstFrame = false;
    this.onFirstDraw = onFirstDraw;
    this.onHeartbeat = onHeartbeat;
    this.lastFrameTime = performance.now();
    this.loop();
  }

  /**
   * Stop render loop
   */
  stop(): void {
    if (!this.isRunning) return;

    console.log('[MetaballsEngine] Stopping');
    this.isRunning = false;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Resize canvases
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;

    // Offscreen stays at sim resolution
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    this.stop();
    this.bands = [];
  }

  /**
   * Set quality tier
   */
  setQualityTier(tier: number): void {
    if (tier < 0 || tier >= QUALITY_TIERS.length) return;
    if (tier === this.currentTier) return;

    console.log(`[MetaballsEngine] Changing quality tier: ${QUALITY_TIERS[tier].name}`);

    this.currentTier = tier;
    const t = QUALITY_TIERS[tier];

    this.options.simWidth = t.simWidth;
    this.options.simHeight = t.simHeight;
    this.options.blurRadius = t.blurRadius;

    // Resize offscreen canvas
    this.offscreen.width = this.options.simWidth;
    this.offscreen.height = this.options.simHeight;

    // Note: Band count changes would require full reallocation
    // For now, just update resolution and blur
    // TODO: Implement dynamic band count adjustment if needed

    // Save tier preference
    try {
      localStorage.setItem('metaballs-tier', tier.toString());
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  /**
   * Get current quality tier
   */
  getQualityTier(): QualityTier {
    return QUALITY_TIERS[this.currentTier];
  }

  /**
   * Get average frame time
   */
  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    const sum = this.frameTimes.reduce((a, b) => a + b, 0);
    return sum / this.frameTimes.length;
  }

  /**
   * Set options
   */
  setOptions(options: Partial<MetaballsOptions>): void {
    Object.assign(this.options, options);
  }

  // Private methods

  private loop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Track frame times
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > 30) {
      this.frameTimes.shift();
    }

    // Check quality ladder (after first 2s for downshift, after 5s for upshift)
    if (this.frameCount === 120) {
      // ~2s at 60fps - check for downshift
      this.checkQualityLadder();
    } else if (this.frameCount === 300) {
      // ~5s at 60fps - check for upshift (auto-promote)
      this.checkQualityLadder();
    }

    this.step();
    this.render();

    // Signal first draw
    if (!this.hasDrawnFirstFrame) {
      this.hasDrawnFirstFrame = true;
      console.log('[MetaballsEngine] ✓ First draw');
      if (this.onFirstDraw) {
        this.onFirstDraw();
      }
    }

    // Emit render heartbeat every 60 frames (~1 second)
    if (this.frameCount % 60 === 0 && this.onHeartbeat) {
      this.onHeartbeat('render:hb');
    }

    this.frameCount++;
    this.rafId = requestAnimationFrame(this.loop);
  };

  private step(): void {
    const { damping, flowSpeed, verticalSpeed, wobbleAmount, separationForce } = this.options;

    for (let i = 0; i < this.bands.length; i++) {
      const band = this.bands[i];

      // 1. Horizontal flow (drift)
      band.flowX += flowSpeed * 0.01;
      if (band.flowX > Math.PI * 2) {
        band.flowX -= Math.PI * 2;
      }

      // 2. Vertical movement with damping
      band.centerY += band.vy;
      band.vy *= damping;

      // 3. Soft bounce at corridor boundaries
      if (band.centerY < band.corridorMin) {
        band.centerY = band.corridorMin;
        band.vy = Math.abs(band.vy) * 0.5; // Bounce up
      } else if (band.centerY > band.corridorMax) {
        band.centerY = band.corridorMax;
        band.vy = -Math.abs(band.vy) * 0.5; // Bounce down
      }

      // 4. Height wobble
      band.wobblePhase += 0.02;
      const wobble = Math.sin(band.wobblePhase) * wobbleAmount;

      // 5. Update rect positions with flow
      for (const rect of band.rects) {
        rect.x += flowSpeed * 0.005;
        if (rect.x > 1.5) rect.x -= 1.5; // Wrap around with some overlap
        rect.height = band.baseHeight * (1 + wobble);
      }

      // 6. Separation force from adjacent bands
      if (i > 0) {
        const prevBand = this.bands[i - 1];
        const dist = band.centerY - prevBand.centerY;
        const minDist = (band.baseHeight + prevBand.baseHeight) * 0.4;

        if (dist < minDist) {
          const push = (minDist - dist) * separationForce;
          band.vy += push;
          prevBand.vy -= push;
        }
      }
    }
  }

  private render(): void {
    const { offscreen, offscreenCtx, ctx, canvas, options } = this;

    // 1. Clear offscreen
    offscreenCtx.fillStyle = '#000';
    offscreenCtx.fillRect(0, 0, offscreen.width, offscreen.height);

    // 2. Render each band's soft rectangles (bottom to top for proper compositing)
    offscreenCtx.fillStyle = '#fff';
    for (let i = this.bands.length - 1; i >= 0; i--) {
      const band = this.bands[i];

      for (const rect of band.rects) {
        const x = rect.x * offscreen.width;
        const y = band.centerY * offscreen.height;
        const w = rect.width * offscreen.width;
        const h = rect.height * offscreen.height;
        const r = rect.rounding;

        // Draw rounded rectangle
        this.drawRoundedRect(offscreenCtx, x - w/2, y - h/2, w, h, r);
      }
    }

    // 3. Blur for soft edges
    this.applyBlur(options.blurRadius);

    // 4. Threshold + Colorize with per-band gradient ranges
    this.applyThresholdAndColorizeByBand(options.threshold);

    // 5. Upscale to display canvas
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
  }

  /**
   * Draw rounded rectangle using SDF-like approach
   */
  private drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  private applyBlur(radius: number): void {
    if (radius === 0) return;

    const { offscreen, offscreenCtx } = this;

    // Simple box blur (horizontal + vertical pass)
    offscreenCtx.filter = `blur(${radius}px)`;
    offscreenCtx.drawImage(offscreen, 0, 0);
    offscreenCtx.filter = 'none';
  }

  private applyThresholdAndColorizeByBand(threshold: number): void {
    const { offscreen, offscreenCtx } = this;

    // Get image data
    const imageData = offscreenCtx.getImageData(0, 0, offscreen.width, offscreen.height);
    const data = imageData.data;

    // Apply threshold and colorize based on Y position
    for (let i = 0; i < data.length; i += 4) {
      const intensity = data[i]; // R channel (grayscale)

      if (intensity > threshold) {
        // Get Y position to determine which band this pixel belongs to
        const pixelIndex = i / 4;
        const y = Math.floor(pixelIndex / offscreen.width);
        const normalizedY = y / offscreen.height;

        // Find which band this Y position is closest to
        let closestBand = this.bands[0];
        let minDist = Math.abs(normalizedY - this.bands[0].centerY);

        for (const band of this.bands) {
          const dist = Math.abs(normalizedY - band.centerY);
          if (dist < minDist) {
            minDist = dist;
            closestBand = band;
          }
        }

        // Map intensity to color using band's gradient range
        const t = (intensity - threshold) / (255 - threshold);
        const bandT = closestBand.colorStart + t * (closestBand.colorEnd - closestBand.colorStart);
        const color = this.getGradientColor(bandT);

        data[i] = color[0];     // R
        data[i + 1] = color[1]; // G
        data[i + 2] = color[2]; // B
        data[i + 3] = 255;      // A
      } else {
        // Below threshold - background
        data[i] = 232;     // Background color #E8E6E0
        data[i + 1] = 230;
        data[i + 2] = 224;
        data[i + 3] = 255;
      }
    }

    offscreenCtx.putImageData(imageData, 0, 0);
  }

  private getGradientColor(t: number): [number, number, number] {
    const { colorRamp } = this.options;

    if (colorRamp.length === 1) return colorRamp[0];

    // Clamp t to [0, 1]
    t = Math.max(0, Math.min(1, t));

    // Find two colors to interpolate between
    const scaledT = t * (colorRamp.length - 1);
    const index = Math.floor(scaledT);
    const localT = scaledT - index;

    if (index >= colorRamp.length - 1) return colorRamp[colorRamp.length - 1];

    const c1 = colorRamp[index];
    const c2 = colorRamp[index + 1];

    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * localT),
      Math.round(c1[1] + (c2[1] - c1[1]) * localT),
      Math.round(c1[2] + (c2[2] - c1[2]) * localT),
    ];
  }

  private checkQualityLadder(): void {
    const avgFrameTime = this.getAverageFrameTime();

    // Downshift if slow (>18ms = <55fps)
    if (avgFrameTime > 18 && this.currentTier < QUALITY_TIERS.length - 1) {
      console.warn(`[MetaballsEngine] Slow performance (${avgFrameTime.toFixed(2)}ms), downshifting`);
      this.setQualityTier(this.currentTier + 1);
      this.frameTimes = []; // Reset
    }
    // Upshift if fast (<17ms = >58fps) - auto-promote after 5s
    else if (avgFrameTime < 17 && this.currentTier > 0 && this.frameCount >= 300) {
      console.log(`[MetaballsEngine] Fast performance (${avgFrameTime.toFixed(2)}ms), upshifting`);
      this.setQualityTier(this.currentTier - 1);
      this.frameTimes = []; // Reset
    }
  }
}
