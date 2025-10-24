import { useEffect, useRef } from 'react';
import { getGlobalCursor } from '../cursor/globalCursor';
import { createDotPanel } from '../utils/dotPanel.js';

interface DotPanelProps {
  // Theming
  backgroundColor?: string;
  dotColor?: string;
  cursorColor?: string;

  // Dot grid
  dotSpacing?: number;
  dotBaseSize?: number;

  // Halo effect
  haloRadius?: number;
  haloMaxScale?: number;
  haloAlphaBoost?: number;

  // Cursor
  cursorSize?: number;

  // Magnetic headings
  magnetSelector?: string;
  magnetRadius?: number;
  magnetStrength?: number;
  magnetSmoothing?: number;

  // Performance
  reducedMotion?: boolean;

  // Children to render inside the panel
  children?: React.ReactNode;

  // Additional styles for the container
  style?: React.CSSProperties;
  className?: string;
}

/**
 * DotPanel - React wrapper for the framework-agnostic dot field component
 *
 * Usage:
 * <DotPanel magnetSelector="h2">
 *   <h2>Magnetic Heading</h2>
 *   <p>Content here</p>
 * </DotPanel>
 */
export function DotPanel({
  backgroundColor,
  dotColor,
  cursorColor,
  dotSpacing,
  dotBaseSize,
  haloRadius,
  haloMaxScale,
  haloAlphaBoost,
  cursorSize,
  magnetSelector,
  magnetRadius,
  magnetStrength,
  magnetSmoothing,
  reducedMotion,
  children,
  style,
  className,
}: DotPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<{ destroy: () => void; updateMagnetElements: (els: Element[]) => void }>();

  useEffect(() => {
    console.log('[DotPanel] useEffect triggered');

    if (!containerRef.current) {
      console.warn('[DotPanel] No container ref');
      return;
    }

    // Get global cursor and attach section
    const cursor = getGlobalCursor();
    console.log('[DotPanel] Got global cursor:', cursor);
    console.log('[DotPanel] Container element:', containerRef.current);

    const detachCursor = cursor.attach({
      id: 'dot-panel',
      element: containerRef.current,
      variant: {
        size: 12,
        color: cursorColor || '#A855F7',
        glow: false,
      },
    });

    console.log('[DotPanel] Attached to global cursor with ID: dot-panel');

    console.log('[DotPanel] Creating panel with options:', {
      backgroundColor,
      dotColor,
      cursorColor,
      magnetSelector,
    });

    // Build options object (only include defined values)
    const options: any = {};

    if (backgroundColor !== undefined) options.backgroundColor = backgroundColor;
    if (dotColor !== undefined) options.dotColor = dotColor;
    if (cursorColor !== undefined) options.cursorColor = cursorColor;
    if (dotSpacing !== undefined) options.dotSpacing = dotSpacing;
    if (dotBaseSize !== undefined) options.dotBaseSize = dotBaseSize;
    if (haloRadius !== undefined) options.haloRadius = haloRadius;
    if (haloMaxScale !== undefined) options.haloMaxScale = haloMaxScale;
    if (haloAlphaBoost !== undefined) options.haloAlphaBoost = haloAlphaBoost;
    if (cursorSize !== undefined) options.cursorSize = cursorSize;
    if (magnetRadius !== undefined) options.magnetRadius = magnetRadius;
    if (magnetStrength !== undefined) options.magnetStrength = magnetStrength;
    if (magnetSmoothing !== undefined) options.magnetSmoothing = magnetSmoothing;
    if (reducedMotion !== undefined) options.reducedMotion = reducedMotion;

    if (magnetSelector) {
      options.magnetElements = magnetSelector;
    }

    // Set magnet elements - wait a tick for children to render
    const timeoutId = setTimeout(() => {
      if (!containerRef.current) {
        console.warn('[DotPanel] Container ref lost before init');
        return;
      }

      console.log('[DotPanel] Initializing panel (LOCAL MODE)');
      try {
        panelRef.current = createDotPanel(containerRef.current, options);
        console.log('[DotPanel] Panel created successfully');
      } catch (error) {
        console.error('[DotPanel] Error creating panel:', error);
      }
    }, 100);

    // Cleanup
    return () => {
      console.log('[DotPanel] Cleanup triggered');
      clearTimeout(timeoutId);
      if (panelRef.current) {
        console.log('[DotPanel] Destroying panel');
        panelRef.current.destroy();
        panelRef.current = undefined;
      }
      detachCursor();
    };
  }, []); // Empty deps - only run once on mount

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
