/**
 * WebGL Capability Detection & Context Management
 *
 * Safe boot sequence:
 * 1. Try WebGL2 with high-performance preference
 * 2. Fallback to WebGL1 with required extensions
 * 3. Return null if neither works (triggers Dot fallback)
 * 4. Add context loss/restore handlers
 */

export interface GLCapabilities {
  isWebGL2: boolean;
  maxTextureSize: number;
  hasFloatTextures: boolean;
  hasHalfFloatTextures: boolean;
  hasLinearFloat: boolean;
  hasColorBufferFloat: boolean;
  extensions: Set<string>;
}

export interface GLContext {
  gl: WebGLRenderingContext | WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
  caps: GLCapabilities;
  dpr: number;
  isLost: boolean;
  onContextLost?: () => void;
  onContextRestored?: () => void;
}

const DPR_CAP = 2.0; // Never exceed 2.0 for render targets

/**
 * Boot WebGL with capability detection and error handling
 */
export function bootGL(
  canvas: HTMLCanvasElement,
  options: {
    onContextLost?: () => void;
    onContextRestored?: () => void;
    preferWebGL2?: boolean;
  } = {}
): GLContext | null {
  const { onContextLost, onContextRestored, preferWebGL2 = true } = options;

  console.log('[bootGL] Starting WebGL initialization');

  // Clamp DPR to avoid massive render targets
  const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
  console.log(`[bootGL] Device DPR: ${window.devicePixelRatio}, clamped to: ${dpr}`);

  // Try WebGL2 first
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  let isWebGL2 = false;

  if (preferWebGL2) {
    try {
      gl = canvas.getContext('webgl2', {
        alpha: false,
        depth: false,
        stencil: false,
        antialias: false,
        powerPreference: 'high-performance',
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
      });

      if (gl) {
        isWebGL2 = true;
        console.log('[bootGL] ✓ WebGL2 context created');
      }
    } catch (e) {
      console.warn('[bootGL] WebGL2 failed:', e);
    }
  }

  // Fallback to WebGL1
  if (!gl) {
    try {
      gl = canvas.getContext('webgl', {
        alpha: false,
        depth: false,
        stencil: false,
        antialias: false,
        powerPreference: 'high-performance',
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
      });

      if (gl) {
        console.log('[bootGL] ✓ WebGL1 context created (fallback)');
      }
    } catch (e) {
      console.error('[bootGL] WebGL1 failed:', e);
    }
  }

  // Neither worked - return null for Dot fallback
  if (!gl) {
    console.error('[bootGL] ✗ No WebGL support - use Dot fallback');
    return null;
  }

  // Probe capabilities
  const caps = probeCapabilities(gl, isWebGL2);

  // Check required capabilities
  if (!caps.hasFloatTextures && !caps.hasHalfFloatTextures) {
    console.error('[bootGL] ✗ No float texture support - use Dot fallback');
    return null;
  }

  console.log('[bootGL] Capabilities:', {
    isWebGL2,
    maxTextureSize: caps.maxTextureSize,
    hasFloatTextures: caps.hasFloatTextures,
    hasHalfFloatTextures: caps.hasHalfFloatTextures,
    hasLinearFloat: caps.hasLinearFloat,
    hasColorBufferFloat: caps.hasColorBufferFloat,
  });

  // Create context object
  const context: GLContext = {
    gl,
    canvas,
    caps,
    dpr,
    isLost: false,
    onContextLost,
    onContextRestored,
  };

  // Add context loss/restore handlers
  setupContextLossHandlers(canvas, context);

  console.log('[bootGL] ✓ Initialization complete');
  return context;
}

/**
 * Probe WebGL capabilities
 */
function probeCapabilities(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  isWebGL2: boolean
): GLCapabilities {
  const extensions = new Set<string>();

  // Get max texture size
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;

  let hasFloatTextures = false;
  let hasHalfFloatTextures = false;
  let hasLinearFloat = false;
  let hasColorBufferFloat = false;

  if (isWebGL2) {
    // WebGL2 has float textures built-in
    hasFloatTextures = true;
    hasHalfFloatTextures = true;
    hasLinearFloat = true;

    // Check for color buffer float (needed for FBO render targets)
    const ext = gl.getExtension('EXT_color_buffer_float');
    hasColorBufferFloat = ext !== null;
    if (ext) extensions.add('EXT_color_buffer_float');
  } else {
    // WebGL1 requires extensions
    const floatExt = gl.getExtension('OES_texture_float');
    const halfFloatExt = gl.getExtension('OES_texture_half_float');
    const linearFloatExt = gl.getExtension('OES_texture_float_linear');
    const colorBufferFloatExt = gl.getExtension('EXT_color_buffer_float') ||
                                 gl.getExtension('WEBGL_color_buffer_float');

    hasFloatTextures = floatExt !== null;
    hasHalfFloatTextures = halfFloatExt !== null;
    hasLinearFloat = linearFloatExt !== null;
    hasColorBufferFloat = colorBufferFloatExt !== null;

    if (floatExt) extensions.add('OES_texture_float');
    if (halfFloatExt) extensions.add('OES_texture_half_float');
    if (linearFloatExt) extensions.add('OES_texture_float_linear');
    if (colorBufferFloatExt) extensions.add('EXT_color_buffer_float');
  }

  return {
    isWebGL2,
    maxTextureSize,
    hasFloatTextures,
    hasHalfFloatTextures,
    hasLinearFloat,
    hasColorBufferFloat,
    extensions,
  };
}

/**
 * Setup context loss/restore handlers
 */
function setupContextLossHandlers(canvas: HTMLCanvasElement, context: GLContext): void {
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    console.warn('[bootGL] ⚠ WebGL context lost');
    context.isLost = true;

    if (context.onContextLost) {
      context.onContextLost();
    }
  });

  canvas.addEventListener('webglcontextrestored', () => {
    console.log('[bootGL] ✓ WebGL context restored');
    context.isLost = false;

    if (context.onContextRestored) {
      context.onContextRestored();
    }
  });
}

/**
 * Destroy WebGL context
 */
export function destroyGL(context: GLContext | null): void {
  if (!context) return;

  const { gl } = context;

  // Lose context intentionally
  const loseExt = gl.getExtension('WEBGL_lose_context');
  if (loseExt) {
    loseExt.loseContext();
  }

  console.log('[bootGL] Context destroyed');
}
