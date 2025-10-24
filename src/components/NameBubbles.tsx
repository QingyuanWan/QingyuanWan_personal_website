import { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { getGlobalCursor } from '../cursor/globalCursor';
import { gsap, ScrollTrigger } from '../utils/gsap';
import { skills } from '../content/data';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface Bubble {
  id: number;
  skill: string;
  x: number;
  y: number;
  element?: HTMLDivElement;
}

const MIN_BUBBLES = 8;
const MAX_BUBBLES = 12;
const EXCLUSION_ZONE = 40; // px margin around name
const RING_MIN = 120;
const RING_MAX = 280;

export function NameBubbles() {
  const containerRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const nextIdRef = useRef(0);
  const reducedMotion = useReducedMotion();

  // Attach to global cursor for variant switching
  useEffect(() => {
    if (!containerRef.current) return;

    const cursor = getGlobalCursor();
    const detach = cursor.attach({
      id: 'name-bubbles',
      element: containerRef.current,
      variant: {
        size: 14,
        color: '#A855F7',
        glow: false,
      },
    });

    return () => detach();
  }, []);

  // Initialize bubbles
  useLayoutEffect(() => {
    const count = MIN_BUBBLES + Math.floor(Math.random() * (MAX_BUBBLES - MIN_BUBBLES + 1));
    const initialBubbles: Bubble[] = [];

    for (let i = 0; i < count; i++) {
      initialBubbles.push({
        id: nextIdRef.current++,
        skill: skills[Math.floor(Math.random() * skills.length)],
        x: 0,
        y: 0,
      });
    }

    setBubbles(initialBubbles);
  }, []);

  // Pin section and animate bubbles
  useLayoutEffect(() => {
    if (!containerRef.current || bubbles.length === 0) return;

    const ctx = gsap.context(() => {
      // Pin the section
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: 'top top',
        end: '+=80vh',
        pin: true,
        pinSpacing: true,
      });

      // Animate each bubble
      bubbles.forEach((bubble) => {
        if (!bubble.element) return;

        const angle = Math.random() * Math.PI * 2;
        const radius = RING_MIN + Math.random() * (RING_MAX - RING_MIN);
        const targetX = Math.cos(angle) * radius;
        const targetY = Math.sin(angle) * radius;

        // Spawn from center
        gsap.fromTo(
          bubble.element,
          { x: 0, y: 0, scale: 0, opacity: 0 },
          {
            x: targetX,
            y: targetY,
            scale: 1,
            opacity: 1,
            duration: 0.8,
            ease: 'back.out(1.2)',
            delay: Math.random() * 0.3,
          }
        );

        // Gentle float
        if (!reducedMotion) {
          gsap.to(bubble.element, {
            y: `+=${Math.random() * 12 - 6}`,
            duration: 2 + Math.random() * 2,
            yoyo: true,
            repeat: -1,
            ease: 'sine.inOut',
          });
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, [bubbles, reducedMotion]);

  const handleBubbleClick = (bubbleId: number) => {
    const bubble = bubbles.find((b) => b.id === bubbleId);
    if (!bubble || !bubble.element) return;

    // Pop animation
    gsap.to(bubble.element, {
      scale: 0,
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        // Respawn with new skill
        setBubbles((prev) =>
          prev.map((b) =>
            b.id === bubbleId
              ? {
                  ...b,
                  skill: skills[Math.floor(Math.random() * skills.length)],
                  x: 0,
                  y: 0,
                }
              : b
          )
        );

        // Re-animate from center
        if (bubble.element) {
          const angle = Math.random() * Math.PI * 2;
          const radius = RING_MIN + Math.random() * (RING_MAX - RING_MIN);
          const targetX = Math.cos(angle) * radius;
          const targetY = Math.sin(angle) * radius;

          gsap.fromTo(
            bubble.element,
            { x: 0, y: 0, scale: 0, opacity: 0 },
            {
              x: targetX,
              y: targetY,
              scale: 1,
              opacity: 1,
              duration: 0.8,
              ease: 'back.out(1.2)',
            }
          );

          if (!reducedMotion) {
            gsap.to(bubble.element, {
              y: `+=${Math.random() * 12 - 6}`,
              duration: 2 + Math.random() * 2,
              yoyo: true,
              repeat: -1,
              ease: 'sine.inOut',
            });
          }
        }
      },
    });
  };

  const assignBubbleRef = (id: number) => (el: HTMLDivElement | null) => {
    if (el) {
      setBubbles((prev) =>
        prev.map((b) => (b.id === id ? { ...b, element: el } : b))
      );
    }
  };

  return (
    <section
      ref={containerRef}
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
        style={{
          position: 'relative',
          width: '100%',
          height: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Name */}
        <div
          ref={nameRef}
          style={{
            position: 'relative',
            zIndex: 10,
            fontSize: 'clamp(32px, 6vw, 64px)',
            fontWeight: 700,
            color: 'var(--text)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          Qingyuan Wan
        </div>

        {/* Bubbles */}
        {bubbles.map((bubble) => (
          <div
            key={bubble.id}
            ref={assignBubbleRef(bubble.id)}
            className="bubble"
            onClick={() => handleBubbleClick(bubble.id)}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {bubble.skill}
          </div>
        ))}
      </div>
    </section>
  );
}
