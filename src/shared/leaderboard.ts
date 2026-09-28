import { useCallback, useEffect, useState } from 'react';
import { playerHeaders, usePlayer } from './player';

export interface LeaderboardEntry {
  name: string;
  score: number;
}

export interface BoardData {
  board: string;
  entries: LeaderboardEntry[];
  /** The current player's entry and rank this week, if they have one. */
  you: (LeaderboardEntry & { rank: number }) | null;
  /** When this week's scores reset (epoch ms), or null if the board is empty. */
  resetsAt: number | null;
}

export interface SubmitResult {
  score: number;
  /** True if this beat the player's previous best this week. */
  improved: boolean;
  /** Who was on top before this score. */
  topBefore: LeaderboardEntry | null;
}

export type Leaderboard = ReturnType<typeof useLeaderboard>;

/**
 * This week's scores for `board` (e.g. 'snake-walls'), saved on the server.
 * Call `submit(score)` when a game ends; it's saved under the player's name.
 * If the server can't be reached, `status` is 'offline' and games carry on without it.
 */
export function useLeaderboard(board: string) {
  const { name } = usePlayer();
  const [data, setData] = useState<BoardData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'offline'>('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetch(`/api/boards/${board}${name ? `?name=${encodeURIComponent(name)}` : ''}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: BoardData) => {
        if (cancelled) return;
        setData(d);
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('offline'));
    return () => {
      cancelled = true;
    };
  }, [board, name]);

  const submit = useCallback(
    async (score: number): Promise<SubmitResult | null> => {
      if (!name) return null;
      try {
        const r = await fetch(`/api/boards/${board}/scores`, {
          method: 'POST',
          headers: playerHeaders(),
          body: JSON.stringify({ name, score }),
        });
        if (!r.ok) throw new Error(String(r.status));
        const d: BoardData & { result: SubmitResult } = await r.json();
        setData(d);
        setStatus('ready');
        return d.result;
      } catch {
        setStatus('offline');
        return null;
      }
    },
    [board, name],
  );

  const current = data?.board === board ? data : null;
  return { data: current, status, top: current?.entries[0] ?? null, you: current?.you ?? null, submit };
}
