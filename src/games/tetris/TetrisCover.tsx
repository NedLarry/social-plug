import './tetris.css';

// [x, y, color] blocks on a 10 × 7 grid: a stack with a T piece dropping in.
const STACK: [number, number, string][] = [
  [0, 6, '#4f7cff'], [1, 6, '#4f7cff'], [2, 6, '#4f7cff'], [0, 5, '#4f7cff'],
  [3, 6, '#ffd23f'], [4, 6, '#ffd23f'], [3, 5, '#ffd23f'], [4, 5, '#ffd23f'],
  [6, 6, '#5fdc7a'], [7, 6, '#5fdc7a'], [7, 5, '#5fdc7a'], [8, 5, '#5fdc7a'],
  [9, 3, '#38d9f5'], [9, 4, '#38d9f5'], [9, 5, '#38d9f5'], [9, 6, '#38d9f5'],
  [8, 6, '#ff9f40'], [1, 5, '#ff5a6e'], [2, 5, '#ff5a6e'], [2, 4, '#ff5a6e'],
];
const FALLING: [number, number][] = [[5, 5], [5, 6], [6, 5], [4, 4]].map(([x, y]) => [x, y - 1]) as [number, number][];

/** Home page artwork: a stack of blocks with a piece dropping into the gap. */
export function TetrisCover() {
  const cell = 10;
  const tile = (x: number, y: number, color: string, key: string) => (
    <g key={key}>
      <rect x={x * cell + 0.5} y={y * cell + 0.5} width={cell - 1} height={cell - 1} rx="1.5" fill={color} />
      <rect x={x * cell + 0.5} y={y * cell + 0.5} width={cell - 1} height="2" fill="#fff" opacity="0.3" />
    </g>
  );
  return (
    <svg className="tetris-cover" viewBox="0 0 100 70" aria-hidden="true">
      {STACK.map(([x, y, c], i) => tile(x, y, c, `s${i}`))}
      <g className="tetris-cover__falling">{FALLING.map(([x, y], i) => tile(x, y, '#b76bff', `f${i}`))}</g>
    </svg>
  );
}
