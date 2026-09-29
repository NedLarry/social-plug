import { Critter } from './Critters';
import './whack-a-mole.css';

/** Home page artwork: a mole peeking out of its hole, with a mallet ready to swing. */
export function WhackCover() {
  return (
    <svg className="wam-cover" viewBox="0 0 200 120" aria-hidden="true">
      <ellipse cx="100" cy="100" rx="52" ry="14" fill="#0d0906" />
      <clipPath id="wam-cover-clip">
        <rect x="40" y="0" width="120" height="100" />
      </clipPath>
      <g clipPath="url(#wam-cover-clip)">
        <g className="wam-cover__mole">
          <svg x="62" y="26" width="76" height="80" viewBox="0 0 100 100">
            <Critter kind="mole" dizzy={false} />
          </svg>
        </g>
      </g>
      <path d="M46 104 a54 14 0 0 0 108 0 z" fill="#5a3d26" />
      <g className="wam-cover__mallet">
        <rect x="146" y="54" width="7" height="52" rx="3" fill="#b07a45" transform="rotate(-20 150 80)" />
        <rect x="128" y="36" width="40" height="22" rx="6" fill="#e0566a" transform="rotate(-20 148 47)" />
      </g>
    </svg>
  );
}
