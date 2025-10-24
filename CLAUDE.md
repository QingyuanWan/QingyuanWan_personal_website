# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Single-page portfolio website for Qingyuan Wan built with React (Vite) + TypeScript + GSAP. Features interactive animations including cursor-avoiding tiles, parallax effects, skill bubbles, and a performant canvas dot grid. Deployed to GitHub Pages at `/QingyuanWan_personal_website/`.

## Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build for production (outputs to dist/)
npm run build

# Preview production build locally
npm run preview
```

## Build and Deployment

- **Build output**: `dist/` directory
- **Base path**: `/QingyuanWan_personal_website/` (vite.config.js:6) — must match GitHub repo name
- **Auto-deployment**: Pushes to `main` trigger GitHub Actions (.github/workflows/deploy.yml)
- **Node version**: 20

## Architecture

### Tech Stack

- React 19 + TypeScript
- Vite 7 for build tooling
- GSAP 3 with ScrollTrigger for animations
- Canvas API for dot grid

### Visual System

**Color Palette** (CSS tokens in src/styles/tokens.css):
- Background: `--bg` (#E8E6E0 - warm beige), `--panel` (#FFFFFF - white)
- Accents: `--blue` (#5BC0F8), `--orange` (#FF9F1C)
- Text: `--text` (#1A1A1A - dark), `--muted` (#6B6B6B - gray)
- Effects: `--glow-blue`, `--glow-orange`

**Flowing Background** (src/components/FlowingBackground.tsx):
- Fixed-position SVG with animated organic shapes
- Blue, white, and orange gradient blobs that flow and float
- Smooth animations (20-30s duration) with reduced-motion support
- Creates depth without interfering with content

**Motion**: Uses `prefers-reduced-motion` media query. When enabled, disables repel/parallax/tilt/flowing animations and uses simple fades.

### Component Structure

```
src/
  content/
    data.ts                 # All text content (hero, skills, education, internships, projects)
  hooks/
    useReducedMotion.ts     # Accessibility hook for motion preferences
  components/
    FlowingBackground.tsx   # Animated SVG background with organic shapes
    HeroPills.tsx           # Hero section with gentle cursor repel (R=140px, MAX_OFFSET=24px)
    PortraitParallax.tsx    # "REAL HUMAN" section with scroll parallax + mouse tilt (±3°)
    NameBubbles.tsx         # Pinned section with 8-12 skill bubbles that pop/respawn
    DotGridCanvas.tsx       # Canvas grid with mouse halo + heading attraction
    SectionCards.tsx        # Generic renderer for Education/Internships/Projects
  styles/
    tokens.css              # CSS variables (colors, spacing, motion)
    app.css                 # Global styles, utilities, and animation keyframes
  App.tsx                   # Main component assembly
  main.tsx                  # React entry point
```

### Key Interactions

**HeroPills (src/components/HeroPills.tsx)**:
- Tokenizes "HELLO" as individual letter tiles (alternating square/round corners, all blue)
- Remaining lines as word pills (alternating orange/blue per line)
- Gentle repel: tiles move ≤24px away from cursor within 140px radius
- Uses `gsap.quickTo()` for smooth motion; entrance stagger with GSAP `from()`

**PortraitParallax (src/components/PortraitParallax.tsx)**:
- 2 gradient blobs parallax at different rates using ScrollTrigger `scrub: true`
- Mouse tilt applies `rotateX/Y` transform (max ±3°) with perspective
- Respects reduced motion (disables parallax/tilt)

**NameBubbles (src/components/NameBubbles.tsx)**:
- Section pinned for 80vh using ScrollTrigger
- Maintains 8-12 bubbles; spawns from center to random ring position (radius 120-280px)
- Click → pop animation (scale 0, 0.2s) → immediately respawn with new skill
- Gentle y-axis float (±6px) with yoyo repeat

**DotGridCanvas (src/components/DotGridCanvas.tsx)**:
- Canvas grid: 24px spacing, 3px dots, base alpha 0.08
- Mouse halo (110px radius): scales dots to 1.8x, boosts alpha +0.4
- Heading attraction: dots within 150px of h2 elements bias toward heading center by 5-10%
- Optimized with rAF loop; only updates affected dots
- Renders Education/Internships/Projects using SectionCards

### Data Management

All content lives in `src/content/data.ts`:
- `hero`: letters array + text lines
- `skills`: skill names for bubbles
- `education`, `internships`, `projects`: structured data for cards

To update portfolio content, edit this single file.

### GSAP Best Practices

- Always use `useLayoutEffect` + `gsap.context()` in components
- Call `ctx.revert()` on unmount to clean up
- Use `gsap.quickTo()` for high-frequency animations (repel)
- Keep transforms GPU-friendly: translate, scale, opacity only
- Respect `useReducedMotion()` hook in all animated components
