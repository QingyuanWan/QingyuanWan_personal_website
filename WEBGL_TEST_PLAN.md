# WebGL Fluid Testing Plan

## Overview

WebGL-based gravity fluid simulation with:
- WebGL2/WebGL1 capability detection
- Automatic quality ladder (auto-downgrades if slow)
- Context loss/restore handlers
- Safe fallback to Dot canvas on any failure
- No crashes, ever

---

## Step 1: Initial Test (WebGL Default)

**URL:** `http://localhost:5175/QingyuanWan_personal_website/?debug=1`

**What to watch:**
1. **Console logs:**
   - `[bootGL] Starting WebGL initialization`
   - `[bootGL] ✓ WebGL2 context created` (or WebGL1 fallback)
   - `[bootGL] Capabilities: { isWebGL2: true, hasFloatTextures: true, ... }`
   - `[FluidRenderer] Compiling shaders...`
   - `[FluidRenderer] ✓ Compiled 'advection' shader` (and others)
   - `[FluidRenderer] Creating textures (NxN)`
   - `[GLGravityHero] Renderer ready (waiting for warmup)`

2. **HUD metrics:**
   - ✅ Phase: `allocate:gl` → `warmup:gl (60)` → `running:gl`
   - ✅ FPS: ≥ 55 (green)
   - ✅ Long tasks: 0 in first 5s
   - ✅ Mode: `glGravity`

3. **Visual:**
   - Preloader overlay shows for ~0.7-1.2s with loading ring
   - Smooth fade-out
   - WebGL canvas renders with gravity-driven fluid in rounded glass container
   - 3-5 colored blobs (blue/purple/orange) slowly rise and separate

4. **Hard refresh:** `Ctrl + Shift + R`

---

## Step 2: Performance Metrics (Record These)

After loading with `?debug=1`:

| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|--------------|
| Overlay duration | 0.7-1.2s | ___ | ___ |
| First draw | ≤2s | ___ | ___ |
| FPS (median) | ≥55 | ___ | ___ |
| Long tasks (first 5s) | ≤1 | ___ | ___ |
| Warm-up time | ≤1.2s | ___ | ___ |
| Quality tier | high (0.75×) | ___ | ___ |

---

## Step 3: Quality Ladder Test

**Simulate slow device:**
1. Open DevTools → Performance tab
2. Set CPU throttling to 6x slowdown
3. Refresh page
4. Watch HUD for quality tier changes

**Expected behavior:**
- Starts at `high` tier (0.75× resolution, 12 iterations)
- If FPS drops below ~55, auto-downgrades to `medium` (0.62×, 10 iterations)
- If still slow, downgrades to `low` (0.5×, 8 iterations)
- Console logs: `[FluidRenderer] Frame time XXms > 18ms, downgrading quality`

**Success criteria:**
- ✅ Quality ladder activates automatically
- ✅ FPS stabilizes at ≥50 after downgrade
- ✅ No crashes or visual glitches

---

## Step 4: Context Loss Test

**Simulate WebGL context loss:**
1. Open DevTools → Console
2. Run: `document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()`
3. Watch console

**Expected behavior:**
- Console: `[bootGL] ⚠ WebGL context lost`
- Renderer stops gracefully
- No crashes or errors
- (Optional: fallback to Dot mode)

**Success criteria:**
- ✅ Context loss handled gracefully
- ✅ No JavaScript errors
- ✅ Page remains usable

---

## Step 5: Fallback Tests

### Test A: Force Dot mode
**URL:** `http://localhost:5175/QingyuanWan_personal_website/?mode=dot&debug=1`

**Expected:**
- Dot canvas renders (not WebGL)
- HUD shows Mode: `dot`
- Console: `[DotPanel] Initializing panel`

### Test B: Force Canvas2D gravity mode
**URL:** `http://localhost:5175/QingyuanWan_personal_website/?mode=gravity&debug=1`

**Expected:**
- Canvas2D fluid renders (not WebGL)
- HUD shows Mode: `gravityLayers`
- Console: `[GravityHero] Mounting`

### Test C: WebGL with reduced warmup
**URL:** `http://localhost:5175/QingyuanWan_personal_website/?mode=glGravity&debug=1&warmup=30`

**Expected:**
- WebGL renders with only 30 warmup steps (faster init)
- FPS may be slightly lower initially (JIT not fully warmed)

---

## Step 6: Cross-Browser Test

Test on multiple browsers/devices:

| Browser/Device | WebGL Support | FPS | Quality Tier | Pass/Fail |
|----------------|---------------|-----|--------------|-----------|
| Chrome Desktop | WebGL2 | ___ | ___ | ___ |
| Firefox Desktop | WebGL2 | ___ | ___ | ___ |
| Safari Desktop | WebGL2/1 | ___ | ___ | ___ |
| Chrome Mobile | WebGL2/1 | ___ | ___ | ___ |
| Safari iOS | WebGL1 | ___ | ___ | ___ |

**Acceptance:**
- ✅ Works on WebGL2 and WebGL1
- ✅ Auto-fallback to Dot if no WebGL support
- ✅ No console errors on any browser

---

## Step 7: Shader Compile Test (Manual)

**Check console for shader compile errors:**
```
[FluidRenderer] ✓ Compiled 'advection' shader
[FluidRenderer] ✓ Compiled 'divergence' shader
[FluidRenderer] ✓ Compiled 'pressure' shader
[FluidRenderer] ✓ Compiled 'projection' shader
[FluidRenderer] ✓ Compiled 'buoyancy' shader
[FluidRenderer] ✓ Compiled 'composite' shader
[FluidRenderer] ✓ Compiled 'clear' shader
[FluidRenderer] ✓ Compiled 'splat' shader
```

**If any shader fails:**
- Console shows: `[shaderUtils] Shader compile failed: <error log>`
- App falls back to Dot mode
- No crash

---

## Step 8: FBO Validation Test

**Check console for FBO completeness:**
```
[FluidRenderer] ✓ Textures created
```

**If FBO is incomplete:**
- Console shows: `[shaderUtils] Framebuffer 'velocity.read' incomplete: <error>`
- App falls back to Dot mode
- No crash

---

## Current Status

**✅ WEBGL NOW DEFAULT**
Default mode: `glGravity` (WebGL fluid with auto quality ladder)
Fallback modes:
- `?mode=dot` - Dot canvas (stable)
- `?mode=gravity` - Canvas2D fluid (old implementation)

**Test now with:**
```
http://localhost:5175/QingyuanWan_personal_website/?debug=1
```

---

## Go / No-Go Decision

**GO (Keep WebGL as default)** if:
- ✅ WebGL initializes successfully on all test browsers
- ✅ Warm-up ≤ 1.2s
- ✅ First draw ≤ 2s
- ✅ FPS median ≥ 55 (or quality ladder stabilizes at ≥50)
- ✅ No long tasks >50ms in first 5s
- ✅ Context loss handled gracefully
- ✅ Shader/FBO errors trigger clean fallback
- ✅ No crashes on any browser

**NO-GO (Revert to Canvas2D gravity or Dot)** if:
- ❌ WebGL fails to initialize on major browsers
- ❌ FPS consistently <50 even after quality ladder
- ❌ Shader compile errors on any browser
- ❌ Context loss causes crashes
- ❌ Long tasks >50ms persist

---

## Acceptance Checklist (Before Shipping)

- [ ] Cold load (no debug): overlay 0.7–1.2s, smooth fade, gravity visible
- [ ] HUD off by default; console clean (no warnings/errors)
- [ ] FPS stable at 55-60 (or quality ladder stabilizes)
- [ ] No long tasks in first 5s
- [ ] Reveal guard working (fallback to dot if timeout)
- [ ] Works on Chrome, Firefox, Safari (desktop + mobile)
- [ ] Context loss handled gracefully
- [ ] All shaders compile successfully
- [ ] All FBOs validate as complete
- [ ] Fallback to Dot works reliably

---

## Known Limitations

1. **WebGL1 Performance**: Slower than WebGL2 due to 8-bit textures (no half-float in some browsers)
2. **Mobile Safari**: May require quality tier downgrade to `low` (0.5×)
3. **Context Loss**: Cannot restore WebGL state; falls back to Dot
4. **DPR Cap**: Render targets capped at 2.0× device pixel ratio for performance

---

## Debugging Tips

**If WebGL fails to initialize:**
- Check: `[bootGL] ✗ No WebGL support - use Dot fallback`
- Solution: Use `?mode=dot` to bypass WebGL

**If shaders fail to compile:**
- Check: `[shaderUtils] Shader compile failed: <info log>`
- Look for GLSL syntax errors or unsupported features
- Test on different browser (shader compiler varies)

**If FPS is low:**
- Check: `[FluidRenderer] Frame time XXms > 18ms`
- Wait for quality ladder to activate
- Try `?warmup=30` for faster init (less JIT warmup)

**If context is lost:**
- Check: `[bootGL] ⚠ WebGL context lost`
- Normal on mobile when app backgrounds
- App should fallback or pause gracefully

---

## Performance Baseline

**Target specs (desktop):**
- WebGL2, 1920×1080, DPR 1.0
- High tier (0.75× = 1440×810 sim)
- FPS: 60 ± 5
- Frame time: ~16ms
- Long tasks: 0

**Target specs (mobile):**
- WebGL1/2, 375×667, DPR 2.0
- Medium/Low tier (0.5× = 375×335 sim)
- FPS: 50 ± 10
- Frame time: ~20ms
- Long tasks: ≤1
