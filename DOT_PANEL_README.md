# DotPanel - Interactive 2D Canvas Dot Field Component

A high-performance, framework-agnostic component that creates an interactive dot field background with custom cursor, radial halo effects, and magnetic heading behavior.

## Features

- **Custom cursor dot** - Small colored dot replaces native cursor over the panel
- **Radial halo effect** - Nearby dots grow and brighten as cursor approaches
- **Magnetic headings** - Text elements gently follow cursor movement
- **60fps performance** - Optimized Canvas 2D rendering with rAF loop
- **Framework-agnostic** - Core module works with vanilla JS, React, or Vue
- **Themeable** - Customize colors, sizes, and behavior via options
- **Accessible** - Respects `prefers-reduced-motion` preference
- **Responsive** - Auto-resizes and handles HiDPI displays
- **Zero dependencies** - Uses only standard platform APIs

## Installation

Copy the following files to your project:

- `src/utils/dotPanel.js` - Core framework-agnostic module
- `src/components/DotPanel.tsx` - React wrapper (optional)
- `src/components/DotPanel.vue` - Vue wrapper (optional)

## Usage

### Vanilla JavaScript

```javascript
import { createDotPanel } from './utils/dotPanel.js';

const container = document.getElementById('my-container');

const panel = createDotPanel(container, {
  backgroundColor: '#1A1A1A',
  dotColor: '#6B6B6B',
  cursorColor: '#A855F7',
  magnetElements: 'h2, h3', // CSS selector for magnetic elements
});

// Later, cleanup
panel.destroy();
```

### React

```tsx
import { DotPanel } from './components/DotPanel';

function MyComponent() {
  return (
    <DotPanel
      backgroundColor="#1A1A1A"
      dotColor="#6B6B6B"
      cursorColor="#A855F7"
      magnetSelector="h2"
      style={{ minHeight: '100vh', padding: '2rem' }}
    >
      <h2>This heading will follow your cursor!</h2>
      <p>Regular content here...</p>
    </DotPanel>
  );
}
```

### Vue

```vue
<template>
  <DotPanel
    background-color="#1A1A1A"
    dot-color="#6B6B6B"
    cursor-color="#A855F7"
    magnet-selector="h2"
    :style="{ minHeight: '100vh', padding: '2rem' }"
  >
    <h2>This heading will follow your cursor!</h2>
    <p>Regular content here...</p>
  </DotPanel>
</template>

<script setup>
import DotPanel from './components/DotPanel.vue';
</script>
```

## Options

All options are optional. Defaults provide a good starting point.

### Theming

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `backgroundColor` | string | `#1A1A1A` | Canvas background color |
| `dotColor` | string | `#6B6B6B` | Base dot color (light gray) |
| `cursorColor` | string | `#A855F7` | Custom cursor color (purple) |

### Dot Grid

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dotSpacing` | number | `24` | Pixels between dots |
| `dotBaseSize` | number | `3` | Base dot radius in pixels |

### Halo Effect

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `haloRadius` | number | `110` | Distance cursor affects dots |
| `haloMaxScale` | number | `1.8` | Maximum dot scale multiplier |
| `haloAlphaBoost` | number | `0.4` | Alpha increase in halo (0-1) |

### Cursor

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cursorSize` | number | `6` | Custom cursor radius in pixels |

### Magnetic Headings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `magnetElements` | string \| Element[] | `[]` | CSS selector or array of elements |
| `magnetRadius` | number | `150` | Distance for magnetic effect |
| `magnetStrength` | number | `8` | Max pixels element can move |
| `magnetSmoothing` | number | `0.15` | Smoothing factor (0.05-0.2, lower = smoother) |

### Performance

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `reducedMotion` | boolean \| null | `null` | Override motion preference (auto-detect if null) |

## API

### createDotPanel(container, options)

Creates a new dot panel instance.

**Parameters:**
- `container` (HTMLElement) - Container element to mount the panel
- `options` (Object) - Configuration options (see above)

**Returns:**
- Object with methods:
  - `destroy()` - Cleanup all resources, listeners, and DOM nodes
  - `updateMagnetElements(elements)` - Dynamically update magnetic elements

**Example:**

```javascript
const panel = createDotPanel(document.getElementById('hero'), {
  cursorColor: '#FF6B6B',
  magnetElements: '.magnetic-heading',
});

// Later...
panel.destroy();
```

### destroy()

Cleans up all resources created by the panel:
- Cancels animation frame
- Removes event listeners
- Removes canvas and cursor DOM elements
- Resets transforms on magnetic elements
- Restores native cursor

Always call `destroy()` when removing the panel to prevent memory leaks.

### updateMagnetElements(elements)

Dynamically update which elements have magnetic behavior.

**Parameters:**
- `elements` (string | Element[]) - CSS selector or array of elements

**Example:**

```javascript
// Change magnetic elements after initialization
panel.updateMagnetElements('.new-selector');
```

## Performance Notes

- Uses Canvas 2D API for efficient dot rendering (no per-dot DOM)
- Single `requestAnimationFrame` loop for smooth 60fps
- HiDPI support capped at 2x to balance quality and performance
- Smooth mouse tracking with configurable interpolation
- Respects `prefers-reduced-motion` to disable heavy animations
- Optimized distance calculations (only affects nearby dots)

## Accessibility

- **Reduced motion**: Disables magnetic movement and uses instant cursor tracking when user prefers reduced motion
- **Pointer events**: Canvas has `pointer-events: none` to not interfere with assistive tech
- **Native cursor fallback**: Shows native cursor when mouse leaves panel
- **No focus traps**: Keyboard navigation works normally over the panel

## Browser Support

Works in all modern browsers that support:
- Canvas 2D API
- `requestAnimationFrame`
- CSS `prefers-reduced-motion` media query
- ES6+ JavaScript

Tested on:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari/Chrome

## Examples

### Minimal Setup

```javascript
import { createDotPanel } from './utils/dotPanel.js';

createDotPanel(document.querySelector('.hero'));
```

### Custom Theme

```javascript
createDotPanel(container, {
  backgroundColor: '#0F172A', // Slate dark
  dotColor: '#94A3B8',        // Slate light
  cursorColor: '#F472B6',     // Pink cursor
  haloRadius: 150,
  haloMaxScale: 2.5,
});
```

### Multiple Panels

```javascript
const heroPanel = createDotPanel(document.querySelector('.hero'), {
  cursorColor: '#A855F7',
  magnetElements: '.hero h1',
});

const footerPanel = createDotPanel(document.querySelector('.footer'), {
  cursorColor: '#3B82F6',
  dotSpacing: 32,
});

// Cleanup both
heroPanel.destroy();
footerPanel.destroy();
```

### React with Scroll Pinning (GSAP)

```tsx
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DotPanel } from './components/DotPanel';

gsap.registerPlugin(ScrollTrigger);

function PinnedSection() {
  const sectionRef = useRef(null);

  useEffect(() => {
    ScrollTrigger.create({
      trigger: sectionRef.current,
      pin: true,
      start: 'top top',
      end: '+=80vh',
      scrub: true,
    });
  }, []);

  return (
    <DotPanel
      ref={sectionRef}
      magnetSelector="h2"
      style={{ minHeight: '100vh' }}
    >
      <h2>Pinned with Magnetic Effect</h2>
    </DotPanel>
  );
}
```

## Troubleshooting

**Issue**: Dots appear tiny or huge
- **Solution**: Check `dotBaseSize` and `dotSpacing` values match your design

**Issue**: Cursor doesn't appear
- **Solution**: Ensure container has pointer events enabled and cursor is inside bounds

**Issue**: Magnetic elements don't move
- **Solution**: Check `magnetElements` selector matches actual elements in the DOM

**Issue**: Performance issues
- **Solution**: Increase `dotSpacing` to reduce dot count, or set `reducedMotion: true`

**Issue**: Elements flicker
- **Solution**: Lower `magnetSmoothing` value for smoother interpolation (try 0.05-0.1)

## License

Free to use in your projects. No attribution required.

## Credits

Built for high-performance portfolio websites with interactive backgrounds.
