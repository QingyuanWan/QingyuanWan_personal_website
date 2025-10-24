# Liquid Hero - Canvas 2D Fluid Simulation

A professional-grade fluid simulation hero background using stable Navier-Stokes solver (Jos Stam style). Features interactive cursor forces, dye advection, bloom effects, and brand color gradients.

## Features

- **Stable Fluids Simulation** - Full 2D Navier-Stokes solver with velocity/pressure projection
- **Dual Layer System** - Base layer (dark, viscous) + Top layer (interactive, lighter)
- **Cursor Interaction** - Mouse movement creates forces and injects colored dye
- **Brand Color Ramp** - Deep blue → magenta → light orange gradient
- **Visual Effects** - Bloom (screen blend) and bottom feathering
- **60fps Performance** - Fixed timestep with sub-stepping, optimized Float32Arrays
- **Shared Cursor State** - Unified pointer tracking across hero and dot panel
- **Accessibility** - Respects `prefers-reduced-motion`
- **Responsive** - Auto-adjusts resolution for mobile/desktop

## Architecture

```
src/sim/
  ├── pointer.ts          - Shared pointer state with velocity tracking
  ├── colorramp.ts        - Gradient color sampling utilities
  ├── fluid2d.ts          - Navier-Stokes solver core
  ├── composite.ts        - Rendering with bloom/feather
  ├── raf.ts              - Fixed timestep animation loop
  ├── fluidSystem.ts      - Main controller (integrates all modules)
  └── presets/
      └── fluidHero.ts    - Default configuration presets

src/components/
  ├── LiquidHero.tsx      - React wrapper for fluid background
  └── SharedCursor.tsx    - Visual cursor dot component
```

## Installation

All required files are already in the project. No external dependencies needed.

## Usage

### Basic Setup

```tsx
import { LiquidHero } from './components/LiquidHero';
import { SharedCursor } from './components/SharedCursor';
import { useState } from 'react';
import type { PointerState } from './sim/pointer';

function App() {
  const [pointer, setPointer] = useState<PointerState | null>(null);

  return (
    <>
      {/* Shared cursor (follows pointer across all sections) */}
      {pointer && (
        <SharedCursor
          pointer={pointer}
          size={16}
          color="#A855F7"
          glow={true}
        />
      )}

      {/* Hero with fluid background */}
      <LiquidHero
        onPointerReady={setPointer}
        style={{ minHeight: '100vh' }}
      >
        <h1>Your Hero Content</h1>
      </LiquidHero>
    </>
  );
}
```

### Advanced Configuration

```tsx
<LiquidHero
  onPointerReady={setPointer}
  style={{ minHeight: '100vh' }}
  options={{
    // Simulation resolution
    simWidth: 720,
    simHeight: 405,

    // Solver quality
    iterations: 16,

    // Viscosity (higher = slower fluid)
    viscosityA: 0.004,  // Base layer
    viscosityB: 0.0008, // Top layer

    // Cursor interaction
    cursorRadius: 80,
    cursorForce: 60,

    // Visual effects
    bloom: {
      enabled: true,
      strength: 0.2,
      radius: 12,
    },
    feather: {
      enabled: true,
      heightPx: 200,
      targetColor: '#E8C69B',
    },
  }}
>
  <div>Hero Content</div>
</LiquidHero>
```

### Custom Color Ramp

```tsx
import { createColorRamp } from './sim/colorramp';

const customRamp = createColorRamp([
  { t: 0.0, color: '#1A237E' },
  { t: 0.5, color: '#E91E63' },
  { t: 1.0, color: '#FFF176' },
]);

<LiquidHero
  options={{ ramp: customRamp }}
>
  ...
</LiquidHero>
```

## Options Reference

### FluidOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `simWidth` | number | 640 (desktop), 448 (mobile) | Simulation grid width |
| `simHeight` | number | Auto (by aspect) | Simulation grid height |
| `dt` | number | 1/60 | Fixed timestep |
| `iterations` | number | 14 | Jacobi solver iterations (12-20 recommended) |

### Layer A (Base)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `viscosityA` | number | 0.003 | Viscosity (0.002-0.005) |
| `dyeDiffA` | number | 0.0003 | Dye diffusion (0-0.0005) |

### Layer B (Interactive)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `viscosityB` | number | 0.0006 | Viscosity (0.0003-0.001) |
| `dyeDiffB` | number | 0.0001 | Dye diffusion (0-0.0003) |
| `buoyancyB` | number | 0.12 | Upward force (0-0.25) |
| `driftB` | [number, number] | [0.08, 0.0] | Lateral drift [x, y] |

### Cursor Interaction

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cursorRadius` | number | 64 | Influence radius (40-80) |
| `cursorForce` | number | 48 | Force magnitude (20-80) |
| `cursorDye` | [number, number, number] | [92, 192, 248] | RGB color to inject |

### Visual Effects

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ramp` | ColorRamp | Brand ramp | Color gradient function |
| `bloom.enabled` | boolean | true | Enable bloom effect |
| `bloom.strength` | number | 0.18 | Bloom intensity (0-1) |
| `bloom.radius` | number | 10 | Blur radius |
| `feather.enabled` | boolean | true | Enable bottom feather |
| `feather.heightPx` | number | 160 | Feather height |
| `feather.targetColor` | string | '#E8C69B' | Bottom color (sand) |

## API

### LiquidHero Component

```tsx
interface LiquidHeroProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  options?: Partial<FluidOptions>;
  onPointerReady?: (pointer: PointerState) => void;
}
```

### SharedCursor Component

```tsx
interface SharedCursorProps {
  pointer: PointerState;
  size?: number;
  color?: string;
  glow?: boolean;
  className?: string;
}
```

### FluidSystem (Low-level API)

```tsx
import { createFluid } from './sim/fluidSystem';
import { createPointer } from './sim/pointer';

const pointer = createPointer(element);
const fluid = createFluid(container, pointer, options);

// Manual dye injection
fluid.inject(x, y, [255, 100, 50], strength);

// Update options
fluid.setOptions({ cursorForce: 60 });

// Cleanup
fluid.destroy();
```

## Performance

### Optimization Tips

1. **Lower resolution on mobile** - Default presets auto-adjust
2. **Reduce iterations** - 10-12 for mobile, 14-18 for desktop
3. **Disable bloom on mobile** - Saves ~20% GPU time
4. **Use reduced motion** - Skips simulation entirely

### Benchmarks

- **Desktop (640x360, 14 iterations)**: ~60fps on modern laptops
- **Mobile (448x252, 10 iterations)**: ~50-60fps on recent phones
- **Memory**: ~8-12MB for grid arrays

### Profiling

The system logs to console:
```
[FluidSystem] Creating fluid system
[FluidSystem] Resized: 1920 x 1080
[FluidSystem] Started
```

## Tuning Guide

### Slower, More Viscous Fluid

```tsx
options={{
  viscosityA: 0.006,
  viscosityB: 0.002,
  dyeDiffA: 0.0005,
  dyeDiffB: 0.0003,
}}
```

### Faster, More Chaotic

```tsx
options={{
  viscosityA: 0.001,
  viscosityB: 0.0002,
  cursorForce: 80,
  driftB: [0.15, 0.0],
}}
```

### Subtle Background (Low Motion)

```tsx
options={{
  cursorForce: 20,
  driftB: [0.02, 0.0],
  buoyancyB: 0.05,
  bloom: { enabled: false },
}}
```

## Accessibility

The system automatically detects `prefers-reduced-motion`:

- **Reduced Motion ON**: Disables simulation, shows static gradient
- **Reduced Motion OFF**: Full fluid animation

Override manually:
```tsx
options={{ reducedMotion: true }}
```

## Troubleshooting

**Issue**: Fluid looks choppy or slow
- **Solution**: Lower `simWidth`/`simHeight` or reduce `iterations`

**Issue**: Colors look washed out
- **Solution**: Increase `cursorDye` values or adjust `ramp` stops

**Issue**: Cursor doesn't inject dye
- **Solution**: Check `pointer.inside` is true; verify container has pointer events

**Issue**: Memory leak after unmount
- **Solution**: Ensure `destroy()` is called (React wrapper handles this)

**Issue**: Bloom looks too intense
- **Solution**: Lower `bloom.strength` to 0.1-0.15

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari/Chrome (iOS 14+, Android 10+)

Requires:
- Canvas 2D API
- Float32Array
- requestAnimationFrame

## Credits

- **Jos Stam** - Stable Fluids algorithm (2003)
- **Mike Ash** - Fluid simulation tutorials
- Built for high-performance portfolio hero sections

## License

Free to use in your projects.
