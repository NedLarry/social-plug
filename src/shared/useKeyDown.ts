import { useEffect, useRef } from 'react';

/**
 * Listens for key presses while the game is on screen. Return true from the
 * handler for keys the game uses, so the page doesn't scroll on arrows/space.
 */
export function useKeyDown(handler: (e: KeyboardEvent) => boolean | void) {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, select, textarea')) return;
      if (latest.current(e) === true) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
