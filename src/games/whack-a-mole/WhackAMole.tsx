import { useEffect, useRef, useState } from 'react';
import { Leaderboard, useGameLoop, useKeyDown, useLeaderboard } from '../../shared';
import { Critter } from './Critters';
import { COMBO_STEP, HOLES, POINTS, ROUND_MS, multiplier, newRound, tick, whack, type WhackEvent, type WhackState } from './logic';
import './whack-a-mole.css';

type Status = 'ready' | 'playing' | 'over';

// Keys laid out like the holes: numpad 7 8 9 / 4 5 6 / 1 2 3, or Q W E / A S D / Z X C.
const KEY_HOLES: Record<string, number> = {
  '7': 0, '8': 1, '9': 2, '4': 3, '5': 4, '6': 5, '1': 6, '2': 7, '3': 8,
  q: 0, w: 1, e: 2, a: 3, s: 4, d: 5, z: 6, x: 7, c: 8,
};

interface Popup {
  id: number;
  hole: number;
  text: string;
  tone: 'good' | 'gold' | 'bad';
}

export default function WhackAMole() {
  const [status, setStatus] = useState<Status>('ready');
  const [game, setGame] = useState<WhackState>(newRound);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [bonk, setBonk] = useState<{ hole: number; id: number } | null>(null);
  const [shake, setShake] = useState(0);
  const [record, setRecord] = useState<'top' | 'personal' | null>(null);
  const board = useLeaderboard('whack-a-mole');
  const gameRef = useRef(game);
  const popupId = useRef(0);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  // Lets browser tests read the board (development builds only).
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __whack?: () => WhackState };
    w.__whack = () => gameRef.current;
    return () => {
      delete w.__whack;
    };
  }, []);

  function start() {
    const fresh = newRound();
    gameRef.current = fresh;
    setGame(fresh);
    setPopups([]);
    setRecord(null);
    setStatus('playing');
  }

  function finish(final: WhackState) {
    setStatus('over');
    const beatTop = final.score > 0 && final.score > (board.top?.score ?? 0);
    setRecord(beatTop ? 'top' : null);
    void board.submit(final.score).then((res) => {
      if (res?.improved && final.score > 0 && !beatTop) setRecord('personal');
    });
  }

  function show(event: WhackEvent) {
    if (event.type === 'miss' || event.type === 'escaped') return;
    const id = ++popupId.current;
    const popup: Popup =
      event.type === 'bomb'
        ? { id, hole: event.hole, text: `${event.points}`, tone: 'bad' }
        : { id, hole: event.hole, text: `+${event.points}${event.multiplier > 1 ? ` ×${event.multiplier}` : ''}`, tone: event.kind === 'gold' ? 'gold' : 'good' };
    setPopups((p) => [...p.slice(-6), popup]);
    setTimeout(() => setPopups((p) => p.filter((x) => x.id !== id)), 750);
    if (event.type === 'bomb') setShake((n) => n + 1);
  }

  useGameLoop((dt) => {
    if (status !== 'playing') return;
    const { state } = tick(gameRef.current, dt * 1000);
    gameRef.current = state;
    setGame(state);
    if (state.over) finish(state);
  }, status === 'playing');

  function hit(hole: number) {
    if (status !== 'playing') return;
    setBonk({ hole, id: Date.now() });
    const { state, event } = whack(gameRef.current, hole);
    gameRef.current = state;
    setGame(state);
    show(event);
  }

  useKeyDown((e) => {
    const hole = KEY_HOLES[e.key.toLowerCase()];
    if (hole !== undefined && status === 'playing') {
      hit(hole);
      return true;
    }
    if ((e.key === 'Enter' || e.key === ' ') && status !== 'playing') {
      start();
      return true;
    }
  });

  const secondsLeft = Math.ceil((ROUND_MS - game.elapsed) / 1000);
  const mult = multiplier(game.combo);
  const top = board.top;

  return (
    <div className="wam">
      <div className="game-toolbar">
        <div className="game-stats">
          <span>
            Score <strong>{game.score}</strong>
          </span>
          <span>
            Time <strong>{secondsLeft}</strong>
          </span>
          <span className={mult > 1 ? 'wam-combo is-hot' : 'wam-combo'}>
            Combo <strong>×{mult}</strong>
          </span>
          <span>
            Top <strong title={top ? `by ${top.name}` : undefined}>{top?.score ?? '–'}</strong>
          </span>
        </div>
      </div>
      <p className="game-status">Tap the moles, or use keys 1–9 (numpad) or Q W E / A S D / Z X C.</p>

      <div className="wam-timer" aria-hidden="true">
        <div className="wam-timer__bar" style={{ width: `${(1 - game.elapsed / ROUND_MS) * 100}%` }} />
      </div>

      <div className="wam-stage">
        <div key={shake} className={`wam-field${shake ? ' is-shaking' : ''}`}>
          {Array.from({ length: HOLES }, (_, i) => {
            const m = game.holes[i];
            return (
              <button
                key={i}
                type="button"
                className={`wam-hole${bonk?.hole === i ? ' is-bonked' : ''}`}
                aria-label={m && !m.hit ? `Hole ${i + 1}: ${m.kind === 'bomb' ? 'bomb' : m.kind === 'gold' ? 'golden mole' : 'mole'}` : `Hole ${i + 1}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  hit(i);
                }}
              >
                <span className="wam-back" />
                <span className="wam-window">
                  <span className={`wam-critter${m ? ' is-up' : ''}`}>{m && <Critter kind={m.kind} dizzy={m.hit} />}</span>
                </span>
                <span className="wam-front" />
                {popups
                  .filter((p) => p.hole === i)
                  .map((p) => (
                    <span key={p.id} className={`wam-popup is-${p.tone}`}>
                      {p.text}
                    </span>
                  ))}
              </button>
            );
          })}
        </div>

        {status === 'ready' && (
          <div className="wam-overlay">
            <p className="wam-overlay__title">Whack-a-Mole!</p>
            <ul className="wam-legend">
              <li>
                <span className="wam-legend__icon">
                  <Critter kind="mole" dizzy={false} />
                </span>
                +{POINTS.mole}
              </li>
              <li>
                <span className="wam-legend__icon">
                  <Critter kind="gold" dizzy={false} />
                </span>
                +{POINTS.gold}
              </li>
              <li>
                <span className="wam-legend__icon">
                  <Critter kind="bomb" dizzy={false} />
                </span>
                {POINTS.bomb}
              </li>
            </ul>
            <p>30 seconds. Every {COMBO_STEP} hits in a row boosts your points. Don&apos;t bonk the bombs!</p>
            {top && (
              <p className="wam-overlay__target">
                Score to beat: <strong>{top.score}</strong> by {top.name}
              </p>
            )}
            <button type="button" className="btn btn--big" onClick={start}>
              Start
            </button>
          </div>
        )}
        {status === 'over' && (
          <div className="wam-overlay wam-overlay--over">
            <p className={`wam-overlay__title${record ? ' is-record' : ''}`}>
              {record === 'top' ? 'New high score!' : record === 'personal' ? 'Personal best!' : "Time's up!"}
            </p>
            <p>
              Score <strong>{game.score}</strong> · {game.hits} bonks · best combo <strong>{game.bestCombo}</strong>
            </p>
            {record !== 'top' && top && (
              <p className="wam-overlay__target">
                Score to beat: <strong>{top.score}</strong> by {top.name}
              </p>
            )}
            <button type="button" className="btn btn--big" onClick={start}>
              Play again
            </button>
          </div>
        )}
      </div>

      <Leaderboard board={board} unit="pts" />
    </div>
  );
}
