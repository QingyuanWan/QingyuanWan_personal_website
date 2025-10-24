/**
 * Metaballs Engine
 *
 * Liquid blob field effect with cursor interaction.
 * Uses brand color ramp (blue → magenta → orange).
 */

import type { GlobalCursor } from '../cursor/globalCursor';
import { toLocal } from '../cursor/coordinates';
import { createGaussianKernel, applyBlur, type BlurKernel } from './blur';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
}

export interface MetaballsOptions {
  // Resolution
  resolutionScale?: number; // 0.5-1.0, default 0.75

  // Particles
  particleCount?: number; // 120-240 desktop, 60-120 mobile
  baseRadius?: number; // 14-24, scaled by DPR

  // Physics
  damping?: number; // 0.96-0.985
  flowSpeed?: number; // 0.3-0.8
  flowDirection?: [number, number]; // [vx, vy]

  // Cursor
  cursorMode?: 'push' | 'pull';
  cursorRadius?: number; // 120-200 in offscreen pixels
  cursorForce?: number; // 0.6-1.4

  // Rendering
  threshold?: number; // 0.4-0.6
  blurRadius?: number; // 6-12

  // Colors (brand ramp)
  colors?: Array<{ t: number; color: string }>;

  // Bloom
  bloom?: {
    enabled: boolean;
    strength: number;
    radius: number;
  };

  // Performance
  reducedMotion?: boolean;
}

const DEFAULT_OPTIONS: Required<MetaballsOptions> = {
  resolutionScale: 0.75,
  particleCount: 150,
  baseRadius: 18,
  damping: 0.98,
  flowSpeed: 0.4,
  flowDirection: [0.5, -0.3],
  cursorMode: 'push',
  cursorRadius: 160,
  cursorForce: 1.0,
  threshold: 0.5,
  blurRadius: 8,
  colors: [
    { t: 0.0, color: '#0A1A3A' },  // Deep blue
    { t: 0.35, color: '#5BC0F8' }, // Brand blue
    { t: 0.65, color: '#FF1F7A' }, // Magenta
    { t: 1.0, color: '#FFB869' },  // Light orange
  ],
  bloom: {
    enabled: true,
    strength: 0.15,
    radius: 20,
  },
  reducedMotion: false,
};

export interface MetaballsSystem {
  resize(): void;
  setOptions(partial: Partial<MetaballsOptions>): void;
  start(): void;
  stop(): void;
  destroy(): void;
}

export function createMetaballs(
  container: HTMLElement,
  cursor: GlobalCursor,
  sectionId: string,
  userOptions: Partial<MetaballsOptions> = {}
): MetaballsSystem {
  console.log('[Metaballs] Creating system');

  const options = { ...DEFAULT_OPTIONS, ...userOptions };

  // State
  let destroyed = false;
  let rafId: number | null = null;
  let width = 0;
  let height = 0;
  let offscreenWidth = 0;
  let offscreenHeight = 0;

  const particles: Particle[] = [];
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Canvases
  const mainCanvas = document.createElement('canvas');
  mainCanvas.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
  `;
  container.style.position = container.style.position || 'relative';
  container.insertBefore(mainCanvas, container.firstChild);

  const mainCtx = mainCanvas.getContext('2d', { alpha: true })!;

  // Offscreen canvas for field rendering
  const offscreenCanvas = document.createElement('canvas');
  const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true })!;

  // Blur kernel
  let blurKernel: BlurKernel;
  let tempImageData: ImageData;

  // Color ramp LUT
  const colorRamp = createColorRamp(options.colors);

  // Initialize particles
  function initParticles() {
    particles.length = 0;

    for (let i = 0; i < options.particleCount; i++) {
      particles.push({
        x: Math.random() * offscreenWidth,
        y: Math.random() * offscreenHeight,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius: options.baseRadius * (0.8 + Math.random() * 0.4),
        mass: 1.0,
      });
    }

    console.log('[Metaballs] Initialized', particles.length, 'particles');
  }

  // Resize
  function resize() {
    const rect = container.getBoundingClientRect();
    width = rect.width;
    height = rect.height;

    mainCanvas.width = width * dpr;
    mainCanvas.height = height * dpr;
    mainCanvas.style.width = `${width}px`;
    mainCanvas.style.height = `${height}px`;
    mainCtx.scale(dpr, dpr);

    offscreenWidth = Math.floor(width * options.resolutionScale);
    offscreenHeight = Math.floor(height * options.resolutionScale);

    offscreenCanvas.width = offscreenWidth;
    offscreenCanvas.height = offscreenHeight;

    // Recreate blur kernel and temp buffer
    blurKernel = createGaussianKernel(options.blurRadius);
    tempImageData = offscreenCtx.createImageData(offscreenWidth, offscreenHeight);

    initParticles();

    console.log('[Metaballs] Resized:', offscreenWidth, 'x', offscreenHeight);
  }

  // Update particles
  function updateParticles() {
    if (options.reducedMotion) {
      // Minimal motion
      particles.forEach(p => {
        p.x += options.flowDirection[0] * 0.1;
        p.y += options.flowDirection[1] * 0.1;

        // Wrap
        if (p.x < 0) p.x += offscreenWidth;
        if (p.x > offscreenWidth) p.x -= offscreenWidth;
        if (p.y < 0) p.y += offscreenHeight;
        if (p.y > offscreenHeight) p.y -= offscreenHeight;
      });
      return;
    }

    // Get cursor state
    const cursorState = cursor.getState();
    let localCursor: { x: number; y: number } | null = null;

    if (cursorState.insideSectionId === sectionId) {
      const local = toLocal(cursorState.clientX, cursorState.clientY, container);
      // Map to offscreen space
      localCursor = {
        x: (local.x / width) * offscreenWidth,
        y: (local.y / height) * offscreenHeight,
      };
    }

    particles.forEach(p => {
      // Apply flow field
      p.vx += options.flowDirection[0] * options.flowSpeed;
      p.vy += options.flowDirection[1] * options.flowSpeed;

      // Cursor interaction
      if (localCursor && cursorState.speed > 0.1) {
        const dx = p.x - localCursor.x;
        const dy = p.y - localCursor.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < options.cursorRadius) {
          const force = (1 - dist / options.cursorRadius) * options.cursorForce;
          const angle = Math.atan2(dy, dx);

          if (options.cursorMode === 'push') {
            p.vx += Math.cos(angle) * force;
            p.vy += Math.sin(angle) * force;
          } else {
            p.vx -= Math.cos(angle) * force;
            p.vy -= Math.sin(angle) * force;
          }
        }
      }

      // Apply damping
      p.vx *= options.damping;
      p.vy *= options.damping;

      // Integrate
      p.x += p.vx;
      p.y += p.vy;

      // Wrap bounds
      if (p.x < 0) p.x += offscreenWidth;
      if (p.x > offscreenWidth) p.x -= offscreenWidth;
      if (p.y < 0) p.y += offscreenHeight;
      if (p.y > offscreenHeight) p.y -= offscreenHeight;
    });
  }

  // Render field
  function renderField() {
    // Clear
    offscreenCtx.clearRect(0, 0, offscreenWidth, offscreenHeight);

    // Draw particles as radial gradients
    particles.forEach(p => {
      const gradient = offscreenCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');

      offscreenCtx.fillStyle = gradient;
      offscreenCtx.fillRect(
        p.x - p.radius,
        p.y - p.radius,
        p.radius * 2,
        p.radius * 2
      );
    });

    // Get image data
    const imageData = offscreenCtx.getImageData(0, 0, offscreenWidth, offscreenHeight);

    // Apply blur
    applyBlur(imageData, tempImageData, blurKernel, offscreenWidth, offscreenHeight);

    // Threshold and colorize
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3] / 255;

      if (alpha > options.threshold) {
        // Map to color ramp
        const t = Math.min(1, (alpha - options.threshold) / (1 - options.threshold));
        const color = sampleColorRamp(colorRamp, t);

        data[i] = color.r;
        data[i + 1] = color.g;
        data[i + 2] = color.b;
        data[i + 3] = 255;
      } else {
        data[i + 3] = 0;
      }
    }

    offscreenCtx.putImageData(imageData, 0, 0);
  }

  // Render to main canvas
  function renderToMain() {
    mainCtx.clearRect(0, 0, width, height);
    mainCtx.drawImage(offscreenCanvas, 0, 0, width, height);
  }

  // Animation loop
  function loop() {
    if (destroyed) return;

    updateParticles();
    renderField();
    renderToMain();

    rafId = requestAnimationFrame(loop);
  }

  // Initialize
  resize();
  window.addEventListener('resize', resize);

  // Public API
  return {
    resize,

    setOptions(partial: Partial<MetaballsOptions>) {
      Object.assign(options, partial);
    },

    start() {
      if (rafId === null) {
        rafId = requestAnimationFrame(loop);
        console.log('[Metaballs] Started');
      }
    },

    stop() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
        console.log('[Metaballs] Stopped');
      }
    },

    destroy() {
      destroyed = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('resize', resize);
      if (mainCanvas.parentNode) {
        mainCanvas.parentNode.removeChild(mainCanvas);
      }
      console.log('[Metaballs] Destroyed');
    },
  };
}

// Helper: Create color ramp LUT
function createColorRamp(stops: Array<{ t: number; color: string }>) {
  return stops.map(stop => {
    const hex = stop.color.replace('#', '');
    return {
      t: stop.t,
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  });
}

// Helper: Sample color ramp
function sampleColorRamp(
  ramp: Array<{ t: number; r: number; g: number; b: number }>,
  t: number
): { r: number; g: number; b: number } {
  t = Math.max(0, Math.min(1, t));

  for (let i = 0; i < ramp.length - 1; i++) {
    if (t >= ramp[i].t && t <= ramp[i + 1].t) {
      const local = (t - ramp[i].t) / (ramp[i + 1].t - ramp[i].t);
      return {
        r: Math.floor(ramp[i].r + (ramp[i + 1].r - ramp[i].r) * local),
        g: Math.floor(ramp[i].g + (ramp[i + 1].g - ramp[i].g) * local),
        b: Math.floor(ramp[i].b + (ramp[i + 1].b - ramp[i].b) * local),
      };
    }
  }

  return ramp[ramp.length - 1];
}
