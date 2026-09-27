import { useEffect, useReducer, useState } from 'react';
import { WhotCardView } from '../WhotCardView';
import { higherLowerReducer, newGame } from './logic';

const BEST_KEY = 'whot.higherLower.best';

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function HigherLower() {
  const [state, dispatch] = useReducer(higherLowerReducer, undefined, () => newGame());
  const [best, setBest] = useState(readBest);

  useEffect(() => {
    if (state.streak <= best) return;
    setBest(state.streak);
    try {
      localStorage.setItem(BEST_KEY, String(state.streak));
    } catch {
      // Best score just won't persist.
    }
  }, [state.streak, best]);

  const status = state.over
    ? state.deck.length === 0 && state.lastResult !== 'wrong'
      ? `You went through the whole deck! Streak: ${state.streak}`
      : `Wrong! It was ${state.current.number}. Final streak: ${state.streak}`
    : state.lastResult === 'right'
      ? 'Correct! Keep going.'
      : state.lastResult === 'tie'
        ? 'Same number: free pass.'
        : 'Will the next card be higher or lower?';

  return (
    <div className="hilo">
      <div className="match__bar">
        <div className="match__stats">
          <span>
            Streak <strong>{state.streak}</strong>
          </span>
          <span>
            Best <strong>{best}</strong>
          </span>
          <span>
            Left <strong>{state.deck.length}</strong>
          </span>
        </div>
        <button type="button" className="btn" onClick={() => dispatch({ type: 'NEW_GAME' })}>
          New game
        </button>
      </div>

      <p className="match__status" aria-live="polite">
        {status}
      </p>

      <div className="hilo__cards">
        <div className="hilo__slot">
          <span className="classic__label">Previous</span>
          {state.previous ? <WhotCardView card={state.previous} faceUp disabled /> : <div className="hilo__empty" />}
        </div>
        <div className="hilo__slot hilo__slot--current">
          <span className="classic__label">Current</span>
          <WhotCardView key={state.current.id} card={state.current} faceUp disabled />
        </div>
      </div>

      {!state.over && (
        <div className="hilo__actions">
          <button type="button" className="btn" onClick={() => dispatch({ type: 'GUESS', guess: 'higher' })}>
            ▲ Higher
          </button>
          <button type="button" className="btn" onClick={() => dispatch({ type: 'GUESS', guess: 'lower' })}>
            ▼ Lower
          </button>
        </div>
      )}
    </div>
  );
}
