/**
 * Coordinate Normalization Utilities
 *
 * Convert between viewport (clientX/Y) and local section/canvas coordinates.
 * Handles scroll, transforms, and DPR scaling correctly.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Convert viewport coordinates to local element coordinates
 *
 * Uses fresh getBoundingClientRect() to handle scroll, transforms, etc.
 */
export function toLocal(clientX: number, clientY: number, element: HTMLElement): Point {
  const rect = element.getBoundingClientRect();

  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

/**
 * Convert viewport coordinates to simulation/canvas coordinates
 *
 * Accounts for element bounds and canvas resolution scaling
 */
export function toSim(
  clientX: number,
  clientY: number,
  element: HTMLElement,
  simWidth: number,
  simHeight: number
): Point {
  const rect = element.getBoundingClientRect();
  const local = toLocal(clientX, clientY, element);

  return {
    x: (local.x / rect.width) * simWidth,
    y: (local.y / rect.height) * simHeight,
  };
}

/**
 * Convert viewport coordinates to canvas pixel coordinates (with DPR)
 */
export function toCanvas(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  dpr: number = window.devicePixelRatio
): Point {
  const rect = canvas.getBoundingClientRect();
  const local = toLocal(clientX, clientY, canvas as any);

  return {
    x: local.x * dpr,
    y: local.y * dpr,
  };
}

/**
 * Check if viewport coordinates are inside an element
 */
export function isInside(clientX: number, clientY: number, element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();

  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

/**
 * Clamp point to element bounds
 */
export function clampToElement(point: Point, element: HTMLElement): Point {
  const rect = element.getBoundingClientRect();

  return {
    x: Math.max(0, Math.min(point.x, rect.width)),
    y: Math.max(0, Math.min(point.y, rect.height)),
  };
}
