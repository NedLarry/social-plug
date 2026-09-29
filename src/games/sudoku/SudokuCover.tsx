import './sudoku.css';

// A 3×3 box of a puzzle, with one number popping in.
const DIGITS = ['5', '', '8', '', '3', '', '7', '1', ''];

/** Home page artwork: one box of a Sudoku grid. */
export function SudokuCover() {
  return (
    <svg className="sudoku-cover" viewBox="0 0 90 90" aria-hidden="true">
      <rect x="1" y="1" width="88" height="88" rx="6" fill="#0c0c0c" stroke="#8a8a8a" strokeWidth="2" />
      {[30, 60].map((p) => (
        <g key={p} stroke="#333" strokeWidth="1">
          <line x1={p} y1="2" x2={p} y2="88" />
          <line x1="2" y1={p} x2="88" y2={p} />
        </g>
      ))}
      <rect x="31" y="31" width="28" height="28" fill="rgb(224 86 106 / 0.45)" />
      {DIGITS.map((d, i) =>
        d ? (
          <text key={i} x={15 + (i % 3) * 30} y={22 + Math.floor(i / 3) * 30} textAnchor="middle" fontSize="18" fontWeight="700" fill="#fff" fontFamily="'Comic Sans MS', 'Comic Neue', cursive">
            {d}
          </text>
        ) : null,
      )}
      <text className="sudoku-cover__pop" x="75" y="82" textAnchor="middle" fontSize="18" fontWeight="700" fill="#7fc8ff" fontFamily="'Comic Sans MS', 'Comic Neue', cursive">
        9
      </text>
    </svg>
  );
}
