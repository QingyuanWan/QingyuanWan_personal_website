import { useEffect, useState, useRef } from 'react';
import { getGlobalCursor } from './cursor/globalCursor';
import {
  HeroPage,
  RealHumanPage,
  NavbarPage,
  AboutPage,
  ProjectsPage,
  ExperiencesPage,
  TestimonialPage,
  // EducationPage,  // Commented out - not using anymore
  type VisualMode
} from './pages';
import { PreloaderManager } from './preload/PreloaderManager';
import { applyDefaultHints } from './perf/headHints';
import { autoBelowTheFold } from './perf/visibility';
import { isDebugMode, getVisualModeFromURL, getWarmupSteps, getDebugHUD } from './perf/debugHUD';
import { gsap } from './utils/gsap';
import './styles/app.css';

// Global flag to prevent double preloader run in StrictMode
let hasInitialized = false;

/**
 * Setup GSAP ScrollTrigger to pin the hero section
 * Pins the hero for one full viewport height
 */
function setupHeroScrollTrigger() {
  const { ScrollTrigger } = gsap as any;

  // Kill all existing ScrollTriggers (dev hot-reload guard)
  ScrollTrigger.killAll();
  console.log('[App] Cleared existing ScrollTriggers');

  // Check for ?nopin=1 to disable pinning
  const params = new URLSearchParams(window.location.search);
  if (params.get('nopin') === '1') {
    console.log('[App] ScrollTrigger pinning disabled by ?nopin=1');
    return;
  }

  const heroSection = document.querySelector('.hero-section');
  if (!heroSection) {
    console.warn('[App] No .hero-section found for ScrollTrigger pinning');
    return;
  }

  console.log('[App] Setting up ScrollTrigger for hero section');

  // Create ScrollTrigger with smooth pinning
  ScrollTrigger.create({
    trigger: heroSection,
    pin: true,
    start: 'top top',
    end: '+=100vh', // Pin for exactly 1 viewport height
    pinSpacing: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    markers: false, // Set to true for debugging
    onRefresh: () => {
      // Call setCanvasSize when ScrollTrigger refreshes (e.g., on resize)
      const hero = (window as any).__fluidHero;
      if (hero && hero.setCanvasSize) {
        hero.setCanvasSize('ScrollTrigger.refresh');
        console.log('[App] ScrollTrigger refresh → triggered canvas resize');
      }
    },
  });

  console.log('[App] ScrollTrigger created - will pin for 100vh');
}

function App() {
  // Get debug mode and visual mode from URL params
  const debugMode = isDebugMode(); // ?debug=1
  const urlMode = getVisualModeFromURL(); // ?mode=dot|gravity
  const warmupSteps = getWarmupSteps(); // ?warmup=0

  // Visual mode: URL param > default to 'glFluid'
  const [visualMode, setVisualMode] = useState<VisualMode>(urlMode || 'glFluid');
  const [preloaderComplete, setPreloaderComplete] = useState(false);
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

      // Add glFluid task (iframe-based - no complex lifecycle needed)
      if (visualMode === 'glFluid') {
        preloader.addTask('glFluid', {
          allocate: async () => {
            if (hud) hud.setPhase('allocate:glFluid');
            console.log('[App] Loading WebGL Fluid iframe...');
            // Just wait a moment for iframe to exist in DOM
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log('[App] ✓ FluidHero iframe ready');
          },
          warmup: async (steps) => {
            if (hud) hud.setPhase(`warmup:glFluid (${steps})`);
            console.log(`[App] Warming up FluidHero iframe (${steps} steps)...`);
            // Iframe handles its own rendering - just simulate warmup
            await new Promise(resolve => setTimeout(resolve, 300));
            console.log('[App] ✓ FluidHero iframe warmup complete');
          },
          start: () => {
            if (hud) hud.setPhase('running:glFluid');
            console.log('[App] FluidHero iframe rendering automatically');
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
      // Skip reveal guard for glFluid and metaballs (stable modes)
      const timeout = visualMode === 'glGravity' ? 5000 : 2000;
      if (visualMode === 'gravityLayers' || visualMode === 'glGravity') {
        console.log(`[App] Starting reveal guard with ${timeout}ms timeout for ${visualMode}`);
        revealTimerRef.current = window.setTimeout(() => {
          console.warn(`[App] ⚠️ Reveal guard timeout after ${timeout}ms - falling back to dot`);
          if (hud) hud.addEvent('⚠ Fallback to dot (timeout)');
          setVisualMode('dot');
        }, timeout);
      } else if (visualMode === 'glFluid' || visualMode === 'metaballs') {
        console.log(`[App] ${visualMode} mode - no reveal guard timeout (stable mode)`);
      }

      // Apply content-visibility to below-the-fold sections
      autoBelowTheFold();

      // Setup GSAP ScrollTrigger for hero pinning
      setupHeroScrollTrigger();

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
    };
  }, [debugMode, visualMode, warmupSteps]);

  // Debug: Log render state
  if (debugMode) {
    console.log('[App] RENDER - preloaderComplete:', preloaderComplete, 'visualMode:', visualMode, 'urlMode:', urlMode);
  }

  return (
    <>
      <NavbarPage />

      <HeroPage
        visualMode={visualMode}
        preloaderComplete={preloaderComplete}
        revealTimerRef={revealTimerRef}
        onModeChange={setVisualMode}
      />

      <RealHumanPage />

      <div className="about-section">
        <AboutPage />
      </div>

      <ExperiencesPage />

      <div className="projects-section">
        <ProjectsPage />
      </div>

      <div className="testimonial-section">
        <TestimonialPage />
      </div>

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