import { ErrorBoundary } from '../components/ErrorBoundary';
import { HeroPills } from '../components/HeroPills';
import { DotPanel } from '../components/DotPanel';
import { GravityHero } from '../components/GravityHero';
import { GLGravityHero } from '../components/GLGravityHero';
import { MetaballsHero } from '../components/MetaballsHero';
import { FluidHeroIframe } from '../components/FluidHeroIframe';

// Visual mode type
export type VisualMode = 'glFluid' | 'metaballs' | 'dot' | 'gravityLayers' | 'glGravity';

interface HeroPageProps {
  visualMode: VisualMode;
  preloaderComplete: boolean;
  revealTimerRef: React.MutableRefObject<number | null>;
  onModeChange: (mode: VisualMode) => void;
}

/**
 * HeroPage - Landing page with interactive fluid/particle background
 *
 * Supports multiple visual modes:
 * - glFluid: WebGL fluid simulation (default)
 * - metaballs: Metaballs animation
 * - dot: Dot panel with cursor interaction
 * - glGravity: WebGL gravity simulation
 * - gravityLayers: Canvas gravity layers
 */
export function HeroPage({
  visualMode,
  preloaderComplete,
  revealTimerRef,
  onModeChange,
}: HeroPageProps) {
  return (
    <ErrorBoundary>
      {/* Using iframe approach to ensure vendor demo works */}
      {visualMode === 'glFluid' ? (
        <FluidHeroIframe
          style={{
            minHeight: '100vh',
            backgroundColor: '#E8E6E0',
            opacity: preloaderComplete ? 1 : 0,
            pointerEvents: preloaderComplete ? 'auto' : 'none'
          }}
          onFirstDraw={() => {
            console.log('[HeroPage] ✓ FluidHero iframe loaded');
            if (revealTimerRef.current) {
              console.log('[HeroPage] ✓ Reveal guard canceled successfully');
              clearTimeout(revealTimerRef.current);
              revealTimerRef.current = null;
            }
          }}
        >
          <HeroPills />
        </FluidHeroIframe>
      ) : (
        <div
          className="hero-section"
          style={{
            opacity: preloaderComplete ? 1 : 0,
            pointerEvents: preloaderComplete ? 'auto' : 'none'
          }}
        >
          {visualMode === 'metaballs' ? (
            <MetaballsHero
              style={{ minHeight: '100vh', backgroundColor: '#E8E6E0' }}
              onFallback={() => {
                console.error('[HeroPage] ❌ MetaballsHero triggered fallback - switching to dot');
                if (revealTimerRef.current) {
                  clearTimeout(revealTimerRef.current);
                  revealTimerRef.current = null;
                }
                onModeChange('dot');
              }}
              onFirstDraw={() => {
                console.log('[HeroPage] ✓ Metaballs first draw received - canceling reveal guard');
                if (revealTimerRef.current) {
                  console.log('[HeroPage] ✓ Reveal guard canceled successfully');
                  clearTimeout(revealTimerRef.current);
                  revealTimerRef.current = null;
                } else {
                  console.warn('[HeroPage] ⚠️ No reveal guard timer to cancel (already fired?)');
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
                console.warn('[HeroPage] GLGravityHero failed - falling back to dot');
                onModeChange('dot');
              }}
              onFirstDraw={() => {
                console.log('[HeroPage] GLGravity first draw - canceling reveal guard');
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
      )}
    </ErrorBoundary>
  );
}
