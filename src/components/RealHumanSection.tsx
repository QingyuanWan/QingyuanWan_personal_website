import { useRef, useEffect, useState } from 'react';
import { useDotCanvas } from '../hooks/useDotCanvas';
import { getGlobalCursor } from '../cursor/globalCursor';
import { gsap } from '../utils/gsap';
import { BinaryTextCanvas } from './BinaryTextCanvas';

/**
 * RealHumanSection - Three-band layout matching concept image
 *
 * Top band: Typography texture + "REAL" (left-aligned)
 * Middle band: Full-width dot canvas + "Qingyuan Wan" (centered)
 * Bottom band: Typography texture + "HUMAN" (right-aligned)
 */
export function RealHumanSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  const middleBandRef = useRef<HTMLDivElement>(null);

  // Initialize dot canvas with breathing animation and cursor interaction
  useDotCanvas(canvasRef, {
    dotColor: '#FFFFFF',
    backgroundColor: '#0B0B0B',
    dotSpacing: 20,
    dotSize: 1.5,
    breathingEnabled: true,
    breathingDuration: 5000,
    breathingRange: [0.9, 1.05],
    cursorInteraction: true, // Enable cursor proximity scaling
    haloRadius: 110, // Same as DotGridCanvas
    haloMaxScale: 3.5, // Increased from 1.8 to 3.5 - much bigger near cursor
  });

  useEffect(() => {
    console.log('[RealHumanSection] Component mounted');

    const text = textRef.current;
    const middleBand = middleBandRef.current;
    if (!text || !middleBand) return;

    const cursor = getGlobalCursor();
    let rafId = 0;

    const updateTextPosition = () => {
      const cursorState = cursor.getState();
      const bandRect = middleBand.getBoundingClientRect();

      // Check if cursor is inside the middle band (dot canvas area)
      const insideBand =
        cursorState.clientX >= bandRect.left &&
        cursorState.clientX <= bandRect.right &&
        cursorState.clientY >= bandRect.top &&
        cursorState.clientY <= bandRect.bottom;

      if (insideBand) {
        // Calculate horizontal offset based on cursor position
        const bandCenterX = bandRect.left + bandRect.width / 2;
        const cursorOffsetFromCenter = cursorState.clientX - bandCenterX;

        // Strong attraction - text moves aggressively (80% of cursor offset)
        const targetX = cursorOffsetFromCenter * 0.8;

        // Use GSAP for smooth, aggressive following
        gsap.to(text, {
          x: targetX,
          duration: 0.15, // Very fast response (was 0.3-0.5 typically)
          ease: 'power2.out',
          overwrite: 'auto',
        });
      } else {
        // Reset to center when cursor leaves
        gsap.to(text, {
          x: 0,
          duration: 0.5,
          ease: 'power2.out',
        });
      }

      rafId = requestAnimationFrame(updateTextPosition);
    };

    rafId = requestAnimationFrame(updateTextPosition);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);


  return (
    <section
      className="real-human-section"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#0B0B0B',
      }}
      aria-label="Name page"
    >
      {/* Top band: REAL with flickering binary canvas */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '35vh',
          minHeight: '200px',
          backgroundColor: '#0B0B0B',
          padding: '2vh 0', // Add vertical padding for margin
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '2vh',
            bottom: '2vh',
            left: 0,
            right: 0,
          }}
        >
          <BinaryTextCanvas
            word="REAL"
            seed={42}
            align="left"
            maskScale={{ desktop: 0.64, tablet: 0.60, mobile: 0.54 }}
            padding={{ left: 'clamp(24px, 6vw, 120px)', right: 'clamp(16px, 4vw, 80px)' }}
            cellSizeDesktop={12}
            cellSizeTablet={10}
            cellSizeMobile={9}
            foregroundColor="#FFFFFF"
            bgDigitColor="rgba(255, 255, 255, 0.16)"
            background="#0B0B0B"
          />
        </div>
      </div>

      {/* Middle band: Dot canvas + Qingyuan Wan (full-width strip) */}
      <div
        ref={middleBandRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '30vh',
          minHeight: '250px',
          backgroundColor: '#0B0B0B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2vh 0', // Add vertical padding for margin
          overflow: 'hidden',
        }}
      >
        {/* Dot canvas with margins */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: '2vh',
            bottom: '2vh',
            left: 0,
            right: 0,
            width: '100%',
            height: 'calc(100% - 4vh)',
            display: 'block',
            pointerEvents: 'auto', // Enable mouse interaction
          }}
          aria-hidden="true"
        />

        {/* Qingyuan Wan - centered with horizontal following */}
        <h1
          ref={textRef}
          style={{
            fontSize: 'clamp(32px, 5vw, 72px)',
            fontWeight: 700,
            color: '#FFFFFF',
            margin: 0,
            padding: '0 5vw',
            letterSpacing: '-0.01em',
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
            pointerEvents: 'none', // Text doesn't interfere with cursor interaction
            willChange: 'transform', // Optimize for animation
          }}
        >
          Qingyuan Wan
        </h1>
      </div>

      {/* Bottom band: HUMAN with flickering binary canvas */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '35vh',
          minHeight: '200px',
          backgroundColor: '#0B0B0B',
          padding: '2vh 0', // Add vertical padding for margin
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '2vh',
            bottom: '2vh',
            left: 0,
            right: 0,
          }}
        >
          <BinaryTextCanvas
            word="HUMAN"
            seed={123}
            align="right"
            maskScale={{ desktop: 0.64, tablet: 0.60, mobile: 0.54 }}
            padding={{ left: 'clamp(16px, 4vw, 80px)', right: 'clamp(24px, 6vw, 120px)' }}
            cellSizeDesktop={12}
            cellSizeTablet={10}
            cellSizeMobile={9}
            foregroundColor="#FFFFFF"
            bgDigitColor="rgba(255, 255, 255, 0.16)"
            background="#0B0B0B"
          />
        </div>
      </div>
    </section>
  );
}
