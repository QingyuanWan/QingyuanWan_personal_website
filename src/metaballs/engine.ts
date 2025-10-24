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
  ballCount: number;        // Number of metaballs
  minRadius: number;        // Minimum ball radius
  maxRadius: number;        // Maximum ball radius
  blurRadius: number;       // Gaussian blur radius
  threshold: number;        // Binary threshold (0-255)
  speed: number;            // Movement speed multiplier
  colorRamp: Array<[number, number, number]>; // RGB gradient stops
}

export interface QualityTier {
  name: string;
  simWidth: number;
  simHeight: number;
  ballCount: number;
  blurRadius: number;
}

const QUALITY_TIERS: QualityTier[] = [
  { name: 'high', simWidth: 480, simHeight: 270, ballCount: 12, blurRadius: 20 },
  { name: 'medium', simWidth: 320, simHeight: 180, ballCount: 8, blurRadius: 15 },
  { name: 'low', simWidth: 240, simHeight: 135, ballCount: 6, blurRadius: 10 },
];

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export class MetaballsEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private offscreen: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;

  private options: MetaballsOptions;
  private currentTier: number = 0;

  private balls: Ball[] = [];

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
      ballCount: options.ballCount ?? tier.ballCount,
      minRadius: options.minRadius ?? 30,
      maxRadius: options.maxRadius ?? 60,
      blurRadius: options.blurRadius ?? tier.blurRadius,
      threshold: options.threshold ?? 128,
      speed: options.speed ?? 1.0,
      colorRamp: options.colorRamp ?? [
        [92, 192, 248],   // Blue
        [168, 85, 247],   // Purple
        [255, 159, 28],   // Orange
      ],
    };

    this.offscreen.width = this.options.simWidth;
    this.offscreen.height = this.options.simHeight;

    console.log('[MetaballsEngine] Created', this.options);
  }

  /**
   * Allocate resources (create balls)
   */
  async allocate(): Promise<boolean> {
    console.log('[MetaballsEngine] Allocating...');

    try {
      // Create metaballs
      for (let i = 0; i < this.options.ballCount; i++) {
        this.balls.push({
          x: Math.random(),
          y: Math.random(),
          vx: (Math.random() - 0.5) * 0.002 * this.options.speed,
          vy: (Math.random() - 0.5) * 0.002 * this.options.speed,
          radius: this.options.minRadius + Math.random() * (this.options.maxRadius - this.options.minRadius),
        });
      }

      console.log('[MetaballsEngine] ✓ Allocated');
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
    this.balls = [];
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

    // Adjust ball count
    while (this.balls.length > t.ballCount) {
      this.balls.pop();
    }
    while (this.balls.length < t.ballCount) {
      this.balls.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.002 * this.options.speed,
        vy: (Math.random() - 0.5) * 0.002 * this.options.speed,
        radius: this.options.minRadius + Math.random() * (this.options.maxRadius - this.options.minRadius),
      });
    }

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
    // Update ball positions
    for (const ball of this.balls) {
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Bounce off edges
      if (ball.x < 0 || ball.x > 1) ball.vx *= -1;
      if (ball.y < 0 || ball.y > 1) ball.vy *= -1;

      // Keep in bounds
      ball.x = Math.max(0, Math.min(1, ball.x));
      ball.y = Math.max(0, Math.min(1, ball.y));
    }
  }

  private render(): void {
    const { offscreen, offscreenCtx, ctx, canvas, options } = this;

    // 1. Clear offscreen
    offscreenCtx.fillStyle = '#000';
    offscreenCtx.fillRect(0, 0, offscreen.width, offscreen.height);

    // 2. Stamp circles
    offscreenCtx.fillStyle = '#fff';
    for (const ball of this.balls) {
      const x = ball.x * offscreen.width;
      const y = ball.y * offscreen.height;

      offscreenCtx.beginPath();
      offscreenCtx.arc(x, y, ball.radius, 0, Math.PI * 2);
      offscreenCtx.fill();
    }

    // 3. Blur (box blur approximation)
    this.applyBlur(options.blurRadius);

    // 4. Threshold + Colorize
    this.applyThresholdAndColorize(options.threshold);

    // 5. Upscale to display canvas
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
  }

  private applyBlur(radius: number): void {
    if (radius === 0) return;

    const { offscreen, offscreenCtx } = this;

    // Simple box blur (horizontal + vertical pass)
    offscreenCtx.filter = `blur(${radius}px)`;
    offscreenCtx.drawImage(offscreen, 0, 0);
    offscreenCtx.filter = 'none';
  }

  private applyThresholdAndColorize(threshold: number): void {
    const { offscreen, offscreenCtx, options } = this;

    // Get image data
    const imageData = offscreenCtx.getImageData(0, 0, offscreen.width, offscreen.height);
    const data = imageData.data;

    // Apply threshold and colorize
    for (let i = 0; i < data.length; i += 4) {
      const intensity = data[i]; // R channel (grayscale)

      if (intensity > threshold) {
        // Map intensity to color gradient
        const t = (intensity - threshold) / (255 - threshold);
        const color = this.getGradientColor(t);

        data[i] = color[0];     // R
        data[i + 1] = color[1]; // G
        data[i + 2] = color[2]; // B
        data[i + 3] = 255;      // A
      } else {
        // Below threshold - transparent
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
