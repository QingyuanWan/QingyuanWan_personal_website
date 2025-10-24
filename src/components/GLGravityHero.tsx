import { useEffect, useRef, useState } from 'react';
import { bootGL, destroyGL, type GLContext } from '../gl/bootGL';
import { SimpleFluidRenderer } from '../gl/SimpleFluidRenderer';

interface GLGravityHeroProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  onFallback?: () => void; // Called if WebGL fails
  onFirstDraw?: () => void; // Called after first successful frame
}

/**
 * GLGravityHero - WebGL-based gravity fluid simulation
 *
 * Features:
 * - WebGL2/WebGL1 with capability detection
 * - Context loss/restore handling
 * - Quality ladder (auto-downgrade if slow)
 * - Automatic fallback to Dot on failure
 */
export function GLGravityHero({
  children,
  style,
  className,
  onFallback,
  onFirstDraw,
}: GLGravityHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glContextRef = useRef<GLContext | null>(null);
  const rendererRef = useRef<SimpleFluidRenderer | null>(null);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    console.log('[GLGravityHero] Mounting');

    if (!containerRef.current || !canvasRef.current) {
      console.warn('[GLGravityHero] No container/canvas ref');
      return;
    }

    const canvas = canvasRef.current;
    const container = containerRef.current;

    // Size canvas to container
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.0);

      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      console.log(`[GLGravityHero] Canvas sized: ${canvas.width}x${canvas.height}`);
    };

    resizeCanvas();

    // Boot WebGL
    const glContext = bootGL(canvas, {
      onContextLost: () => {
        console.warn('[GLGravityHero] Context lost - stopping renderer');
        if (rendererRef.current) {
          rendererRef.current.stop();
        }
      },
      onContextRestored: () => {
        console.log('[GLGravityHero] Context restored - attempting restart');
        handleFallback('Context lost and not recovered');
      },
    });

    if (!glContext) {
      console.error('[GLGravityHero] WebGL not supported');
      handleFallback('WebGL not supported');
      return;
    }

    glContextRef.current = glContext;

    // Create simple renderer
    const renderer = new SimpleFluidRenderer(glContext);

    rendererRef.current = renderer;

    console.log('[GLGravityHero] Renderer created, exposing to window');

    // Expose renderer immediately (before allocation)
    (window as any).__glGravityRenderer = {
      allocate: () => renderer.allocate(),
      warmup: (steps: number) => renderer.warmup(steps),
      start: () => renderer.start(onFirstDraw),
      stop: () => renderer.stop(),
      getRenderer: () => renderer,
    };

    console.log('[GLGravityHero] Renderer ready for preloader');

    // Handle resize
    const handleResize = () => {
      resizeCanvas();
      // TODO: Resize textures if needed
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      console.log('[GLGravityHero] Unmounting');
      window.removeEventListener('resize', handleResize);

      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }

      if (glContextRef.current) {
        destroyGL(glContextRef.current);
        glContextRef.current = null;
      }
    };

    function handleFallback(reason: string): void {
      console.warn(`[GLGravityHero] Fallback triggered: ${reason}`);
      setHasFailed(true);

      if (onFallback) {
        onFallback();
      }
    }
  }, [onFallback]);

  if (hasFailed) {
    return (
      <div
        className={className}
        style={{
          position: 'relative',
          overflow: 'hidden',
          ...style,
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
