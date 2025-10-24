/**
 * Glass Mask Rendering
 *
 * Creates rounded rectangle "glass" container with:
 * - Inner shadow (dark edge falloff)
 * - Edge highlights (soft directional glow)
 * - Optional refraction effect
 */

export interface GlassMaskOptions {
  // Mask geometry
  radius: number; // Corner radius in pixels
  padding: number; // Inset from canvas edges

  // Edge effects
  innerShadow: {
    enabled: boolean;
    width: number; // Shadow width in pixels (1-3px)
    opacity: number; // 0-1
  };
  edgeHighlight: {
    enabled: boolean;
    width: number; // Highlight width in pixels
    opacity: number; // 0-1
  };

  // Refraction (optional)
  refraction: {
    enabled: boolean;
    offset: number; // Pixel offset for background sampling
  };
}

const DEFAULT_GLASS_OPTIONS: GlassMaskOptions = {
  radius: 24,
  padding: 0,
  innerShadow: {
    enabled: true,
    width: 2,
    opacity: 0.3,
  },
  edgeHighlight: {
    enabled: true,
    width: 1.5,
    opacity: 0.15,
  },
  refraction: {
    enabled: false,
    offset: 1,
  },
};

/**
 * Create glass mask and effects
 */
export function createGlassMask(
  width: number,
  height: number,
  userOptions: Partial<GlassMaskOptions> = {}
) {
  const options = { ...DEFAULT_GLASS_OPTIONS, ...userOptions };

  // Create offscreen canvas for mask
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext('2d')!;

  // Create offscreen canvas for inner shadow
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = width;
  shadowCanvas.height = height;
  const shadowCtx = shadowCanvas.getContext('2d')!;

  // Create offscreen canvas for highlights
  const highlightCanvas = document.createElement('canvas');
  highlightCanvas.width = width;
  highlightCanvas.height = height;
  const highlightCtx = highlightCanvas.getContext('2d')!;

  // Rebuild mask geometry
  function buildMask() {
    const { radius, padding } = options;
    const x = padding;
    const y = padding;
    const w = width - padding * 2;
    const h = height - padding * 2;

    // Draw rounded rectangle mask
    maskCtx.clearRect(0, 0, width, height);
    maskCtx.fillStyle = '#FFFFFF';
    maskCtx.beginPath();
    maskCtx.moveTo(x + radius, y);
    maskCtx.lineTo(x + w - radius, y);
    maskCtx.arcTo(x + w, y, x + w, y + radius, radius);
    maskCtx.lineTo(x + w, y + h - radius);
    maskCtx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
    maskCtx.lineTo(x + radius, y + h);
    maskCtx.arcTo(x, y + h, x, y + h - radius, radius);
    maskCtx.lineTo(x, y + radius);
    maskCtx.arcTo(x, y, x + radius, y, radius);
    maskCtx.closePath();
    maskCtx.fill();
  }

  // Build inner shadow (dark edge falloff)
  function buildInnerShadow() {
    if (!options.innerShadow.enabled) return;

    const { radius, padding } = options;
    const { width: shadowWidth, opacity } = options.innerShadow;
    const x = padding;
    const y = padding;
    const w = width - padding * 2;
    const h = height - padding * 2;

    shadowCtx.clearRect(0, 0, width, height);

    // Draw outer rectangle (full canvas)
    shadowCtx.fillStyle = '#000000';
    shadowCtx.fillRect(0, 0, width, height);

    // Cut out inner rectangle with shadow gradient
    shadowCtx.globalCompositeOperation = 'destination-out';

    // Inner shape (smaller than mask by shadowWidth)
    shadowCtx.save();
    shadowCtx.shadowColor = 'rgba(0, 0, 0, 1)';
    shadowCtx.shadowBlur = shadowWidth * 2;
    shadowCtx.shadowOffsetX = 0;
    shadowCtx.shadowOffsetY = 0;

    shadowCtx.beginPath();
    const innerRadius = Math.max(0, radius - shadowWidth);
    const ix = x + shadowWidth;
    const iy = y + shadowWidth;
    const iw = w - shadowWidth * 2;
    const ih = h - shadowWidth * 2;

    shadowCtx.moveTo(ix + innerRadius, iy);
    shadowCtx.lineTo(ix + iw - innerRadius, iy);
    shadowCtx.arcTo(ix + iw, iy, ix + iw, iy + innerRadius, innerRadius);
    shadowCtx.lineTo(ix + iw, iy + ih - innerRadius);
    shadowCtx.arcTo(ix + iw, iy + ih, ix + iw - innerRadius, iy + ih, innerRadius);
    shadowCtx.lineTo(ix + innerRadius, iy + ih);
    shadowCtx.arcTo(ix, iy + ih, ix, iy + ih - innerRadius, innerRadius);
    shadowCtx.lineTo(ix, iy + innerRadius);
    shadowCtx.arcTo(ix, iy, ix + innerRadius, iy, innerRadius);
    shadowCtx.closePath();
    shadowCtx.fill();

    shadowCtx.restore();
    shadowCtx.globalCompositeOperation = 'source-over';

    // Apply opacity
    shadowCtx.globalAlpha = opacity;
  }

  // Build edge highlights (directional glow)
  function buildEdgeHighlight() {
    if (!options.edgeHighlight.enabled) return;

    const { radius, padding } = options;
    const { width: highlightWidth, opacity } = options.edgeHighlight;
    const x = padding;
    const y = padding;
    const w = width - padding * 2;
    const h = height - padding * 2;

    highlightCtx.clearRect(0, 0, width, height);

    // Top-left highlight (light from top-left)
    highlightCtx.save();
    highlightCtx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
    highlightCtx.lineWidth = highlightWidth;
    highlightCtx.lineCap = 'round';
    highlightCtx.lineJoin = 'round';

    // Draw partial rounded rect (top and left edges only)
    highlightCtx.beginPath();
    highlightCtx.moveTo(x + radius, y);
    highlightCtx.lineTo(x + w * 0.6, y); // Top edge (60% width)
    highlightCtx.stroke();

    highlightCtx.beginPath();
    highlightCtx.moveTo(x, y + radius);
    highlightCtx.lineTo(x, y + h * 0.6); // Left edge (60% height)
    highlightCtx.stroke();

    // Top-left corner arc
    highlightCtx.beginPath();
    highlightCtx.arc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5);
    highlightCtx.stroke();

    highlightCtx.restore();
  }

  // Build all effects
  function rebuild() {
    buildMask();
    buildInnerShadow();
    buildEdgeHighlight();
  }

  // Initial build
  rebuild();

  return {
    /**
     * Apply glass mask and effects to canvas
     */
    apply(ctx: CanvasRenderingContext2D) {
      // Apply mask
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(maskCanvas, 0, 0);
      ctx.globalCompositeOperation = 'source-over';

      // Apply inner shadow
      if (options.innerShadow.enabled) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(shadowCanvas, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
      }

      // Apply edge highlight
      if (options.edgeHighlight.enabled) {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = options.edgeHighlight.opacity;
        ctx.drawImage(highlightCanvas, 0, 0);
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
      }
    },

    /**
     * Resize mask
     */
    resize(newWidth: number, newHeight: number) {
      if (newWidth === width && newHeight === height) return;

      width = newWidth;
      height = newHeight;

      maskCanvas.width = width;
      maskCanvas.height = height;
      shadowCanvas.width = width;
      shadowCanvas.height = height;
      highlightCanvas.width = width;
      highlightCanvas.height = height;

      rebuild();
    },

    /**
     * Update options
     */
    setOptions(partial: Partial<GlassMaskOptions>) {
      Object.assign(options, partial);
      rebuild();
    },

    /**
     * Get mask canvas (for debugging)
     */
    getMaskCanvas: () => maskCanvas,
    getShadowCanvas: () => shadowCanvas,
    getHighlightCanvas: () => highlightCanvas,
  };
}

export type GlassMask = ReturnType<typeof createGlassMask>;
