import { useLayoutEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger } from '../utils/gsap';
import { useReducedMotion } from '../hooks/useReducedMotion';

export function PortraitParallax() {
  const containerRef = useRef<HTMLDivElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    if (!containerRef.current || !portraitRef.current) return;

    const ctx = gsap.context(() => {
      // Entrance animation
      gsap.from(containerRef.current, {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 80%',
        },
      });

      if (!reducedMotion) {
        // Parallax layers
        gsap.to('.blob-1', {
          y: -40,
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        });

        gsap.to('.blob-2', {
          y: 40,
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        });

        gsap.to('.portrait-image', {
          y: -20,
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion || !portraitRef.current) return;

    const rect = portraitRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) / (rect.width / 2);
    const deltaY = (e.clientY - centerY) / (rect.height / 2);

    // Max ±3 degrees
    setTilt({
      x: deltaY * 3,
      y: deltaX * -3,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <section
      id="portrait"
      className="section"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '600px',
          padding: '0 24px',
        }}
      >
        <div
          ref={portraitRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '3/4',
            perspective: '1000px',
          }}
        >
          {/* Background blobs */}
          <div
            className="blob-1"
            style={{
              position: 'absolute',
              top: '10%',
              left: '10%',
              width: '200px',
              height: '200px',
              background: 'var(--blue)',
              filter: 'blur(80px)',
              opacity: 0.2,
              borderRadius: '50%',
              pointerEvents: 'none',
            }}
          />
          <div
            className="blob-2"
            style={{
              position: 'absolute',
              bottom: '10%',
              right: '10%',
              width: '250px',
              height: '250px',
              background: 'var(--orange)',
              filter: 'blur(80px)',
              opacity: 0.2,
              borderRadius: '50%',
              pointerEvents: 'none',
            }}
          />

          {/* Portrait container with tilt */}
          <div
            className="portrait-image"
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              background: 'var(--panel)',
              borderRadius: 'var(--radius-tile)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: 'transform 0.15s ease-out',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                fontSize: 'clamp(32px, 6vw, 64px)',
                fontWeight: 700,
                color: 'var(--blue)',
                textAlign: 'center',
                padding: '40px',
              }}
            >
              REAL<br />HUMAN
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
