import './snake.css';

/** Home page artwork: a wiggling snake eyeing a berry. */
export function SnakeCover() {
  return (
    <svg className="snake-cover" viewBox="0 0 200 120" aria-hidden="true">
      <defs>
        <linearGradient id="snake-cover-body" x1="0" x2="1">
          <stop offset="0" stopColor="hsl(170 80% 42%)" />
          <stop offset="1" stopColor="hsl(110 80% 60%)" />
        </linearGradient>
        <radialGradient id="snake-cover-glow">
          <stop offset="0" stopColor="#ff5a6e" stopOpacity="0.6" />
          <stop offset="1" stopColor="#ff5a6e" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="snake-cover__berry">
        <circle cx="168" cy="36" r="16" fill="url(#snake-cover-glow)" />
        <circle cx="168" cy="36" r="7" fill="#ff5a6e" />
        <circle cx="165.5" cy="33.5" r="1.8" fill="#fff" opacity="0.75" />
        <ellipse cx="171" cy="27.5" rx="3.5" ry="1.8" fill="#5fbf85" transform="rotate(-30 171 27.5)" />
      </g>
      <g className="snake-cover__snake">
        <path
          d="M22 88 C 45 60, 62 104, 88 82 S 125 50, 140 62"
          fill="none"
          stroke="url(#snake-cover-body)"
          strokeWidth="15"
          strokeLinecap="round"
        />
        <path className="snake-cover__tongue" d="M150 56 l8 -5 m0 0 l3 -4 m-3 4 l4 -1" stroke="#ff5a6e" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="142" cy="61" r="9.5" fill="hsl(110 80% 60%)" />
        <circle cx="143" cy="56" r="3" fill="#fff" />
        <circle cx="147" cy="61" r="3" fill="#fff" />
        <circle cx="144" cy="55.5" r="1.4" fill="#111" />
        <circle cx="148" cy="60.3" r="1.4" fill="#111" />
      </g>
    </svg>
  );
}
