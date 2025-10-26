/**
 * Hero Effect Interface
 *
 * Standard interface for all hero visual modes
 */

export interface HeroEffect {
  /**
   * Allocate resources (create GL context, textures, etc.)
   */
  allocate(rootEl: HTMLElement): Promise<void>;

  /**
   * Warm-up phase - run N frames without displaying
   * Yields via rAF to keep UI responsive
   */
  warmup(steps: number, onHeartbeat?: (i: number, total: number) => void): Promise<void>;

  /**
   * Start the render loop
   */
  start(): void;

  /**
   * Stop the render loop (pause)
   */
  stop(): void;

  /**
   * Destroy and cleanup all resources
   */
  destroy(): void;

  /**
   * Promise that resolves on first visible frame
   */
  firstDraw$: Promise<void>;
}
