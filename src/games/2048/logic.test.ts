import { describe, expect, it } from 'vitest';
import { canMove, newGame, slide, type Game2048, type Tile } from './logic';

/** Builds a game from rows of numbers (0 = empty). */
function board(rows: number[][]): Game2048 {
  const tiles: Tile[] = [];
  let id = 1;
  rows.forEach((r, row) => r.forEach((value, col) => value && tiles.push({ id: id++, value, row, col })));
  return { tiles, score: 0, nextId: id, won: false, over: false };
}

/** The board as rows of numbers, ignoring the newly spawned tile. */
function rows(g: Game2048) {
  const out = Array.from({ length: 4 }, () => Array(4).fill(0));
  for (const t of g.tiles) if (!t.isNew) out[t.row][t.col] = t.value;
  return out;
}

const never = () => 0.99; // spawns go in the last empty cell as a 4

describe('2048', () => {
  it('starts with two tiles', () => {
    expect(newGame().tiles).toHaveLength(2);
  });

  it('slides and merges each pair once', () => {
    const { game, gained } = slide(board([[2, 2, 2, 2], [2, 2, 4, 0], [4, 0, 4, 4], [0, 0, 0, 2]]), 'left', never);
    expect(rows(game)).toEqual([
      [4, 4, 0, 0],
      [4, 4, 0, 0],
      [8, 4, 0, 0],
      [2, 0, 0, 0],
    ]);
    expect(gained).toBe(4 + 4 + 4 + 8);
    expect(game.score).toBe(20);
  });

  it('works in every direction', () => {
    const start = board([[2, 0, 0, 2], [0, 0, 0, 0], [0, 0, 0, 0], [2, 0, 0, 0]]);
    expect(rows(slide(start, 'right', never).game)[0]).toEqual([0, 0, 0, 4]);
    expect(rows(slide(start, 'down', never).game).map((r) => r[0])).toEqual([0, 0, 0, 4]);
    expect(rows(slide(start, 'up', never).game).map((r) => r[0])).toEqual([4, 0, 0, 0]);
  });

  it('adds a new tile only when something moved', () => {
    const stuck = board([[2, 4, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    const r = slide(stuck, 'left', never);
    expect(r.moved).toBe(false);
    expect(r.game).toBe(stuck);
    const moved = slide(stuck, 'right', never);
    expect(moved.game.tiles).toHaveLength(3);
    expect(moved.game.tiles.filter((t) => t.isNew)).toHaveLength(1);
  });

  it('returns the swallowed tiles for the merge animation', () => {
    const r = slide(board([[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 'right', never);
    expect(r.ghosts.map((t) => [t.id, t.col])).toEqual([
      [2, 3],
      [1, 3],
    ]);
    expect(r.game.tiles.find((t) => t.merged)).toMatchObject({ value: 4, row: 0, col: 3 });
  });

  it('notices reaching 2048', () => {
    const r = slide(board([[1024, 1024, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 'left', never);
    expect(r.game.won).toBe(true);
  });

  it('ends when the board is full with no merges', () => {
    const full = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 0],
    ];
    expect(canMove(board(full).tiles)).toBe(true); // one gap left: still playable
    // Sliding the bottom row left leaves one gap; the new 2 lands there and nothing can merge.
    const r = slide(board([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [0, 8, 16, 32]]), 'left', () => 0);
    expect(r.game.tiles).toHaveLength(16);
    expect(r.game.over).toBe(true);
  });
});
