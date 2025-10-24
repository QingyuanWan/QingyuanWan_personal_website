import { useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getGlobalCursor } from './cursor/globalCursor';
import { HeroPills } from './components/HeroPills';
import { PortraitParallax } from './components/PortraitParallax';
import { NameBubbles } from './components/NameBubbles';
import { DotGridCanvas } from './components/DotGridCanvas';
import './styles/app.css';

function App() {
  // Initialize global cursor once
  useEffect(() => {
    const cursor = getGlobalCursor();
    console.log('[App] Global cursor initialized');

    // Cleanup on unmount (SPA navigation)
    return () => {
      // Keep cursor alive for SPA - don't destroy
    };
  }, []);

  return (
    <>
      {/* Hero section - Simple background */}
      <ErrorBoundary>
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#E8E6E0',
          position: 'relative'
        }}>
          <HeroPills />
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
