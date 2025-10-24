/**
 * Shared Pointer State
 *
 * Singleton pointer tracker that smooths mouse/touch movement
 * and provides velocity/speed calculations for fluid interactions.
 * Used across both LiquidHero and DotPanel for unified cursor behavior.
 */

export interface PointerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  inside: boolean;
  onEnter(cb: () => void): () => void;
  onLeave(cb: () => void): () => void;
  destroy(): void;
}

interface PointerOptions {
  smoothing?: number;        // 0-1, lower = smoother (default 0.15)
  maxSpeed?: number;         // clamp speed to prevent spikes
  velocityDecay?: number;    // how fast velocity decays when not moving
}

const DEFAULT_OPTIONS: Required<PointerOptions> = {
  smoothing: 0.15,
  maxSpeed: 50,
  velocityDecay: 0.92,
};

export function createPointer(
  element: HTMLElement,
  userOptions: PointerOptions = {}
): PointerState {
  const options = { ...DEFAULT_OPTIONS, ...userOptions };

  // State
  const state = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    prevX: 0,
    prevY: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    inside: false,
    destroyed: false,
  };

  const enterCallbacks: Array<() => void> = [];
  const leaveCallbacks: Array<() => void> = [];

  // Event handlers
  function handlePointerMove(e: PointerEvent | MouseEvent) {
    if (state.destroyed) return;

    const rect = element.getBoundingClientRect();
    state.targetX = e.clientX - rect.left;
    state.targetY = e.clientY - rect.top;

    if (!state.inside) {
      state.inside = true;
      // Initialize position immediately on enter to prevent jump
      state.x = state.targetX;
      state.y = state.targetY;
      state.prevX = state.targetX;
      state.prevY = state.targetY;
      enterCallbacks.forEach(cb => cb());
    }
  }

  function handlePointerEnter(e: PointerEvent | MouseEvent) {
    handlePointerMove(e);
  }

  function handlePointerLeave() {
    if (state.destroyed) return;

    if (state.inside) {
      state.inside = false;
      leaveCallbacks.forEach(cb => cb());
    }

    // Decay velocity when leaving
    state.vx *= 0.5;
    state.vy *= 0.5;
    state.speed *= 0.5;
  }

  // Smooth update loop (should be called every frame)
  function update() {
    if (state.destroyed) return;

    // Exponential moving average for smooth tracking
    state.x += (state.targetX - state.x) * options.smoothing;
    state.y += (state.targetY - state.y) * options.smoothing;

    // Calculate velocity (pixels per frame)
    const dx = state.x - state.prevX;
    const dy = state.y - state.prevY;

    // Smooth velocity with decay
    state.vx = state.vx * options.velocityDecay + dx * (1 - options.velocityDecay);
    state.vy = state.vy * options.velocityDecay + dy * (1 - options.velocityDecay);

    // Calculate speed (magnitude)
    state.speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);

    // Clamp speed to prevent spikes
    if (state.speed > options.maxSpeed) {
      const scale = options.maxSpeed / state.speed;
      state.vx *= scale;
      state.vy *= scale;
      state.speed = options.maxSpeed;
    }

    // Store previous position
    state.prevX = state.x;
    state.prevY = state.y;
  }

  // Auto-update on RAF (alternative: caller can update manually)
  let rafId: number;
  function autoUpdate() {
    if (state.destroyed) return;
    update();
    rafId = requestAnimationFrame(autoUpdate);
  }

  // Attach listeners
  element.addEventListener('pointermove', handlePointerMove as any);
  element.addEventListener('pointerenter', handlePointerEnter as any);
  element.addEventListener('pointerleave', handlePointerLeave);

  // Fallback for older browsers
  element.addEventListener('mousemove', handlePointerMove);
  element.addEventListener('mouseenter', handlePointerEnter);
  element.addEventListener('mouseleave', handlePointerLeave);

  // Start auto-update
  rafId = requestAnimationFrame(autoUpdate);

  // Public API
  return {
    get x() { return state.x; },
    get y() { return state.y; },
    get vx() { return state.vx; },
    get vy() { return state.vy; },
    get speed() { return state.speed; },
    get inside() { return state.inside; },

    onEnter(cb: () => void) {
      enterCallbacks.push(cb);
      return () => {
        const idx = enterCallbacks.indexOf(cb);
        if (idx >= 0) enterCallbacks.splice(idx, 1);
      };
    },

    onLeave(cb: () => void) {
      leaveCallbacks.push(cb);
      return () => {
        const idx = leaveCallbacks.indexOf(cb);
        if (idx >= 0) leaveCallbacks.splice(idx, 1);
      };
    },

    destroy() {
      state.destroyed = true;
      cancelAnimationFrame(rafId);

      element.removeEventListener('pointermove', handlePointerMove as any);
      element.removeEventListener('pointerenter', handlePointerEnter as any);
      element.removeEventListener('pointerleave', handlePointerLeave);
      element.removeEventListener('mousemove', handlePointerMove);
      element.removeEventListener('mouseenter', handlePointerEnter);
      element.removeEventListener('mouseleave', handlePointerLeave);

      enterCallbacks.length = 0;
      leaveCallbacks.length = 0;
    },
  };
}
