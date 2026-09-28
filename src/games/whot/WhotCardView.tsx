import { SHAPES, type WhotCard } from './deck';
import { getCardBackImage, getCardFaceImage } from './cardAssets';
import './whot.css';

interface Props {
  card: WhotCard;
  faceUp: boolean;
  matched?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function WhotCardView({ card, faceUp, matched, selected, disabled, onClick }: Props) {
  const face = getCardFaceImage(card);
  const shape = SHAPES[card.shape];
  const back = getCardBackImage();
  const classes = ['whot-card', faceUp && 'is-up', matched && 'is-matched', selected && 'is-selected']
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      disabled={disabled}
      aria-label={faceUp ? `${shape.name} ${card.number}` : 'Face-down card'}
    >
      <span className="whot-card__inner">
        <span className="whot-card__back">
          {back ? <img src={back} alt="" /> : <span className="whot-card__back-mark">WHOT</span>}
        </span>
        <span className={`whot-card__front shape-${card.shape}`}>
          {face ? (
            <img src={face} alt="" />
          ) : (
            <>
              <span className="whot-card__symbol" aria-hidden="true">{shape.symbol}</span>
              <span className="whot-card__number">{card.number}</span>
              <span className="whot-card__shape">{shape.name}</span>
            </>
          )}
        </span>
      </span>
    </button>
  );
}
