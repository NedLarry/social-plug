import { COLS, ROWS, landingRow, pieceCells, type PieceType, type TetrisState } from './logic';

export const CELL = 28;
export const BOARD_W = COLS * CELL;
export const SIDE_W = 132;
export const WIDTH = BOARD_W + SIDE_W;
export const HEIGHT = ROWS * CELL;
const FONT = "'Comic Sans MS', 'Comic Sans', 'Comic Neue', cursive";

export const COLORS: Record<PieceType, string> = {
  I: '#38d9f5',
  J: '#4f7cff',
  L: '#ff9f40',
  O: '#ffd23f',
  S: '#5fdc7a',
  T: '#b76bff',
  Z: '#ff5a6e',
};

function block(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
  // Simple bevel: light top-left, dark bottom-right.
  ctx.fillStyle = 'rgb(255 255 255 / 0.28)';
  ctx.fillRect(x + 1, y + 1, size - 2, 3);
  ctx.fillRect(x + 1, y + 1, 3, size - 2);
  ctx.fillStyle = 'rgb(0 0 0 / 0.25)';
  ctx.fillRect(x + 1, y + size - 4, size - 2, 3);
  ctx.fillRect(x + size - 4, y + 1, 3, size - 2);
}

/** `flash` = rows just cleared and how far through the flash we are (1 → 0). */
export function drawTetris(ctx: CanvasRenderingContext2D, s: TetrisState, flash: { rows: number[]; t: number } | null) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Board and faint grid.
  ctx.fillStyle = '#0c0c0c';
  ctx.fillRect(0, 0, BOARD_W, HEIGHT);
  ctx.strokeStyle = 'rgb(255 255 255 / 0.04)';
  ctx.lineWidth = 1;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * CELL + 0.5, 0);
    ctx.lineTo(c * CELL + 0.5, HEIGHT);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL + 0.5);
    ctx.lineTo(BOARD_W, r * CELL + 0.5);
    ctx.stroke();
  }

  s.board.forEach((row, r) => row.forEach((cell, c) => cell && block(ctx, c * CELL, r * CELL, CELL, COLORS[cell])));

  if (!s.over) {
    // Ghost: where the piece will land.
    const ghost = { ...s.piece, row: landingRow(s) };
    ctx.strokeStyle = COLORS[s.piece.type];
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 2;
    for (const [r, c] of pieceCells(ghost)) if (r >= 0) ctx.strokeRect(c * CELL + 3, r * CELL + 3, CELL - 6, CELL - 6);
    ctx.globalAlpha = 1;
    for (const [r, c] of pieceCells(s.piece)) if (r >= 0) block(ctx, c * CELL, r * CELL, CELL, COLORS[s.piece.type]);
  }

  if (flash) {
    ctx.fillStyle = `rgb(255 255 255 / ${flash.t * 0.8})`;
    for (const r of flash.rows) ctx.fillRect(0, r * CELL, BOARD_W, CELL);
  }

  // Side panel: next piece.
  ctx.fillStyle = '#121212';
  ctx.fillRect(BOARD_W, 0, SIDE_W, HEIGHT);
  ctx.fillStyle = '#b3b3b3';
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('NEXT', BOARD_W + SIDE_W / 2, 30);
  const mini = 22;
  const cells = pieceCells({ type: s.next, rotation: 0, row: 0, col: 0 });
  const rows = cells.map(([r]) => r);
  const cols = cells.map(([, c]) => c);
  const w = (Math.max(...cols) - Math.min(...cols) + 1) * mini;
  const h = (Math.max(...rows) - Math.min(...rows) + 1) * mini;
  const x0 = BOARD_W + (SIDE_W - w) / 2;
  const y0 = 48 + (60 - h) / 2;
  for (const [r, c] of cells) block(ctx, x0 + (c - Math.min(...cols)) * mini, y0 + (r - Math.min(...rows)) * mini, mini, COLORS[s.next]);
}
