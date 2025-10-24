# Version History - Qingyuan Wan Portfolio

## Version 1.0 - Working Baseline (2025-01-23)

### ✅ Features Implemented

#### 1. Global Cursor System
- **Location**: `src/cursor/`
- **Description**: Site-wide custom purple cursor with fixed positioning
- **Status**: ✅ WORKING
- **Features**:
  - Single `position: fixed` overlay at `z-index: 99999`
  - No scroll drift (uses `clientX/clientY`)
  - Section-aware variant switching
  - Smooth EMA movement

**Sections Using Global Cursor:**
- Hero Pills (`hero-pills`) - size: 14, no glow
- Name Bubbles (`name-bubbles`) - size: 14, no glow
- Portrait Parallax - inherits default

#### 2. Hero Section
- **Location**: `src/components/HeroPills.tsx`, `src/components/ThreeHello.tsx`
- **Status**: ✅ WORKING
- **Features**:
  - Three.js 3D "HELLO" text with crystal material (#FFB869)
  - Word pills with repel + rotation effects (R=140px, MAX_OFFSET=24px)
  - GSAP animations with reduced motion support
  - Simple beige background (#E8E6E0)

#### 3. Dot Panel System (Education/Internships/Projects)
- **Location**: `src/utils/dotPanel.js`, `src/components/DotPanel.tsx`
- **Mode**: 🔧 LOCAL CURSOR MODE (independent from global cursor)
- **Status**: ✅ WORKING
- **Features**:
  - Canvas dot grid (24px spacing, 3px base size)
  - Local purple cursor dot (only visible in this section)
  - Halo effect (110px radius, 1.8x scale, +0.4 alpha boost)
  - Magnetic headings (h2 elements, 150px radius, 8px strength)
  - Own `pointermove/enter/leave` listeners
  - Fresh `getBoundingClientRect()` on every event
  - Direct coordinate mapping: `clientX - rect.left`

**Why Local Mode:**
- Original implementation used local listeners
- More reliable for canvas coordinate mapping
- No dependency on global cursor state
- Easier to debug halo alignment

#### 4. Portrait Parallax Section
- **Location**: `src/components/PortraitParallax.tsx`
- **Status**: ✅ WORKING
- **Features**: ScrollTrigger parallax + mouse tilt

#### 5. Name Bubbles Section
- **Location**: `src/components/NameBubbles.tsx`
- **Status**: ✅ WORKING
- **Features**:
  - Pinned section with floating skill bubbles
  - Click to pop & respawn
  - 8-12 bubbles with GSAP animations

### 🔧 Technical Stack

```
React 19 + TypeScript
Vite 7
GSAP 3 with ScrollTrigger
Three.js (for 3D HELLO text)
Canvas 2D API (for dot grid)
```

### 📁 Project Structure

```
src/
  cursor/
    globalCursor.ts       - Global fixed cursor system
    coordinates.ts        - Coordinate conversion utilities
  components/
    HeroPills.tsx        - Hero word pills with repel effect
    ThreeHello.tsx       - 3D HELLO text
    PortraitParallax.tsx - Portrait section
    NameBubbles.tsx      - Skill bubbles section
    DotPanel.tsx         - React wrapper for dot panel
    DotGridCanvas.tsx    - Dot grid section (Edu/Intern/Projects)
  utils/
    dotPanel.js          - Dot panel implementation (LOCAL MODE)
  styles/
    app.css              - Global styles (cursor: none)
    tokens.css           - CSS variables
```

### 🚫 Removed Features

#### LiquidHero (Fluid Simulation)
- **Reason**: Caused site to hang/freeze
- **Location**: `src/sim/` (still exists but not used)
- **Files**:
  - `src/sim/fluid2d.ts` - Navier-Stokes solver
  - `src/sim/fluidSystem.ts` - Main controller
  - `src/sim/composite.ts` - Rendering pipeline
  - `src/components/LiquidHero.tsx` - React wrapper (not imported)
- **Status**: ⚠️ DISABLED - Can be re-enabled later if performance issues resolved

#### PreloaderProvider (Buffer Manager)
- **Reason**: Caused blank page, blocking issues
- **Location**: `src/buffer/` (still exists but not used)
- **Status**: ⚠️ DISABLED

### 🐛 Known Issues

1. **Metaball effect missing** - User mentioned it was removed, needs restoration
2. **Fluid simulation disabled** - Performance issues need investigation

### 📝 Configuration Notes

**vite.config.js:**
- Base path: `/QingyuanWan_personal_website/`
- Deployed to GitHub Pages

**Global Styles (app.css):**
```css
body {
  cursor: none; /* Hides default cursor */
}
* {
  cursor: none !important;
}
```

### 🔄 Migration Path (Future)

**To integrate dot panel with global cursor:**

1. Add `cursorMode: "local" | "shared"` prop to DotPanel
2. When `mode === "shared"`:
   - Subscribe to `getGlobalCursor().getState()`
   - Map `clientX/Y` to local coords each RAF
   - Use `toLocal()` from `coordinates.ts`
   - Only run halo when `insideSectionId === "dot-panel"`
3. Keep local mode as fallback/default

**Reference Files:**
- `CURSOR_FIX_GUIDE.md` - Global cursor integration guide
- `DOT_PANEL_README.md` - Dot panel documentation (if exists)

### 📦 Backup Instructions

**Create backup:**
```bash
git add .
git commit -m "v1.0 - Working baseline with global cursor + local dot panel"
git tag v1.0
```

**Restore from this version:**
```bash
git checkout v1.0
```

**Compare with previous:**
```bash
git diff v1.0 HEAD
```

---

## Version 0.1 - Initial GSAP Site (2025-01-XX)

- Initial setup with Vite + React + GSAP
- Basic structure before major refactoring

---

**Last Updated**: 2025-01-23
**Status**: ✅ Stable & Working
**Deploy URL**: `https://qingyuanwan.github.io/QingyuanWan_personal_website/`
