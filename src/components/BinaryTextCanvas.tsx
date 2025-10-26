import { useRef, useEffect } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface BinaryTextCanvasProps {
  word: string;
  cellSizeDesktop?: number;
  cellSizeTablet?: number;
  cellSizeMobile?: number;
  seed?: number;
  foregroundColor?: string;
  bgDigitColor?: string;
  background?: string;
  align?: 'left' | 'center' | 'right';
  maskScale?: { desktop: number; tablet: number; mobile: number };
  padding?: { left: string; right: string };
  style?: React.CSSProperties;
}

/**
 * BinaryTextCanvas - High-performance masked binary text with flickering digits
 *
 * Architecture:
 * - maskCanvas (offscreen): Renders word in white on transparent at high-res
 * - bgCanvas (onscreen): Static gray 0/1 grid (deterministic, never updates)
 * - fgCanvas (onscreen): Bright flickering 0/1 only where mask alpha > 0.5
 *
 * Performance:
 * - DPR capped at 2.0
 * - Grid snapped to integer device pixels
 * - Only redraws modified cells (cached glyph bitmaps)
 * - Pauses on reduced motion, page hidden, or off-screen
 */
export function BinaryTextCanvas({
  word,
  cellSizeDesktop = 12,
  cellSizeTablet = 10,
  cellSizeMobile = 9,
  seed = 42,
  foregroundColor = '#FFFFFF',
  bgDigitColor = 'rgba(255, 255, 255, 0.15)',
  background = '#0B0B0B',
  align = 'center',
  maskScale = { desktop: 0.64, tablet: 0.60, mobile: 0.54 },
  padding = { left: '0px', right: '0px' },
  style,
}: BinaryTextCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    const bgCanvas = bgCanvasRef.current;
    const fgCanvas = fgCanvasRef.current;
    if (!container || !bgCanvas || !fgCanvas) return;

    console.log(`[BinaryTextCanvas:${word}] Initializing...`);

    // Seeded random generator
    const seededRandom = (s: number) => {
      const x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };

    // Get responsive cell size
    const getCellSize = () => {
      const width = window.innerWidth;
      if (width < 768) return cellSizeMobile;
      if (width < 1024) return cellSizeTablet;
      return cellSizeDesktop;
    };

    // Get responsive mask scale
    const getMaskScale = () => {
      const width = window.innerWidth;
      if (width < 768) return maskScale.mobile;
      if (width < 1024) return maskScale.tablet;
      return maskScale.desktop;
    };

    // Get responsive align (center on mobile)
    const getAlign = () => {
      const width = window.innerWidth;
      if (width < 640) return 'center';
      return align;
    };

    let isRunning = false;
    let rafId = 0;
    let cols = 0;
    let rows = 0;
    let cellSize = 0;
    let dpr = 1;

    // Cell state for flickering
    interface CellState {
      value: 0 | 1;
      periodMs: number;
      nextFlipAt: number;
    }
    const cellStates: Map<string, CellState> = new Map();

    // Cached glyph bitmaps for "0" and "1"
    let glyphCache: {
      '0': ImageData | null;
      '1': ImageData | null;
    } = { '0': null, '1': null };

    // Mask canvas (offscreen)
    let maskCanvas: HTMLCanvasElement | null = null;
    let maskCtx: CanvasRenderingContext2D | null = null;

    const setup = () => {
      const rect = container.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2.0
      cellSize = getCellSize();

      // Snap to integer device pixels
      const physicalCellSize = Math.round(cellSize * dpr);
      cellSize = physicalCellSize / dpr;

      cols = Math.ceil(rect.width / cellSize);
      rows = Math.ceil(rect.height / cellSize);

      // Setup canvases
      const physicalWidth = cols * physicalCellSize;
      const physicalHeight = rows * physicalCellSize;

      bgCanvas.width = physicalWidth;
      bgCanvas.height = physicalHeight;
      fgCanvas.width = physicalWidth;
      fgCanvas.height = physicalHeight;

      bgCanvas.style.width = `${rect.width}px`;
      bgCanvas.style.height = `${rect.height}px`;
      fgCanvas.style.width = `${rect.width}px`;
      fgCanvas.style.height = `${rect.height}px`;

      const bgCtx = bgCanvas.getContext('2d', { alpha: false });
      const fgCtx = fgCanvas.getContext('2d', { alpha: true });
      if (!bgCtx || !fgCtx) return;

      console.log(`[BinaryTextCanvas:${word}] Grid: ${cols}x${rows}, cellSize: ${cellSize}px, DPR: ${dpr}`);

      // Create mask canvas
      maskCanvas = document.createElement('canvas');
      maskCanvas.width = physicalWidth;
      maskCanvas.height = physicalHeight;
      maskCtx = maskCanvas.getContext('2d', { alpha: true });
      if (!maskCtx) return;

      // Draw word on mask with responsive scaling and alignment
      const currentMaskScale = getMaskScale();
      const currentAlign = getAlign();
      const fontSize = Math.floor(rect.height * currentMaskScale);

      maskCtx.fillStyle = '#FFFFFF';
      maskCtx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
      maskCtx.textAlign = currentAlign;
      maskCtx.textBaseline = 'middle';

      // Calculate x position based on alignment
      let textX;
      if (currentAlign === 'left') {
        textX = 0;
      } else if (currentAlign === 'right') {
        textX = physicalWidth;
      } else {
        textX = physicalWidth / 2;
      }

      // Apply vertical centering with safe area (8-10% inset for ascenders/descenders)
      const verticalInset = rect.height * 0.09;
      const textY = (physicalHeight / 2) + verticalInset * dpr * 0.5;

      maskCtx.fillText(word, textX, textY);

      // Get mask data
      const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

      // Cache glyphs
      const glyphCtx = document.createElement('canvas').getContext('2d')!;
      glyphCtx.canvas.width = physicalCellSize;
      glyphCtx.canvas.height = physicalCellSize;
      glyphCtx.font = `${physicalCellSize}px monospace`;
      glyphCtx.textAlign = 'center';
      glyphCtx.textBaseline = 'middle';
      glyphCtx.fillStyle = foregroundColor;

      glyphCtx.clearRect(0, 0, physicalCellSize, physicalCellSize);
      glyphCtx.fillText('0', physicalCellSize / 2, physicalCellSize / 2);
      glyphCache['0'] = glyphCtx.getImageData(0, 0, physicalCellSize, physicalCellSize);

      glyphCtx.clearRect(0, 0, physicalCellSize, physicalCellSize);
      glyphCtx.fillText('1', physicalCellSize / 2, physicalCellSize / 2);
      glyphCache['1'] = glyphCtx.getImageData(0, 0, physicalCellSize, physicalCellSize);

      // Draw static background grid
      bgCtx.fillStyle = background;
      bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
      bgCtx.fillStyle = bgDigitColor;
      bgCtx.font = `${physicalCellSize}px monospace`;
      bgCtx.textAlign = 'center';
      bgCtx.textBaseline = 'middle';

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const s = seed + row * 1000 + col;
          const digit = seededRandom(s) > 0.5 ? '1' : '0';
          const x = col * physicalCellSize + physicalCellSize / 2;
          const y = row * physicalCellSize + physicalCellSize / 2;
          bgCtx.fillText(digit, x, y);
        }
      }

      // Initialize cell states for masked cells
      cellStates.clear();
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const maskX = Math.floor(col * physicalCellSize + physicalCellSize / 2);
          const maskY = Math.floor(row * physicalCellSize + physicalCellSize / 2);
          const maskIdx = (maskY * maskCanvas.width + maskX) * 4 + 3; // Alpha channel
          const alpha = maskData.data[maskIdx] / 255;

          if (alpha > 0.5) {
            const s = seed + row * 2000 + col * 3;
            const periodMs = 350 + Math.floor(seededRandom(s) * 600); // 350-950ms
            cellStates.set(`${row},${col}`, {
              value: seededRandom(s + 1) > 0.5 ? 1 : 0,
              periodMs,
              nextFlipAt: performance.now() + periodMs,
            });
          }
        }
      }

      console.log(`[BinaryTextCanvas:${word}] ✓ Initialized ${cellStates.size} flickering cells`);
    };

    const start = () => {
      if (isRunning) return;
      isRunning = true;
      console.log(`[BinaryTextCanvas:${word}] Started`);

      const render = (now: number) => {
        if (!isRunning) return;

        const fgCtx = fgCanvas.getContext('2d', { alpha: true });
        if (!fgCtx) return;

        // Update and draw modified cells
        for (const [key, state] of cellStates.entries()) {
          if (now >= state.nextFlipAt) {
            // Flip cell
            state.value = state.value === 0 ? 1 : 0;
            state.nextFlipAt = now + state.periodMs;

            // Draw updated cell
            const [row, col] = key.split(',').map(Number);
            const x = col * Math.round(cellSize * dpr);
            const y = row * Math.round(cellSize * dpr);

            fgCtx.clearRect(x, y, Math.round(cellSize * dpr), Math.round(cellSize * dpr));
            if (glyphCache[state.value]) {
              fgCtx.putImageData(glyphCache[state.value]!, x, y);
            }
          }
        }

        rafId = requestAnimationFrame(render);
      };

      rafId = requestAnimationFrame(render);
    };

    const stop = () => {
      if (!isRunning) return;
      isRunning = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      console.log(`[BinaryTextCanvas:${word}] Stopped`);
    };

    // Initial setup
    setup();

    // Start if not reduced motion
    if (!reducedMotion) {
      start();
    }

    // Visibility observer (pause when off-screen)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !reducedMotion) {
          start();
        } else {
          stop();
        }
      },
      { threshold: 0 }
    );
    observer.observe(container);

    // Page visibility (pause when hidden)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else if (!reducedMotion) {
        start();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      stop();
      setup();
      if (!reducedMotion) {
        start();
      }
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      stop();
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    word,
    cellSizeDesktop,
    cellSizeTablet,
    cellSizeMobile,
    seed,
    foregroundColor,
    bgDigitColor,
    background,
    reducedMotion,
  ]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: background,
        ...style,
      }}
    >
      {/* Background canvas (static gray 0/1 grid) */}
      <canvas
        ref={bgCanvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'block',
        }}
        aria-hidden="true"
      />
      {/* Foreground canvas (flickering bright 0/1 in mask) */}
      <canvas
        ref={fgCanvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'block',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />
    </div>
  );
}
