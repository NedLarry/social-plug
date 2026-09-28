import { useCallback, useState } from 'react';

function read(key: string) {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

/**
 * Best score for `key`, kept in this browser. `submit(score)` saves it if it's a new best.
 * Use a key per game (or per mode), e.g. 'snake.best.walls'; changing the key switches scores.
 */
export function useHighScore(key: string) {
  const [stored, setStored] = useState(() => ({ key, best: read(key) }));
  if (stored.key !== key) setStored({ key, best: read(key) });
  const best = stored.key === key ? stored.best : read(key);

  const submit = useCallback(
    (score: number) => {
      setStored((prev) => {
        if (prev.key !== key || score <= prev.best) return prev;
        try {
          localStorage.setItem(key, String(score));
        } catch {
          // Storage blocked: the best score just won't persist.
        }
        return { key, best: score };
      });
    },
    [key],
  );
  return [best, submit] as const;
}
