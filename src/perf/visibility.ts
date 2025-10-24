/**
 * Content Visibility Utilities
 *
 * Applies content-visibility: auto to skip layout/paint for off-screen content.
 * Removes property when sections approach viewport for seamless rendering.
 */

export interface VisibilityOptions {
  rootMargin?: string; // How far before viewport to reveal (e.g., "200px")
  threshold?: number; // Intersection threshold (0-1)
}

const DEFAULT_OPTIONS: VisibilityOptions = {
  rootMargin: '200px', // Start rendering 200px before viewport
  threshold: 0.01, // Trigger when 1% visible
};

/**
 * Apply content-visibility: auto to an element
 * Automatically removes when approaching viewport
 */
export function applyContentVisibility(
  element: HTMLElement,
  options: VisibilityOptions = {}
): () => void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Apply content-visibility: auto
  element.style.contentVisibility = 'auto';
  element.style.containIntrinsicSize = '1px 500px'; // Estimate size to prevent layout shift

  console.log('[Visibility] Applied content-visibility:auto to', element);

  // Create IntersectionObserver to remove when approaching
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Remove content-visibility when approaching viewport
          element.style.contentVisibility = '';
          element.style.containIntrinsicSize = '';

          console.log('[Visibility] Removed content-visibility from', element);

          // Stop observing once removed
          observer.disconnect();
        }
      });
    },
    {
      rootMargin: opts.rootMargin,
      threshold: opts.threshold,
    }
  );

  observer.observe(element);

  // Return cleanup function
  return () => {
    observer.disconnect();
    element.style.contentVisibility = '';
    element.style.containIntrinsicSize = '';
  };
}

/**
 * Apply content-visibility to multiple elements (e.g., all below-the-fold sections)
 */
export function applyContentVisibilityToSections(
  selector: string,
  options: VisibilityOptions = {}
): () => void {
  const elements = document.querySelectorAll<HTMLElement>(selector);
  const cleanups: Array<() => void> = [];

  elements.forEach((element) => {
    const cleanup = applyContentVisibility(element, options);
    cleanups.push(cleanup);
  });

  console.log(`[Visibility] Applied to ${elements.length} elements matching "${selector}"`);

  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}

/**
 * Auto-detect and apply content-visibility to below-the-fold sections
 * Skips the first section (assumed to be hero/above-the-fold)
 */
export function autoBelowTheFold(options: VisibilityOptions = {}): () => void {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    return () => {};
  }

  // Find all main sections, skip first (hero)
  const sections = Array.from(document.querySelectorAll('main > section, main > div[class*="section"]'));

  if (sections.length <= 1) {
    console.log('[Visibility] No below-the-fold sections found');
    return () => {};
  }

  // Apply to all except first
  const belowTheFold = sections.slice(1) as HTMLElement[];
  const cleanups = belowTheFold.map((section) => applyContentVisibility(section, options));

  console.log(`[Visibility] Auto-applied to ${belowTheFold.length} below-the-fold sections`);

  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}

/**
 * Check if content-visibility is supported
 */
export function isContentVisibilitySupported(): boolean {
  if (typeof CSS === 'undefined' || !CSS.supports) {
    return false;
  }

  return CSS.supports('content-visibility', 'auto');
}
