/**
 * Global Shared Cursor System
 *
 * Single fixed-position overlay that tracks the OS pointer across all sections.
 * No scroll math, no coordinate drift, section-aware styling.
 */

export interface CursorVariant {
  size: number;
  color: string;
  glow: boolean;
  glowSize?: number;
}

export interface CursorState {
  clientX: number;
  clientY: number;
  vx: number;
  vy: number;
  speed: number;
  insideSectionId: string | null;
}

export interface SectionConfig {
  id: string;
  element: HTMLElement;
  variant?: CursorVariant;
}

export interface GlobalCursor {
  getState(): Readonly<CursorState>;
  attach(config: SectionConfig): () => void;
  setVariant(variant: CursorVariant): void;
  onEnter(sectionId: string, cb: () => void): () => void;
  onLeave(sectionId: string, cb: () => void): () => void;
  destroy(): void;
}

const DEFAULT_VARIANT: CursorVariant = {
  size: 10,
  color: '#A855F7',
  glow: false,
};

const VARIANTS: Record<string, CursorVariant> = {
  hero: {
    size: 18,
    color: '#A855F7',
    glow: true,
    glowSize: 36,
  },
  panel: {
    size: 12,
    color: '#A855F7',
    glow: false,
  },
  default: DEFAULT_VARIANT,
};

/**
 * Create global cursor overlay
 */
export function createGlobalCursor(): GlobalCursor {
  console.log('[GlobalCursor] Initializing');

  // State
  const state: CursorState = {
    clientX: 0,
    clientY: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    insideSectionId: null,
  };

  let prevX = 0;
  let prevY = 0;
  let targetX = 0;
  let targetY = 0;
  let destroyed = false;

  const sections = new Map<string, SectionConfig>();
  const enterCallbacks = new Map<string, Set<() => void>>();
  const leaveCallbacks = new Map<string, Set<() => void>>();

  let currentVariant = DEFAULT_VARIANT;

  // Create fixed overlay dot
  const dot = document.createElement('div');
  dot.style.cssText = `
    position: fixed;
    width: ${currentVariant.size}px;
    height: ${currentVariant.size}px;
    border-radius: 50%;
    background-color: ${currentVariant.color};
    pointer-events: none;
    z-index: 99999;
    transform: translate(-50%, -50%);
    opacity: 1;
    transition: opacity 0.2s ease, width 0.3s ease, height 0.3s ease;
    will-change: transform;
    left: 50%;
    top: 50%;
  `;
  document.body.appendChild(dot);

  console.log('[GlobalCursor] Overlay created', dot);

  // Update dot position (called in RAF)
  function updateDotPosition() {
    // Smooth EMA
    state.clientX += (targetX - state.clientX) * 0.15;
    state.clientY += (targetY - state.clientY) * 0.15;

    // Calculate velocity
    const dx = state.clientX - prevX;
    const dy = state.clientY - prevY;

    state.vx = state.vx * 0.9 + dx * 0.1;
    state.vy = state.vy * 0.9 + dy * 0.1;
    state.speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);

    prevX = state.clientX;
    prevY = state.clientY;

    // Move dot using left/top for better visibility
    dot.style.left = `${state.clientX}px`;
    dot.style.top = `${state.clientY}px`;
  }

  // Check which section the pointer is inside
  function updateInsideSection() {
    let topSection: string | null = null;
    let topZIndex = -Infinity;

    for (const [id, config] of sections) {
      const rect = config.element.getBoundingClientRect();

      if (
        state.clientX >= rect.left &&
        state.clientX <= rect.right &&
        state.clientY >= rect.top &&
        state.clientY <= rect.bottom
      ) {
        // Get z-index
        const zIndex = parseInt(getComputedStyle(config.element).zIndex || '0', 10);

        if (zIndex > topZIndex) {
          topZIndex = zIndex;
          topSection = id;
        }
      }
    }

    // Section change
    if (topSection !== state.insideSectionId) {
      // Leave old section
      if (state.insideSectionId) {
        const callbacks = leaveCallbacks.get(state.insideSectionId);
        if (callbacks) {
          callbacks.forEach(cb => cb());
        }

        console.log('[GlobalCursor] Left section:', state.insideSectionId);
      }

      // Enter new section
      state.insideSectionId = topSection;

      if (topSection) {
        const callbacks = enterCallbacks.get(topSection);
        if (callbacks) {
          callbacks.forEach(cb => cb());
        }

        // Auto-set variant if configured
        const config = sections.get(topSection);
        if (config?.variant) {
          setVariant(config.variant);
        }

        console.log('[GlobalCursor] Entered section:', topSection, 'Available sections:', Array.from(sections.keys()));
      } else {
        // Outside all sections - revert to default
        setVariant(DEFAULT_VARIANT);
      }
    }
  }

  // Set cursor variant
  function setVariant(variant: CursorVariant) {
    currentVariant = variant;

    dot.style.width = `${variant.size}px`;
    dot.style.height = `${variant.size}px`;
    dot.style.backgroundColor = variant.color;

    if (variant.glow && variant.glowSize) {
      dot.style.boxShadow = `
        0 0 ${variant.glowSize}px ${variant.color},
        0 0 ${variant.glowSize / 2}px ${variant.color}
      `;
    } else {
      dot.style.boxShadow = 'none';
    }
  }

  // Window-level pointer handlers
  function handlePointerMove(e: PointerEvent) {
    if (destroyed) return;

    targetX = e.clientX;
    targetY = e.clientY;

    // Show dot
    if (dot.style.opacity === '0') {
      dot.style.opacity = '1';
    }
  }

  function handlePointerLeave() {
    if (destroyed) return;

    // Hide dot when leaving window
    dot.style.opacity = '0';

    // Leave current section
    if (state.insideSectionId) {
      const callbacks = leaveCallbacks.get(state.insideSectionId);
      if (callbacks) {
        callbacks.forEach(cb => cb());
      }
      state.insideSectionId = null;
    }
  }

  // RAF loop
  let rafId: number;

  function loop() {
    if (destroyed) return;

    updateDotPosition();
    updateInsideSection();

    rafId = requestAnimationFrame(loop);
  }

  // Attach listeners
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerleave', handlePointerLeave);

  // Fallback for older browsers
  window.addEventListener('mousemove', handlePointerMove as any);
  window.addEventListener('mouseleave', handlePointerLeave);

  // Start loop
  rafId = requestAnimationFrame(loop);

  console.log('[GlobalCursor] Started');

  // Public API
  return {
    getState() {
      return { ...state };
    },

    attach(config: SectionConfig) {
      console.log('[GlobalCursor] Attaching section:', config.id);

      sections.set(config.id, config);

      if (!enterCallbacks.has(config.id)) {
        enterCallbacks.set(config.id, new Set());
      }
      if (!leaveCallbacks.has(config.id)) {
        leaveCallbacks.set(config.id, new Set());
      }

      // Return detach function
      return () => {
        console.log('[GlobalCursor] Detaching section:', config.id);
        sections.delete(config.id);
        enterCallbacks.delete(config.id);
        leaveCallbacks.delete(config.id);
      };
    },

    setVariant(variant: CursorVariant) {
      setVariant(variant);
    },

    onEnter(sectionId: string, cb: () => void) {
      let callbacks = enterCallbacks.get(sectionId);
      if (!callbacks) {
        callbacks = new Set();
        enterCallbacks.set(sectionId, callbacks);
      }
      callbacks.add(cb);

      return () => {
        callbacks?.delete(cb);
      };
    },

    onLeave(sectionId: string, cb: () => void) {
      let callbacks = leaveCallbacks.get(sectionId);
      if (!callbacks) {
        callbacks = new Set();
        leaveCallbacks.set(sectionId, callbacks);
      }
      callbacks.add(cb);

      return () => {
        callbacks?.delete(cb);
      };
    },

    destroy() {
      console.log('[GlobalCursor] Destroying');
      destroyed = true;

      cancelAnimationFrame(rafId);

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('mousemove', handlePointerMove as any);
      window.removeEventListener('mouseleave', handlePointerLeave);

      if (dot.parentNode) {
        dot.parentNode.removeChild(dot);
      }

      sections.clear();
      enterCallbacks.clear();
      leaveCallbacks.clear();
    },
  };
}

/**
 * Singleton instance
 */
let globalCursor: GlobalCursor | null = null;

export function getGlobalCursor(): GlobalCursor {
  if (!globalCursor) {
    globalCursor = createGlobalCursor();
  }
  return globalCursor;
}

export function destroyGlobalCursor(): void {
  if (globalCursor) {
    globalCursor.destroy();
    globalCursor = null;
  }
}
