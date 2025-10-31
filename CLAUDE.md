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

## Recent Changes & Current State (Last Updated: 2025-10-29)

### ⚠️ Important Notes for Next Agent

**TailwindCSS v4 Integration** (COMPLETED):
- **Package**: Using `@tailwindcss/postcss` (NOT `tailwindcss` directly as PostCSS plugin)
- **Config**: `postcss.config.js` uses `'@tailwindcss/postcss': {}`
- **CSS**: Tailwind directives added to `src/styles/app.css` (lines 4-6)
- **Reason**: Tailwind v4 moved PostCSS plugin to separate package to avoid conflicts

**Navbar Modernization** (COMPLETED):
- **Location**: Extracted from components to `src/pages/NavbarPage.tsx`
- **Export**: Uses `export default Navbar` (note: default export, not named export)
- **Barrel Export**: `src/pages/index.ts` uses `export { default as NavbarPage } from './NavbarPage'`
- **Styling**: Migrated from inline styles to TailwindCSS utility classes
- **Animation**: Uses Framer Motion (`motion` package) for mobile menu slide-in
- **Assets**: Menu/close SVG icons copied to `public/assets/` from resource folder
- **Responsive**: Desktop shows horizontal nav, mobile shows hamburger menu with animated toggle
- **Branding**: Logo displays "QW" (Qingyuan Wan initials), changed from "Ali"

**Custom Tailwind Classes** (NEED STYLING):
The navbar uses these custom classes that need CSS definitions:
- `.nav-ul` - Styling for navigation list
- `.nav-li` - Styling for navigation list items
- `.nav-link` - Styling for navigation links
- `.c-space` - Custom spacing/padding utility

**Pending Tasks**:
1. Define custom Tailwind classes (`.nav-ul`, `.nav-li`, `.nav-link`, `.c-space`) in app.css or create dedicated navbar.css
2. Test mobile menu animation on various screen sizes
3. Verify navbar backdrop blur works across browsers
4. Consider adding active link highlighting
5. Test keyboard navigation and accessibility

**Known Issues**:
- Node.js version warning: Vite 7.1.9 requires Node 20.19+ or 22.12+, currently using 20.17.0 (works but shows warning)
- Custom Tailwind classes may not be styled yet (needs verification in browser)

**Dev Server**: Currently running on http://localhost:5176/QingyuanWan_personal_website/

## Architecture

### Tech Stack

- React 19 + TypeScript
- Vite 7 for build tooling
- **TailwindCSS v4** with @tailwindcss/postcss plugin
- **Framer Motion** (motion package v12.23.24) for animations
- GSAP 3 with ScrollTrigger for scroll animations
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
  pages/
    NavbarPage.tsx          # ✨ NEW: Fixed navbar with Tailwind + Framer Motion (default export)
    HeroPage.tsx            # Hero page component
    RealHumanPage.tsx       # Real human section page
    EducationPage.tsx       # Education section page
    AboutPage.tsx           # About page component
    ExperiencesPage.tsx     # Experiences page component
    ProjectsPage.tsx        # Projects page component
    ContactPage.tsx         # Contact page component
    TestimonialPage.tsx     # Testimonial page component
    FooterPage.tsx          # Footer page component
    index.ts                # Barrel export for all pages
  components/
    FlowingBackground.tsx   # Animated SVG background with organic shapes
    HeroPills.tsx           # Hero section with gentle cursor repel (R=140px, MAX_OFFSET=24px)
    PortraitParallax.tsx    # "REAL HUMAN" section with scroll parallax + mouse tilt (±3°)
    NameBubbles.tsx         # Pinned section with 8-12 skill bubbles that pop/respawn
    DotGridCanvas.tsx       # Canvas grid with mouse halo + heading attraction
    SectionCards.tsx        # Generic renderer for Education/Internships/Projects
  styles/
    tokens.css              # CSS variables (colors, spacing, motion)
    app.css                 # Global styles, utilities, Tailwind directives, animation keyframes
  App.tsx                   # Main component assembly
  main.tsx                  # React entry point
public/
  assets/
    menu.svg                # ✨ NEW: Hamburger menu icon for mobile navbar
    close.svg               # ✨ NEW: Close icon for mobile navbar
postcss.config.js           # ✨ UPDATED: PostCSS config with @tailwindcss/postcss
```

### Key Interactions

**NavbarPage (src/pages/NavbarPage.tsx)** ✨ NEW:
- Fixed position navbar with `position: fixed, top: 0, z-index: 20`
- **Desktop**: Horizontal navigation with hover transitions
- **Mobile**: Hamburger menu button toggles full-screen menu with Framer Motion slide-in
- **Styling**: TailwindCSS utility classes (backdrop-blur-lg, bg-primary/40, etc.)
- **Animation**: `motion.div` with `initial={{ opacity: 0, x: -10 }}`, `animate={{ opacity: 1, x: 0 }}`
- **State**: `useState(false)` for mobile menu open/close toggle
- **Assets**: Uses SVG icons from `public/assets/` (menu.svg, close.svg)
- **Logo**: "QW" with hover color transition
- **Responsive**: Hidden on mobile (sm:hidden), shows hamburger button below 640px
- **Note**: Uses custom classes (`.nav-ul`, `.nav-li`, `.nav-link`, `.c-space`) that need CSS definitions

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

### TailwindCSS Best Practices ✨ NEW

- **Version**: TailwindCSS v4 (requires `@tailwindcss/postcss` package)
- **Config**: `postcss.config.js` must use `'@tailwindcss/postcss': {}` NOT `tailwindcss: {}`
- **Directives**: Added in `src/styles/app.css` at the top: `@tailwind base; @tailwind components; @tailwind utilities;`
- **Custom Classes**: Can be defined in `app.css` using `@layer components { ... }` or standard CSS
- **Utilities**: Use utility-first approach (e.g., `flex items-center justify-between`)
- **Responsive**: Use responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`) for breakpoints
- **Custom Colors**: Tailwind config extends with custom colors (primary, midnight, navy, etc.)
- **Animations**: Custom animations defined in tailwind config (orbit, marquee, etc.)

### Framer Motion Best Practices ✨ NEW

- **Package**: Using `motion` package v12.23.24 (modern Framer Motion)
- **Import**: `import { motion } from "motion/react"`
- **Basic Animation**: `<motion.div initial={{...}} animate={{...}} transition={{...}} />`
- **Common Props**:
  - `initial`: Starting state (e.g., `{ opacity: 0, x: -10 }`)
  - `animate`: Target state (e.g., `{ opacity: 1, x: 0 }`)
  - `transition`: Animation config (e.g., `{ duration: 1 }`)
  - `exit`: Unmount animation (requires `<AnimatePresence>` wrapper)
- **Conditional Rendering**: Use with `&&` operator for show/hide (e.g., navbar mobile menu)
- **Performance**: Use `will-change` sparingly, prefer transform/opacity animations
- **Variants**: Define animation variants for complex multi-stage animations

### Package Management Notes

**Dependencies** (package.json):
- `motion@12.23.24` - Framer Motion for animations
- `gsap@3.13.0` - GSAP for scroll animations
- `react@19.2.0` + `react-dom@19.2.0`
- `@react-three/fiber`, `@react-three/drei`, `three` - 3D graphics
- `tailwind-merge@3.3.1` - Utility for merging Tailwind classes

**Dev Dependencies**:
- `@tailwindcss/postcss@4.1.16` - Required for Tailwind v4
- `tailwindcss@4.1.16` - Core Tailwind package
- `postcss@8.5.6` + `autoprefixer@10.4.21` - CSS processing
- `vite@7.1.9` - Build tool (requires Node 20.19+ or 22.12+)
- `typescript@5.9.3` + type definitions

---

## Session Handover Summary (2025-10-29)

### What Was Accomplished

This session focused on **modernizing the navigation component** and **integrating TailwindCSS v4** into the project for future styling work.

#### 1. TailwindCSS v4 Integration ✅

**Problem**: User wanted to add TailwindCSS for future use, but Tailwind v4 requires a different PostCSS plugin setup than previous versions.

**Solution**:
- Installed `@tailwindcss/postcss` package (NOT just `tailwindcss`)
- Created `postcss.config.js` with `'@tailwindcss/postcss': {}` plugin
- Added Tailwind directives to `src/styles/app.css` (lines 4-6)
- Existing `tailwind.config.js` already had custom colors and animations configured

**Files Modified**:
- `package.json` - Added dev dependency
- `postcss.config.js` - Created new file
- `src/styles/app.css` - Added `@tailwind` directives

**Result**: TailwindCSS v4 is fully functional and ready to use throughout the project.

#### 2. Navbar Component Modernization ✅

**Problem**: User wanted to replace the existing navbar with a modern version using TailwindCSS classes and Framer Motion animations.

**Solution**:
- Extracted navbar from `components` folder to `src/pages/NavbarPage.tsx`
- Replaced inline styles with TailwindCSS utility classes
- Added Framer Motion (`motion` package) for mobile menu slide-in animation
- Copied SVG icons (menu.svg, close.svg) from resource folder to `public/assets/`
- Changed logo from "Ali" to "QW" (Qingyuan Wan initials)
- Used responsive design with hamburger menu for mobile

**Files Modified**:
- `src/pages/NavbarPage.tsx` - Complete rewrite with Tailwind + Framer Motion
- `src/pages/index.ts` - Updated export to `export { default as NavbarPage }`
- `src/App.tsx` - Uses NavbarPage from pages folder (line 338)
- `public/assets/menu.svg` - Copied from resource folder
- `public/assets/close.svg` - Copied from resource folder

**Technical Details**:
- Component uses `export default Navbar` (default export pattern)
- Mobile menu animates with `initial={{ opacity: 0, x: -10 }}`, `animate={{ opacity: 1, x: 0 }}`
- Fixed position with `backdrop-blur-lg` and `bg-primary/40` for glassmorphism effect
- Responsive breakpoint at `sm:` (640px)
- State management with `useState(false)` for menu toggle

**Result**: Modern, responsive navbar with smooth animations working in dev environment.

### Outstanding Issues & Next Steps

#### 🔴 Priority 1: Style Custom Navbar Classes

The navbar uses these custom CSS classes that are **NOT YET DEFINED**:
- `.nav-ul` - Needs styling for navigation list
- `.nav-li` - Needs styling for list items
- `.nav-link` - Needs styling for links
- `.c-space` - Custom spacing utility

**Recommendation**: Add these to `src/styles/app.css` using Tailwind's `@layer components` directive:

```css
@layer components {
  .nav-ul {
    @apply flex gap-8 list-none p-0 m-0;
  }

  .nav-li {
    /* Add custom styles */
  }

  .nav-link {
    @apply text-neutral-400 hover:text-white transition-colors duration-300 text-base font-medium no-underline;
  }

  .c-space {
    @apply px-4 py-2;
  }
}
```

#### 🟡 Priority 2: Testing & Verification

1. **Visual Testing**: Verify navbar appearance in browser (custom classes may not be styled)
2. **Mobile Testing**: Test hamburger menu animation on various screen sizes
3. **Browser Testing**: Verify backdrop-blur works across browsers
4. **Accessibility**: Test keyboard navigation and screen reader support

#### 🟢 Priority 3: Enhancements

1. **Active Link Highlighting**: Add active state for current page
2. **Smooth Scroll**: Implement smooth scrolling for anchor links
3. **Close on Link Click**: Mobile menu should close when link is clicked (partially implemented)
4. **Theme Toggle**: Consider adding dark/light mode toggle

### Environment & Configuration

**Current Dev Server**: http://localhost:5176/QingyuanWan_personal_website/

**Git Status**:
- Modified: `index.html`, `src/App.tsx`, `src/components/HeroPills.tsx`, `src/styles/tokens.css`
- Branch: `main`
- Recent commit: `9bcc875 complete interactive rending intro`

**Known Warnings**:
- Node.js version: Using 20.17.0, Vite recommends 20.19+ or 22.12+ (still works)
- npm audit: 1 moderate severity vulnerability (non-blocking)

### File Locations Reference

**Key Files to Know**:
- Navbar: `src/pages/NavbarPage.tsx` (default export)
- Main App: `src/App.tsx` (imports NavbarPage on line 6, uses on line 338)
- Styles: `src/styles/app.css` (Tailwind directives + global styles)
- PostCSS: `postcss.config.js` (must use `@tailwindcss/postcss`)
- Assets: `public/assets/menu.svg`, `public/assets/close.svg`

### Commands for Next Agent

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# View dev server output
# Server running at: http://localhost:5176/QingyuanWan_personal_website/
```

### Testing Checklist for Next Agent

- [ ] Visual inspection of navbar in browser
- [ ] Test mobile menu toggle (hamburger icon)
- [ ] Verify Framer Motion animation works smoothly
- [ ] Check if custom classes (.nav-ul, .nav-li, .nav-link, .c-space) are styled
- [ ] Test all navigation links (#home, #about, #work, #contact)
- [ ] Verify logo ("QW") displays and links to home
- [ ] Test responsive behavior at different breakpoints
- [ ] Check backdrop blur and glassmorphism effect
- [ ] Verify z-index layering (navbar should be on top)
- [ ] Test keyboard navigation (Tab, Enter)

### Context for Future Work

**Why These Changes**:
- User is modernizing the portfolio website with utility-first CSS approach
- TailwindCSS provides faster styling workflow and smaller bundle size
- Framer Motion adds professional animations to improve UX
- Component structure moving toward page-based organization

**Design Direction**:
- Moving from CSS-in-JS inline styles to Tailwind utility classes
- Embracing modern React patterns (default exports, barrel exports)
- Focus on responsive design and mobile-first approach
- Maintaining accessibility and reduced-motion support

**What User Can Work On**:
- TailwindCSS is ready for styling other components
- Navbar structure is in place, just needs custom class styling
- Can continue modernizing other components with similar approach

---

**End of Handover Summary** - Next agent should start by defining the custom navbar CSS classes and testing the navbar in the browser.
