import { useEffect, useRef } from 'react';
import type { PointerState } from '../sim/pointer';

interface SharedCursorProps {
  pointer: PointerState;
  size?: number;        // Cursor size in pixels
  color?: string;       // Cursor color
  glow?: boolean;       // Add glow effect
  className?: string;
}

/**
 * SharedCursor - Visual cursor dot
 *
 * Renders a custom cursor that follows the shared pointer state.
 * Size and style change based on context (larger in hero, smaller in dot panel).
 */
export function SharedCursor({
  pointer,
  size = 12,
  color = '#A855F7',
  glow = false,
  className,
}: SharedCursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    let rafId: number;

    function updatePosition() {
      if (!cursor) return;

      // Update cursor position
      cursor.style.left = `${pointer.x}px`;
      cursor.style.top = `${pointer.y}px`;

      // Update visibility
      cursor.style.opacity = pointer.inside ? '1' : '0';

      rafId = requestAnimationFrame(updatePosition);
    }

    rafId = requestAnimationFrame(updatePosition);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [pointer]);

  return (
    <div
      ref={cursorRef}
      className={className}
      style={{
        position: 'fixed',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: color,
        pointerEvents: 'none',
        zIndex: 10000,
        transform: 'translate(-50%, -50%)',
        opacity: 0,
        transition: 'opacity 0.2s, width 0.3s, height 0.3s',
        boxShadow: glow ? `0 0 ${size * 2}px ${color}, 0 0 ${size}px ${color}` : 'none',
      }}
    />
  );
}
