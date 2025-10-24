/**
 * Preloader UI Overlay
 *
 * Minimal, accessible loading screen with progress indication
 */

import { useEffect, useState } from 'react';
import type { TaskProgress } from './types';

interface PreloaderUIProps {
  visible: boolean;
  progress: TaskProgress[];
  label?: string;
  showProgress?: boolean;
  fadeMs?: number;
  onFadeComplete?: () => void;
}

export function PreloaderUI({
  visible,
  progress,
  label = 'Preparing experience...',
  showProgress = true,
  fadeMs = 300,
  onFadeComplete,
}: PreloaderUIProps) {
  const [isFading, setIsFading] = useState(false);
  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    if (!visible && !isFading) {
      // Start fade out
      setIsFading(true);

      // Remove from DOM after fade
      const timer = setTimeout(() => {
        setShouldRender(false);
        if (onFadeComplete) {
          onFadeComplete();
        }
      }, fadeMs);

      return () => clearTimeout(timer);
    } else if (visible) {
      setShouldRender(true);
      setIsFading(false);
    }
  }, [visible, fadeMs, onFadeComplete, isFading]);

  if (!shouldRender) return null;

  // Calculate progress
  const completedTasks = progress.filter(t => t.status === 'complete').length;
  const totalTasks = progress.length;
  const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#1A1A1A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        opacity: isFading ? 0 : 1,
        transition: `opacity ${fadeMs}ms ease-out`,
        pointerEvents: isFading ? 'none' : 'auto',
      }}
    >
      {/* Loading ring */}
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        style={{
          marginBottom: '24px',
        }}
      >
        {/* Background ring */}
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="4"
        />

        {/* Progress ring */}
        {showProgress && (
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="#A855F7"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 36}`}
            strokeDashoffset={`${2 * Math.PI * 36 * (1 - percentage / 100)}`}
            transform="rotate(-90 40 40)"
            style={{
              transition: 'stroke-dashoffset 0.3s ease-out',
            }}
          />
        )}

        {/* Spinning ring (when no progress shown) */}
        {!showProgress && (
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="#A855F7"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 36 * 0.25}`}
            transform="rotate(-90 40 40)"
            style={{
              animation: 'spin 1.5s linear infinite',
            }}
          />
        )}
      </svg>

      {/* Label */}
      <p
        style={{
          color: 'rgba(255,255,255,0.8)',
          fontSize: '14px',
          fontWeight: 500,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          margin: 0,
        }}
      >
        {label}
      </p>

      {/* Progress percentage (optional) */}
      {showProgress && percentage > 0 && (
        <p
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '12px',
            marginTop: '8px',
          }}
        >
          {Math.round(percentage)}%
        </p>
      )}

      {/* CSS animation for spinning */}
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(-90deg);
          }
          to {
            transform: rotate(270deg);
          }
        }
      `}</style>
    </div>
  );
}
