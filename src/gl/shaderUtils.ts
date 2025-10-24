/**
 * WebGL Shader Compilation Utilities
 *
 * Safe compilation with error logging and validation
 */

export interface ShaderProgram {
  program: WebGLProgram;
  uniforms: Map<string, WebGLUniformLocation>;
  attributes: Map<string, number>;
}

/**
 * Compile a shader with error handling
 */
export function compileShader(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  source: string,
  type: number
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    console.error('[shaderUtils] Failed to create shader');
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!success) {
    const log = gl.getShaderInfoLog(shader);
    console.error('[shaderUtils] Shader compile failed:', log);
    console.error('[shaderUtils] Source:', source);
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

/**
 * Link a program with error handling
 */
export function linkProgram(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) {
    console.error('[shaderUtils] Failed to create program');
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!success) {
    const log = gl.getProgramInfoLog(program);
    console.error('[shaderUtils] Program link failed:', log);
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

/**
 * Create a shader program from source with uniform/attribute caching
 */
export function createProgram(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
  uniformNames: string[] = [],
  attributeNames: string[] = []
): ShaderProgram | null {
  const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER);
  if (!vertexShader) return null;

  const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);
  if (!fragmentShader) {
    gl.deleteShader(vertexShader);
    return null;
  }

  const program = linkProgram(gl, vertexShader, fragmentShader);

  // Clean up shaders (no longer needed after linking)
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!program) return null;

  // Cache uniform locations
  const uniforms = new Map<string, WebGLUniformLocation>();
  for (const name of uniformNames) {
    const location = gl.getUniformLocation(program, name);
    if (location) {
      uniforms.set(name, location);
    } else {
      console.warn(`[shaderUtils] Uniform '${name}' not found in program`);
    }
  }

  // Cache attribute locations
  const attributes = new Map<string, number>();
  for (const name of attributeNames) {
    const location = gl.getAttribLocation(program, name);
    if (location >= 0) {
      attributes.set(name, location);
    } else {
      console.warn(`[shaderUtils] Attribute '${name}' not found in program`);
    }
  }

  return { program, uniforms, attributes };
}

/**
 * Validate framebuffer completeness
 */
export function checkFramebuffer(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  fbo: WebGLFramebuffer | null,
  name: string = 'FBO'
): boolean {
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    let errorMsg = 'UNKNOWN';

    switch (status) {
      case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
        errorMsg = 'INCOMPLETE_ATTACHMENT';
        break;
      case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
        errorMsg = 'MISSING_ATTACHMENT';
        break;
      case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
        errorMsg = 'INCOMPLETE_DIMENSIONS';
        break;
      case gl.FRAMEBUFFER_UNSUPPORTED:
        errorMsg = 'UNSUPPORTED';
        break;
    }

    console.error(`[shaderUtils] Framebuffer '${name}' incomplete: ${errorMsg}`);
    return false;
  }

  return true;
}

/**
 * Create a full-screen quad buffer
 */
export function createQuadBuffer(
  gl: WebGLRenderingContext | WebGL2RenderingContext
): WebGLBuffer | null {
  const buffer = gl.createBuffer();
  if (!buffer) return null;

  const vertices = new Float32Array([
    -1, -1,  // Bottom-left
     1, -1,  // Bottom-right
    -1,  1,  // Top-left
     1,  1,  // Top-right
  ]);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  return buffer;
}

/**
 * Draw a full-screen quad
 */
export function drawQuad(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  buffer: WebGLBuffer,
  positionAttribute: number
): void {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(positionAttribute);
  gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
