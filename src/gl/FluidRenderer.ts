/**
 * WebGL Fluid Renderer
 *
 * Manages textures, FBOs, shader programs, and simulation loop
 * with quality ladder and error containment
 */

import type { GLContext } from './bootGL';
import { createProgram, createQuadBuffer, drawQuad, checkFramebuffer } from './shaderUtils';
import {
  baseVertexShader,
  advectionFragmentShader,
  divergenceFragmentShader,
  pressureFragmentShader,
  projectionFragmentShader,
  buoyancyFragmentShader,
  compositeFragmentShader,
  clearFragmentShader,
  splatFragmentShader,
} from './shaders';

export interface FluidOptions {
  simResolution: number;      // Base resolution (0.5-1.0)
  iterations: number;          // Pressure solver iterations
  dt: number;                  // Time step
  velocityDissipation: number; // Velocity decay
  dyeDissipation: number;      // Dye decay
  buoyancy: number;            // Buoyancy force (gravity)
  glassRadius: number;         // Corner radius (pixels)
  glassPadding: number;        // Edge padding (pixels)
}

export interface QualityTier {
  name: string;
  simResolution: number;
  iterations: number;
}

const QUALITY_TIERS: QualityTier[] = [
  { name: 'high', simResolution: 0.75, iterations: 12 },
  { name: 'medium', simResolution: 0.62, iterations: 10 },
  { name: 'low', simResolution: 0.5, iterations: 8 },
];

interface DoubleFBO {
  read: WebGLFramebuffer;
  write: WebGLFramebuffer;
  readTexture: WebGLTexture;
  writeTexture: WebGLTexture;
  width: number;
  height: number;
  swap: () => void;
}

export class FluidRenderer {
  private context: GLContext;
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;

  private options: FluidOptions;
  private currentTier: number = 0;

  // Shader programs
  private programs: Map<string, any> = new Map();

  // Geometry
  private quadBuffer: WebGLBuffer | null = null;

  // Textures & FBOs
  private velocity: DoubleFBO | null = null;
  private pressure: DoubleFBO | null = null;
  private divergence: WebGLFramebuffer | null = null;
  private divergenceTexture: WebGLTexture | null = null;
  private dye: DoubleFBO | null = null;

  // Performance tracking
  private frameCount: number = 0;
  private frameTimes: number[] = [];
  private lastFrameTime: number = 0;

  // Animation
  private rafId: number | null = null;
  private isRunning: boolean = false;
  private hasDrawnFirstFrame: boolean = false;
  private onFirstDraw?: () => void;

  constructor(context: GLContext, options: Partial<FluidOptions> = {}) {
    this.context = context;
    this.gl = context.gl;
    this.canvas = context.canvas;

    this.options = {
      simResolution: options.simResolution ?? QUALITY_TIERS[0].simResolution,
      iterations: options.iterations ?? QUALITY_TIERS[0].iterations,
      dt: options.dt ?? 1 / 60,
      velocityDissipation: options.velocityDissipation ?? 0.98,
      dyeDissipation: options.dyeDissipation ?? 0.99,
      buoyancy: options.buoyancy ?? 0.12,
      glassRadius: options.glassRadius ?? 24,
      glassPadding: options.glassPadding ?? 0,
    };

    console.log('[FluidRenderer] Created with options:', this.options);
  }

  /**
   * Allocate GPU resources (textures, FBOs, shaders)
   */
  async allocate(): Promise<boolean> {
    console.log('[FluidRenderer] Allocating resources...');

    try {
      // Create quad buffer
      this.quadBuffer = createQuadBuffer(this.gl);
      if (!this.quadBuffer) {
        throw new Error('Failed to create quad buffer');
      }

      // Compile all shaders
      if (!this.compileShaders()) {
        throw new Error('Shader compilation failed');
      }

      // Create textures and FBOs
      if (!this.createTextures()) {
        throw new Error('Texture/FBO creation failed');
      }

      console.log('[FluidRenderer] ✓ Allocation complete');
      return true;
    } catch (error) {
      console.error('[FluidRenderer] ✗ Allocation failed:', error);
      return false;
    }
  }

  /**
   * Warm-up simulation (run N invisible frames)
   */
  async warmup(steps: number): Promise<void> {
    console.log(`[FluidRenderer] Warming up (${steps} steps)...`);

    // Add some initial dye splats
    this.addInitialSplats();

    for (let i = 0; i < steps; i++) {
      this.step();

      // Yield every 10 steps to keep UI responsive
      if (i % 10 === 0) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }

    console.log('[FluidRenderer] ✓ Warmup complete');
  }

  /**
   * Start visible rendering loop
   */
  start(onFirstDraw?: () => void): void {
    if (this.isRunning) return;

    console.log('[FluidRenderer] Starting render loop');
    this.isRunning = true;
    this.hasDrawnFirstFrame = false;
    this.onFirstDraw = onFirstDraw;
    this.lastFrameTime = performance.now();
    this.loop();
  }

  /**
   * Stop rendering loop
   */
  stop(): void {
    if (!this.isRunning) return;

    console.log('[FluidRenderer] Stopping render loop');
    this.isRunning = false;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Destroy all resources
   */
  destroy(): void {
    console.log('[FluidRenderer] Destroying');

    this.stop();

    // Delete textures
    if (this.velocity) this.deleteDoubleFBO(this.velocity);
    if (this.pressure) this.deleteDoubleFBO(this.pressure);
    if (this.dye) this.deleteDoubleFBO(this.dye);
    if (this.divergenceTexture) this.gl.deleteTexture(this.divergenceTexture);

    // Delete FBOs
    if (this.divergence) this.gl.deleteFramebuffer(this.divergence);

    // Delete programs
    for (const [, program] of this.programs) {
      if (program?.program) {
        this.gl.deleteProgram(program.program);
      }
    }

    // Delete buffers
    if (this.quadBuffer) this.gl.deleteBuffer(this.quadBuffer);

    this.programs.clear();
  }

  /**
   * Set quality tier (0 = high, 1 = medium, 2 = low)
   */
  setQualityTier(tier: number): void {
    if (tier < 0 || tier >= QUALITY_TIERS.length) return;
    if (tier === this.currentTier) return;

    console.log(`[FluidRenderer] Changing quality tier: ${QUALITY_TIERS[tier].name}`);

    this.currentTier = tier;
    this.options.simResolution = QUALITY_TIERS[tier].simResolution;
    this.options.iterations = QUALITY_TIERS[tier].iterations;

    // Recreate textures with new resolution
    this.deleteTextures();
    this.createTextures();
  }

  /**
   * Get current quality tier
   */
  getQualityTier(): QualityTier {
    return QUALITY_TIERS[this.currentTier];
  }

  /**
   * Get average frame time (ms)
   */
  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    const sum = this.frameTimes.reduce((a, b) => a + b, 0);
    return sum / this.frameTimes.length;
  }

  // Private methods

  private loop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Track frame times for quality ladder
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > 30) {
      this.frameTimes.shift();
    }

    // Check quality ladder (after 30 frames)
    if (this.frameCount % 30 === 0 && this.frameCount > 0) {
      this.checkQualityLadder();
    }

    // Simulate + render
    this.step();
    this.render();

    this.frameCount++;
    this.rafId = requestAnimationFrame(this.loop);
  };

  private step(): void {
    if (!this.velocity || !this.pressure || !this.divergence || !this.dye) return;

    const { gl } = this;

    // 1. Apply buoyancy (gravity)
    this.applyBuoyancy();

    // 2. Advect velocity
    this.advect(this.velocity, this.velocity, this.options.velocityDissipation);

    // 3. Compute divergence
    this.computeDivergence();

    // 4. Solve for pressure (Jacobi iterations)
    for (let i = 0; i < this.options.iterations; i++) {
      this.solvePressure();
    }

    // 5. Subtract pressure gradient (projection)
    this.project();

    // 6. Advect dye
    this.advect(this.dye, this.velocity, this.options.dyeDissipation);
  }

  private render(): void {
    if (!this.dye) return;

    const { gl, canvas } = this;
    const program = this.programs.get('composite');
    if (!program) return;

    // Render to canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.useProgram(program.program);

    // Bind dye texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.dye.readTexture);
    gl.uniform1i(program.uniforms.get('u_dye'), 0);

    // Set uniforms
    gl.uniform2f(program.uniforms.get('u_resolution'), canvas.width, canvas.height);
    gl.uniform1f(program.uniforms.get('u_radius'), this.options.glassRadius);
    gl.uniform1f(program.uniforms.get('u_padding'), this.options.glassPadding);

    // Draw
    drawQuad(gl, this.quadBuffer!, program.attributes.get('a_position')!);

    // Signal first draw
    if (!this.hasDrawnFirstFrame) {
      this.hasDrawnFirstFrame = true;
      console.log('[FluidRenderer] ✓ First draw complete');
      if (this.onFirstDraw) {
        this.onFirstDraw();
      }
    }
  }

  private advect(target: DoubleFBO, velocity: DoubleFBO, dissipation: number): void {
    const { gl } = this;
    const program = this.programs.get('advection');
    if (!program) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, target.write);
    gl.viewport(0, 0, target.width, target.height);

    gl.useProgram(program.program);

    // Bind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, target.readTexture);
    gl.uniform1i(program.uniforms.get('u_field'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, velocity.readTexture);
    gl.uniform1i(program.uniforms.get('u_velocity'), 1);

    // Set uniforms
    gl.uniform2f(program.uniforms.get('u_resolution'), target.width, target.height);
    gl.uniform1f(program.uniforms.get('u_dt'), this.options.dt);
    gl.uniform1f(program.uniforms.get('u_dissipation'), dissipation);

    // Draw
    drawQuad(gl, this.quadBuffer!, program.attributes.get('a_position')!);

    target.swap();
  }

  private applyBuoyancy(): void {
    if (!this.velocity || !this.dye) return;

    const { gl } = this;
    const program = this.programs.get('buoyancy');
    if (!program) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocity.write);
    gl.viewport(0, 0, this.velocity.width, this.velocity.height);

    gl.useProgram(program.program);

    // Bind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocity.readTexture);
    gl.uniform1i(program.uniforms.get('u_velocity'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.dye.readTexture);
    gl.uniform1i(program.uniforms.get('u_dye'), 1);

    // Set uniforms
    gl.uniform1f(program.uniforms.get('u_buoyancy'), this.options.buoyancy);
    gl.uniform1f(program.uniforms.get('u_dt'), this.options.dt);

    // Draw
    drawQuad(gl, this.quadBuffer!, program.attributes.get('a_position')!);

    this.velocity.swap();
  }

  private computeDivergence(): void {
    if (!this.velocity || !this.divergence) return;

    const { gl } = this;
    const program = this.programs.get('divergence');
    if (!program) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.divergence);
    gl.viewport(0, 0, this.velocity.width, this.velocity.height);

    gl.useProgram(program.program);

    // Bind velocity
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocity.readTexture);
    gl.uniform1i(program.uniforms.get('u_velocity'), 0);

    // Set uniforms
    gl.uniform2f(program.uniforms.get('u_resolution'), this.velocity.width, this.velocity.height);

    // Draw
    drawQuad(gl, this.quadBuffer!, program.attributes.get('a_position')!);
  }

  private solvePressure(): void {
    if (!this.pressure || !this.divergenceTexture) return;

    const { gl } = this;
    const program = this.programs.get('pressure');
    if (!program) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pressure.write);
    gl.viewport(0, 0, this.pressure.width, this.pressure.height);

    gl.useProgram(program.program);

    // Bind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.pressure.readTexture);
    gl.uniform1i(program.uniforms.get('u_pressure'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.divergenceTexture);
    gl.uniform1i(program.uniforms.get('u_divergence'), 1);

    // Set uniforms
    gl.uniform2f(program.uniforms.get('u_resolution'), this.pressure.width, this.pressure.height);

    // Draw
    drawQuad(gl, this.quadBuffer!, program.attributes.get('a_position')!);

    this.pressure.swap();
  }

  private project(): void {
    if (!this.velocity || !this.pressure) return;

    const { gl } = this;
    const program = this.programs.get('projection');
    if (!program) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocity.write);
    gl.viewport(0, 0, this.velocity.width, this.velocity.height);

    gl.useProgram(program.program);

    // Bind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocity.readTexture);
    gl.uniform1i(program.uniforms.get('u_velocity'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.pressure.readTexture);
    gl.uniform1i(program.uniforms.get('u_pressure'), 1);

    // Set uniforms
    gl.uniform2f(program.uniforms.get('u_resolution'), this.velocity.width, this.velocity.height);

    // Draw
    drawQuad(gl, this.quadBuffer!, program.attributes.get('a_position')!);

    this.velocity.swap();
  }

  private compileShaders(): boolean {
    const { gl } = this;

    console.log('[FluidRenderer] Compiling shaders...');

    const shaders = [
      {
        name: 'advection',
        fragment: advectionFragmentShader,
        uniforms: ['u_field', 'u_velocity', 'u_resolution', 'u_dt', 'u_dissipation'],
      },
      {
        name: 'divergence',
        fragment: divergenceFragmentShader,
        uniforms: ['u_velocity', 'u_resolution'],
      },
      {
        name: 'pressure',
        fragment: pressureFragmentShader,
        uniforms: ['u_pressure', 'u_divergence', 'u_resolution'],
      },
      {
        name: 'projection',
        fragment: projectionFragmentShader,
        uniforms: ['u_velocity', 'u_pressure', 'u_resolution'],
      },
      {
        name: 'buoyancy',
        fragment: buoyancyFragmentShader,
        uniforms: ['u_velocity', 'u_dye', 'u_buoyancy', 'u_dt'],
      },
      {
        name: 'composite',
        fragment: compositeFragmentShader,
        uniforms: ['u_dye', 'u_resolution', 'u_radius', 'u_padding'],
      },
      {
        name: 'clear',
        fragment: clearFragmentShader,
        uniforms: ['u_color'],
      },
      {
        name: 'splat',
        fragment: splatFragmentShader,
        uniforms: ['u_target', 'u_resolution', 'u_point', 'u_radius', 'u_color'],
      },
    ];

    for (const shader of shaders) {
      const program = createProgram(
        gl,
        baseVertexShader,
        shader.fragment,
        shader.uniforms,
        ['a_position']
      );

      if (!program) {
        console.error(`[FluidRenderer] Failed to compile '${shader.name}' shader`);
        return false;
      }

      this.programs.set(shader.name, program);
      console.log(`[FluidRenderer] ✓ Compiled '${shader.name}' shader`);
    }

    return true;
  }

  private createTextures(): boolean {
    const { canvas, context } = this;
    const { gl, dpr } = context;

    // Calculate simulation resolution
    const width = Math.floor(canvas.width * this.options.simResolution);
    const height = Math.floor(canvas.height * this.options.simResolution);

    console.log(`[FluidRenderer] Creating textures (${width}x${height})`);

    // Determine texture format
    const format = gl.RGBA;
    const internalFormat = context.caps.isWebGL2 ? (gl as WebGL2RenderingContext).RGBA16F : gl.RGBA;
    const type = context.caps.hasHalfFloatTextures
      ? (context.caps.isWebGL2 ? (gl as WebGL2RenderingContext).HALF_FLOAT : 0x8D61) // HALF_FLOAT_OES
      : gl.UNSIGNED_BYTE;

    try {
      // Create double FBOs
      this.velocity = this.createDoubleFBO(width, height, format, internalFormat, type);
      this.pressure = this.createDoubleFBO(width, height, format, internalFormat, type);
      this.dye = this.createDoubleFBO(width, height, format, internalFormat, type);

      // Create single FBO for divergence
      this.divergenceTexture = this.createTexture(width, height, format, internalFormat, type);
      this.divergence = this.createFBO(this.divergenceTexture);

      if (!this.velocity || !this.pressure || !this.dye || !this.divergence) {
        throw new Error('FBO creation failed');
      }

      // Verify all FBOs are complete
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocity.read);
      if (!checkFramebuffer(gl, this.velocity.read, 'velocity.read')) return false;

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.divergence);
      if (!checkFramebuffer(gl, this.divergence, 'divergence')) return false;

      console.log('[FluidRenderer] ✓ Textures created');
      return true;
    } catch (error) {
      console.error('[FluidRenderer] Texture creation failed:', error);
      return false;
    }
  }

  private deleteTextures(): void {
    if (this.velocity) this.deleteDoubleFBO(this.velocity);
    if (this.pressure) this.deleteDoubleFBO(this.pressure);
    if (this.dye) this.deleteDoubleFBO(this.dye);
    if (this.divergenceTexture) this.gl.deleteTexture(this.divergenceTexture);
    if (this.divergence) this.gl.deleteFramebuffer(this.divergence);

    this.velocity = null;
    this.pressure = null;
    this.dye = null;
    this.divergenceTexture = null;
    this.divergence = null;
  }

  private createTexture(
    width: number,
    height: number,
    format: number,
    internalFormat: number,
    type: number
  ): WebGLTexture | null {
    const { gl } = this;

    const texture = gl.createTexture();
    if (!texture) return null;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return texture;
  }

  private createFBO(texture: WebGLTexture): WebGLFramebuffer | null {
    const { gl } = this;

    const fbo = gl.createFramebuffer();
    if (!fbo) return null;

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    return fbo;
  }

  private createDoubleFBO(
    width: number,
    height: number,
    format: number,
    internalFormat: number,
    type: number
  ): DoubleFBO | null {
    const readTexture = this.createTexture(width, height, format, internalFormat, type);
    const writeTexture = this.createTexture(width, height, format, internalFormat, type);

    if (!readTexture || !writeTexture) return null;

    const read = this.createFBO(readTexture);
    const write = this.createFBO(writeTexture);

    if (!read || !write) return null;

    return {
      read,
      write,
      readTexture,
      writeTexture,
      width,
      height,
      swap: function () {
        [this.read, this.write] = [this.write, this.read];
        [this.readTexture, this.writeTexture] = [this.writeTexture, this.readTexture];
      },
    };
  }

  private deleteDoubleFBO(fbo: DoubleFBO): void {
    this.gl.deleteFramebuffer(fbo.read);
    this.gl.deleteFramebuffer(fbo.write);
    this.gl.deleteTexture(fbo.readTexture);
    this.gl.deleteTexture(fbo.writeTexture);
  }

  private addInitialSplats(): void {
    // Add 3-5 random dye splats for initial gravity demonstration
    const count = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const x = 0.3 + Math.random() * 0.4;
      const y = 0.4 + Math.random() * 0.4;
      const r = 50 + Math.random() * 50;

      // Random color from brand palette
      const colors = [
        [92 / 255, 192 / 255, 248 / 255, 1.0],  // Blue
        [168 / 255, 85 / 255, 247 / 255, 1.0],  // Purple
        [255 / 255, 159 / 255, 28 / 255, 0.8],  // Orange
      ];

      const color = colors[Math.floor(Math.random() * colors.length)];

      this.splat(x, y, r, color);
    }
  }

  private splat(x: number, y: number, radius: number, color: number[]): void {
    if (!this.dye) return;

    const { gl } = this;
    const program = this.programs.get('splat');
    if (!program) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.dye.write);
    gl.viewport(0, 0, this.dye.width, this.dye.height);

    gl.useProgram(program.program);

    // Bind dye texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.dye.readTexture);
    gl.uniform1i(program.uniforms.get('u_target'), 0);

    // Set uniforms
    gl.uniform2f(program.uniforms.get('u_resolution'), this.dye.width, this.dye.height);
    gl.uniform2f(program.uniforms.get('u_point'), x, y);
    gl.uniform1f(program.uniforms.get('u_radius'), radius);
    gl.uniform4f(program.uniforms.get('u_color'), color[0], color[1], color[2], color[3]);

    // Draw
    drawQuad(gl, this.quadBuffer!, program.attributes.get('a_position')!);

    this.dye.swap();
  }

  private checkQualityLadder(): void {
    const avgFrameTime = this.getAverageFrameTime();

    // If frame time > 18ms (< 55fps), downgrade quality
    if (avgFrameTime > 18 && this.currentTier < QUALITY_TIERS.length - 1) {
      console.warn(`[FluidRenderer] Frame time ${avgFrameTime.toFixed(2)}ms > 18ms, downgrading quality`);
      this.setQualityTier(this.currentTier + 1);
      this.frameTimes = []; // Reset measurements
    }
  }
}
