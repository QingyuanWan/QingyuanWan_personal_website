import { useEffect, useRef } from 'react';
import { getGlobalCursor } from '../cursor/globalCursor';
import { createFluid } from '../sim/fluidSystem';
import type { FluidSystem } from '../sim/fluidSystem';
import { getDefaultPreset } from '../sim/presets/fluidHero';
import type { FluidOptions } from '../sim/presets/fluidHero';

interface LiquidHeroProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  options?: Partial<FluidOptions>;
}

/**
 * LiquidHero - Fluid simulation hero background
 *
 * Creates a canvas-based fluid simulation with Navier-Stokes solver.
 * Responds to cursor movement with forces and dye injection.
 */
export function LiquidHero({
  children,
  style,
  className,
  options: userOptions,
}: LiquidHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fluidRef = useRef<FluidSystem>();

  useEffect(() => {
    console.log('[LiquidHero] Mounting');

    if (!containerRef.current) {
      console.warn('[LiquidHero] No container ref');
      return;
    }

    // Get global cursor and attach hero section
    const cursor = getGlobalCursor();
    const detachCursor = cursor.attach({
      id: 'hero',
      element: containerRef.current,
      variant: {
        size: 18,
        color: '#A855F7',
        glow: true,
        glowSize: 36,
      },
    });

    console.log('[LiquidHero] Attached to global cursor');

    // Get preset based on device
    const preset = getDefaultPreset();

    // Merge with user options
    const options = { ...preset, ...userOptions };

    console.log('[LiquidHero] Fluid options:', {
      simWidth: options.simWidth,
      simHeight: options.simHeight,
      iterations: options.iterations,
    });

    // Create fluid immediately
    console.log('[LiquidHero] Creating fluid immediately');
    const fluid = createFluid(containerRef.current, cursor, options);
    fluidRef.current = fluid;

    // Cleanup
    return () => {
      console.log('[LiquidHero] Unmounting');
      if (fluidRef.current) {
        fluidRef.current.destroy();
      }
      detachCursor();
    };
  }, []); // Only run once on mount

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
      {children}
    </div>
  );
}
