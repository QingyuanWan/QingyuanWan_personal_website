/**
 * Head Hints - Critical Path Optimization
 *
 * Injects <link rel="preload">, <link rel="modulepreload">, <link rel="preconnect">
 * and sets fetchpriority on images for optimal loading.
 *
 * Based on:
 * - https://web.dev/preload-critical-assets/
 * - https://web.dev/modulepreload/
 * - https://web.dev/fetch-priority/
 */

export interface HeadHintsConfig {
  // Preload critical assets
  preloads?: Array<{
    href: string;
    as: 'style' | 'font' | 'script' | 'image';
    type?: string; // e.g., 'font/woff2'
    crossorigin?: '' | 'anonymous' | 'use-credentials';
  }>;

  // Module preload for entry chunks
  modulePreloads?: string[];

  // Preconnect to external domains
  preconnects?: string[];

  // LCP image selector
  lcpImageSelector?: string;

  // Debug mode
  debug?: boolean;
}

const injectedLinks = new Set<string>();

/**
 * Inject head hints
 */
export function inject(config: HeadHintsConfig): void {
  const { preloads = [], modulePreloads = [], preconnects = [], lcpImageSelector, debug = false } = config;

  console.log('[HeadHints] Injecting hints', { debug });

  // Inject preconnects
  preconnects.forEach((href) => {
    injectPreconnect(href, debug);
  });

  // Inject preloads
  preloads.forEach((preload) => {
    injectPreload(preload, debug);
  });

  // Inject module preloads
  modulePreloads.forEach((href) => {
    injectModulePreload(href, debug);
  });

  // Set LCP image fetchpriority
  if (lcpImageSelector) {
    setLCPImagePriority(lcpImageSelector, debug);
  }

  // Monitor unused preloads
  if (debug) {
    monitorUnusedPreloads();
  }
}

/**
 * Inject preconnect link
 */
function injectPreconnect(href: string, debug: boolean): void {
  const key = `preconnect:${href}`;
  if (injectedLinks.has(key)) return;

  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = href;
  link.crossOrigin = 'anonymous';

  document.head.appendChild(link);
  injectedLinks.add(key);

  if (debug) {
    console.log(`[HeadHints] Preconnect: ${href}`);
  }
}

/**
 * Inject preload link
 */
function injectPreload(
  config: {
    href: string;
    as: string;
    type?: string;
    crossorigin?: string;
  },
  debug: boolean
): void {
  const key = `preload:${config.href}`;
  if (injectedLinks.has(key)) return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = config.href;
  link.as = config.as;

  if (config.type) {
    link.type = config.type;
  }

  if (config.crossorigin) {
    link.crossOrigin = config.crossorigin;
  }

  document.head.appendChild(link);
  injectedLinks.add(key);

  if (debug) {
    console.log(`[HeadHints] Preload: ${config.href} (as ${config.as})`);
  }
}

/**
 * Inject module preload link
 */
function injectModulePreload(href: string, debug: boolean): void {
  const key = `modulepreload:${href}`;
  if (injectedLinks.has(key)) return;

  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.href = href;

  document.head.appendChild(link);
  injectedLinks.add(key);

  if (debug) {
    console.log(`[HeadHints] Module preload: ${href}`);
  }
}

/**
 * Set fetchpriority="high" on LCP image
 */
function setLCPImagePriority(selector: string, debug: boolean): void {
  const img = document.querySelector<HTMLImageElement>(selector);

  if (img) {
    img.fetchPriority = 'high';

    if (debug) {
      console.log(`[HeadHints] Set fetchpriority="high" on LCP image:`, selector);
    }
  } else if (debug) {
    console.warn(`[HeadHints] LCP image not found: ${selector}`);
  }
}

/**
 * Set fetchpriority="low" and loading="lazy" on below-the-fold images
 */
export function setLowPriorityImages(selector: string = 'img[data-below-fold]', debug: boolean = false): void {
  const images = document.querySelectorAll<HTMLImageElement>(selector);

  images.forEach((img) => {
    img.loading = 'lazy';
    img.fetchPriority = 'low';
  });

  if (debug) {
    console.log(`[HeadHints] Set ${images.length} images to low priority + lazy loading`);
  }
}

/**
 * Monitor unused preloads (warn after 5s)
 */
function monitorUnusedPreloads(): void {
  setTimeout(() => {
    const preloads = document.querySelectorAll<HTMLLinkElement>('link[rel="preload"]');

    preloads.forEach((link) => {
      // Check if resource was used by looking at performance timing
      const perfEntries = performance.getEntriesByName(link.href);

      if (perfEntries.length === 0) {
        console.warn(`[HeadHints] Unused preload: ${link.href} (as ${link.as})`);
      }
    });
  }, 5000);
}

/**
 * Get critical CSS/fonts from Vite manifest (production only)
 */
export function getCriticalAssets(): HeadHintsConfig {
  // In dev mode, Vite handles this automatically
  if (import.meta.env.DEV) {
    return {};
  }

  // In production, you'd parse .vite/manifest.json to find:
  // - Entry chunk for modulepreload
  // - Critical CSS for preload
  // - First font for preload

  // For now, return empty (would need build-time generation)
  return {
    modulePreloads: [],
    preloads: [],
    preconnects: [],
  };
}

/**
 * Apply all default hints
 */
export function applyDefaultHints(debug: boolean = false): void {
  const config: HeadHintsConfig = {
    // Preconnect to common CDNs (adjust for your project)
    preconnects: [
      // Add CDN domains here if needed
    ],

    // Preload critical assets (first paint)
    preloads: [
      // Add critical CSS/fonts here
      // Example:
      // { href: '/fonts/brand.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
    ],

    // Module preload (from Vite manifest)
    modulePreloads: getCriticalAssets().modulePreloads || [],

    debug,
  };

  inject(config);

  // Set low priority on below-the-fold images
  setLowPriorityImages('img[data-below-fold]', debug);
}
