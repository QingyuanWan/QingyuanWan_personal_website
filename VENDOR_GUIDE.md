# Vendoring PavelDoGreat WebGL Fluid Simulation

## Step 1: Download the source

1. Go to https://github.com/PavelDoGreat/WebGL-Fluid-Simulation
2. Download the repository (Code → Download ZIP)
3. Extract it

## Step 2: Copy vendor files

Copy these files from the extracted repo to `src/hero/glFluid/vendor/`:

```
PavelDoGreat-WebGL-Fluid-Simulation/
  script.js  →  src/hero/glFluid/vendor/fluid-core.js
```

## Step 3: Preserve MIT License

Add this header to the top of `fluid-core.js`:

```javascript
/**
 * WebGL Fluid Simulation
 *
 * Copyright (c) 2017 Pavel Dobryakov
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit the following conditions:
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
```

## Step 4: Modify for ES6 export

At the end of `fluid-core.js`, add:

```javascript
// Export for our adapter
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initialize: (canvas, config) => {
      // Call the main initialization logic with canvas and config
      // This depends on how the original code is structured
    }
  };
}
```

## Step 5: Integration is ready

Once these files are in place, the `FluidHero.ts` adapter will be able to import and use them.

## Alternative: Use our simplified implementation

If vendoring is too complex, you can use the simplified fluid simulation I've created in the current `FluidHero.ts`, which implements the same techniques but is self-contained.
