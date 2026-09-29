import type { Kind } from './logic';

/** A mole (brown or golden with a crown) or a bomb. `dizzy` = just got bonked. */
export function Critter({ kind, dizzy }: { kind: Kind; dizzy: boolean }) {
  if (kind === 'bomb') {
    return (
      <svg viewBox="0 0 100 100" className="wam-svg" aria-hidden="true">
        <path d="M62 22 q10 -12 20 -8" stroke="#b58a5a" strokeWidth="4" fill="none" strokeLinecap="round" />
        <g className="wam-spark">
          <circle cx="84" cy="13" r="6" fill="#ffd23f" />
          <circle cx="84" cy="13" r="3" fill="#fff" />
        </g>
        <rect x="52" y="20" width="16" height="12" rx="3" fill="#555" transform="rotate(25 60 26)" />
        <circle cx="50" cy="62" r="34" fill="#232323" />
        <circle cx="38" cy="50" r="8" fill="#fff" opacity="0.25" />
        {dizzy ? (
          <text x="50" y="72" textAnchor="middle" fontSize="26" fontWeight="800" fill="#ff5a6e" fontFamily="'Comic Sans MS', 'Comic Neue', cursive">
            BOOM
          </text>
        ) : (
          <g fill="#ff5a6e">
            <path d="M34 62 l10 -6 v12 z" />
            <path d="M66 62 l-10 -6 v12 z" />
          </g>
        )}
      </svg>
    );
  }

  const fur = kind === 'gold' ? '#f2c230' : '#8b5a3c';
  const muzzle = kind === 'gold' ? '#ffe89a' : '#d9a47a';
  return (
    <svg viewBox="0 0 100 100" className="wam-svg" aria-hidden="true">
      {kind === 'gold' && <path d="M32 22 l6 -14 l12 10 l12 -10 l6 14 z" fill="#ffd23f" stroke="#c99a12" strokeWidth="2" strokeLinejoin="round" />}
      <ellipse cx="50" cy="70" rx="38" ry="48" fill={fur} />
      <circle cx="18" cy="36" r="7" fill={fur} />
      <circle cx="82" cy="36" r="7" fill={fur} />
      <ellipse cx="50" cy="66" rx="22" ry="17" fill={muzzle} />
      {dizzy ? (
        <g stroke="#1b1b1b" strokeWidth="3.5" strokeLinecap="round">
          <path d="M31 40 l8 8 M39 40 l-8 8" />
          <path d="M61 40 l8 8 M69 40 l-8 8" />
        </g>
      ) : (
        <g>
          <circle cx="35" cy="44" r="5" fill="#1b1b1b" />
          <circle cx="65" cy="44" r="5" fill="#1b1b1b" />
          <circle cx="36.5" cy="42.5" r="1.6" fill="#fff" />
          <circle cx="66.5" cy="42.5" r="1.6" fill="#fff" />
        </g>
      )}
      <ellipse cx="50" cy="58" rx="7" ry="5" fill="#ff8fa3" />
      <rect x="45" y="68" width="10" height="9" rx="2" fill="#fff" />
      <line x1="50" y1="68" x2="50" y2="77" stroke="#ddd" strokeWidth="1" />
      <g stroke="#3a2618" strokeWidth="1.5" strokeLinecap="round" opacity="0.6">
        <path d="M32 62 l-14 -3 M32 67 l-14 2" />
        <path d="M68 62 l14 -3 M68 67 l14 2" />
      </g>
      {dizzy && (
        <g className="wam-stars" fill="#ffd23f">
          <path d="M20 16 l3 6 l6 1 l-5 4 l1 6 l-5 -3 l-5 3 l1 -6 l-5 -4 l6 -1 z" />
          <path d="M78 12 l2 4 l4 1 l-3 3 l1 4 l-4 -2 l-4 2 l1 -4 l-3 -3 l4 -1 z" />
        </g>
      )}
    </svg>
  );
}
