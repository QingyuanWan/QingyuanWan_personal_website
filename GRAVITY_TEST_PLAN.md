# Gravity Mode Testing Plan

## Step 1: Initial Test

**URL:** `http://localhost:5175/QingyuanWan_personal_website/?mode=gravity&debug=1`

**Watch HUD for:**
- ✅ Warm-up heartbeats counting to ~60
- ✅ Reveal within ~0.7–1.2s overlay + ≤2s first draw
- ✅ FPS ≥ 50 after reveal
- ✅ Long tasks: 0 in first 5s

**Hard refresh:** `Ctrl + Shift + R`

---

## Step 2: Performance Metrics (Record These)

After loading with `?mode=gravity&debug=1`:

| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| Overlay duration | 0.7-1.2s | ___ | ___ |
| First draw | ≤2s | ___ | ___ |
| FPS (median) | ≥55 | ___ | ___ |
| Long tasks (first 5s) | ≤1 | ___ | ___ |
| Warm-up time | ≤1.2s | ___ | ___ |

---

## Step 3: If It Stutters (Tuning Ladder)

**✅ Already Applied: Resolution reduced to 480×270 (75% of original) + iterations reduced to 12**

Apply these ADDITIONAL tuning steps in order if needed:

### Tuning 1: Further Resolution Downshift (50%)
Edit `src/sim/presets/fluidHero.ts`:
```typescript
export const GRAVITY_LAYERS_PRESET: FluidOptions = {
  simWidth: 320,  // 50% resolution
  simHeight: 180, // 50% resolution
  // ...
}
```

### Tuning 2: Reduce Iterations
```typescript
iterations: 12,  // was 14
// In mobile preset too
```

### Tuning 3: Disable Extras
```typescript
bloom: {
  enabled: false,  // was false already
  // ...
},
buoyancyB: 0.12,  // keep as is, or reduce to 0.08
```

### Tuning 4: Minimal Drift
```typescript
driftB: [0.02, 0],  // was [0.06, 0]
```

---

## Step 4: Go / No-Go Decision

**GO (Keep Gravity)** if:
- ✅ Warm-up ≤ 1.2s
- ✅ First draw ≤ 2s
- ✅ FPS median ≥ 55
- ✅ No (or ≤1) long task >50ms in first 5s

**NO-GO (Stay on Dot)** if:
- ❌ Any metric fails twice after tuning
- ❌ Move to WorkerAdapter implementation

---

## Step 5: If GO → Make Gravity Default

Edit `src/App.tsx` line 26:
```typescript
// Change from:
const [visualMode, setVisualMode] = useState<VisualMode>(urlMode || 'dot');

// To:
const [visualMode, setVisualMode] = useState<VisualMode>(urlMode || 'gravityLayers');
```

**Keep failsafes:**
- ✅ Reveal guard (2s timeout)
- ✅ Fallback to dot
- ✅ URL flag `?mode=dot` for instant fallback

---

## Current Status

**✅ GRAVITY NOW DEFAULT**
Default mode: `gravityLayers` (reduced particles - 480×270 resolution)
Dot mode fallback: Available via `?mode=dot`
Debug HUD: Available via `?debug=1`

**Test now with:**
```
http://localhost:5175/QingyuanWan_personal_website/?debug=1
```

**Or test with dot mode:**
```
http://localhost:5175/QingyuanWan_personal_website/?mode=dot&debug=1
```

---

## Acceptance Checklist (Before Making Default)

- [ ] Cold load (no debug): overlay 0.7–1.2s, smooth fade, gravity visible
- [ ] HUD off by default; console clean
- [ ] FPS stable at 55-60
- [ ] No long tasks in first 5s
- [ ] Reveal guard working (fallback to dot if timeout)
- [ ] Works on second machine/browser

