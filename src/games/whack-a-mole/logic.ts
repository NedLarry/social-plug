export type Kind = 'mole' | 'gold' | 'bomb';

export const HOLES = 9;
export const ROUND_MS = 30_000;
export const POINTS: Record<Kind, number> = { mole: 10, gold: 50, bomb: -30 };
/** Every this many hits in a row, points go up by 1× (up to MAX_MULTIPLIER). */
export const COMBO_STEP = 5;
export const MAX_MULTIPLIER = 4;
const HIT_SHOW_MS = 320;

export interface Mole {
  kind: Kind;
  /** Round time (ms) it popped up, and when it ducks back down. */
  upAt: number;
  downAt: number;
  hit: boolean;
}

export interface WhackState {
  /** Round time in ms. Advances only while playing, so switching tabs pauses the game. */
  elapsed: number;
  holes: (Mole | null)[];
  nextSpawnAt: number;
  score: number;
  combo: number;
  bestCombo: number;
  hits: number;
  over: boolean;
}

export type WhackEvent =
  | { type: 'hit'; hole: number; kind: Kind; points: number; multiplier: number }
  | { type: 'bomb'; hole: number; points: number }
  | { type: 'miss'; hole: number }
  | { type: 'escaped'; hole: number };

const lerp = (from: number, to: number, t: number) => from + (to - from) * Math.min(1, Math.max(0, t));

/** Moles come faster and stay up for less time as the round goes on. */
export function spawnGap(elapsed: number) {
  return lerp(850, 360, elapsed / ROUND_MS);
}

export function upTime(kind: Kind, elapsed: number) {
  if (kind === 'gold') return 750;
  if (kind === 'bomb') return 1500;
  return lerp(1300, 620, elapsed / ROUND_MS);
}

export function pickKind(random: () => number, elapsed: number): Kind {
  const r = random();
  if (r < 0.08) return 'gold';
  // No bombs in the first few seconds, to warm up.
  if (elapsed > 4000 && r < 0.2) return 'bomb';
  return 'mole';
}

export function multiplier(combo: number) {
  return Math.min(MAX_MULTIPLIER, 1 + Math.floor(combo / COMBO_STEP));
}

export function newRound(): WhackState {
  return { elapsed: 0, holes: Array(HOLES).fill(null), nextSpawnAt: 400, score: 0, combo: 0, bestCombo: 0, hits: 0, over: false };
}

/** Moves the round on by `dt` ms: moles duck down, new ones pop up, and the clock runs out. */
export function tick(state: WhackState, dt: number, random = Math.random): { state: WhackState; events: WhackEvent[] } {
  if (state.over) return { state, events: [] };
  const events: WhackEvent[] = [];
  const elapsed = Math.min(ROUND_MS, state.elapsed + dt);
  let combo = state.combo;

  const holes = state.holes.map((m, hole) => {
    if (!m || elapsed < m.downAt) return m;
    // A mole that got away breaks the combo (bombs and gold don't count against you).
    if (!m.hit && m.kind === 'mole') {
      combo = 0;
      events.push({ type: 'escaped', hole });
    }
    return null;
  });

  let nextSpawnAt = state.nextSpawnAt;
  if (elapsed >= nextSpawnAt && elapsed < ROUND_MS - 400) {
    const free = holes.map((m, i) => (m ? -1 : i)).filter((i) => i >= 0);
    if (free.length) {
      const hole = free[Math.floor(random() * free.length)];
      const kind = pickKind(random, elapsed);
      holes[hole] = { kind, upAt: elapsed, downAt: elapsed + upTime(kind, elapsed), hit: false };
    }
    nextSpawnAt = elapsed + spawnGap(elapsed) * (0.7 + random() * 0.6);
  }

  const over = elapsed >= ROUND_MS;
  return { state: { ...state, elapsed, holes, nextSpawnAt, combo, over }, events };
}

/** The player bonks `hole`. */
export function whack(state: WhackState, hole: number): { state: WhackState; event: WhackEvent } {
  const m = state.holes[hole];
  if (state.over || !m || m.hit) {
    return { state: { ...state, combo: 0 }, event: { type: 'miss', hole } };
  }
  const holes = [...state.holes];
  // Stay up a moment, dizzy, so the hit is visible.
  holes[hole] = { ...m, hit: true, downAt: state.elapsed + HIT_SHOW_MS };

  if (m.kind === 'bomb') {
    const points = Math.max(POINTS.bomb, -state.score); // never below zero
    return { state: { ...state, holes, score: state.score + points, combo: 0 }, event: { type: 'bomb', hole, points } };
  }
  const mult = multiplier(state.combo);
  const points = POINTS[m.kind] * mult;
  const combo = state.combo + 1;
  return {
    state: { ...state, holes, score: state.score + points, combo, bestCombo: Math.max(state.bestCombo, combo), hits: state.hits + 1 },
    event: { type: 'hit', hole, kind: m.kind, points, multiplier: mult },
  };
}
