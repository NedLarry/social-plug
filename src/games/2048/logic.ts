export type Dir = 'up' | 'down' | 'left' | 'right';
export const SIZE = 4;
export const WIN_VALUE = 2048;

export interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  /** Just appeared (for the grow-in animation). */
  isNew?: boolean;
  /** Just made by a merge (for the pop animation). */
  merged?: boolean;
}

export interface Game2048 {
  tiles: Tile[];
  score: number;
  nextId: number;
  /** Reached 2048 at some point. */
  won: boolean;
  over: boolean;
}

export interface SlideResult {
  game: Game2048;
  moved: boolean;
  gained: number;
  /** Tiles swallowed by a merge, at the spot they slid into (shown briefly for the animation). */
  ghosts: Tile[];
}

function emptyCells(tiles: Tile[]) {
  const taken = new Set(tiles.map((t) => t.row * SIZE + t.col));
  const cells: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!taken.has(r * SIZE + c)) cells.push([r, c]);
  return cells;
}

/** Adds a 2 (or, one time in ten, a 4) in a random empty cell. */
export function spawn(game: Game2048, random = Math.random): Game2048 {
  const cells = emptyCells(game.tiles);
  if (!cells.length) return game;
  const [row, col] = cells[Math.floor(random() * cells.length)];
  const tile: Tile = { id: game.nextId, value: random() < 0.9 ? 2 : 4, row, col, isNew: true };
  return { ...game, tiles: [...game.tiles, tile], nextId: game.nextId + 1 };
}

export function newGame(random = Math.random): Game2048 {
  return spawn(spawn({ tiles: [], score: 0, nextId: 1, won: false, over: false }, random), random);
}

export function canMove(tiles: Tile[]) {
  if (tiles.length < SIZE * SIZE) return true;
  const at = new Map(tiles.map((t) => [t.row * SIZE + t.col, t.value]));
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = at.get(r * SIZE + c);
      if (c + 1 < SIZE && at.get(r * SIZE + c + 1) === v) return true;
      if (r + 1 < SIZE && at.get((r + 1) * SIZE + c) === v) return true;
    }
  }
  return false;
}

/** Slides every tile as far as it goes in `dir`, merging equal pairs once. Adds a new tile if anything moved. */
export function slide(game: Game2048, dir: Dir, random = Math.random): SlideResult {
  if (game.over) return { game, moved: false, gained: 0, ghosts: [] };
  let nextId = game.nextId;
  let gained = 0;
  const ghosts: Tile[] = [];
  const out: Tile[] = [];
  const horizontal = dir === 'left' || dir === 'right';
  const towardEnd = dir === 'right' || dir === 'down';
  // Position `i` along a line, counted from the edge the tiles slide toward.
  const place = (line: number, i: number) => {
    const along = towardEnd ? SIZE - 1 - i : i;
    return horizontal ? { row: line, col: along } : { row: along, col: line };
  };

  for (let line = 0; line < SIZE; line++) {
    const inLine = game.tiles
      .filter((t) => (horizontal ? t.row : t.col) === line)
      .sort((a, b) => {
        const pa = horizontal ? a.col : a.row;
        const pb = horizontal ? b.col : b.row;
        return towardEnd ? pb - pa : pa - pb;
      });
    const result: Tile[] = [];
    let canMerge = false;
    for (const t of inLine) {
      const prev = result[result.length - 1];
      if (prev && canMerge && prev.value === t.value) {
        // Both tiles slide into prev's spot and become one.
        const spot = { row: prev.row, col: prev.col };
        ghosts.push({ ...prev, isNew: false, merged: false }, { ...t, ...spot, isNew: false, merged: false });
        result[result.length - 1] = { id: nextId++, value: t.value * 2, ...spot, merged: true };
        gained += t.value * 2;
        canMerge = false;
      } else {
        result.push({ ...t, ...place(line, result.length), isNew: false, merged: false });
        canMerge = true;
      }
    }
    out.push(...result);
  }

  const before = new Map(game.tiles.map((t) => [t.id, `${t.row},${t.col}`]));
  const moved = gained > 0 || out.some((t) => before.get(t.id) !== `${t.row},${t.col}`);
  if (!moved) return { game, moved: false, gained: 0, ghosts: [] };

  let next: Game2048 = {
    tiles: out,
    score: game.score + gained,
    nextId,
    won: game.won || out.some((t) => t.value >= WIN_VALUE),
    over: false,
  };
  next = spawn(next, random);
  next.over = !canMove(next.tiles);
  return { game: next, moved: true, gained, ghosts };
}
