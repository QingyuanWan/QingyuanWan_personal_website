# Cursor Fix Implementation Guide

## Problem
- Cursor dot lags/shifts after scrolling
- Dot disappears in certain sections
- Coordinate drift due to scroll math

## Solution
Global fixed-position cursor with section-aware coordinate normalization.

## Files Created

### 1. `src/cursor/globalCursor.ts`
- Single `position: fixed` overlay at `z-index: 99999`
- Window-level `pointermove` listeners (no scroll math)
- Section attachment system with variants
- Auto-switches size/glow based on section

### 2. `src/cursor/coordinates.ts`
- `toLocal(clientX, clientY, element)` - viewport → element coords
- `toSim(clientX, clientY, element, simW, simH)` - viewport → simulation coords
- `toCanvas(clientX, clientY, canvas, dpr)` - viewport → canvas pixels
- `isInside(clientX, clientY, element)` - intersection test

## Integration Steps

### Step 1: Initialize Global Cursor (App.tsx)

```tsx
import { getGlobalCursor } from './cursor/globalCursor';

function App() {
  useEffect(() => {
    const cursor = getGlobalCursor();

    return () => {
      // Don't destroy - keep alive for SPA
    };
  }, []);

  return (
    <>
      {/* No more SharedCursor component - it's global now */}
      <LiquidHero />
      ...
    </>
  );
}
```

### Step 2: Update LiquidHero

```tsx
import { getGlobalCursor } from '../cursor/globalCursor';
import { toSim } from '../cursor/coordinates';

export function LiquidHero() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = getGlobalCursor();
    const container = containerRef.current;
    if (!container) return;

    // Attach section
    const detach = cursor.attach({
      id: 'hero',
      element: container,
      variant: {
        size: 18,
        color: '#A855F7',
        glow: true,
        glowSize: 36,
      },
    });

    // In fluid render loop, use cursor.getState()
    function update() {
      const state = cursor.getState();

      if (state.insideSectionId === 'hero') {
        // Convert to sim space
        const simPos = toSim(
          state.clientX,
          state.clientY,
          container,
          grid.width,
          grid.height
        );

        // Add forces at simPos.x, simPos.y
        addForce(grid.uB, grid.vB, simPos.x, simPos.y, ...);
      }
    }

    return () => {
      detach();
    };
  }, []);
}
```

### Step 3: Update DotPanel (DotGridCanvas)

```tsx
import { getGlobalCursor } from '../cursor/globalCursor';
import { toLocal } from '../cursor/coordinates';

export function DotGridCanvas() {
  useEffect(() => {
    const cursor = getGlobalCursor();
    const container = canvasRef.current?.parentElement;
    if (!container) return;

    // Attach with panel variant
    const detach = cursor.attach({
      id: 'dot-panel',
      element: container,
      variant: {
        size: 12,
        color: '#A855F7',
        glow: false,
      },
    });

    // In render loop
    function render() {
      const state = cursor.getState();

      if (state.insideSectionId === 'dot-panel') {
        // Convert to local canvas coordinates
        const local = toLocal(state.clientX, state.clientY, canvas);

        // Apply halo effect at local.x, local.y
        dots.forEach(dot => {
          const dx = dot.x - local.x;
          const dy = dot.y - local.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < HALO_RADIUS) {
            // Scale/brighten dot
          }
        });
      }
    }

    return () => {
      detach();
    };
  }, []);
}
```

### Step 4: Add to NameBubbles Section

```tsx
import { getGlobalCursor } from '../cursor/globalCursor';

export function NameBubbles() {
  useEffect(() => {
    const cursor = getGlobalCursor();
    const container = sectionRef.current;
    if (!container) return;

    const detach = cursor.attach({
      id: 'name-bubbles',
      element: container,
      variant: {
        size: 14,
        color: '#A855F7',
        glow: false,
      },
    });

    return () => {
      detach();
    };
  }, []);
}
```

## Cursor Variants by Section

```tsx
const VARIANTS = {
  hero: {
    size: 18,
    color: '#A855F7',
    glow: true,
    glowSize: 36,
  },
  'dot-panel': {
    size: 12,
    color: '#A855F7',
    glow: false,
  },
  'name-bubbles': {
    size: 14,
    color: '#A855F7',
    glow: false,
  },
  default: {
    size: 10,
    color: '#A855F7',
    glow: false,
  },
};
```

## Benefits

✅ **No scroll drift** - Uses `clientX/Y` + `position: fixed`
✅ **Always visible** - Single global overlay, never unmounts
✅ **Section-aware** - Auto-switches variants on enter/leave
✅ **Accurate coords** - Fresh `getBoundingClientRect()` every frame
✅ **60fps** - Direct style mutation, no React state in hot path
✅ **Works everywhere** - HUMAN section, dot panel, hero, all visible

## Testing

1. Scroll up/down - dot stays under OS pointer
2. Move between sections - dot changes size/glow
3. Open console - no coordinate drift warnings
4. Check HUMAN section - dot is visible
5. Performance: 60fps maintained

## Metaball Effect (Separate Task)

For the name section metaball effect, create a new component that:
- Uses `getGlobalCursor().getState()` for mouse position
- Converts to local coordinates with `toLocal()`
- Renders metaballs with march squares or shader
- Will be added in next step

## Quick Fix Checklist

- [ ] Remove old `SharedCursor.tsx` component
- [ ] Remove `src/sim/pointer.ts` (replaced by globalCursor)
- [ ] Update `LiquidHero` to use `getGlobalCursor()`
- [ ] Update `DotPanel` to use `getGlobalCursor()` + `toLocal()`
- [ ] Update `NameBubbles` to attach section
- [ ] Update `HeroPills` to attach section
- [ ] Test scroll behavior
- [ ] Verify dot visibility in all sections
- [ ] Add metaball effect component
