import { useEffect, useRef, useState } from 'react';
import { Leaderboard, setupCanvas, useGameLoop, useKeyDown, useLeaderboard } from '../../shared';
import { dropInterval, hardDrop, move, newGame, rotate, tick, type TetrisEvent, type TetrisState } from './logic';
import { HEIGHT, WIDTH, drawTetris } from './render';
import './tetris.css';

type Status = 'ready' | 'playing' | 'paused' | 'over';
type Action = 'left' | 'right' | 'rotate' | 'rotate-back' | 'down' | 'drop';

const FLASH_MS = 180;

export default function Tetris() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const game = useRef<TetrisState>(null as unknown as TetrisState);
  if (!game.current) game.current = newGame();
  const statusRef = useRef<Status>('ready');
  const elapsed = useRef(0);
  const flash = useRef<{ rows: number[]; left: number } | null>(null);
  const holdTimer = useRef<number | null>(null);
  const padRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState<Status>('ready');
  const [stats, setStats] = useState({ score: 0, lines: 0, level: 1 });
  // 'top' = beat this week's high score, 'personal' = beat your own best this week.
  const [record, setRecord] = useState<'top' | 'personal' | null>(null);
  const board = useLeaderboard('tetris');
  const topRef = useRef(0);

  useEffect(() => {
    ctxRef.current = setupCanvas(canvasRef.current!, WIDTH, HEIGHT);
  }, []);

  useEffect(() => {
    topRef.current = board.top?.score ?? 0;
  }, [board.top]);

  // Pause when switching tabs or apps.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && statusRef.current === 'playing') go('paused');
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  // Lets browser tests read the board (development builds only).
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __tetrisState?: () => TetrisState };
    w.__tetrisState = () => game.current;
    return () => {
      delete w.__tetrisState;
    };
  }, []);

  function go(next: Status) {
    statusRef.current = next;
    setStatus(next);
  }

  function sync() {
    const { score, lines, level } = game.current;
    setStats({ score, lines, level });
  }

  function play() {
    // On phones, bring the board and buttons fully into view for playing.
    if (statusRef.current !== 'paused' && matchMedia('(pointer: coarse)').matches) {
      requestAnimationFrame(() => padRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }));
    }
    if (statusRef.current === 'over') {
      game.current = newGame();
      elapsed.current = 0;
      setRecord(null);
      sync();
    }
    go('playing');
  }

  function handle(events: TetrisEvent[]) {
    for (const e of events) {
      if (e.type === 'clear') flash.current = { rows: e.rows, left: FLASH_MS };
      if (e.type === 'over') {
        const final = game.current.score;
        const beatTop = final > 0 && final > topRef.current;
        setRecord(beatTop ? 'top' : null);
        void board.submit(final).then((res) => {
          if (res?.improved && final > 0 && !beatTop) setRecord('personal');
        });
        go('over');
      }
    }
    sync();
  }

  function act(action: Action) {
    if (statusRef.current !== 'playing') {
      if (statusRef.current !== 'over') play();
      return;
    }
    const s = game.current;
    if (action === 'left') game.current = move(s, -1);
    else if (action === 'right') game.current = move(s, 1);
    else if (action === 'rotate') game.current = rotate(s, 1);
    else if (action === 'rotate-back') game.current = rotate(s, -1);
    else {
      const result = action === 'down' ? tick(s, true) : hardDrop(s);
      game.current = result.state;
      elapsed.current = 0;
      handle(result.events);
    }
  }

  function togglePause() {
    if (statusRef.current === 'playing') go('paused');
    else play();
  }

  useGameLoop((dt) => {
    if (statusRef.current === 'playing') {
      elapsed.current += dt * 1000;
      const interval = dropInterval(game.current.level);
      while (elapsed.current >= interval && statusRef.current === 'playing') {
        elapsed.current -= interval;
        const result = tick(game.current);
        game.current = result.state;
        if (result.events.length) handle(result.events);
      }
    }
    if (flash.current) {
      flash.current.left -= dt * 1000;
      if (flash.current.left <= 0) flash.current = null;
    }
    const f = flash.current ? { rows: flash.current.rows, t: flash.current.left / FLASH_MS } : null;
    if (ctxRef.current) drawTetris(ctxRef.current, game.current, f);
  });

  useKeyDown((e) => {
    const keys: Record<string, Action> = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'rotate',
      x: 'rotate',
      X: 'rotate',
      z: 'rotate-back',
      Z: 'rotate-back',
      ArrowDown: 'down',
      ' ': 'drop',
    };
    const action = keys[e.key];
    if (action) {
      act(action);
      return true;
    }
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (statusRef.current !== 'over') togglePause();
      return true;
    }
    if (e.key === 'Enter' && statusRef.current !== 'playing') {
      play();
      return true;
    }
  });

  // Touch buttons repeat while held.
  const startHold = (action: Action) => {
    act(action);
    if (action === 'drop' || action === 'rotate') return;
    const repeat = () => {
      act(action);
      holdTimer.current = window.setTimeout(repeat, action === 'down' ? 50 : 90);
    };
    holdTimer.current = window.setTimeout(repeat, 220);
  };
  const stopHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };
  useEffect(() => stopHold, []);

  const top = board.top;

  return (
    <div className="tetris">
      <div className="game-toolbar">
        <div className="game-stats">
          <span>
            Score <strong>{stats.score}</strong>
          </span>
          <span>
            Lines <strong>{stats.lines}</strong>
          </span>
          <span>
            Level <strong>{stats.level}</strong>
          </span>
          <span>
            Top <strong title={top ? `by ${top.name}` : undefined}>{top?.score ?? '–'}</strong>
          </span>
        </div>
        <div className="game-controls">
          {(status === 'playing' || status === 'paused') && (
            <button type="button" className="btn" onClick={togglePause}>
              {status === 'playing' ? 'Pause' : 'Resume'}
            </button>
          )}
        </div>
      </div>
      <p className="game-status">
        <span className="tetris-hint--keys">← → move · ↑ or X rotate · Z rotate back · ↓ soft drop · Space hard drop · P pause</span>
        <span className="tetris-hint--touch">Tap the board to rotate · hold ◀ ▶ ▼ to keep moving</span>
      </p>

      <div className="tetris-stage">
        <canvas
          ref={canvasRef}
          className="game-canvas"
          aria-label="Tetris board"
          onPointerDown={() => (statusRef.current === 'playing' ? act('rotate') : undefined)}
        />
        {status === 'ready' && (
          <div className="tetris-overlay">
            <p className="tetris-overlay__title">Tetris</p>
            <p>Fit the falling blocks together. Fill a whole row to clear it; clear lots at once for big points.</p>
            {top && (
              <p className="tetris-overlay__target">
                Score to beat: <strong>{top.score}</strong> by {top.name}
              </p>
            )}
            <button type="button" className="btn btn--big" onClick={play}>
              Start
            </button>
          </div>
        )}
        {status === 'paused' && (
          <div className="tetris-overlay">
            <p className="tetris-overlay__title">Paused</p>
            <button type="button" className="btn btn--big" onClick={play}>
              Resume
            </button>
          </div>
        )}
        {status === 'over' && (
          <div className="tetris-overlay tetris-overlay--over">
            <p className={`tetris-overlay__title${record ? ' tetris-overlay__title--best' : ''}`}>
              {record === 'top' ? 'New high score!' : record === 'personal' ? 'Personal best!' : 'Game over!'}
            </p>
            <p>
              Score <strong>{stats.score}</strong> · Lines <strong>{stats.lines}</strong>
            </p>
            {record === 'top' ? (
              <p className="tetris-overlay__target">You&apos;re top of this week&apos;s leaderboard!</p>
            ) : (
              top && (
                <p className="tetris-overlay__target">
                  Score to beat: <strong>{top.score}</strong> by {top.name}
                </p>
              )
            )}
            <button type="button" className="btn btn--big" onClick={play}>
              Play again
            </button>
          </div>
        )}
      </div>

      <div className="tetris-pad" ref={padRef} aria-label="Touch controls">
        {(
          [
            ['left', '◀', 'Move left'],
            ['rotate', '⟳', 'Rotate'],
            ['right', '▶', 'Move right'],
            ['down', '▼', 'Soft drop'],
            ['drop', '⤓', 'Hard drop'],
          ] as const
        ).map(([action, label, name]) => (
          <button
            key={action}
            type="button"
            aria-label={name}
            onPointerDown={(e) => {
              e.preventDefault();
              startHold(action);
            }}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onPointerCancel={stopHold}
          >
            {label}
          </button>
        ))}
      </div>

      <Leaderboard board={board} unit="pts" />
    </div>
  );
}
