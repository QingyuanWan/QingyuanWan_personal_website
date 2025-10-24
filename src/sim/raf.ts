/**
 * RAF Loop Controller
 *
 * Fixed timestep animation loop with sub-stepping for frame drops
 */

export interface RAFController {
  start(): void;
  stop(): void;
  destroy(): void;
}

export interface RAFOptions {
  dt: number;              // Fixed timestep (1/60)
  maxSubSteps?: number;    // Max sub-steps per frame (default 3)
  onUpdate(dt: number): void;
  onRender?(): void;
}

export function createRAFController(options: RAFOptions): RAFController {
  const { dt, maxSubSteps = 3, onUpdate, onRender } = options;

  let rafId: number | null = null;
  let running = false;
  let lastTime = 0;
  let accumulator = 0;

  function loop(currentTime: number) {
    if (!running) return;

    // Calculate frame delta (convert to seconds)
    const frameTime = lastTime === 0 ? 0 : (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // Accumulate time
    accumulator += Math.min(frameTime, dt * maxSubSteps);

    // Fixed timestep updates
    let steps = 0;
    while (accumulator >= dt && steps < maxSubSteps) {
      onUpdate(dt);
      accumulator -= dt;
      steps++;
    }

    // Render
    if (onRender) {
      onRender();
    }

    rafId = requestAnimationFrame(loop);
  }

  return {
    start() {
      if (running) return;
      running = true;
      lastTime = 0;
      accumulator = 0;
      rafId = requestAnimationFrame(loop);
    },

    stop() {
      running = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },

    destroy() {
      this.stop();
    },
  };
}
