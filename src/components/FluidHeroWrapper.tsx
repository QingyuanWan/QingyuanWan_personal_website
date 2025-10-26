import { useEffect, useRef, useState } from 'react';
import { FluidHero } from '../hero/glFluid/FluidHero';

interface FluidHeroWrapperProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  onFallback?: () => void;
  onFirstDraw?: () => void;
}

/**
 * FluidHeroWrapper - React wrapper for WebGL Fluid simulation
 */
export function FluidHeroWrapper({
  children,
  style,
  className,
  onFallback,
  onFirstDraw,
}: FluidHeroWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<FluidHero | null>(null);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    console.log('[FluidHeroWrapper] Mounting');

    if (!containerRef.current) {
      console.warn('[FluidHeroWrapper] No container ref');
      return;
    }

    const container = containerRef.current;

    // Create hero instance
    try {
      const hero = new FluidHero();
      heroRef.current = hero;

      console.log('[FluidHeroWrapper] Hero created, exposing to window');

      // Expose hero for PreloaderManager
      (window as any).__fluidHero = {
        allocate: async () => {
          await hero.allocate(container);
        },
        warmup: (steps: number, onHeartbeat?: any) => {
          return hero.warmup(steps, onHeartbeat);
        },
        start: () => {
          hero.start();
          // Set up first draw listener
          hero.firstDraw$.then(() => {
            console.log('[FluidHeroWrapper] First draw received');
            if (onFirstDraw) {
              onFirstDraw();
            }
          });
        },
        stop: () => hero.stop(),
        getHero: () => hero,
      };

      console.log('[FluidHeroWrapper] Hero ready for preloader');
    } catch (error) {
      console.error('[FluidHeroWrapper] Failed to create hero:', error);
      handleFallback('Hero creation failed');
      return;
    }

    // Cleanup
    return () => {
      console.log('[FluidHeroWrapper] Unmounting');

      if (heroRef.current) {
        heroRef.current.destroy();
        heroRef.current = null;
      }

      delete (window as any).__fluidHero;
    };

    function handleFallback(reason: string): void {
      console.warn(`[FluidHeroWrapper] Fallback triggered: ${reason}`);
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
      {/* WebGL canvas will be injected here by FluidHero (z-index: 1) */}
      {/* Hero content overlays on top (z-index: 2) */}
      <div style={{ position: 'relative', zIndex: 2 }}>{children}</div>
    </div>
  );
}
