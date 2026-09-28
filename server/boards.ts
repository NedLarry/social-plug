export const WEEK_SECONDS = 7 * 24 * 60 * 60;
/** A name stays reserved for its player this long after they last use it. */
export const NAME_CLAIM_SECONDS = 30 * 24 * 60 * 60;

export interface BoardRule {
  /** 'best' keeps each player's highest score; 'total' adds scores up (e.g. wins). */
  kind: 'best' | 'total';
  /** For 'total' boards: the most one submission can add. */
  maxPerSubmit?: number;
  /** Boards with a seed always have a score to beat: when the board is new or has reset,
   * a made-up score under a random human-like name is added. */
  seed?: { min: number; max: number; step: number };
}

// Boards that need special rules. Any other valid board id is a plain 'best' board,
// so new games can save scores without touching the server.
const RULES: Record<string, BoardRule> = {
  'snake-walls': { kind: 'best', seed: { min: 380, max: 640, step: 10 } },
  'snake-wrap': { kind: 'best', seed: { min: 520, max: 880, step: 10 } },
  'whot-classic-wins': { kind: 'total', maxPerSubmit: 1 },
};

const BOARD_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function boardRule(board: string): BoardRule | null {
  if (board.length > 48 || !BOARD_ID.test(board)) return null;
  return RULES[board] ?? { kind: 'best' };
}

export function seedScore(seed: NonNullable<BoardRule['seed']>, random = Math.random) {
  const steps = Math.floor((seed.max - seed.min) / seed.step);
  return seed.min + Math.floor(random() * (steps + 1)) * seed.step;
}

/** Tidies a player name; returns null if nothing usable is left. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N} ._'-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20)
    .trim();
  return name.length ? name : null;
}
