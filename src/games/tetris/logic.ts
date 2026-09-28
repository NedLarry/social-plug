export type PieceType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';
export type Cell = PieceType | null;
export type Board = Cell[][]; // [row][col], row 0 at the top

export const COLS = 10;
export const ROWS = 20;
export const PIECES: PieceType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

/** Line clear points for 1–4 lines, multiplied by the level. */
const LINE_POINTS = [0, 100, 300, 500, 800];

// Each piece's cells in its spawn rotation, as [row, col] within its box.
const SHAPES: Record<PieceType, { size: number; cells: [number, number][] }> = {
  I: { size: 4, cells: [[1, 0], [1, 1], [1, 2], [1, 3]] },
  J: { size: 3, cells: [[0, 0], [1, 0], [1, 1], [1, 2]] },
  L: { size: 3, cells: [[0, 2], [1, 0], [1, 1], [1, 2]] },
  O: { size: 2, cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  S: { size: 3, cells: [[0, 1], [0, 2], [1, 0], [1, 1]] },
  T: { size: 3, cells: [[0, 1], [1, 0], [1, 1], [1, 2]] },
  Z: { size: 3, cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },
};

export interface Piece {
  type: PieceType;
  rotation: number; // 0–3, clockwise quarter turns
  row: number; // top-left of the piece's box on the board
  col: number;
}

export interface TetrisState {
  board: Board;
  piece: Piece;
  next: PieceType;
  /** Pieces still to come in the current bag of seven. */
  bag: PieceType[];
  score: number;
  lines: number;
  level: number;
  over: boolean;
}

export type TetrisEvent = { type: 'lock' } | { type: 'clear'; lines: number; rows: number[] } | { type: 'over' };

/** Board cells a piece covers, as [row, col]. */
export function pieceCells(p: Piece): [number, number][] {
  const { size, cells } = SHAPES[p.type];
  return cells.map(([r, c]) => {
    let [rr, cc] = [r, c];
    for (let i = 0; i < p.rotation % 4; i++) [rr, cc] = [cc, size - 1 - rr]; // rotate clockwise
    return [p.row + rr, p.col + cc];
  });
}

export function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

function fits(board: Board, p: Piece) {
  return pieceCells(p).every(([r, c]) => c >= 0 && c < COLS && r < ROWS && (r < 0 || board[r][c] === null));
}

/** Shuffled bag of all seven pieces, so droughts can't go on forever. */
function newBag(random: () => number): PieceType[] {
  const bag = [...PIECES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function spawn(type: PieceType): Piece {
  const size = SHAPES[type].size;
  return { type, rotation: 0, row: type === 'I' ? -1 : 0, col: Math.floor((COLS - size) / 2) };
}

function draw(state: Pick<TetrisState, 'bag'>, random: () => number) {
  const bag = state.bag.length ? state.bag : newBag(random);
  return { type: bag[0], bag: bag.slice(1) };
}

export function newGame(random = Math.random): TetrisState {
  const first = draw({ bag: [] }, random);
  const second = draw({ bag: first.bag }, random);
  return {
    board: emptyBoard(),
    piece: spawn(first.type),
    next: second.type,
    bag: second.bag,
    score: 0,
    lines: 0,
    level: 1,
    over: false,
  };
}

/** Milliseconds between automatic drops at this level. */
export function dropInterval(level: number) {
  return Math.max(80, 800 - (level - 1) * 70);
}

export function move(state: TetrisState, dCol: number): TetrisState {
  if (state.over) return state;
  const piece = { ...state.piece, col: state.piece.col + dCol };
  return fits(state.board, piece) ? { ...state, piece } : state;
}

/** Rotates, nudging sideways (or up for the I piece) if it would hit a wall or block. */
export function rotate(state: TetrisState, dir: 1 | -1 = 1): TetrisState {
  if (state.over || state.piece.type === 'O') return state;
  const rotation = (state.piece.rotation + dir + 4) % 4;
  for (const [dRow, dCol] of [[0, 0], [0, -1], [0, 1], [0, -2], [0, 2], [-1, 0]]) {
    const piece = { ...state.piece, rotation, row: state.piece.row + dRow, col: state.piece.col + dCol };
    if (fits(state.board, piece)) return { ...state, piece };
  }
  return state;
}

/** Where the current piece would land (for the ghost preview and hard drops). */
export function landingRow(state: TetrisState) {
  let row = state.piece.row;
  while (fits(state.board, { ...state.piece, row: row + 1 })) row++;
  return row;
}

function lock(state: TetrisState, random: () => number): { state: TetrisState; events: TetrisEvent[] } {
  const events: TetrisEvent[] = [{ type: 'lock' }];
  const board = state.board.map((row) => [...row]);
  const cells = pieceCells(state.piece);
  // Locking any part above the top ends the game.
  if (cells.some(([r]) => r < 0)) {
    events.push({ type: 'over' });
    return { state: { ...state, over: true }, events };
  }
  for (const [r, c] of cells) board[r][c] = state.piece.type;

  const full = board.map((row, i) => (row.every(Boolean) ? i : -1)).filter((i) => i >= 0);
  const kept = board.filter((_, i) => !full.includes(i));
  const cleared = [...Array.from({ length: full.length }, () => Array<Cell>(COLS).fill(null)), ...kept];
  const lines = state.lines + full.length;
  const score = state.score + LINE_POINTS[full.length] * state.level;
  if (full.length) events.push({ type: 'clear', lines: full.length, rows: full });

  const next = draw(state, random);
  const piece = spawn(state.next);
  const s: TetrisState = {
    ...state,
    board: cleared,
    piece,
    next: next.type,
    bag: next.bag,
    lines,
    level: Math.floor(lines / 10) + 1,
    score,
  };
  if (!fits(cleared, piece)) {
    events.push({ type: 'over' });
    return { state: { ...s, over: true }, events };
  }
  return { state: s, events };
}

/** One step down. `soft` means the player pressed down (worth 1 point per row). */
export function tick(state: TetrisState, soft = false, random = Math.random): { state: TetrisState; events: TetrisEvent[] } {
  if (state.over) return { state, events: [] };
  const piece = { ...state.piece, row: state.piece.row + 1 };
  if (fits(state.board, piece)) return { state: { ...state, piece, score: state.score + (soft ? 1 : 0) }, events: [] };
  return lock(state, random);
}

/** Drops the piece straight to the bottom and locks it (2 points per row). */
export function hardDrop(state: TetrisState, random = Math.random): { state: TetrisState; events: TetrisEvent[] } {
  if (state.over) return { state, events: [] };
  const row = landingRow(state);
  const dropped = { ...state, piece: { ...state.piece, row }, score: state.score + (row - state.piece.row) * 2 };
  return lock(dropped, random);
}
