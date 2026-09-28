import type { CSSProperties } from 'react';
import type { WhotShape } from './deck';
import { WhotCardView } from './WhotCardView';

interface Props {
  cards: { shape: WhotShape; number: number }[];
  className?: string;
}

/** A hand of face-up cards fanned out; spreads wider on hover. */
export function WhotFan({ cards, className = '' }: Props) {
  const mid = (cards.length - 1) / 2;
  return (
    <div className={`fan ${className}`} aria-hidden="true">
      {cards.map((c, i) => (
        <div key={i} className="fan__card" style={{ '--offset': i - mid } as CSSProperties}>
          <WhotCardView card={{ id: `fan-${i}`, ...c }} faceUp disabled />
        </div>
      ))}
    </div>
  );
}

export function WhotCover() {
  return (
    <WhotFan
      className="fan--cover"
      cards={[
        { shape: 'star', number: 8 },
        { shape: 'whot', number: 20 },
        { shape: 'circle', number: 14 },
      ]}
    />
  );
}
