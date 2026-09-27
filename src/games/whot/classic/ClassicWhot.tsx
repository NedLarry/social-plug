import { useEffect, useReducer, useState } from 'react';
import { getCardBackImage } from '../cardAssets';
import { SHAPES, type WhotShape } from '../deck';
import { WhotCardView } from '../WhotCardView';
import { canPlay, classicReducer, newGame, top } from './logic';

const CPU_DELAY_MS = 900;
const PICKABLE_SHAPES: WhotShape[] = ['circle', 'triangle', 'cross', 'square', 'star'];

export function ClassicWhot() {
  const [playerCount, setPlayerCount] = useState(2);
  const [handSize, setHandSize] = useState(5);
  const [state, dispatch] = useReducer(classicReducer, undefined, () => newGame(playerCount, handSize));
  const [whotCardId, setWhotCardId] = useState<string | null>(null);

  const me = state.players[0];
  const myTurn = state.current === 0 && state.winner === null;
  const topCard = top(state);

  useEffect(() => {
    if (state.winner !== null || state.players[state.current].isHuman) return;
    const t = setTimeout(() => dispatch({ type: 'CPU_TURN' }), CPU_DELAY_MS);
    return () => clearTimeout(t);
  }, [state]);

  const restart = (players = playerCount, size = handSize) => {
    setPlayerCount(players);
    setHandSize(size);
    setWhotCardId(null);
    dispatch({ type: 'NEW_GAME', players, handSize: size });
  };

  const onCardClick = (cardId: string, shape: WhotShape) => {
    if (shape === 'whot') setWhotCardId(cardId);
    else dispatch({ type: 'PLAY', cardId });
  };

  const status =
    state.winner !== null
      ? state.winner === 0
        ? 'You won! Check up!'
        : `${state.players[state.winner].name} won.`
      : !myTurn
        ? `${state.players[state.current].name} is thinking…`
        : state.pending
          ? `Pick ${state.pending.count}! Play a ${state.pending.number} to pass it on, or go to market.`
          : state.requestedShape
            ? `Whot asked for ${SHAPES[state.requestedShape].name}. Play one, play Whot, or go to market.`
            : 'Your turn: match the shape or number, or go to market.';

  return (
    <div className="classic">
      <div className="match__bar">
        <div className="match__controls">
          <label>
            Players{' '}
            <select value={playerCount} onChange={(e) => restart(Number(e.target.value))}>
              {[2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            Deal{' '}
            <select value={handSize} onChange={(e) => restart(playerCount, Number(e.target.value))}>
              {[4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} cards
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" className="btn" onClick={() => restart()}>
          New game
        </button>
      </div>

      <div className="classic__opponents">
        {state.players.slice(1).map((p, i) => (
          <div key={p.name} className={`opponent${state.current === i + 1 ? ' is-turn' : ''}`}>
            <span className="opponent__name">{p.name}</span>
            <span className="opponent__count">{p.hand.length} cards</span>
            {p.hand.length <= 2 && state.winner === null && (
              <span className="badge">{p.hand.length === 1 ? 'Last card!' : 'Semi-last card!'}</span>
            )}
          </div>
        ))}
      </div>

      <div className="classic__table">
        <div className="classic__pile">
          <span className="classic__label">Market ({state.market.length})</span>
          <button
            type="button"
            className="market"
            onClick={() => dispatch({ type: 'GO_MARKET' })}
            disabled={!myTurn}
            aria-label="Go to market"
          >
            {getCardBackImage() && <img src={getCardBackImage()} alt="" />}
            <span className="market__label">GO MARKET</span>
          </button>
        </div>
        <div className="classic__pile">
          <span className="classic__label">
            Call card
            {state.requestedShape && ` · wants ${SHAPES[state.requestedShape].symbol} ${SHAPES[state.requestedShape].name}`}
          </span>
          <div className="classic__top">
            <WhotCardView card={topCard} faceUp disabled />
          </div>
        </div>
      </div>

      <p className="match__status" aria-live="polite">
        {status}
      </p>

      {whotCardId && (
        <div className="shape-picker" role="dialog" aria-label="Choose a shape">
          <span>I need…</span>
          {PICKABLE_SHAPES.map((shape) => (
            <button
              key={shape}
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                dispatch({ type: 'PLAY', cardId: whotCardId, shape });
                setWhotCardId(null);
              }}
            >
              {SHAPES[shape].symbol} {SHAPES[shape].name}
            </button>
          ))}
          <button type="button" className="btn btn--ghost" onClick={() => setWhotCardId(null)}>
            Cancel
          </button>
        </div>
      )}

      <div className="classic__hand-head">
        <span className="classic__label">Your hand ({me.hand.length})</span>
        {me.hand.length <= 2 && state.winner === null && (
          <span className="badge">{me.hand.length === 1 ? 'Last card!' : 'Semi-last card!'}</span>
        )}
      </div>
      <div className="classic__hand">
        {me.hand.map((card) => {
          const playable = myTurn && !whotCardId && canPlay(state, card);
          return (
            <WhotCardView
              key={card.id}
              card={card}
              faceUp
              selected={playable}
              disabled={!playable}
              onClick={() => onCardClick(card.id, card.shape)}
            />
          );
        })}
      </div>

      <ul className="classic__log">
        {[...state.log].reverse().map((line, i) => (
          <li key={state.log.length - i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
