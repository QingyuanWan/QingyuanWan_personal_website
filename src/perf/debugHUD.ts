/**
 * Debug HUD
 *
 * Shows:
 * - Current phase (allocate/prepare/warmup/reveal/running)
 * - FPS counter
 * - Long tasks count
 * - Last events
 */

import { observeLongTasks, observeLongFrames } from './scheduler';

export interface HUDState {
  phase: string;
  fps: number;
  longTaskCount: number;
  lastEvents: string[];
  visualMode: string;
}

export class DebugHUD {
  private container: HTMLDivElement | null = null;
  private state: HUDState = {
    phase: 'init',
    fps: 0,
    longTaskCount: 0,
    lastEvents: [],
    visualMode: 'unknown',
  };

  private lastFrameTime: number = performance.now();
  private frameCount: number = 0;
  private fpsUpdateInterval: number = 500; // Update FPS every 500ms
  private stopLongTasks: (() => void) | null = null;
  private stopLongFrames: (() => void) | null = null;

  /**
   * Mount HUD
   */
  mount(): void {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: #00ff00;
      font-family: monospace;
      font-size: 11px;
      padding: 10px;
      border-radius: 4px;
      z-index: 999998;
      min-width: 200px;
      pointer-events: none;
      line-height: 1.4;
    `;

    document.body.appendChild(this.container);

    // Start FPS counter
    this.startFPSCounter();

    // Start long-task monitoring
    this.startLongTaskMonitoring();

    // Initial render
    this.render();

    console.log('[DebugHUD] Mounted');
  }

  /**
   * Unmount HUD
   */
  unmount(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }

    if (this.stopLongTasks) {
      this.stopLongTasks();
      this.stopLongTasks = null;
    }

    if (this.stopLongFrames) {
      this.stopLongFrames();
      this.stopLongFrames = null;
    }

    console.log('[DebugHUD] Unmounted');
  }

  /**
   * Update phase
   */
  setPhase(phase: string): void {
    this.state.phase = phase;
    this.addEvent(`Phase: ${phase}`);
    this.render();
  }

  /**
   * Set visual mode
   */
  setVisualMode(mode: string): void {
    this.state.visualMode = mode;
    this.render();
  }

  /**
   * Add event to log
   */
  addEvent(event: string): void {
    this.state.lastEvents.unshift(`[${new Date().toLocaleTimeString()}] ${event}`);

    // Keep only last 5 events
    if (this.state.lastEvents.length > 5) {
      this.state.lastEvents = this.state.lastEvents.slice(0, 5);
    }

    this.render();
  }

  /**
   * Start FPS counter
   */
  private startFPSCounter(): void {
    let lastUpdate = performance.now();

    const countFrame = () => {
      this.frameCount++;
      const now = performance.now();
      const elapsed = now - lastUpdate;

      if (elapsed >= this.fpsUpdateInterval) {
        this.state.fps = Math.round((this.frameCount / elapsed) * 1000);
        this.frameCount = 0;
        lastUpdate = now;
        this.render();
      }

      requestAnimationFrame(countFrame);
    };

    requestAnimationFrame(countFrame);
  }

  /**
   * Start long-task monitoring
   */
  private startLongTaskMonitoring(): void {
    this.stopLongTasks = observeLongTasks((entries) => {
      this.state.longTaskCount += entries.length;
      entries.forEach((entry) => {
        this.addEvent(`� Long task: ${entry.duration.toFixed(0)}ms`);
      });
    });

    this.stopLongFrames = observeLongFrames((entries) => {
      entries.forEach((entry) => {
        if (entry.duration > 100) {
          // Only log very long frames
          this.addEvent(`� Long frame: ${entry.duration.toFixed(0)}ms`);
        }
      });
    });
  }

  /**
   * Render HUD
   */
  private render(): void {
    if (!this.container) return;

    const fpsColor = this.state.fps >= 55 ? '#00ff00' : this.state.fps >= 30 ? '#ffaa00' : '#ff0000';

    this.container.innerHTML = `
      <div style="margin-bottom: 8px; font-weight: bold; color: #00ffff;">
        = DEBUG HUD
      </div>
      <div style="margin-bottom: 4px;">
        Phase: <span style="color: #ffff00;">${this.state.phase}</span>
      </div>
      <div style="margin-bottom: 4px;">
        Mode: <span style="color: #ff00ff;">${this.state.visualMode}</span>
      </div>
      <div style="margin-bottom: 4px;">
        FPS: <span style="color: ${fpsColor}; font-weight: bold;">${this.state.fps}</span>
      </div>
      <div style="margin-bottom: 8px;">
        Long tasks: <span style="color: ${this.state.longTaskCount > 0 ? '#ff0000' : '#00ff00'};">${this.state.longTaskCount}</span>
      </div>
      <div style="border-top: 1px solid #333; padding-top: 4px; font-size: 10px;">
        ${this.state.lastEvents.map((event) => `<div>${event}</div>`).join('')}
      </div>
    `;
  }
}

/**
 * Global debug HUD instance
 */
let globalHUD: DebugHUD | null = null;

/**
 * Get or create global HUD
 */
export function getDebugHUD(): DebugHUD {
  if (!globalHUD) {
    globalHUD = new DebugHUD();
  }
  return globalHUD;
}

/**
 * Check if debug mode is enabled (?debug=1)
 */
export function isDebugMode(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get('debug') === '1';
}

/**
 * Get visual mode from URL (?mode=metaballs|dot|gravity|glGravity)
 */
export function getVisualModeFromURL(): 'metaballs' | 'dot' | 'gravityLayers' | 'glGravity' | null {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');

  if (mode === 'metaballs' || mode === 'meta') return 'metaballs';
  if (mode === 'dot') return 'dot';
  if (mode === 'gravity' || mode === 'gravityLayers') return 'gravityLayers';
  if (mode === 'glGravity' || mode === 'gl') return 'glGravity';

  return null;
}

/**
 * Get warmup steps from URL (?warmup=60)
 */
export function getWarmupSteps(): number | null {
  const params = new URLSearchParams(window.location.search);
  const warmup = params.get('warmup');

  if (warmup !== null) {
    const steps = parseInt(warmup, 10);
    return isNaN(steps) ? null : steps;
  }

  return null;
}
