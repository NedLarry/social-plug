import './2048.css';

const TILES: [number, number, string, string, string][] = [
  // x, y, value, background, text colour
  [0, 0, '2', '#3a4a5c', '#fff'],
  [1, 0, '8', '#2fa3a0', '#fff'],
  [0, 1, '64', '#e0b92e', '#1b1b1b'],
  [1, 1, '2048', '#ffd23f', '#1b1b1b'],
];

/** Home page artwork: four tiles, with 2048 glowing. */
export function Cover2048() {
  return (
    <svg className="t2048-cover" viewBox="0 0 100 100" aria-hidden="true">
      <rect x="0" y="0" width="100" height="100" rx="10" fill="#1b1b1b" />
      {TILES.map(([x, y, v, bg, fg]) => (
        <g key={v} className={v === '2048' ? 't2048-cover__pop' : undefined}>
          <rect x={6 + x * 47} y={6 + y * 47} width="41" height="41" rx="7" fill={bg} />
          <text
            x={26.5 + x * 47}
            y={33 + y * 47}
            textAnchor="middle"
            fontSize={v.length > 2 ? 12 : 20}
            fontWeight="800"
            fill={fg}
            fontFamily="'Comic Sans MS', 'Comic Neue', cursive"
          >
            {v}
          </text>
        </g>
      ))}
    </svg>
  );
}
