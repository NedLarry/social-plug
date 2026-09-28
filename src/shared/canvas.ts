/**
 * Prepares a canvas to draw in `width` × `height` units, sharp on high-DPI screens.
 * The canvas scales down with the page (see `.game-canvas`) but you always draw
 * in the same coordinates. Returns the 2D context.
 */
export function setupCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.maxWidth = `${width}px`;
  canvas.style.aspectRatio = `${width} / ${height}`;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/** Converts a pointer event to the canvas's drawing coordinates. */
export function pointerPosition(canvas: HTMLCanvasElement, e: { clientX: number; clientY: number }, width: number, height: number) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * width,
    y: ((e.clientY - rect.top) / rect.height) * height,
  };
}
