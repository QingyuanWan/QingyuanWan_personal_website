import { useEffect, useRef } from 'react';
import { createFluid } from '../sim/fluidSystem';
import type { FluidSystem } from '../sim/fluidSystem';
import { getGravityPreset } from '../sim/presets/fluidHero';
import type { FluidOptions } from '../sim/presets/fluidHero';

interface GravityHeroProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  options?: Partial<FluidOptions>;
}

/**
 * GravityHero - Gravity-only two-layer liquid (no cursor interaction)
 *
 * Creates a calm, lava-lamp-style fluid simulation with:
 * - Heavy base layer (sinks)
 * - Light top layer (rises via buoyancy)
 * - No cursor forces - purely gravity-driven
 * - Rounded glass container with soft shadows
 */
export function GravityHero({
  children,
  style,
  className,
  options: userOptions,
}: GravityHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fluidRef = useRef<FluidSystem>();

  useEffect(() => {
    console.log('[GravityHero] Mounting');

    if (!containerRef.current) {
      console.warn('[GravityHero] No container ref');
      return;
    }

    // Get gravity preset (no cursor interaction)
    const preset = getGravityPreset();

    // Merge with user options
    const options = { ...preset, ...userOptions };

    console.log('[GravityHero] Fluid options:', {
      simWidth: options.simWidth,
      simHeight: options.simHeight,
      buoyancyB: options.buoyancyB,
      cursorForce: options.cursorForce,
    });

    // Create a dummy cursor object (no actual cursor needed)
    const dummyCursor = {
      getState: () => ({
        clientX: 0,
        clientY: 0,
        vx: 0,
        vy: 0,
        speed: 0,
        insideSectionId: null,
      }),
      attach: () => () => {},
      setVariant: () => {},
      onEnter: () => () => {},
      onLeave: () => () => {},
      destroy: () => {},
    };

    // Create fluid system
    console.log('[GravityHero] Creating fluid system');
    const fluid = createFluid(containerRef.current, dummyCursor, options);
    fluidRef.current = fluid;

    // Cleanup
    return () => {
      console.log('[GravityHero] Unmounting');
      if (fluidRef.current) {
        fluidRef.current.destroy();
      }
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
