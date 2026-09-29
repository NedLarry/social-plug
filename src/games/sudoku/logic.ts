/** 81 cells, row by row; 0 = empty. */
export type Grid = number[];
export type Difficulty = 'easy' | 'medium' | 'hard';

/** How many numbers each puzzle starts with. */
export const GIVENS: Record<Difficulty, number> = { easy: 40, medium: 32, hard: 26 };
/** Starting points before time, mistakes and hints are taken off. */
export const BASE_POINTS: Record<Difficulty, number> = { easy: 1000, medium: 2000, hard: 3000 };
export const MISTAKE_PENALTY = 50;
export const HINT_PENALTY = 100;

export const rowOf = (i: number) => Math.floor(i / 9);
export const colOf = (i: number) => i % 9;
export const boxOf = (i: number) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

const ALL = Array.from({ length: 81 }, (_, i) => i);

/** The three groups (row, column, box) each cell belongs to. */
export const UNITS: number[][][] = ALL.map((i) => [
  ALL.filter((j) => rowOf(j) === rowOf(i)),
  ALL.filter((j) => colOf(j) === colOf(i)),
  ALL.filter((j) => boxOf(j) === boxOf(i)),
]);

/** Every other cell sharing a row, column or box. */
export const PEERS: number[][] = ALL.map((i) => [...new Set(UNITS[i].flat())].filter((j) => j !== i));

export function candidates(grid: Grid, i: number): number[] {
  const used = new Set(PEERS[i].map((j) => grid[j]));
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !used.has(d));
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The empty cell with the fewest options (makes the search fast). */
function mostConstrained(grid: Grid): { cell: number; options: number[] } | null {
  let best: { cell: number; options: number[] } | null = null;
  for (let i = 0; i < 81; i++) {
    if (grid[i]) continue;
    const options = candidates(grid, i);
    if (!best || options.length < best.options.length) best = { cell: i, options };
    if (options.length <= 1) break;
  }
  return best;
}

/** Counts solutions, stopping once `limit` is reached. */
export function countSolutions(grid: Grid, limit = 2): number {
  const g = [...grid];
  let count = 0;
  const search = (): boolean => {
    const next = mostConstrained(g);
    if (!next) return ++count >= limit;
    for (const d of next.options) {
      g[next.cell] = d;
      if (search()) return true;
    }
    g[next.cell] = 0;
    return false;
  };
  search();
  return count;
}

export function generateSolved(random = Math.random): Grid {
  const g: Grid = Array(81).fill(0);
  const fill = (): boolean => {
    const next = mostConstrained(g);
    if (!next) return true;
    for (const d of shuffle(next.options, random)) {
      g[next.cell] = d;
      if (fill()) return true;
    }
    g[next.cell] = 0;
    return false;
  };
  fill();
  return g;
}

/** A puzzle with exactly one solution, emptied down to about GIVENS[difficulty] numbers. */
export function makePuzzle(difficulty: Difficulty, random = Math.random): { puzzle: Grid; solution: Grid } {
  const solution = generateSolved(random);
  const puzzle = [...solution];
  let givens = 81;
  for (const i of shuffle(ALL, random)) {
    if (givens <= GIVENS[difficulty]) break;
    const kept = puzzle[i];
    puzzle[i] = 0;
    // Only remove a number if the puzzle still has a single answer.
    if (countSolutions(puzzle, 2) === 1) givens--;
    else puzzle[i] = kept;
  }
  return { puzzle, solution };
}

/** Cells of any row, column or box through `i` that are now completely and correctly filled. */
export function completedUnits(values: Grid, solution: Grid, i: number): number[] {
  const done = UNITS[i].filter((unit) => unit.every((j) => values[j] === solution[j]));
  return [...new Set(done.flat())];
}

export function isSolved(values: Grid, solution: Grid) {
  return values.every((v, i) => v === solution[i]);
}

export function finalScore(difficulty: Difficulty, seconds: number, mistakes: number, hints: number) {
  const base = BASE_POINTS[difficulty];
  return Math.max(Math.round(base * 0.1), base - seconds - mistakes * MISTAKE_PENALTY - hints * HINT_PENALTY);
}
