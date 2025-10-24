/**
 * JS Scheduling & Long-Task Hygiene
 *
 * Utilities for:
 * - requestIdleCallback for low-priority work
 * - Long-Task observer to detect >50ms blocks
 * - Chunking heavy work into micro-tasks
 */

export interface IdleOptions {
  timeout?: number; // Max wait time in ms
}

/**
 * Schedule work during idle time
 * Falls back to setTimeout if requestIdleCallback not available
 */
export function onIdle(fn: () => void, options: IdleOptions = {}): number {
  const { timeout = 2000 } = options;

  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(fn, { timeout });
  } else {
    // Fallback: use setTimeout
    return window.setTimeout(fn, 1) as unknown as number;
  }
}

/**
 * Cancel idle callback
 */
export function cancelIdle(id: number): void {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  } else {
    window.clearTimeout(id);
  }
}

/**
 * Long-Task observer - detects tasks >50ms
 */
export interface LongTaskEntry {
  name: string;
  duration: number;
  startTime: number;
  attribution?: string;
}

export function observeLongTasks(callback: (entries: LongTaskEntry[]) => void): () => void {
  // Check if PerformanceObserver and long-task support exists
  if (!('PerformanceObserver' in window)) {
    console.warn('[LongTask] PerformanceObserver not supported');
    return () => {};
  }

  try {
    const observer = new PerformanceObserver((list) => {
      const entries: LongTaskEntry[] = [];

      for (const entry of list.getEntries()) {
        // Long tasks are >50ms by definition
        if (entry.duration > 50) {
          entries.push({
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
            attribution: (entry as any).attribution?.[0]?.name || 'unknown',
          });
        }
      }

      if (entries.length > 0) {
        callback(entries);
      }
    });

    // Observe longtask entries
    observer.observe({ entryTypes: ['longtask'] });

    console.log('[LongTask] Observer started');

    return () => {
      observer.disconnect();
      console.log('[LongTask] Observer stopped');
    };
  } catch (e) {
    console.warn('[LongTask] Failed to observe:', e);
    return () => {};
  }
}

/**
 * Long Animation Frames observer - detects frames >50ms (newer API)
 */
export interface LongFrameEntry {
  name: string;
  duration: number;
  startTime: number;
  renderStart: number;
}

export function observeLongFrames(callback: (entries: LongFrameEntry[]) => void): () => void {
  if (!('PerformanceObserver' in window)) {
    console.warn('[LongFrame] PerformanceObserver not supported');
    return () => {};
  }

  try {
    const observer = new PerformanceObserver((list) => {
      const entries: LongFrameEntry[] = [];

      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          entries.push({
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
            renderStart: (entry as any).renderStart || 0,
          });
        }
      }

      if (entries.length > 0) {
        callback(entries);
      }
    });

    // Try to observe long-animation-frame
    observer.observe({ entryTypes: ['long-animation-frame'] });

    console.log('[LongFrame] Observer started');

    return () => {
      observer.disconnect();
      console.log('[LongFrame] Observer stopped');
    };
  } catch (e) {
    // Fallback to longtask if long-animation-frame not supported
    console.warn('[LongFrame] long-animation-frame not supported, using longtask');
    return observeLongTasks((tasks) => {
      callback(
        tasks.map((t) => ({
          name: t.name,
          duration: t.duration,
          startTime: t.startTime,
          renderStart: 0,
        }))
      );
    });
  }
}

/**
 * Chunk heavy work into micro-tasks
 * Yields to browser between chunks
 */
export async function chunkWork<T>(
  items: T[],
  processFn: (item: T, index: number) => void | Promise<void>,
  chunkSize = 10
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);

    for (let j = 0; j < chunk.length; j++) {
      await processFn(chunk[j], i + j);
    }

    // Yield to browser
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/**
 * Start performance monitoring
 * Logs long tasks/frames to console
 */
export function startPerformanceMonitoring(): () => void {
  const stopLongTasks = observeLongTasks((entries) => {
    entries.forEach((entry) => {
      console.warn(
        `[LongTask] ${entry.name} took ${entry.duration.toFixed(2)}ms (attribution: ${entry.attribution})`
      );
    });
  });

  const stopLongFrames = observeLongFrames((entries) => {
    entries.forEach((entry) => {
      console.warn(`[LongFrame] ${entry.name} took ${entry.duration.toFixed(2)}ms`);
    });
  });

  return () => {
    stopLongTasks();
    stopLongFrames();
  };
}
