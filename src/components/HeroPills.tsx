import { useLayoutEffect, useRef, useEffect } from 'react';
import { getGlobalCursor } from '../cursor/globalCursor';
import { gsap } from '../utils/gsap';
import { hero } from '../content/data';
import { useReducedMotion } from '../hooks/useReducedMotion';

const R = 140; // repel radius
const MAX_OFFSET = 24; // max movement in pixels
const STAGGER = 0.08;

export function HeroPills() {
  const containerRef = useRef<HTMLDivElement>(null);
  const tilesRef = useRef<HTMLElement[]>([]);
  const centerMapRef = useRef<Map<HTMLElement, { x: number; y: number }>>(new Map());
  const quickToMapRef = useRef<Map<HTMLElement, { x: any; y: any }>>(new Map());
  const reducedMotion = useReducedMotion();

  // Attach to global cursor for variant switching
  useEffect(() => {
    if (!containerRef.current) return;

    const cursor = getGlobalCursor();
    const detach = cursor.attach({
      id: 'hero-pills',
      element: containerRef.current,
      variant: {
        size: 14,
        color: '#A855F7',
        glow: false,
      },
    });

    return () => detach();
  }, []);

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // Entrance animation - no opacity fade
      gsap.from('.tile', {
        y: 24,
        duration: 0.8,
        stagger: STAGGER,
        ease: 'power2.out',
      });

      // Precompute tile centers
      const updateCenters = () => {
        tilesRef.current.forEach((tile) => {
          const rect = tile.getBoundingClientRect();
          centerMapRef.current.set(tile, {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          });
        });
      };

      updateCenters();
      window.addEventListener('resize', updateCenters);

      // Create quickTo tweens for each tile
      if (!reducedMotion) {
        tilesRef.current.forEach((tile) => {
          quickToMapRef.current.set(tile, {
            x: gsap.quickTo(tile, 'x', { duration: 0.35, ease: 'power3.out' }),
            y: gsap.quickTo(tile, 'y', { duration: 0.35, ease: 'power3.out' }),
          });
        });
      }

      return () => {
        window.removeEventListener('resize', updateCenters);
      };
    }, containerRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (reducedMotion) return;

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    tilesRef.current.forEach((tile) => {
      const center = centerMapRef.current.get(tile);
      if (!center) return;

      const dx = center.x - mouseX;
      const dy = center.y - mouseY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < R) {
        const force = (1 - distance / R) * MAX_OFFSET;
        const angle = Math.atan2(dy, dx);
        const offsetX = Math.cos(angle) * force;
        const offsetY = Math.sin(angle) * force;

        const quickTo = quickToMapRef.current.get(tile);
        if (quickTo) {
          quickTo.x(offsetX);
          quickTo.y(offsetY);
        }

        // Add sliding/slipping effect - perpendicular to repel direction
        const perpAngle = angle + Math.PI / 2;
        const slideAmount = (1 - distance / R) * 8; // Sliding intensity
        const rotationAmount = (1 - distance / R) * 3; // Slight rotation

        gsap.to(tile, {
          rotateZ: Math.sin(perpAngle) * rotationAmount,
          duration: 0.3,
          ease: 'power2.out',
        });
      } else {
        // Reset rotation when far away
        gsap.to(tile, {
          rotateZ: 0,
          duration: 0.5,
          ease: 'power2.out',
        });
      }
    });
  };

  const handleMouseLeave = () => {
    if (reducedMotion) return;

    tilesRef.current.forEach((tile) => {
      gsap.to(tile, {
        x: 0,
        y: 0,
        rotateZ: 0,
        duration: 0.5,
        ease: 'power2.out',
      });
    });
  };

  const handleScrollClick = () => {
    const realHumanSection = document.querySelector('.real-human-section');
    if (realHumanSection) {
      realHumanSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const addTileRef = (el: HTMLElement | null) => {
    if (el && !tilesRef.current.includes(el)) {
      tilesRef.current.push(el);
    }
  };

  // Create tokens from data
  const helloTokens = hero.helloLetters.map((letter, i) => ({
    text: letter,
    type: 'letter' as const,
    color: 'blue' as const,
    shape: (i % 2 === 0 ? 'square' : 'round') as 'square' | 'round',
  }));

  // Lines as separate rows with alternating colors
  const lineTokens = hero.lines.map((line, lineIndex) => {
    const words = line.split(' ');
    return words.map((word, wordIndex) => ({
      text: word,
      type: 'pill' as const,
      color: (wordIndex % 2 === 0 ? 'orange' : 'blue') as 'orange' | 'blue',
    }));
  });

  return (
    <section
      className="section"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '32px',
        padding: '0 24px',
        paddingTop: '5vh',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          width: '100%',
          maxWidth: '1000px',
          pointerEvents: 'auto', // Enable pointer events for pills interaction
        }}
      >
        {/* HELLO - Simple static black text, centered */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: '64px',
            marginBottom: '64px',
          }}
        >
          <h1
            style={{
              fontSize: 'clamp(64px, 12vw, 120px)',
              fontWeight: 700,
              color: '#1A1A1A',
              margin: 0,
              padding: 0,
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            HELLO
          </h1>
        </div>

        {/* Line 1: nice to meet you - right aligned */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            paddingRight: '5%',
            marginTop: '0px',
          }}
        >
          {lineTokens[0]?.map((token, i) => {
            // "nice to you" in blue, "meet" in black
            const isSpecialWord = token.text.toLowerCase() === 'meet';
            return (
              <span
                key={`line1-${i}`}
                ref={addTileRef}
                className={`tile hero-token ${token.type} ${isSpecialWord ? '' : 'blue'}`}
                style={isSpecialWord ? {
                  background: '#1A1A1A',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
                } : {}}
              >
                {token.text}
              </span>
            );
          })}
        </div>

        {/* Line 2: Here is a unique - left aligned */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            justifyContent: 'flex-start',
            paddingLeft: '2%',
            marginTop: '8px',
          }}
        >
          {lineTokens[1]?.map((token, i) => {
            // "Here is a" in blue, "unique" in black
            const isSpecialWord = token.text.toLowerCase() === 'unique';
            return (
              <span
                key={`line2-${i}`}
                ref={addTileRef}
                className={`tile hero-token ${token.type} ${isSpecialWord ? '' : 'blue'}`}
                style={isSpecialWord ? {
                  background: '#1A1A1A',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
                } : {}}
              >
                {token.text}
              </span>
            );
          })}
        </div>

        {/* Line 3: creative and productive - right aligned */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            paddingRight: '2%',
            marginTop: '8px',
          }}
        >
          {lineTokens[2]?.map((token, i) => {
            // "creative" and "productive" in black, "and" in blue
            const isCreative = token.text.toLowerCase() === 'creative';
            const isProductive = token.text.toLowerCase() === 'productive';
            const isSpecialWord = isCreative || isProductive;

            let customStyle = {};
            if (isSpecialWord) {
              customStyle = {
                background: '#1A1A1A',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
              };
            }

            return (
              <span
                key={`line3-${i}`}
                ref={addTileRef}
                className={`tile hero-token ${token.type} ${isSpecialWord ? '' : 'blue'}`}
                style={customStyle}
              >
                {token.text}
              </span>
            );
          })}
        </div>
      </div>

      <div className="scroll-cue" onClick={handleScrollClick} style={{ pointerEvents: 'auto' }}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
        <span>scroll</span>
      </div>
    </section>
  );
}
