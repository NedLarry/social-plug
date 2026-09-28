import { useEffect, useRef } from 'react';

/**
 * Calls `update(dt)` every animation frame while `running` is true.
 * `dt` is seconds since the last frame, capped so a background tab doesn't jump.
 */
export function useGameLoop(update: (dt: number) => void, running = true) {
  const latest = useRef(update);
  useEffect(() => {
    latest.current = update;
  });

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      latest.current(Math.min((now - last) / 1000, 0.1));
      last = now;
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [running]);
}
