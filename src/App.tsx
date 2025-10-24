import { useEffect, useState, useRef } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getGlobalCursor } from './cursor/globalCursor';
import { HeroPills } from './components/HeroPills';
import { PortraitParallax } from './components/PortraitParallax';
import { NameBubbles } from './components/NameBubbles';
import { DotGridCanvas } from './components/DotGridCanvas';
import { DotPanel } from './components/DotPanel';
import { GravityHero } from './components/GravityHero';
import { GLGravityHero } from './components/GLGravityHero';
import { MetaballsHero } from './components/MetaballsHero';
import { PreloaderManager } from './preload/PreloaderManager';
import { applyDefaultHints } from './perf/headHints';
import { autoBelowTheFold } from './perf/visibility';
import { isDebugMode, getVisualModeFromURL, getWarmupSteps, getDebugHUD } from './perf/debugHUD';
import './styles/app.css';

// Visual mode: "metaballs" (default), "dot", "gravityLayers" (Canvas2D), or "glGravity" (WebGL)
type VisualMode = 'metaballs' | 'dot' | 'gravityLayers' | 'glGravity';

// Global flag to prevent double preloader run in StrictMode
let hasInitialized = false;

function App() {
  // Get debug mode and visual mode from URL params
  const debugMode = isDebugMode(); // ?debug=1
  const urlMode = getVisualModeFromURL(); // ?mode=dot|gravity
  const warmupSteps = getWarmupSteps(); // ?warmup=0

  // Visual mode: URL param > default to 'metaballs'
  const [visualMode, setVisualMode] = useState<VisualMode>(urlMode || 'metaballs');
  const [preloaderComplete, setPreloaderComplete] = useState(false);
  const [componentsReady, setComponentsReady] = useState(false);
  const revealTimerRef = useRef<number | null>(null);

  // Initialize app with preloader
  useEffect(() => {
    // StrictMode guard: prevent double preloader initialization
    if (hasInitialized) {
      console.log('[App] Preloader already ran (StrictMode double-invoke) - skipping to reveal');
      setPreloaderComplete(true);
      return;
    }
    hasInitialized = true;
    const init = async () => {
      console.log('[App] Initializing...', { debugMode, visualMode, warmupSteps });

      // Initialize debug HUD if enabled
      let hud: ReturnType<typeof getDebugHUD> | null = null;
      if (debugMode) {
        hud = getDebugHUD();
        hud.mount();
        hud.setPhase('init');
        hud.setVisualMode(visualMode);
      }

      // Apply head hints
      applyDefaultHints(debugMode);

      // Initialize global cursor
      const cursor = getGlobalCursor();
      console.log('[App] Global cursor initialized');

      // Create preloader
      // Reduced warmup for WebGL/metaballs (30-60 steps)
      const defaultWarmup = visualMode === 'glGravity' ? 30 : visualMode === 'metaballs' ? 60 : 60;
      const preloader = new PreloaderManager({
        minShowMs: 700,
        fadeMs: 300,
        warmupSteps: warmupSteps !== null ? warmupSteps : defaultWarmup,
      });

      // Add dot canvas task (always pre-warm)
      preloader.addTask('dot-canvas', {
        allocate: () => {
          if (hud) hud.setPhase('allocate:dot');
          console.log('[App] Allocating dot canvas');
        },
        warmup: (steps) => {
          if (hud) hud.setPhase(`warmup:dot (${steps})`);
          // Dot canvas warm-up happens when component mounts
        },
        start: () => {
          if (hud) hud.setPhase('running:dot');
        },
      });

      // Add gravity fluid task only if needed
      if (visualMode === 'gravityLayers') {
        preloader.addTask('gravity-fluid', {
          allocate: () => {
            if (hud) hud.setPhase('allocate:gravity');
            console.log('[App] Allocating gravity fluid');
          },
          warmup: (steps) => {
            if (hud) hud.setPhase(`warmup:gravity (${steps})`);
            // Gravity warm-up happens when component mounts
          },
          start: () => {
            if (hud) hud.setPhase('running:gravity');
          },
        });
      }

      // Add WebGL gravity task only if needed
      if (visualMode === 'glGravity') {
        preloader.addTask('gl-gravity', {
          allocate: async () => {
            if (hud) hud.setPhase('allocate:gl');
            console.log('[App] Allocating WebGL gravity');

            // Wait for renderer to be available (component must mount first)
            let retries = 0;
            while (!(window as any).__glGravityRenderer && retries < 50) {
              await new Promise(resolve => setTimeout(resolve, 100));
              retries++;
            }

            if (!(window as any).__glGravityRenderer) {
              console.error('[App] GLGravityRenderer not ready after 5s');
              return;
            }

            const renderer = (window as any).__glGravityRenderer;
            if (renderer && renderer.allocate) {
              const success = await renderer.allocate();
              if (!success) {
                console.error('[App] GL allocation failed');
              }
            }
          },
          warmup: async (steps) => {
            if (hud) hud.setPhase(`warmup:gl (${steps})`);
            const renderer = (window as any).__glGravityRenderer;
            if (renderer && renderer.warmup) {
              await renderer.warmup(steps);
            }
          },
          start: () => {
            if (hud) hud.setPhase('running:gl');
            const renderer = (window as any).__glGravityRenderer;
            if (renderer && renderer.start) {
              renderer.start();
            }
          },
        });
      }

      // Add metaballs task only if needed
      if (visualMode === 'metaballs') {
        preloader.addTask('metaballs', {
          allocate: async () => {
            if (hud) hud.setPhase('allocate:metaballs');
            console.log('[App] Allocating metaballs...');

            // Wait for engine to be available
            let retries = 0;
            while (!(window as any).__metaballsEngine && retries < 50) {
              await new Promise(resolve => setTimeout(resolve, 100));
              retries++;
            }

            if (!(window as any).__metaballsEngine) {
              console.error('[App] ❌ Metaballs engine not ready after 5s');
              return;
            }

            console.log('[App] ✓ Metaballs engine found');
            const engine = (window as any).__metaballsEngine;
            if (engine && engine.allocate) {
              console.log('[App] Calling engine.allocate()...');
              const success = await engine.allocate();
              if (!success) {
                console.error('[App] ❌ Metaballs allocation failed');
              } else {
                console.log('[App] ✓ Metaballs allocated');
              }
            }
          },
          warmup: async (steps) => {
            if (hud) hud.setPhase(`warmup:metaballs (${steps})`);
            console.log(`[App] Warming up metaballs (${steps} steps)...`);
            const engine = (window as any).__metaballsEngine;
            if (engine && engine.warmup) {
              // Pass heartbeat callback to track warmup progress
              await engine.warmup(steps, (phase: string, step?: number, total?: number) => {
                console.log(`[App] Metaballs heartbeat: ${phase}`, step, total);
                if (hud) hud.addEvent(`Metaballs ${phase} ${step}/${total}`);
              });
              console.log('[App] ✓ Metaballs warmup complete');
            } else {
              console.warn('[App] ⚠ No warmup method on metaballs engine');
            }
          },
          start: () => {
            if (hud) hud.setPhase('running:metaballs');
            console.log('[App] Starting metaballs render loop...');
            const engine = (window as any).__metaballsEngine;
            if (engine && engine.start) {
              // Pass heartbeat callback for render loop
              engine.start(
                () => {
                  console.log('[App] ✓ Metaballs first frame rendered');
                },
                (phase: string) => {
                  console.log(`[App] Metaballs render heartbeat: ${phase}`);
                }
              );
            } else {
              console.warn('[App] ⚠ No start method on metaballs engine');
            }
          },
        });
      }

      // Run preloader
      if (hud) hud.setPhase('preloading');
      await preloader.run();

      if (hud) {
        hud.setPhase('reveal');
        hud.addEvent('Preloader complete');
      }

      setPreloaderComplete(true);

      // Start reveal guard (fallback to dot if mode doesn't render)
      // Skip reveal guard for metaballs (stable, always works)
      // Only use for experimental WebGL modes
      const timeout = visualMode === 'glGravity' ? 5000 : 2000;
      if (visualMode === 'gravityLayers' || visualMode === 'glGravity') {
        console.log(`[App] Starting reveal guard with ${timeout}ms timeout for ${visualMode}`);
        revealTimerRef.current = window.setTimeout(() => {
          console.warn(`[App] ⚠️ Reveal guard timeout after ${timeout}ms - falling back to dot`);
          if (hud) hud.addEvent('⚠ Fallback to dot (timeout)');
          setVisualMode('dot');
        }, timeout);
      } else if (visualMode === 'metaballs') {
        console.log('[App] Metaballs mode - no reveal guard timeout (stable mode)');
      }

      // Apply content-visibility to below-the-fold sections
      autoBelowTheFold();

      console.log('[App] Initialization complete');
    };

    init();

    // Cleanup
    return () => {
      console.log('[App] Unmounting - cleaning up');
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
      // Note: hasInitialized stays true to prevent re-running preloader on remount
    };
  }, [debugMode, visualMode, warmupSteps]);

  // Debug: Log render state
  console.log('[App] RENDER - preloaderComplete:', preloaderComplete, 'visualMode:', visualMode, 'urlMode:', urlMode);

  return (
    <>
      {/* Hero section - Conditional visual mode (always mount, hide if preloader not complete) */}
      <ErrorBoundary>
        <div style={{ opacity: preloaderComplete ? 1 : 0, pointerEvents: preloaderComplete ? 'auto' : 'none' }}>
          {visualMode === 'metaballs' ? (
            <MetaballsHero
              style={{ minHeight: '100vh', backgroundColor: '#E8E6E0' }}
              onFallback={() => {
                console.error('[App] ❌ MetaballsHero triggered fallback - switching to dot');
                if (revealTimerRef.current) {
                  clearTimeout(revealTimerRef.current);
                  revealTimerRef.current = null;
                }
                setVisualMode('dot');
              }}
              onFirstDraw={() => {
                console.log('[App] ✓ Metaballs first draw received - canceling reveal guard');
                if (revealTimerRef.current) {
                  console.log('[App] ✓ Reveal guard canceled successfully');
                  clearTimeout(revealTimerRef.current);
                  revealTimerRef.current = null;
                } else {
                  console.warn('[App] ⚠️ No reveal guard timer to cancel (already fired?)');
                }
              }}
            >
              <HeroPills />
            </MetaballsHero>
          ) : visualMode === 'dot' ? (
            <DotPanel
              style={{ minHeight: '100vh' }}
              backgroundColor="#E8E6E0"
              dotColor="#6B6B6B"
              cursorColor="#A855F7"
            >
              <HeroPills />
            </DotPanel>
          ) : visualMode === 'glGravity' ? (
            <GLGravityHero
              style={{ minHeight: '100vh', backgroundColor: '#E8E6E0' }}
              onFallback={() => {
                console.warn('[App] GLGravityHero failed - falling back to dot');
                setVisualMode('dot');
              }}
              onFirstDraw={() => {
                console.log('[App] GLGravity first draw - canceling reveal guard');
                if (revealTimerRef.current) {
                  clearTimeout(revealTimerRef.current);
                  revealTimerRef.current = null;
                }
              }}
            >
              <HeroPills />
            </GLGravityHero>
          ) : (
            <GravityHero style={{ minHeight: '100vh', backgroundColor: '#E8E6E0' }}>
              <HeroPills />
            </GravityHero>
          )}
        </div>
      </ErrorBoundary>

      <ErrorBoundary>
        <PortraitParallax />
      </ErrorBoundary>

      <ErrorBoundary>
        <NameBubbles />
      </ErrorBoundary>

      <ErrorBoundary>
        <DotGridCanvas />
      </ErrorBoundary>

      {/* Footer */}
      <footer
        style={{
          padding: 'var(--space-lg) 0',
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: '14px',
        }}
      >
        <div className="container">
          <p>&copy; 2025 Qingyuan Wan</p>
        </div>
      </footer>
    </>
  );
}

export default App;
