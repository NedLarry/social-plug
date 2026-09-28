import { useEffect, useReducer, useRef } from 'react';
import { Leaderboard, useLeaderboard } from '../../../shared';
import { WhotCardView } from '../WhotCardView';
import { higherLowerReducer, newGame } from './logic';

export default function HigherLower() {
  const [state, dispatch] = useReducer(higherLowerReducer, undefined, () => newGame());
  const board = useLeaderboard('whot-higher-lower');
  const submitted = useRef(false);

  // Save the streak once when a game ends.
  useEffect(() => {
    if (!state.over) {
      submitted.current = false;
      return;
    }
    if (submitted.current) return;
    submitted.current = true;
    void board.submit(state.streak);
  }, [state.over, state.streak, board]);

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
      <div className="game-toolbar">
        <div className="game-stats">
          <span>
            Streak <strong>{state.streak}</strong>
          </span>
          <span>
            Your best <strong>{board.you?.score ?? 0}</strong>
          </span>
          <span>
            Top <strong title={board.top ? `by ${board.top.name}` : undefined}>{board.top?.score ?? '–'}</strong>
          </span>
          <span>
            Left <strong>{state.deck.length}</strong>
          </span>
        </div>
        <button type="button" className="btn" onClick={() => dispatch({ type: 'NEW_GAME' })}>
          New game
        </button>
      </div>

      <p className="game-status" aria-live="polite">
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
      <Leaderboard board={board} title="This week's longest streaks" />
    </div>
  );
}
