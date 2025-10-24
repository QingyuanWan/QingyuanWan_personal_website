/**
 * Preloader Provider - React wrapper for BufferManager
 *
 * Orchestrates preloading, warm-up, and reveal for all effects
 */

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { createBufferManager, setGlobalManager, clearGlobalManager } from './manager';
import type { BufferManager, BufferOptions, TaskProgress } from './types';
import { PreloaderUI } from './ui';

interface PreloaderContextValue {
  manager: BufferManager | null;
  ready: boolean;
}

const PreloaderContext = createContext<PreloaderContextValue>({
  manager: null,
  ready: false,
});

export function usePreloader() {
  return useContext(PreloaderContext);
}

interface PreloaderProviderProps {
  children: React.ReactNode;
  options?: BufferOptions;
  /** Skip preloader and show content immediately (dev mode) */
  skipPreload?: boolean;
}

/**
 * PreloaderProvider
 *
 * Mount this at the app root to enable buffered preloading.
 * All effects should use the buffer manager from context.
 */
export function PreloaderProvider({
  children,
  options,
  skipPreload = false,
}: PreloaderProviderProps) {
  const [manager] = useState(() => {
    const mgr = createBufferManager(options);
    setGlobalManager(mgr);
    return mgr;
  });

  const [ready, setReady] = useState(skipPreload);
  const [showUI, setShowUI] = useState(!skipPreload);
  const [progress, setProgress] = useState<TaskProgress[]>([]);
  const progressIntervalRef = useRef<number>();

  useEffect(() => {
    if (skipPreload) {
      console.log('[PreloaderProvider] Skipping preload (dev mode)');
      manager.fastPath();
      return;
    }

    console.log('[PreloaderProvider] Starting preload sequence');

    // Poll progress
    progressIntervalRef.current = window.setInterval(() => {
      setProgress([...manager.getProgress()]);
    }, 100);

    // Run preload
    manager
      .run()
      .then(() => {
        console.log('[PreloaderProvider] Preload complete');
        setShowUI(false); // Start fade out
      })
      .catch(error => {
        console.error('[PreloaderProvider] Preload failed', error);
        // Still hide UI and show content
        setShowUI(false);
      });

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      clearGlobalManager();
    };
  }, [manager, skipPreload]);

  const handleFadeComplete = () => {
    console.log('[PreloaderProvider] Fade complete - content ready');
    setReady(true);
  };

  return (
    <PreloaderContext.Provider value={{ manager, ready }}>
      {/* Preloader overlay */}
      <PreloaderUI
        visible={showUI}
        progress={progress}
        label={options?.ui?.label}
        showProgress={options?.ui?.showProgress}
        fadeMs={options?.ui?.fadeMs}
        onFadeComplete={handleFadeComplete}
      />

      {/* Main content (rendered but hidden until ready) */}
      <div
        style={{
          opacity: ready ? 1 : 0,
          transition: ready ? 'opacity 0.3s ease-in' : 'none',
        }}
      >
        {children}
      </div>
    </PreloaderContext.Provider>
  );
}
