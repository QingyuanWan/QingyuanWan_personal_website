/**
 * Simple WebGL Fluid Renderer
 *
 * Minimal implementation based on Jos Stam's "Real-Time Fluid Dynamics for Games"
 * Focus: Get something visible quickly without complex features
 */

import type { GLContext } from './bootGL';
import { createProgram, createQuadBuffer, drawQuad, checkFramebuffer } from './shaderUtils';

// Simple shaders - just advection and display
const vertexShader = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const advectShader = `
precision mediump float;
uniform sampler2D u_velocity;
uniform sampler2D u_source;
uniform vec2 u_texelSize;
uniform float u_dt;
uniform float u_dissipation;
varying vec2 v_uv;

void main() {
  vec2 coord = v_uv - u_dt * texture2D(u_velocity, v_uv).xy * u_texelSize;
  gl_FragColor = u_dissipation * texture2D(u_source, coord);
}
`;

const splatShader = `
precision mediump float;
uniform sampler2D u_target;
uniform vec3 u_color;
uniform vec2 u_point;
uniform float u_radius;
varying vec2 v_uv;

void main() {
  vec2 p = v_uv - u_point;
  vec3 splat = exp(-dot(p, p) / u_radius) * u_color;
  vec3 base = texture2D(u_target, v_uv).xyz;
  gl_FragColor = vec4(base + splat, 1.0);
}
`;

const displayShader = `
precision mediump float;
uniform sampler2D u_texture;
varying vec2 v_uv;

void main() {
  vec3 color = texture2D(u_texture, v_uv).xyz;
  gl_FragColor = vec4(color, 1.0);
}
`;

interface FBO {
  fbo: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
}

interface DoubleFBO {
  read: FBO;
  write: FBO;
  swap: () => void;
}

export class SimpleFluidRenderer {
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;

  private programs = new Map<string, any>();
  private quadBuffer: WebGLBuffer | null = null;

  private velocity: DoubleFBO | null = null;
  private density: DoubleFBO | null = null;

  private rafId: number | null = null;
  private isRunning = false;
  private frameCount = 0;

  constructor(context: GLContext) {
    this.gl = context.gl;
    this.canvas = context.canvas;
  }

  async allocate(): Promise<boolean> {
    console.log('[SimpleFluid] Allocating...');

    try {
      // Create quad buffer
      this.quadBuffer = createQuadBuffer(this.gl);
      if (!this.quadBuffer) throw new Error('Failed to create quad buffer');

      // Compile shaders
      const advect = createProgram(this.gl, vertexShader, advectShader,
        ['u_velocity', 'u_source', 'u_texelSize', 'u_dt', 'u_dissipation'], ['a_position']);
      const splat = createProgram(this.gl, vertexShader, splatShader,
        ['u_target', 'u_color', 'u_point', 'u_radius'], ['a_position']);
      const display = createProgram(this.gl, vertexShader, displayShader,
        ['u_texture'], ['a_position']);

      if (!advect || !splat || !display) throw new Error('Shader compilation failed');

      this.programs.set('advect', advect);
      this.programs.set('splat', splat);
      this.programs.set('display', display);

      // Create textures (low res for performance)
      const simWidth = 256;
      const simHeight = 256;

      this.velocity = this.createDoubleFBO(simWidth, simHeight);
      this.density = this.createDoubleFBO(simWidth, simHeight);

      if (!this.velocity || !this.density) throw new Error('FBO creation failed');

      console.log('[SimpleFluid] ✓ Allocated successfully');
      return true;
    } catch (error) {
      console.error('[SimpleFluid] Allocation failed:', error);
      return false;
    }
  }

  async warmup(steps: number): Promise<void> {
    console.log(`[SimpleFluid] Warming up ${steps} steps...`);

    // Add initial splats
    for (let i = 0; i < 5; i++) {
      this.splat(
        Math.random(),
        Math.random(),
        Math.random() * 0.01,
        [Math.random(), Math.random(), Math.random()]
      );
    }

    // Run simulation invisibly
    for (let i = 0; i < steps; i++) {
      this.step();
      if (i % 10 === 0) {
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
    }

    console.log('[SimpleFluid] ✓ Warmup complete');
  }

  start(onFirstDraw?: () => void): void {
    console.log('[SimpleFluid] Starting...');
    this.isRunning = true;

    const loop = () => {
      if (!this.isRunning) return;

      this.step();
      this.render();

      if (this.frameCount === 0 && onFirstDraw) {
        console.log('[SimpleFluid] First draw');
        onFirstDraw();
      }

      this.frameCount++;
      this.rafId = requestAnimationFrame(loop);
    };

    loop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  destroy(): void {
    this.stop();

    if (this.velocity) {
      this.gl.deleteFramebuffer(this.velocity.read.fbo);
      this.gl.deleteFramebuffer(this.velocity.write.fbo);
      this.gl.deleteTexture(this.velocity.read.texture);
      this.gl.deleteTexture(this.velocity.write.texture);
    }

    if (this.density) {
      this.gl.deleteFramebuffer(this.density.read.fbo);
      this.gl.deleteFramebuffer(this.density.write.fbo);
      this.gl.deleteTexture(this.density.read.texture);
      this.gl.deleteTexture(this.density.write.texture);
    }

    for (const [, prog] of this.programs) {
      if (prog?.program) this.gl.deleteProgram(prog.program);
    }

    if (this.quadBuffer) this.gl.deleteBuffer(this.quadBuffer);
  }

  private step(): void {
    if (!this.velocity || !this.density) return;

    const { gl } = this;
    const dt = 0.016; // ~60fps

    // Advect velocity
    this.advect(this.velocity.read, this.velocity, this.velocity.write, dt, 0.98);
    this.velocity.swap();

    // Advect density
    this.advect(this.velocity.read, this.density, this.density.write, dt, 0.99);
    this.density.swap();

    // Occasionally add splats (rising effect)
    if (Math.random() < 0.01) {
      this.splat(
        0.5 + (Math.random() - 0.5) * 0.3,
        0.2 + Math.random() * 0.3,
        0.005,
        [0.3 + Math.random() * 0.7, 0.3 + Math.random() * 0.7, 0.8 + Math.random() * 0.2]
      );

      // Add upward velocity
      this.splatVelocity(
        0.5 + (Math.random() - 0.5) * 0.3,
        0.2 + Math.random() * 0.3,
        0.0,
        0.02
      );
    }
  }

  private render(): void {
    if (!this.density) return;

    const { gl } = this;
    const program = this.programs.get('display');
    if (!program) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    gl.useProgram(program.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.density.read.texture);
    gl.uniform1i(program.uniforms.get('u_texture'), 0);

    drawQuad(gl, this.quadBuffer!, program.attributes.get('a_position')!);
  }

  private advect(
    velocityFBO: FBO,
    source: DoubleFBO,
    target: FBO,
    dt: number,
    dissipation: number
  ): void {
    const { gl } = this;
    const program = this.programs.get('advect');
    if (!program) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    gl.viewport(0, 0, target.width, target.height);

    gl.useProgram(program.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocityFBO.texture);
    gl.uniform1i(program.uniforms.get('u_velocity'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, source.read.texture);
    gl.uniform1i(program.uniforms.get('u_source'), 1);

    gl.uniform2f(program.uniforms.get('u_texelSize'), 1.0 / target.width, 1.0 / target.height);
    gl.uniform1f(program.uniforms.get('u_dt'), dt);
    gl.uniform1f(program.uniforms.get('u_dissipation'), dissipation);

    drawQuad(gl, this.quadBuffer!, program.attributes.get('a_position')!);
  }

  private splat(x: number, y: number, radius: number, color: number[]): void {
    if (!this.density) return;

    const { gl } = this;
    const program = this.programs.get('splat');
    if (!program) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.density.write.fbo);
    gl.viewport(0, 0, this.density.write.width, this.density.write.height);

    gl.useProgram(program.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.density.read.texture);
    gl.uniform1i(program.uniforms.get('u_target'), 0);

    gl.uniform3f(program.uniforms.get('u_color'), color[0], color[1], color[2]);
    gl.uniform2f(program.uniforms.get('u_point'), x, y);
    gl.uniform1f(program.uniforms.get('u_radius'), radius);

    drawQuad(gl, this.quadBuffer!, program.attributes.get('a_position')!);

    this.density.swap();
  }

  private splatVelocity(x: number, y: number, vx: number, vy: number): void {
    if (!this.velocity) return;

    const { gl } = this;
    const program = this.programs.get('splat');
    if (!program) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocity.write.fbo);
    gl.viewport(0, 0, this.velocity.write.width, this.velocity.write.height);

    gl.useProgram(program.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
    gl.uniform1i(program.uniforms.get('u_target'), 0);

    gl.uniform3f(program.uniforms.get('u_color'), vx, vy, 0.0);
    gl.uniform2f(program.uniforms.get('u_point'), x, y);
    gl.uniform1f(program.uniforms.get('u_radius'), 0.005);

    drawQuad(gl, this.quadBuffer!, program.attributes.get('a_position')!);

    this.velocity.swap();
  }

  private createFBO(width: number, height: number): FBO | null {
    const { gl } = this;

    const texture = gl.createTexture();
    if (!texture) return null;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, width, height, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.WRAP_T, gl.CLAMP_TO_EDGE);

    const fbo = gl.createFramebuffer();
    if (!fbo) return null;

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    if (!checkFramebuffer(gl, fbo, 'SimpleFBO')) return null;

    return { fbo, texture, width, height };
  }

  private createDoubleFBO(width: number, height: number): DoubleFBO | null {
    const read = this.createFBO(width, height);
    const write = this.createFBO(width, height);

    if (!read || !write) return null;

    return {
      read,
      write,
      swap: function() {
        const temp = this.read;
        this.read = this.write;
        this.write = temp;
      }
    };
  }
}
