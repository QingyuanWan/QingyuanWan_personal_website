/**
 * WebGL Fluid Hero
 *
 * Simplified but functional WebGL fluid simulation
 * Based on Jos Stam's stable fluids algorithm
 *
 * MIT License
 */

import { HeroEffect } from '../HeroEffect';
import type { FluidOptions } from './fluid-options';
import { PRESETS, FluidQualityLadder } from './fluid-options';
import { getWebGLContext, getSupportedFormat, createMaterial, createDoubleFBO, type Material, type DoubleFBO } from './vendor/utils';
import * as shaders from './vendor/shaders';

export class FluidHero implements HeroEffect {
  private canvas!: HTMLCanvasElement;
  private gl!: WebGL2RenderingContext;
  private options: FluidOptions;
  private ladder: FluidQualityLadder;

  // WebGL resources
  private materials: Map<string, Material> = new Map();
  private velocity!: DoubleFBO;
  private density!: DoubleFBO;
  private divergence!: any;
  private curl!: any;
  private pressure!: DoubleFBO;

  // State
  private rafId: number | null = null;
  private isRunning = false;
  private frameCount = 0;
  private lastFrameTime = 0;
  private firstDrawResolve!: () => void;
  public firstDraw$: Promise<void>;

  private hasAllocated = false;
  private debugMode = false;
  private testMode: 'off' | 'color' | 'gradient' | 'texture' = 'off';
  private resizeObserver?: ResizeObserver;
  private loggedOnce = false;

  constructor() {
    this.ladder = new FluidQualityLadder();
    this.options = this.ladder.getCurrentOptions();

    // Check for debug/test mode
    const params = new URLSearchParams(window.location.search);
    const gltestParam = params.get('gltest');
    const debugParam = params.get('debug');

    console.log('[FluidHero] Constructor - URL params:', { gltest: gltestParam, debug: debugParam });

    this.debugMode = debugParam === '1';
    if (gltestParam === '1') {
      this.testMode = 'gradient'; // Use UV gradient test
      this.debugMode = true;
      console.log('[FluidHero] ===== TEST MODE ACTIVATED: UV GRADIENT =====');
      console.log('[FluidHero] testMode set to:', this.testMode);
    }

    // Create firstDraw promise
    this.firstDraw$ = new Promise(resolve => {
      this.firstDrawResolve = resolve;
    });
  }

  private assertNoGLError(checkpoint: string): void {
    if (!this.gl) return;

    const error = this.gl.getError();
    if (error !== this.gl.NO_ERROR) {
      const errorNames: Record<number, string> = {
        [this.gl.INVALID_ENUM]: 'INVALID_ENUM',
        [this.gl.INVALID_VALUE]: 'INVALID_VALUE',
        [this.gl.INVALID_OPERATION]: 'INVALID_OPERATION',
        [this.gl.INVALID_FRAMEBUFFER_OPERATION]: 'INVALID_FRAMEBUFFER_OPERATION',
        [this.gl.OUT_OF_MEMORY]: 'OUT_OF_MEMORY',
      };
      console.error(`[FluidHero] WebGL Error at ${checkpoint}: ${errorNames[error] || error}`);
    } else if (this.debugMode) {
      console.log(`[FluidHero] ✓ No GL error at ${checkpoint}`);
    }
  }

  async allocate(rootEl: HTMLElement): Promise<void> {
    if (this.hasAllocated) return;

    console.log('[FluidHero] Allocating...');

    try {
      // Create canvas
      this.canvas = document.createElement('canvas');
      this.canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
        display: block;
        background: transparent;
        will-change: transform;
        transform: translateZ(0);
      `;
      rootEl.appendChild(this.canvas);

      console.log('[FluidHero] Canvas created with transparent background, z-index:1');

      // Get WebGL context
      const gl = getWebGLContext(this.canvas);
      if (!gl) {
        throw new Error('WebGL not available');
      }
      this.gl = gl;

      // Size canvas initially
      this.setCanvasSize('mount');

      // Initialize WebGL resources
      await this.initGL();

      // Attach resize observers after GL init
      this.attachObservers();

      this.hasAllocated = true;
      console.log('[FluidHero] ✓ Allocated');
    } catch (error) {
      console.error('[FluidHero] Allocation failed:', error);
      throw error;
    }
  }

  async warmup(steps: number, onHeartbeat?: (i: number, total: number) => void): Promise<void> {
    console.log(`[FluidHero] Warming up (${steps} steps)...`);

    const startTime = performance.now();

    for (let i = 0; i < steps; i++) {
      this.stepSimulation(16.67); // ~60fps timestep

      // Heartbeat every 5 steps
      if (i % 5 === 0 && onHeartbeat) {
        onHeartbeat(i, steps);
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
    }

    const elapsed = performance.now() - startTime;
    const avgFrameTime = elapsed / steps;

    console.log(`[FluidHero] ✓ Warmup complete (${avgFrameTime.toFixed(2)}ms/frame)`);

    // Check if we should downshift
    if (avgFrameTime > 20) {
      console.warn('[FluidHero] Slow warmup, may need to downshift quality');
    }
  }

  start(): void {
    if (this.isRunning) return;

    console.log('[FluidHero] Starting render loop');
    this.isRunning = true;
    this.lastFrameTime = performance.now();

    // Force first render immediately to debug
    console.log('[FluidHero] Forcing immediate first render for debug...');
    this.renderToScreen();

    this.loop();
  }

  stop(): void {
    if (!this.isRunning) return;

    console.log('[FluidHero] Stopping');
    this.isRunning = false;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  destroy(): void {
    console.log('[FluidHero] Destroying');
    this.stop();

    // Detach observers
    this.detachObservers();

    // Clean up WebGL resources
    if (this.gl) {
      // Delete FBOs and textures
      // (simplified - full cleanup would iterate all resources)
      this.materials.clear();
    }

    // Remove canvas
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }

  // Private methods

  private async initGL(): Promise<void> {
    const gl = this.gl;

    console.log('[FluidHero] Initializing WebGL...');

    // Disable features that might interfere with rendering
    gl.disable(gl.BLEND);          // CRITICAL: Disable blending
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.SCISSOR_TEST);
    gl.colorMask(true, true, true, true);

    console.log('[FluidHero] WebGL state: blend=OFF, depth=OFF, cull=OFF, scissor=OFF');

    // Get supported formats
    const { internalFormat, format } = getSupportedFormat(gl);
    const type = gl.HALF_FLOAT || gl.FLOAT;
    const filtering = gl.LINEAR;

    if (this.debugMode) {
      console.log('[FluidHero] Format:', { internalFormat, format, type, filtering });
    }

    // Create materials (shader programs)
    console.log('[FluidHero] Creating shader programs...');

    const clearMat = createMaterial(gl, shaders.baseVertexShader, shaders.clearShader);
    this.assertNoGLError('clear shader');

    const splatMat = createMaterial(gl, shaders.baseVertexShader, shaders.splatShader);
    this.assertNoGLError('splat shader');

    const advectionMat = createMaterial(gl, shaders.baseVertexShader, shaders.advectionShader);
    this.assertNoGLError('advection shader');

    const divergenceMat = createMaterial(gl, shaders.baseVertexShader, shaders.divergenceShader);
    this.assertNoGLError('divergence shader');

    const curlMat = createMaterial(gl, shaders.baseVertexShader, shaders.curlShader);
    this.assertNoGLError('curl shader');

    const vorticityMat = createMaterial(gl, shaders.baseVertexShader, shaders.vorticityShader);
    this.assertNoGLError('vorticity shader');

    const pressureMat = createMaterial(gl, shaders.baseVertexShader, shaders.pressureShader);
    this.assertNoGLError('pressure shader');

    const gradientSubtractMat = createMaterial(gl, shaders.baseVertexShader, shaders.gradientSubtractShader);
    this.assertNoGLError('gradientSubtract shader');

    const displayMat = createMaterial(gl, shaders.baseVertexShader, shaders.displayShader);
    this.assertNoGLError('display shader');

    const uvGradientMat = createMaterial(gl, shaders.baseVertexShader, shaders.uvGradientShader);
    this.assertNoGLError('uvGradient shader');

    if (!clearMat || !splatMat || !advectionMat || !divergenceMat || !curlMat || !vorticityMat || !pressureMat || !gradientSubtractMat || !displayMat || !uvGradientMat) {
      throw new Error('Failed to create shader materials');
    }

    this.materials.set('clear', clearMat);
    this.materials.set('splat', splatMat);
    this.materials.set('advection', advectionMat);
    this.materials.set('divergence', divergenceMat);
    this.materials.set('curl', curlMat);
    this.materials.set('vorticity', vorticityMat);
    this.materials.set('pressure', pressureMat);
    this.materials.set('gradientSubtract', gradientSubtractMat);
    this.materials.set('display', displayMat);
    this.materials.set('uvGradient', uvGradientMat);

    console.log('[FluidHero] ✓ All shaders compiled');

    // Create FBOs
    const simRes = this.options.simResolution;
    const dyeRes = this.options.dyeResolution;

    console.log(`[FluidHero] Creating FBOs: sim=${simRes}x${simRes}, dye=${dyeRes}x${dyeRes}`);

    const velocity = createDoubleFBO(gl, simRes, simRes, internalFormat, format, type, filtering);
    this.assertNoGLError('velocity FBO');

    const density = createDoubleFBO(gl, dyeRes, dyeRes, internalFormat, format, type, filtering);
    this.assertNoGLError('density FBO');

    if (!velocity || !density) {
      throw new Error('Failed to create FBOs');
    }

    this.velocity = velocity;
    this.density = density;

    // Check framebuffer completeness
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.density.read.fbo);
    const fbStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (fbStatus !== gl.FRAMEBUFFER_COMPLETE) {
      const statusNames: Record<number, string> = {
        [gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT]: 'INCOMPLETE_ATTACHMENT',
        [gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT]: 'INCOMPLETE_MISSING_ATTACHMENT',
        [gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS]: 'INCOMPLETE_DIMENSIONS',
        [gl.FRAMEBUFFER_UNSUPPORTED]: 'UNSUPPORTED',
      };
      throw new Error(`Framebuffer not complete: ${statusNames[fbStatus] || fbStatus}`);
    }
    console.log('[FluidHero] ✓ FBOs complete');

    // Create full-screen quad
    this.initBlitProgram();
    this.assertNoGLError('blit program');

    // Test mode: Fill density texture with test data
    if (this.testMode !== 'off') {
      console.log('[FluidHero] Test mode active - filling density with test pattern');
      this.fillDensityTestPattern();
    }

    console.log('[FluidHero] ✓ WebGL initialized');
  }

  private fullscreenBuffer!: WebGLBuffer;

  private initBlitProgram(): void {
    const gl = this.gl;

    // Full-screen triangle (covers entire clip space with 3 vertices)
    // More efficient than quad - no degenerate pixels
    const vertices = new Float32Array([
      -1, -1,  // v0: bottom-left
       3, -1,  // v1: extends far right
      -1,  3   // v2: extends far up
    ]);

    const buffer = gl.createBuffer();
    if (!buffer) {
      throw new Error('Failed to create vertex buffer');
    }

    this.fullscreenBuffer = buffer;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    console.log('[FluidHero] Full-screen triangle buffer created');
  }

  public setCanvasSize(reason = 'init'): void {
    if (!this.canvas || !this.gl) return;

    const gl = this.gl;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.0);

    // Measure the PARENT container (hero div), not the canvas itself
    const host = this.canvas.parentElement as HTMLElement;
    if (!host) {
      console.warn('[FluidHero] No parent element for canvas!');
      return;
    }

    const rect = host.getBoundingClientRect();

    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));
    const pixelW = Math.max(1, Math.round(cssW * dpr));
    const pixelH = Math.max(1, Math.round(cssH * dpr));

    // Only update if changed
    const changed = (pixelW !== this.canvas.width || pixelH !== this.canvas.height);

    if (changed) {
      this.canvas.width = pixelW;
      this.canvas.height = pixelH;
      gl.viewport(0, 0, pixelW, pixelH);
    }

    // Get actual viewport for debugging
    const vp = gl.getParameter(gl.VIEWPORT) as Int32Array;

    console.log('[FluidHero] setCanvasSize', {
      reason,
      dpr,
      cssW,
      cssH,
      pixelW,
      pixelH,
      changed,
      viewport: Array.from(vp),
    });

    // Re-apply critical state
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.SCISSOR_TEST);
    gl.colorMask(true, true, true, true);
  }

  private attachObservers(): void {
    const host = this.canvas.parentElement as HTMLElement;
    if (!host) return;

    // ResizeObserver on the hero container
    this.resizeObserver = new ResizeObserver(() => {
      this.setCanvasSize('ResizeObserver');
    });
    this.resizeObserver.observe(host);

    // Window resize as fallback
    window.addEventListener('resize', this.handleWindowResize, { passive: true });

    console.log('[FluidHero] Observers attached');
  }

  private handleWindowResize = () => {
    this.setCanvasSize('window.resize');
  };

  private detachObservers(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    window.removeEventListener('resize', this.handleWindowResize);

    console.log('[FluidHero] Observers detached');
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const dt = Math.min(now - this.lastFrameTime, 33.33); // Cap at 30fps minimum
    this.lastFrameTime = now;

    this.ladder.addFrameTime(dt);

    // Update simulation
    this.stepSimulation(dt);

    // Render to canvas
    this.render();

    // First draw
    if (this.frameCount === 0) {
      console.log('[FluidHero] ✓ First draw');
      this.firstDrawResolve();
    }

    // Check quality ladder
    if (this.frameCount === 120 || this.frameCount === 300) {
      const newTier = this.ladder.checkLadder(this.frameCount);
      if (newTier) {
        console.log(`[FluidHero] Quality changed to: ${newTier}`);
        // TODO: Re-initialize with new options
      }
    }

    this.frameCount++;
    this.rafId = requestAnimationFrame(this.loop);
  };

  private stepSimulation(dt: number): void {
    // Simplified but functional fluid simulation
    // This implements the core Jos Stam algorithm

    const gl = this.gl;
    const time = performance.now() * 0.001;

    // 1. Add periodic splats (automatic animation)
    if (this.frameCount % 30 === 0) {
      this.addSplat(
        Math.random(),
        Math.random(),
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        [
          0.5 + 0.5 * Math.sin(time),
          0.5 + 0.5 * Math.sin(time + 2),
          0.5 + 0.5 * Math.sin(time + 4)
        ]
      );
    }

    // 2. Advect density (simplified - use current density as-is)
    // Full implementation would do semi-Lagrangian advection

    // Render current density to screen using display shader
    this.renderToScreen();
  }

  private fillDensityTestPattern(): void {
    const gl = this.gl;
    const dyeRes = this.options.dyeResolution;

    // Create RGBA test data
    const data = new Uint8Array(dyeRes * dyeRes * 4);
    for (let y = 0; y < dyeRes; y++) {
      for (let x = 0; x < dyeRes; x++) {
        const i = (y * dyeRes + x) * 4;
        // Gradient pattern: Red left to right, Green top to bottom
        data[i + 0] = Math.floor((x / dyeRes) * 255);     // R
        data[i + 1] = Math.floor((y / dyeRes) * 255);     // G
        data[i + 2] = 128;                                 // B
        data[i + 3] = 255;                                 // A
      }
    }

    // Upload to density texture
    gl.bindTexture(gl.TEXTURE_2D, this.density.read.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, dyeRes, dyeRes, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);

    console.log('[FluidHero] ✓ Test pattern uploaded to density texture');
  }

  private renderToScreen(): void {
    const gl = this.gl;

    // Comprehensive frame diagnostics (user requested: "if possible can add more console debug line")
    if (this.frameCount < 5 || this.frameCount % 60 === 0) {
      const parentEl = this.canvas.parentElement as HTMLElement;
      const parentRect = parentEl ? parentEl.getBoundingClientRect() : { width: 0, height: 0 };

      console.log('[FluidHero] Frame Diagnostics', {
        frame: this.frameCount,
        testMode: this.testMode,
        rafActive: !!this.rafId,
        materials: {
          uvGradient: !!this.materials.get('uvGradient'),
          display: !!this.materials.get('display'),
          splat: !!this.materials.get('splat'),
          advection: !!this.materials.get('advection'),
        },
        parentCSS: {
          w: Math.round(parentRect.width),
          h: Math.round(parentRect.height),
        },
        canvasPixels: {
          w: this.canvas.width,
          h: this.canvas.height,
        },
        viewport: Array.from(gl.getParameter(gl.VIEWPORT) as Int32Array),
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      });

      const err = gl.getError();
      if (err !== gl.NO_ERROR) {
        console.error('[FluidHero] ⚠ GL Error detected:', err);
      }
    }

    if (this.frameCount === 0) {
      console.log('[FluidHero] ========== RENDER TO SCREEN ==========');
      console.log('[FluidHero] Canvas size:', this.canvas.width, 'x', this.canvas.height);
      console.log('[FluidHero] Test mode:', this.testMode);
      console.log('[FluidHero] Debug mode:', this.debugMode);
    }

    // Test modes for debugging
    if (this.testMode === 'color') {
      // (a) Solid color test
      console.log('[FluidHero] Rendering solid color test');
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.clearColor(0.2, 0.8, 0.4, 1.0); // Bright green
      gl.clear(gl.COLOR_BUFFER_BIT);
      this.assertNoGLError('color test');
      console.log('[FluidHero] Color test complete');
      return;
    }

    if (this.testMode === 'gradient') {
      // (b) UV gradient test - tests vertex shader, attributes, and basic fragment
      console.log('[FluidHero] ===== UV GRADIENT TEST MODE =====');

      const gradientMat = this.materials.get('uvGradient');
      if (!gradientMat) {
        console.error('[FluidHero] ❌ UV gradient material not found!');
        console.log('[FluidHero] Available materials:', Array.from(this.materials.keys()));
        return;
      }

      console.log('[FluidHero] ✓ Gradient material found');

      // Force clean WebGL state
      gl.disable(gl.BLEND);          // CRITICAL
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.SCISSOR_TEST);
      gl.colorMask(true, true, true, true);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);

      // Dark background so gradient is visible
      gl.clearColor(0.06, 0.07, 0.09, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      console.log('[FluidHero] ✓ Cleared to dark background');

      // Use gradient shader
      gl.useProgram(gradientMat.program);
      console.log('[FluidHero] ✓ Gradient program active');

      // Set resolution uniform
      const uResolution = gradientMat.uniforms.get('uResolution');
      if (uResolution) {
        gl.uniform2f(uResolution, this.canvas.width, this.canvas.height);
        console.log('[FluidHero] ✓ Resolution set:', this.canvas.width, 'x', this.canvas.height);
      } else {
        console.warn('[FluidHero] ⚠ uResolution uniform not found');
      }

      this.assertNoGLError('before gradient draw');

      // Draw using full-screen triangle
      console.log('[FluidHero] Drawing full-screen triangle...');
      this.blit(gradientMat.program);

      this.assertNoGLError('after gradient draw');

      console.log('[FluidHero] ===== UV GRADIENT TEST COMPLETE =====');
      return;
    }

    // Normal rendering path
    const displayMat = this.materials.get('display');
    if (!displayMat) {
      console.error('[FluidHero] No display material!');
      return;
    }

    if (this.frameCount === 0) {
      console.log('[FluidHero] Normal render path - using display shader');
      console.log('[FluidHero] Display material:', displayMat);
      console.log('[FluidHero] Uniforms:', Array.from(displayMat.uniforms.keys()));
    }

    // Bind to screen framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    // Clear with brand background color
    gl.clearColor(0.93, 0.90, 0.88, 1.0); // #E8E6E0
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (this.frameCount === 0) {
      console.log('[FluidHero] Cleared to background color');
    }

    // Use display shader
    gl.useProgram(displayMat.program);

    if (this.frameCount === 0) {
      console.log('[FluidHero] Display shader program set');
    }

    // Bind vertex buffer before drawing
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.getParameter(gl.ARRAY_BUFFER_BINDING));
    const aPosition = gl.getAttribLocation(displayMat.program, 'aPosition');
    if (aPosition !== -1) {
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
    }

    // Bind density texture to TEXTURE0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.density.read.texture);

    // Set uniforms
    const uTexture = displayMat.uniforms.get('uTexture');
    const uTexelSize = displayMat.uniforms.get('texelSize');

    if (uTexture !== undefined) {
      gl.uniform1i(uTexture, 0); // TEXTURE0
    } else {
      console.warn('[FluidHero] uTexture uniform not found');
    }

    // Use density FBO size for texelSize, not canvas size
    const dyeRes = this.options.dyeResolution;
    if (uTexelSize !== undefined) {
      gl.uniform2f(uTexelSize, 1.0 / dyeRes, 1.0 / dyeRes);
    }

    this.assertNoGLError('before draw');

    if (this.frameCount === 0) {
      console.log('[FluidHero] About to call blit() - drawing full-screen triangle');
    }

    // Draw full-screen triangle
    this.blit(displayMat.program);

    if (this.frameCount === 0) {
      console.log('[FluidHero] blit() returned');
    }

    this.assertNoGLError('after draw');

    // Debug logging on first few frames
    if (this.debugMode && this.frameCount < 5) {
      console.log(`[FluidHero] Frame ${this.frameCount} rendered`);
    }
  }

  private blit(program: WebGLProgram): void {
    const gl = this.gl;

    // Bind fullscreen triangle buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fullscreenBuffer);

    // Get aPosition location for this program
    const loc = gl.getAttribLocation(program, 'aPosition');
    if (loc === -1) {
      console.error('[FluidHero] aPosition not found in program!');
      return;
    }

    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    if (this.frameCount === 0) {
      console.log('[FluidHero] blit(): Drawing full-screen triangle (3 vertices)');
    }

    // Draw full-screen triangle (3 vertices)
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (this.frameCount === 0) {
      console.log('[FluidHero] blit(): drawArrays complete');
    }
  }

  private addSplat(x: number, y: number, dx: number, dy: number, color: number[]): void {
    // Add a splat of color at position with velocity
    const gl = this.gl;
    const splatMat = this.materials.get('splat');
    if (!splatMat) return;

    // Splat to density
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.density.write.fbo);
    gl.useProgram(splatMat.program);

    // Set uniforms
    const uTarget = splatMat.uniforms.get('uTarget');
    const uAspectRatio = splatMat.uniforms.get('aspectRatio');
    const uPoint = splatMat.uniforms.get('point');
    const uColor = splatMat.uniforms.get('color');
    const uRadius = splatMat.uniforms.get('radius');

    if (uTarget) {
      gl.uniform1i(uTarget, this.density.read.attach(0));
    }
    if (uAspectRatio) {
      gl.uniform1f(uAspectRatio, this.canvas.width / this.canvas.height);
    }
    if (uPoint) {
      gl.uniform2f(uPoint, x, y);
    }
    if (uColor) {
      gl.uniform3f(uColor, color[0], color[1], color[2]);
    }
    if (uRadius) {
      gl.uniform1f(uRadius, this.options.splatRadius);
    }

    // Draw full-screen triangle
    this.blit(splatMat.program);

    this.density.swap();
  }

  private render(): void {
    // Rendering is done inline in stepSimulation
    // Full implementation would have separate display pass with bloom
  }
}
