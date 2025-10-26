import { useEffect, useRef } from 'react';
import { useReducedMotion } from './useReducedMotion';
import { getGlobalCursor } from '../cursor/globalCursor';

interface DotCanvasOptions {
  dotColor?: string;
  backgroundColor?: string;
  dotSpacing?: number; // px between dots
  dotSize?: number; // base dot radius
  breathingEnabled?: boolean;
  breathingDuration?: number; // ms
  breathingRange?: [number, number]; // [min, max] scale
  cursorInteraction?: boolean; // Enable cursor proximity scaling
  haloRadius?: number; // Cursor influence radius
  haloMaxScale?: number; // Max scale multiplier for dots near cursor
}

/**
 * Non-interactive dot grid canvas with subtle breathing animation
 * Optimized for 2-4k dots on desktop, 1-2k on mobile
 * Target: 55-60fps
 */
export function useDotCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  options: DotCanvasOptions = {}
) {
  const {
    dotColor = '#FFFFFF',
    backgroundColor = '#0B0B0B',
    dotSpacing = 20, // 16-24px as spec
    dotSize = 1.5,
    breathingEnabled = true,
    breathingDuration = 5000, // 4-6s as spec
    breathingRange = [0.9, 1.05],
    cursorInteraction = false,
    haloRadius = 110,
    haloMaxScale = 1.8,
  } = options;

  const reducedMotion = useReducedMotion();
  const rafIdRef = useRef<number>(0);
  const dotsRef = useRef<{ x: number; y: number }[]>([]);
  const startTimeRef = useRef<number>(0);
  const mouseRef = useRef<{ x: number; y: number }>({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', {
      alpha: false, // Opaque background, better perf
      desynchronized: true, // Allow async rendering
    });
    if (!ctx) {
      console.error('[useDotCanvas] Failed to get 2D context');
      return;
    }

    console.log('[useDotCanvas] Initializing dot grid...');

    // Setup canvas size and DPR
    const setupCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 as spec

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      // Pre-compute dot positions
      const cols = Math.floor(rect.width / dotSpacing);
      const rows = Math.floor(rect.height / dotSpacing);
      const offsetX = (rect.width - (cols - 1) * dotSpacing) / 2;
      const offsetY = (rect.height - (rows - 1) * dotSpacing) / 2;

      dotsRef.current = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          dotsRef.current.push({
            x: offsetX + col * dotSpacing,
            y: offsetY + row * dotSpacing,
          });
        }
      }

      console.log(`[useDotCanvas] Grid: ${cols}x${rows} = ${dotsRef.current.length} dots`);
      console.log(`[useDotCanvas] Canvas: ${rect.width}x${rect.height}, DPR: ${dpr}`);
    };

    setupCanvas();

    // Render loop
    const render = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;

      const elapsed = timestamp - startTimeRef.current;

      // Update cursor position from global cursor if interaction enabled
      if (cursorInteraction && updateCursorPosition) {
        updateCursorPosition();
      }

      // Breathing animation (skip if reduced motion)
      let scale = 1;
      if (breathingEnabled && !reducedMotion) {
        const progress = (elapsed % breathingDuration) / breathingDuration;
        const eased = Math.sin(progress * Math.PI * 2) * 0.5 + 0.5; // Smooth sine wave
        scale = breathingRange[0] + (breathingRange[1] - breathingRange[0]) * eased;
      }

      // Clear with background color
      const rect = canvas.getBoundingClientRect();
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Draw dots with soft glow and cursor interaction
      ctx.fillStyle = dotColor;
      ctx.shadowColor = dotColor;
      ctx.shadowBlur = 2; // Soft glow as spec

      for (const dot of dotsRef.current) {
        let finalDotSize = dotSize * scale;

        // Apply cursor proximity scaling if enabled
        if (cursorInteraction && !reducedMotion) {
          const dx = dot.x - mouseRef.current.x;
          const dy = dot.y - mouseRef.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < haloRadius) {
            const proximity = 1 - distance / haloRadius;
            const cursorScale = 1 + (haloMaxScale - 1) * proximity;
            finalDotSize *= cursorScale;
          }
        }

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, finalDotSize, 0, Math.PI * 2);
        ctx.fill();
      }

      rafIdRef.current = requestAnimationFrame(render);
    };

    // Use global purple cursor position instead of mouse
    let updateCursorPosition: (() => void) | null = null;
    if (cursorInteraction) {
      const cursor = getGlobalCursor();
      updateCursorPosition = () => {
        const cursorState = cursor.getState();
        const rect = canvas.getBoundingClientRect();
        mouseRef.current = {
          x: cursorState.clientX - rect.left,
          y: cursorState.clientY - rect.top,
        };
      };
    }

    // Start render loop
    rafIdRef.current = requestAnimationFrame(render);

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      setupCanvas();
    });
    resizeObserver.observe(canvas);

    console.log('[useDotCanvas] ✓ Render loop started', { cursorInteraction });

    // Cleanup
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = 0;
      }
      resizeObserver.disconnect();
      console.log('[useDotCanvas] Cleanup complete');
    };
  }, [
    canvasRef,
    dotColor,
    backgroundColor,
    dotSpacing,
    dotSize,
    breathingEnabled,
    breathingDuration,
    reducedMotion,
    breathingRange,
    cursorInteraction,
    haloRadius,
    haloMaxScale,
  ]);
}
