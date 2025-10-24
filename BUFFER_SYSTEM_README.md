# Buffer System - Site Preloader & Resource Manager

A production-grade preloading system that ensures smooth, hitch-free first renders for heavy canvas effects.

## What It Does

1. **Detects Capabilities** - DPR, OffscreenCanvas, Workers, device tier
2. **Pre-allocates Resources** - Typed arrays, canvases, kernels, color ramps
3. **Warms Up Effects** - Runs invisible simulation steps to prime JIT
4. **Shows Progress UI** - Minimal loading overlay with smooth reveal
5. **Auto-downgrades Quality** - Reduces resolution on slow devices
6. **Manages Lifecycle** - Orchestrates allocate → prepare → warmup → start → destroy

## Architecture

```
src/buffer/
  ├── types.ts              - TypeScript interfaces
  ├── resources.ts          - Allocation helpers (arrays, canvases, kernels)
  ├── manager.ts            - Core orchestration logic
  ├── ui.tsx                - Preloader overlay component
  └── PreloaderProvider.tsx - React context wrapper
```

## Quick Start

### 1. Wrap Your App

```tsx
import { PreloaderProvider } from './buffer/PreloaderProvider';

function App() {
  return (
    <PreloaderProvider
      options={{
        ui: {
          minMs: 700,
          fadeMs: 300,
          label: 'Preparing magic...',
          showProgress: true,
        },
        warmupSteps: 60,
      }}
      skipPreload={false} // Set true for dev
    >
      <YourContent />
    </PreloaderProvider>
  );
}
```

### 2. Integrate Effects

```tsx
import { usePreloader } from './buffer/PreloaderProvider';

function MyEffect() {
  const { manager } = usePreloader();

  useEffect(() => {
    if (!manager) return;

    // Register preload tasks
    manager.addTask('my-task', () => {
      console.log('Allocating resources');
    });

    // Attach effect hooks
    manager.attachEffect('my-effect', {
      allocate: () => {
        // Create TypedArrays, canvases
      },
      prepare: () => {
        // Compile kernels, load assets
      },
      warmup: (steps) => {
        // Run N invisible simulation steps
      },
      start: () => {
        // Begin visible animation
      },
      destroy: () => {
        // Cleanup
      },
    });
  }, [manager]);
}
```

## API Reference

### BufferOptions

```tsx
interface BufferOptions {
  ui?: {
    minMs?: number;        // Min display time (default 600ms)
    fadeMs?: number;       // Fade duration (default 300ms)
    label?: string;        // Loading text
    showProgress?: boolean; // Show percentage
  };
  warmupSteps?: number;    // Warmup iterations (default 60)
  features?: {
    useWorker?: boolean;
    useOffscreen?: boolean;
    dprCap?: number;       // Max DPR (default 2)
  };
  metrics?: {
    report?: (name: string, ms: number) => void;
  };
}
```

### Effect Hooks

```tsx
interface EffectHooks {
  allocate?: () => Promise<void> | void;  // Pre-allocate buffers
  prepare?: () => Promise<void> | void;   // Compile/precompute
  warmup?: (steps: number) => Promise<void> | void; // Prime JIT
  start?: () => void;      // Start animation
  destroy?: () => void;    // Cleanup
}
```

### BufferManager Methods

```tsx
manager.addTask(name: string, fn: BufferTask): void
manager.attachEffect(name: string, hooks: EffectHooks): void
manager.run(): Promise<void>
manager.fastPath(): void  // Skip preload
manager.getCapabilities(): Capabilities
manager.getProgress(): TaskProgress[]
manager.destroy(): void
```

## Resource Helpers

### Create Canvases

```tsx
import { createCanvas } from './buffer/resources';

const canvas = createCanvas(640, 360, useOffscreen);
```

### Typed Arrays

```tsx
import { createFloatArray, createByteArray } from './buffer/resources';

const velocityU = createFloatArray(width * height, 0);
const dye = createByteArray(width * height * 4);
```

### Blur Kernels

```tsx
import { createGaussianKernel } from './buffer/resources';

const kernel = createGaussianKernel(10); // radius 10
```

### Color Ramps

```tsx
import { createColorRampLUT } from './buffer/resources';

const ramp = createColorRampLUT([
  { t: 0.0, color: [10, 26, 58] },
  { t: 0.5, color: [92, 192, 248] },
  { t: 1.0, color: [255, 184, 105] },
]);
```

### Capability Detection

```tsx
import { detectCapabilities } from './buffer/resources';

const caps = detectCapabilities(2); // DPR cap
// {
//   dpr: 2,
//   offscreenCanvas: true,
//   workers: true,
//   reducedMotion: false,
//   tier: 'high'
// }
```

### Auto Quality Downgrade

```tsx
import { autoDowngradeQuality } from './buffer/resources';

const adjusted = autoDowngradeQuality(
  frameTime,     // measured ms
  currentWidth,
  currentHeight
);
// Returns adjusted resolution + iteration count
```

## Flow Diagram

```
1. Mount PreloaderProvider
   ↓
2. Show UI Overlay
   ↓
3. Detect Capabilities
   ↓
4. Run addTask() tasks
   ↓
5. Run effect.allocate()
   ↓
6. Run effect.prepare()
   ↓
7. Run effect.warmup(steps)
   ↓
8. Wait for minMs
   ↓
9. Fade Out UI
   ↓
10. Run effect.start()
   ↓
11. Content Visible
```

## Performance Gates

### Auto-Downgrade Triggers

- **Warm-up time > 1500ms** → Reduce grid 25%
- **FPS probe < 45** → Lower iterations
- **Device tier = 'low'** → Use mobile preset

### Quality Levels

```tsx
// Desktop (high tier)
simWidth: 640, iterations: 14

// Mobile (medium tier)
simWidth: 448, iterations: 10

// Low-end (low tier)
simWidth: 384, iterations: 8
```

## Accessibility

- **Reduced Motion**: Auto-detected, skips warmup
- **ARIA Labels**: `role="status"`, `aria-live="polite"`
- **High Contrast**: White text on charcoal background
- **Screen Readers**: Progress announced via live region

## Examples

### Fluids Integration

```tsx
manager.attachEffect('fluids', {
  allocate: () => {
    createFluidGrid(640, 360);
  },
  prepare: () => {
    createGaussianKernel(10);
    createColorRampLUT(stops);
  },
  warmup: (steps) => {
    for (let i = 0; i < steps; i++) {
      stepVelocity(grid, params, 'A');
      stepVelocity(grid, params, 'B');
    }
  },
  start: () => {
    rafController.start();
  },
  destroy: () => {
    rafController.destroy();
  },
});
```

### Dot Panel Integration

```tsx
manager.attachEffect('dot-panel', {
  allocate: () => {
    // No heavy allocation needed
  },
  prepare: () => {
    // Initialize dot positions
  },
  warmup: () => {
    // No warmup needed (lightweight)
  },
  start: () => {
    // Start render loop
  },
});
```

## Development Mode

Skip preloader during development:

```tsx
<PreloaderProvider skipPreload={true}>
```

Or use fast path:

```tsx
manager.fastPath(); // Immediate start
```

## Telemetry

```tsx
<PreloaderProvider
  options={{
    metrics: {
      report: (name, ms) => {
        console.log(`[Perf] ${name}: ${ms}ms`);
        // Send to analytics
      },
    },
  }}
/>
```

Logged events:
- `fluids:allocate`
- `fluids:prepare`
- `fluids:warmup`
- `total-preload`

## Troubleshooting

**Issue**: Preloader never disappears
- **Solution**: Check console for errors in effect hooks
- Check `manager.getProgress()` for failed tasks

**Issue**: Content flashes before preloader
- **Solution**: Ensure PreloaderProvider wraps entire app

**Issue**: Warmup takes too long
- **Solution**: Reduce `warmupSteps` or check for expensive operations

**Issue**: Quality too low on desktop
- **Solution**: Adjust tier detection or override `simWidth` in options

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari/Chrome

## Credits

Built for smooth, professional portfolio experiences.
