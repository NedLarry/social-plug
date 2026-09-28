import { describe, expect, it } from 'vitest';
import { COLS, ROWS, dropInterval, emptyBoard, hardDrop, landingRow, move, newGame, pieceCells, rotate, tick, type TetrisState } from './logic';

const withPiece = (s: TetrisState, type: TetrisState['piece']['type'], col = 3, row = 0): TetrisState => ({
  ...s,
  piece: { type, rotation: 0, row, col },
});

describe('tetris', () => {
  it('deals every piece once per bag of seven', () => {
    let s = newGame();
    const seen = [s.piece.type, s.next];
    for (let i = 0; i < 5; i++) {
      s = hardDrop({ ...s, board: emptyBoard() }).state;
      seen.push(s.next);
    }
    expect(new Set(seen).size).toBe(7);
  });

  it('moves within the walls', () => {
    let s = withPiece(newGame(), 'O', 0);
    expect(move(s, -1)).toBe(s);
    s = move(s, 1);
    expect(s.piece.col).toBe(1);
    const right = withPiece(newGame(), 'O', COLS - 2);
    expect(move(right, 1)).toBe(right);
  });

  it('rotates, and kicks off a wall when needed', () => {
    const s = withPiece(newGame(), 'T', 3, 5);
    const r = rotate(s);
    expect(r.piece.rotation).toBe(1);
    expect(pieceCells(rotate(r, -1).piece).sort()).toEqual(pieceCells(s.piece).sort());
    // Vertical I against the left wall: rotating flat needs a nudge right.
    const i = { ...withPiece(newGame(), 'I', -2, 5), piece: { type: 'I' as const, rotation: 1, row: 5, col: -2 } };
    const flat = rotate(i);
    expect(flat.piece.rotation).toBe(2);
    expect(pieceCells(flat.piece).every(([, c]) => c >= 0)).toBe(true);
  });

  it('soft drop scores 1 per row, hard drop 2 per row', () => {
    const s = withPiece(newGame(), 'O', 4);
    expect(tick(s, true).state.score).toBe(1);
    const dropped = hardDrop(s).state;
    expect(dropped.score).toBe((ROWS - 2) * 2);
    expect(dropped.board[ROWS - 1][4]).toBe('O');
  });

  it('clears full lines and scores by level', () => {
    const board = emptyBoard();
    // Bottom two rows full except columns 4–5, where an O piece will land.
    for (const r of [ROWS - 1, ROWS - 2]) for (let c = 0; c < COLS; c++) if (c !== 4 && c !== 5) board[r][c] = 'J';
    const s = { ...withPiece(newGame(), 'O', 4, ROWS - 2), board, level: 2 };
    const { state, events } = tick(s);
    expect(events).toContainEqual({ type: 'clear', lines: 2, rows: [ROWS - 2, ROWS - 1] });
    expect(state.lines).toBe(2);
    expect(state.score).toBe(300 * 2);
    expect(state.board.every((row) => row.every((c) => c === null))).toBe(true);
  });

  it('levels up every 10 lines and speeds up', () => {
    const board = emptyBoard();
    for (let c = 0; c < COLS; c++) if (c !== 0) board[ROWS - 1][c] = 'L';
    const s = { ...withPiece(newGame(), 'I', 0, ROWS - 4), piece: { type: 'I' as const, rotation: 1, row: ROWS - 4, col: -2 }, board, lines: 9 };
    const { state } = hardDrop(s);
    expect(state.lines).toBe(10);
    expect(state.level).toBe(2);
    expect(dropInterval(2)).toBeLessThan(dropInterval(1));
    expect(dropInterval(100)).toBe(80);
  });

  it('ends when a piece locks above the top', () => {
    const board = emptyBoard();
    // A tower under the spawn point; the O piece can only rest half above the board.
    for (let r = 1; r < ROWS; r++) board[r][4] = board[r][5] = 'Z';
    const s = { ...withPiece(newGame(), 'O', 4, -1), board };
    const { state, events } = hardDrop(s);
    expect(state.over).toBe(true);
    expect(events.map((e) => e.type)).toContain('over');
    expect(tick(state).state).toBe(state);
  });

  it('ends when the next piece has no room to appear', () => {
    const board = emptyBoard();
    // Spawn area blocked, but the current piece can still lock at the side.
    for (let r = 0; r < 2; r++) for (let c = 3; c < 7; c++) board[r][c] = 'Z';
    const s = { ...withPiece(newGame(), 'O', 0, 0), board };
    const { state, events } = hardDrop(s);
    expect(state.over).toBe(true);
    expect(events.map((e) => e.type)).toContain('over');
  });

  it('shows where the piece will land', () => {
    const s = withPiece(newGame(), 'O', 4);
    expect(landingRow(s)).toBe(ROWS - 2);
  });
});
