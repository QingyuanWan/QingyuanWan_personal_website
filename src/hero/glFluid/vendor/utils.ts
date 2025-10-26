/**
 * WebGL Fluid Simulation - Utilities
 *
 * MIT License - Based on Pavel Dobryakov's WebGL Fluid Simulation
 */

export function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

export function createProgram(
  gl: WebGL2RenderingContext,
  vertexShader: string,
  fragmentShader: string
): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexShader);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader);

  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

export interface Material {
  program: WebGLProgram;
  uniforms: Map<string, WebGLUniformLocation>;
}

export function createMaterial(
  gl: WebGL2RenderingContext,
  vertexShader: string,
  fragmentShaderSource: string,
  keywords?: string[]
): Material | null {
  // Add keywords as #define directives
  let fragmentShader = fragmentShaderSource;
  if (keywords && keywords.length > 0) {
    const defines = keywords.map(k => `#define ${k}\n`).join('');
    fragmentShader = defines + fragmentShader;
  }

  const program = createProgram(gl, vertexShader, fragmentShader);
  if (!program) return null;

  const uniforms = new Map<string, WebGLUniformLocation>();

  // Extract all uniform names from shader source
  const uniformPattern = /uniform\s+\w+\s+(\w+);/g;
  let match;

  while ((match = uniformPattern.exec(vertexShader + fragmentShader)) !== null) {
    const name = match[1];
    const location = gl.getUniformLocation(program, name);
    if (location) {
      uniforms.set(name, location);
    }
  }

  return { program, uniforms };
}

export interface FBO {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  attach(id: number): number;
}

export function createFBO(
  gl: WebGL2RenderingContext,
  w: number,
  h: number,
  internalFormat: number,
  format: number,
  type: number,
  param: number
): FBO | null {
  gl.activeTexture(gl.TEXTURE0);

  const texture = gl.createTexture();
  if (!texture) return null;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

  const fbo = gl.createFramebuffer();
  if (!fbo) {
    gl.deleteTexture(texture);
    return null;
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.viewport(0, 0, w, h);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    console.error('Framebuffer incomplete:', status);
    gl.deleteFramebuffer(fbo);
    gl.deleteTexture(texture);
    return null;
  }

  return {
    texture,
    fbo,
    width: w,
    height: h,
    attach(id: number): number {
      gl.activeTexture(gl.TEXTURE0 + id);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      return id;
    },
  };
}

export interface DoubleFBO {
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  read: FBO;
  write: FBO;
  swap(): void;
}

export function createDoubleFBO(
  gl: WebGL2RenderingContext,
  w: number,
  h: number,
  internalFormat: number,
  format: number,
  type: number,
  param: number
): DoubleFBO | null {
  const fbo1 = createFBO(gl, w, h, internalFormat, format, type, param);
  const fbo2 = createFBO(gl, w, h, internalFormat, format, type, param);

  if (!fbo1 || !fbo2) return null;

  return {
    width: w,
    height: h,
    texelSizeX: 1.0 / w,
    texelSizeY: 1.0 / h,
    read: fbo1,
    write: fbo2,
    swap() {
      const temp = this.read;
      this.read = this.write;
      this.write = temp;
    },
  };
}

export function getWebGLContext(canvas: HTMLCanvasElement, options?: WebGLContextAttributes): WebGL2RenderingContext | null {
  const params: WebGLContextAttributes = {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    preserveDrawingBuffer: false,
    ...options,
  };

  let gl = canvas.getContext('webgl2', params);

  if (!gl) {
    console.warn('[FluidGL] WebGL2 not available, trying WebGL1');
    gl = canvas.getContext('webgl', params) as any;
  }

  if (!gl) {
    console.error('[FluidGL] WebGL not supported');
    return null;
  }

  return gl as WebGL2RenderingContext;
}

export function getSupportedFormat(gl: WebGL2RenderingContext): { internalFormat: number; format: number } {
  let internalFormat: number;
  let format: number;

  // Try half-float (best quality)
  const ext = gl.getExtension('EXT_color_buffer_half_float');
  if (ext) {
    internalFormat = (gl as any).RGBA16F || 0x881A;
    format = gl.RGBA;
  } else {
    // Fallback to RGBA
    internalFormat = gl.RGBA;
    format = gl.RGBA;
  }

  return { internalFormat, format };
}
