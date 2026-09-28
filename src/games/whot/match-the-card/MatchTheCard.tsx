import { useEffect, useReducer, useState } from 'react';
import { WhotCardView } from '../WhotCardView';
import { dealBoard, initState, isGameOver, matchReducer } from './logic';

const BOARD_SIZES = [12, 20, 30];
const MISS_DELAY_MS = 900;

export default function MatchTheCard() {
  const [size, setSize] = useState(20);
  const [state, dispatch] = useReducer(matchReducer, size, (n) => initState(dealBoard(n)));

  useEffect(() => {
    if (!state.missId) return;
    const t = setTimeout(() => dispatch({ type: 'HIDE_MISS' }), MISS_DELAY_MS);
    return () => clearTimeout(t);
  }, [state.missId]);

  const newGame = (n = size) => {
    setSize(n);
    dispatch({ type: 'NEW_GAME', cards: dealBoard(n) });
  };

  const over = isGameOver(state);
  const cleared = state.cards.every((c) => c.status === 'matched');
  const status = cleared
    ? `You matched every card! Final score: ${state.score}`
    : over
      ? `No more matches left. Final score: ${state.score}`
      : state.missId
        ? 'No match, try another card.'
        : state.targetId
          ? 'Find a card with the same shape or number (Whot matches anything).'
          : 'Pick a card to turn over.';

  return (
    <div className="match">
      <div className="game-toolbar">
        <div className="game-stats">
          <span>
            Score <strong>{state.score}</strong>
          </span>
          <span>
            Moves <strong>{state.moves}</strong>
          </span>
        </div>
        <div className="game-controls">
          <label>
            Cards{' '}
            <select value={size} onChange={(e) => newGame(Number(e.target.value))}>
              {BOARD_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn" onClick={() => newGame()}>
            New game
          </button>
        </div>
      </div>

      <p className="game-status" aria-live="polite">
        {status}
      </p>

      <div className="match__grid">
        {state.cards.map((card) => (
          <WhotCardView
            key={card.id}
            card={card}
            faceUp={card.status !== 'down'}
            matched={card.status === 'matched'}
            selected={card.id === state.targetId}
            disabled={card.status === 'matched'}
            onClick={() => dispatch({ type: 'FLIP', id: card.id })}
          />
        ))}
      </div>
    </div>
  );
}
