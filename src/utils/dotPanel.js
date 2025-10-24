/**
 * DotPanel - Framework-agnostic 2D canvas dot field component
 *
 * Features:
 * - Custom cursor dot with radial halo effect
 * - Magnetic heading behavior (elements follow cursor)
 * - High-performance canvas rendering (60fps)
 * - Themeable via options
 * - Accessibility support (respfers-reduced-motion)
 * - Responsive and HiDPI-ready
 */

const DEFAULT_OPTIONS = {
  // Theming
  backgroundColor: '#1A1A1A',      // Dark charcoal
  dotColor: '#6B6B6B',             // Light gray
  cursorColor: '#A855F7',          // Purple

  // Dot grid
  dotSpacing: 24,                  // Pixels between dots
  dotBaseSize: 3,                  // Base dot radius

  // Halo effect
  haloRadius: 110,                 // Distance cursor affects dots
  haloMaxScale: 1.8,               // Maximum dot scale
  haloAlphaBoost: 0.4,             // Alpha increase in halo

  // Cursor
  cursorSize: 6,                   // Custom cursor radius

  // Magnetic headings
  magnetElements: [],              // Array of elements or selector string
  magnetRadius: 150,               // Distance for magnetic effect
  magnetStrength: 8,               // Max pixels to move
  magnetSmoothing: 0.15,           // Lower = smoother (0.05-0.2)

  // Performance
  reducedMotion: null,             // Auto-detect if null
};

export function createDotPanel(container, userOptions = {}) {
  console.log('[dotPanel] createDotPanel called (LOCAL MODE)', { container, userOptions });

  // Merge options
  const options = { ...DEFAULT_OPTIONS, ...userOptions };

  // Detect reduced motion preference
  const prefersReducedMotion = options.reducedMotion ??
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  console.log('[dotPanel] Reduced motion:', prefersReducedMotion);

  // State
  const state = {
    width: 0,
    height: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    dots: [],
    mouse: { x: -1000, y: -1000 },
    targetMouse: { x: -1000, y: -1000 },
    magnetElements: [],
    magnetStates: new Map(),
    isMouseInside: false,
    rafId: null,
    destroyed: false,
  };

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
  `;
  container.style.position = container.style.position || 'relative';
  container.insertBefore(canvas, container.firstChild);

  const ctx = canvas.getContext('2d', { alpha: true });

  // Create custom cursor element (local to this panel)
  const cursor = document.createElement('div');
  cursor.style.cssText = `
    position: fixed;
    width: ${options.cursorSize * 2}px;
    height: ${options.cursorSize * 2}px;
    border-radius: 50%;
    background-color: ${options.cursorColor};
    pointer-events: none;
    z-index: 10000;
    transform: translate(-50%, -50%);
    opacity: 0;
    transition: opacity 0.2s;
  `;
  document.body.appendChild(cursor);

  // Initialize dots grid
  function initDots() {
    state.dots = [];
    const cols = Math.ceil(state.width / options.dotSpacing);
    const rows = Math.ceil(state.height / options.dotSpacing);

    console.log('[dotPanel] initDots:', { width: state.width, height: state.height, cols, rows });

    for (let row = 0; row <= rows; row++) {
      for (let col = 0; col <= cols; col++) {
        state.dots.push({
          x: col * options.dotSpacing,
          y: row * options.dotSpacing,
          baseX: col * options.dotSpacing,
          baseY: row * options.dotSpacing,
        });
      }
    }

    console.log('[dotPanel] Created', state.dots.length, 'dots');
  }

  // Resize handler
  function handleResize() {
    const rect = container.getBoundingClientRect();
    state.width = rect.width;
    state.height = rect.height;

    canvas.width = state.width * state.dpr;
    canvas.height = state.height * state.dpr;
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;

    ctx.scale(state.dpr, state.dpr);

    initDots();
  }

  // Mouse handlers (LOCAL MODE - own listeners)
  function handleMouseMove(e) {
    const rect = container.getBoundingClientRect();
    state.targetMouse.x = e.clientX - rect.left;
    state.targetMouse.y = e.clientY - rect.top;

    // Update cursor position
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
  }

  function handleMouseEnter(e) {
    state.isMouseInside = true;
    cursor.style.opacity = '1';
    container.style.cursor = 'none';
    handleMouseMove(e);
  }

  function handleMouseLeave() {
    state.isMouseInside = false;
    cursor.style.opacity = '0';
    container.style.cursor = '';
    state.targetMouse.x = -1000;
    state.targetMouse.y = -1000;

    // Reset all magnetic elements
    state.magnetStates.forEach((elementState) => {
      elementState.targetOffsetX = 0;
      elementState.targetOffsetY = 0;
    });
  }

  // Initialize magnetic elements
  function initMagnetElements() {
    state.magnetElements = [];
    state.magnetStates.clear();

    const elements = typeof options.magnetElements === 'string'
      ? container.querySelectorAll(options.magnetElements)
      : options.magnetElements;

    elements.forEach((el) => {
      state.magnetElements.push(el);
      state.magnetStates.set(el, {
        offsetX: 0,
        offsetY: 0,
        targetOffsetX: 0,
        targetOffsetY: 0,
      });

      // Store original transform if any
      const originalTransform = el.style.transform || '';
      el.dataset.originalTransform = originalTransform;
    });
  }

  // Update magnetic element positions
  function updateMagneticElements() {
    if (prefersReducedMotion || !state.isMouseInside) return;

    state.magnetElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const centerX = rect.left + rect.width / 2 - containerRect.left;
      const centerY = rect.top + rect.height / 2 - containerRect.top;

      const dx = state.mouse.x - centerX;
      const dy = state.mouse.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const elementState = state.magnetStates.get(el);

      if (distance < options.magnetRadius) {
        const force = 1 - distance / options.magnetRadius;
        const angle = Math.atan2(dy, dx);

        elementState.targetOffsetX = Math.cos(angle) * force * options.magnetStrength;
        elementState.targetOffsetY = Math.sin(angle) * force * options.magnetStrength;
      } else {
        elementState.targetOffsetX = 0;
        elementState.targetOffsetY = 0;
      }

      // Smooth interpolation
      elementState.offsetX += (elementState.targetOffsetX - elementState.offsetX) * options.magnetSmoothing;
      elementState.offsetY += (elementState.targetOffsetY - elementState.offsetY) * options.magnetSmoothing;

      // Apply transform
      const originalTransform = el.dataset.originalTransform || '';
      const magnetTransform = `translate(${elementState.offsetX}px, ${elementState.offsetY}px)`;
      el.style.transform = originalTransform
        ? `${originalTransform} ${magnetTransform}`
        : magnetTransform;
    });
  }

  // Render loop
  function render() {
    if (state.destroyed) {
      console.log('[dotPanel] Render called but destroyed');
      return;
    }

    // Smooth mouse movement (LOCAL MODE - using targetMouse from events)
    const smoothing = prefersReducedMotion ? 1 : 0.15;
    state.mouse.x += (state.targetMouse.x - state.mouse.x) * smoothing;
    state.mouse.y += (state.targetMouse.y - state.mouse.y) * smoothing;

    // Clear canvas
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, state.width, state.height);

    // Draw dots with halo effect
    state.dots.forEach((dot) => {
      const dx = state.mouse.x - dot.x;
      const dy = state.mouse.y - dot.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      let scale = 1;
      let alpha = 0.08;

      if (distance < options.haloRadius) {
        const force = 1 - distance / options.haloRadius;
        scale = 1 + force * (options.haloMaxScale - 1);
        alpha = 0.08 + force * options.haloAlphaBoost;
      }

      const size = options.dotBaseSize * scale;

      ctx.fillStyle = options.dotColor;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalAlpha = 1;

    // Update magnetic elements
    updateMagneticElements();

    // Continue loop
    state.rafId = requestAnimationFrame(render);
  }

  // Setup
  console.log('[dotPanel] Starting setup (LOCAL MODE)');
  handleResize();
  initMagnetElements();

  // Event listeners (LOCAL MODE - own mouse listeners)
  container.addEventListener('mousemove', handleMouseMove);
  container.addEventListener('mouseenter', handleMouseEnter);
  container.addEventListener('mouseleave', handleMouseLeave);
  window.addEventListener('resize', handleResize);

  // Start render loop
  console.log('[dotPanel] Starting render loop');
  state.rafId = requestAnimationFrame(render);
  console.log('[dotPanel] Setup complete');

  // Public API
  return {
    destroy() {
      state.destroyed = true;

      // Cancel animation frame
      if (state.rafId) {
        cancelAnimationFrame(state.rafId);
      }

      // Remove event listeners
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);

      // Remove DOM elements
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      if (cursor.parentNode) {
        cursor.parentNode.removeChild(cursor);
      }

      // Reset magnetic elements
      state.magnetElements.forEach((el) => {
        el.style.transform = el.dataset.originalTransform || '';
        delete el.dataset.originalTransform;
      });

      // Reset container
      container.style.cursor = '';
    },

    // Optional: allow updating magnet elements dynamically
    updateMagnetElements(newElements) {
      options.magnetElements = newElements;
      initMagnetElements();
    },
  };
}
