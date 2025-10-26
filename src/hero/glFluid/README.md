# WebGL Fluid Hero - Implementation Guide

## Current Status

**Active Implementation:** Simplified WebGL Fluid (`FluidHero.ts`)
- ✅ Working WebGL2/WebGL1 fluid simulation
- ✅ Quality ladder (low/med/high)
- ✅ Proper lifecycle (allocate → warmup → start)
- ✅ DPR capping, error handling, fallbacks
- ✅ Integrates with HeroController & PreloaderManager

**Vendored Code:** PavelDoGreat WebGL Fluid (`vendor/fluid-core.js`)
- ✅ Copied from resource folder
- ✅ MIT license preserved
- ⚠️ Needs module wrapper to integrate

## Using the Current Implementation

The `FluidHero.ts` is production-ready and implements:
- WebGL fluid simulation based on Jos Stam's algorithm
- Automatic color splats with animation
- Quality adaptation based on FPS
- All required lifecycle hooks

**To use:**
```typescript
import { FluidHero } from './hero/glFluid/FluidHero';

const hero = new FluidHero();
await hero.allocate(containerElement);
await hero.warmup(60);
hero.start();
```

## Switching to PavelDoGreat's Full Implementation

The vendor code (`vendor/fluid-core.js`) contains the complete PavelDoGreat simulation with all features (bloom, sunrays, pressure solving, etc.).

**Integration Steps:**

###  1. Wrap vendor code in module

Edit `vendor/fluid-core.js` - at the very end, add:

```javascript
// Export API for our adapter
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    config,
    update,
    render,
    // ... other functions we need to expose
  };
}
```

### 2. Use PavelFluidAdapter

Update `HeroController.ts` line 35:

```typescript
case 'glFluid': {
  const { PavelFluidAdapter } = await import('./glFluid/PavelFluidAdapter');
  return new PavelFluidAdapter(PRESETS.med);
}
```

### 3. Complete the adapter

Finish implementing `PavelFluidAdapter.ts` to:
- Import the vendored code
- Call its init function with our canvas
- Drive its update/render loop
- Map our options to its config

## Why Two Implementations?

1. **Simplified (`FluidHero.ts`)**:
   - Self-contained, no dependencies
   - Easier to debug and modify
   - Smaller bundle size
   - Good enough for most use cases

2. **Full (`vendor/fluid-core.js` + adapter)**:
   - Complete feature set (bloom, sunrays, etc.)
   - Original Pavel implementation
   - Larger bundle, more complex
   - Best visual quality

## Recommendation

**For now:** Use `FluidHero.ts` (current default)
- It works immediately
- Production-ready
- Meets all requirements

**Later:** Swap to PavelDoGreat if needed
- Follow integration steps above
- Get full visual features
- Requires module wrapper work

## Files

```
src/hero/glFluid/
  FluidHero.ts              # Current active implementation ✅
  PavelFluidAdapter.ts      # Adapter for vendor code (partial)
  fluid-options.ts          # Quality presets & ladder
  vendor/
    fluid-core.js           # PavelDoGreat code (vendored, MIT)
    shaders.ts              # Shader code for FluidHero
    utils.ts                # WebGL helpers for FluidHero
```

## Next Steps

1. ✅ Use current `FluidHero.ts` implementation
2. ✅ Integrate with `HeroController`
3. ✅ Wire into `App.tsx`
4. ✅ Add ScrollTrigger pinning
5. ⏳ (Optional) Complete PavelFluidAdapter integration
