import { useEffect, useRef } from 'react';
import { getGlobalCursor } from '../cursor/globalCursor';

interface FluidHeroIframeProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  onFirstDraw?: () => void;
}

/**
 * FluidHeroIframe - Uses the vendor WebGL-Fluid-Simulation demo via iframe
 *
 * This approach:
 * - Uses the exact PavelDoGreat demo (proven to work)
 * - No integration risk with custom shaders
 * - Full-screen fluid effect behind React content
 */
export function FluidHeroIframe({
  children,
  style,
  className = 'hero-section',
  onFirstDraw,
}: FluidHeroIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('[FluidHeroIframe] Mounting vendor demo via iframe');

    // Signal first draw after iframe loads
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      console.log('[FluidHeroIframe] ✓ Vendor demo loaded');

      // Wait a frame for the demo to start rendering
      requestAnimationFrame(() => {
        if (onFirstDraw) {
          onFirstDraw();
        }
      });
    };

    iframe.addEventListener('load', handleLoad);

    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
  }, [onFirstDraw]);

  // Forward global cursor position to iframe for fluid interaction
  useEffect(() => {
    const host = containerRef.current;
    const iframe = iframeRef.current;
    if (!host || !iframe) return;

    const cursor = getGlobalCursor();
    let rafId = 0;
    let isPointerDown = false;
    let lastSentX = -1;
    let lastSentY = -1;
    let messageCount = 0;
    let lastLogTime = 0;

    const sendToIframe = () => {
      if (!iframe.contentWindow) {
        rafId = requestAnimationFrame(sendToIframe);
        return;
      }

      const cursorState = cursor.getState();
      const rect = host.getBoundingClientRect();

      // Convert cursor position to hero-relative coordinates
      const x = cursorState.clientX - rect.left;
      const y = cursorState.clientY - rect.top;

      // Check if cursor is inside hero bounds
      const inside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;

      // Only send if position changed or pointer state changed
      const posChanged = Math.abs(x - lastSentX) > 0.5 || Math.abs(y - lastSentY) > 0.5;

      if (inside && posChanged) {
        messageCount++;

        iframe.contentWindow.postMessage(
          {
            __fluid: true,
            type: 'move' as const,
            x,
            y,
            inside,
            ts: performance.now(),
          },
          window.location.origin
        );

        // Log every 60 messages (once per second at 60fps)
        const now = performance.now();
        if (messageCount === 1 || now - lastLogTime > 1000) {
          console.log('[FluidHeroIframe] Sent message:', { type: 'move', x: Math.round(x), y: Math.round(y), inside, count: messageCount });
          lastLogTime = now;
        }

        lastSentX = x;
        lastSentY = y;
      } else if (!inside && lastSentX !== -1) {
        // Send one last message when leaving to clear state
        iframe.contentWindow.postMessage(
          {
            __fluid: true,
            type: 'move' as const,
            x,
            y,
            inside: false,
            ts: performance.now(),
          },
          window.location.origin
        );
        lastSentX = -1;
        lastSentY = -1;
      }

      rafId = requestAnimationFrame(sendToIframe);
    };

    // DON'T forward real clicks - we handle auto button via move events
    // Real clicks would interfere with our virtual button state
    const onDown = (e: PointerEvent) => {
      // Ignore - auto mode handles this via enter/exit
    };

    const onUp = (e: PointerEvent) => {
      // Ignore - auto mode handles this via enter/exit
    };

    // Start RAF loop
    rafId = requestAnimationFrame(sendToIframe);

    // Listen for pointer down/up
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);

    console.log('[FluidHeroIframe] ✓ Global cursor forwarding enabled');

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

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
      <div className="hero-inner">
        {/* Vendor WebGL-Fluid-Simulation demo (hero version without UI) */}
        <iframe
          ref={iframeRef}
          src="/QingyuanWan_personal_website/fluid-demo/index-hero.html"
          title="WebGL Fluid Simulation"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            border: '0',
            zIndex: 1,
            pointerEvents: 'none', // Events forwarded via postMessage
          }}
          loading="eager"
        />

        {/* Hero content overlays on top */}
        <div className="hero-content">
          {children}
        </div>
      </div>
    </div>
  );
}
