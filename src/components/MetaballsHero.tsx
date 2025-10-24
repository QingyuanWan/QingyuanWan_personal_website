import { useEffect, useRef, useState } from 'react';
import { MetaballsEngine } from '../metaballs/engine';

interface MetaballsHeroProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  onFallback?: () => void;
  onFirstDraw?: () => void;
}

/**
 * MetaballsHero - Canvas2D metaballs with offscreen-buffer pipeline
 *
 * Pipeline:
 * 1. Stamp circles to offscreen buffer
 * 2. Blur for smooth blending
 * 3. Threshold to binary mask
 * 4. Colorize with brand gradient
 * 5. Upscale to display canvas
 */
export function MetaballsHero({
  children,
  style,
  className,
  onFallback,
  onFirstDraw,
}: MetaballsHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<MetaballsEngine | null>(null);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    console.log('[MetaballsHero] Mounting');

    if (!containerRef.current || !canvasRef.current) {
      console.warn('[MetaballsHero] No container/canvas ref');
      return;
    }

    const canvas = canvasRef.current;
    const container = containerRef.current;

    // Size canvas
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.0);

      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      if (engineRef.current) {
        engineRef.current.resize(canvas.width, canvas.height);
      }
    };

    resizeCanvas();

    // Check if preloader already ran (StrictMode second mount)
    const preloaderAlreadyRan = (window as any).__metaballsEngine !== undefined;

    // Create engine
    try {
      const engine = new MetaballsEngine(canvas);
      engineRef.current = engine;

      console.log('[MetaballsHero] Engine created, exposing to window');

      // Expose engine for PreloaderManager
      (window as any).__metaballsEngine = {
        allocate: () => engine.allocate(),
        warmup: (steps: number, onHeartbeat?: any) => {
          // Set heartbeat callback on engine
          (engine as any).onHeartbeat = onHeartbeat;
          return engine.warmup(steps);
        },
        start: (onFirstDrawCb?: any, onHeartbeatCb?: any) => engine.start(onFirstDrawCb || onFirstDraw, onHeartbeatCb),
        stop: () => engine.stop(),
        getEngine: () => engine,
      };

      console.log('[MetaballsHero] Engine ready for preloader');

      // If preloader already ran (second mount), start engine immediately
      if (preloaderAlreadyRan) {
        console.log('[MetaballsHero] Preloader already ran - starting engine immediately');
        (async () => {
          await engine.allocate();
          await engine.warmup(60);
          engine.start(onFirstDraw);
        })();
      }
    } catch (error) {
      console.error('[MetaballsHero] Failed to create engine:', error);
      handleFallback('Engine creation failed');
      return;
    }

    // Handle resize
    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      console.log('[MetaballsHero] Unmounting');
      window.removeEventListener('resize', handleResize);

      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }

      delete (window as any).__metaballsEngine;
    };

    function handleFallback(reason: string): void {
      console.warn(`[MetaballsHero] Fallback triggered: ${reason}`);
      setHasFailed(true);

      if (onFallback) {
        onFallback();
      }
    }
  }, [onFallback, onFirstDraw]);

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
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}
