import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

const KEY = 'player.name';
const TOKEN_KEY = 'player.token';

let sessionToken: string | null = null;

/** Random hex id. (crypto.randomUUID only exists on HTTPS/localhost pages.) */
function randomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * This browser's secret player key. Names belong to the key that used them first,
 * so nobody else can post scores under your name. Kept in this browser only.
 */
function playerToken() {
  try {
    let token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      token = randomId();
      localStorage.setItem(TOKEN_KEY, token);
    }
    return token;
  } catch {
    // Storage blocked: the name is only yours for this visit.
    return (sessionToken ??= randomId());
  }
}

/** Headers that identify this player to the scores API. */
export function playerHeaders() {
  return { 'content-type': 'application/json', 'x-player-token': playerToken() };
}

export type ClaimOutcome = { status: 'ok'; name: string } | { status: 'taken' } | { status: 'not-allowed' } | { status: 'offline' };

/** Reserves a name for this player. 'taken' if someone else has it; 'not-allowed' if it's offensive. */
export async function claimName(name: string): Promise<ClaimOutcome> {
  try {
    const r = await fetch('/api/players/claim', { method: 'POST', headers: playerHeaders(), body: JSON.stringify({ name }) });
    if (r.status === 409) return { status: 'taken' };
    if (r.status === 400 && (await r.json().catch(() => null))?.code === 'name-not-allowed') return { status: 'not-allowed' };
    if (!r.ok) return { status: 'offline' };
    return { status: 'ok', name: (await r.json()).name };
  } catch {
    return { status: 'offline' };
  }
}

/** Same tidying the server does: letters, numbers, spaces and . _ ' - ; max 20 characters. */
export function tidyName(raw: string) {
  return raw
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N} ._'-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20)
    .trim();
}

interface Player {
  /** The name scores are saved under, or null before the player has given one. */
  name: string | null;
  setName: (name: string) => void;
}

const PlayerContext = createContext<Player>({ name: null, setName: () => {} });

function load() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [name, setNameState] = useState<string | null>(load);
  const setName = useCallback((next: string) => {
    setNameState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Name just won't be remembered next visit.
    }
  }, []);
  return <PlayerContext.Provider value={{ name, setName }}>{children}</PlayerContext.Provider>;
}

/** The current player's name (asked for before every game). */
export function usePlayer() {
  return useContext(PlayerContext);
}
