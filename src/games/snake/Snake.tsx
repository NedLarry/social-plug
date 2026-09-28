import { useEffect, useRef, useState } from 'react';
import { setupCanvas, useGameLoop, useHighScore, useKeyDown } from '../../shared';
import { newGame, step, stepInterval, turn, type Dir, type Mode, type SnakeEvent } from './logic';
import { BONUS_COLOR, CELL, FOOD_COLOR, drawScene, spawnBurst, spawnPopup, updateEffects, type Scene } from './render';
import { setMuted, sounds } from './sound';
import './snake.css';

const COLS = 24;
const ROWS = 18;
const WIDTH = COLS * CELL;
const HEIGHT = ROWS * CELL;
const SWIPE_DISTANCE = 22;

type Status = 'ready' | 'playing' | 'paused' | 'over';

const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};

function loadPref(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function savePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Preference just won't be remembered.
  }
}

function freshScene(mode: Mode): Scene {
  const state = newGame(mode, COLS, ROWS);
  return { state, prev: state.snake, t: 1, time: 0, particles: [], popups: [], shake: 0 };
}

export default function Snake() {
  const [mode, setMode] = useState<Mode>(() => (loadPref('snake.mode') === 'wrap' ? 'wrap' : 'walls'));
  const [muted, setMutedState] = useState(() => loadPref('snake.muted') === '1');
  const [status, setStatus] = useState<Status>('ready');
  const [score, setScore] = useState(0);
  const [length, setLength] = useState(3);
  const [newBest, setNewBest] = useState(false);
  const [best, submitBest] = useHighScore(`snake.best.${mode}`);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const scene = useRef<Scene>(null as unknown as Scene);
  if (!scene.current) scene.current = freshScene(mode);
  const statusRef = useRef<Status>('ready');
  const elapsed = useRef(0);
  const bestRef = useRef(best);
  const swipe = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  useEffect(() => {
    ctxRef.current = setupCanvas(canvasRef.current!, WIDTH, HEIGHT);
  }, []);

  useEffect(() => {
    bestRef.current = best;
  }, [best]);

  // Lets browser tests read the board (development builds only).
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __snakeState?: () => unknown };
    w.__snakeState = () => scene.current.state;
    return () => {
      delete w.__snakeState;
    };
  }, []);

  useEffect(() => {
    setMuted(muted);
    savePref('snake.muted', muted ? '1' : '0');
  }, [muted]);

  // Pause when switching tabs or apps.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && statusRef.current === 'playing') go('paused');
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  function go(next: Status) {
    statusRef.current = next;
    setStatus(next);
  }

  function reset(nextMode = mode) {
    scene.current = freshScene(nextMode);
    elapsed.current = 0;
    setScore(0);
    setLength(3);
    setNewBest(false);
    go('ready');
  }

  function play() {
    if (statusRef.current === 'over') reset();
    if (statusRef.current === 'ready') sounds.start();
    go('playing');
  }

  function togglePause() {
    if (statusRef.current === 'playing') {
      sounds.pause();
      go('paused');
    } else {
      play();
    }
  }

  function steer(dir: Dir) {
    if (statusRef.current === 'over') return;
    const sc = scene.current;
    sc.state = turn(sc.state, dir);
    if (statusRef.current !== 'playing') play();
  }

  function changeMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    savePref('snake.mode', next);
    reset(next);
  }

  function handleEvents(events: SnakeEvent[]) {
    const sc = scene.current;
    for (const e of events) {
      if (e.type === 'eat') {
        spawnBurst(sc.particles, e.at, FOOD_COLOR, 14);
        spawnPopup(sc.popups, e.at, `+${e.points}`, '#ffffff');
        if (e.combo > 1) spawnPopup(sc.popups, { x: e.at.x, y: e.at.y - 1 }, `x${e.combo} combo!`, BONUS_COLOR, 18);
        sounds.eat(e.combo);
      } else if (e.type === 'bonus') {
        spawnBurst(sc.particles, e.at, BONUS_COLOR, 26, 210);
        spawnPopup(sc.popups, e.at, `+${e.points}`, BONUS_COLOR, 22);
        sounds.bonus();
      } else if (e.type === 'bonus-spawn') {
        spawnBurst(sc.particles, e.at, BONUS_COLOR, 8, 60);
        sounds.bonusSpawn();
      } else if (e.type === 'bonus-gone') {
        spawnBurst(sc.particles, e.at, '#777777', 8, 50);
      } else if (e.type === 'die') {
        sc.shake = 1;
        spawnBurst(sc.particles, e.at, '#ff3c50', 22, 180);
        sounds.die();
        const final = sc.state.score;
        setNewBest(final > 0 && final > bestRef.current);
        submitBest(final);
        go('over');
      }
    }
    setScore(sc.state.score);
    setLength(sc.state.snake.length + sc.state.grow);
  }

  useGameLoop((dt) => {
    const sc = scene.current;
    sc.time += dt;
    if (statusRef.current === 'playing') {
      elapsed.current += dt * 1000;
      let interval = stepInterval(sc.state.eaten);
      while (elapsed.current >= interval && sc.state.alive) {
        elapsed.current -= interval;
        sc.prev = sc.state.snake;
        const result = step(sc.state);
        sc.state = result.state;
        if (result.events.length) handleEvents(result.events);
        interval = stepInterval(sc.state.eaten);
      }
      sc.t = sc.state.alive ? Math.min(1, elapsed.current / interval) : 1;
    } else if (statusRef.current !== 'paused') {
      sc.prev = sc.state.snake;
      sc.t = 1;
    }
    updateEffects(sc, dt);
    if (ctxRef.current) drawScene(ctxRef.current, sc);
  });

  useKeyDown((e) => {
    const dir = KEY_DIRS[e.key] ?? KEY_DIRS[e.key.toLowerCase()];
    if (dir) {
      steer(dir);
      return true;
    }
    if (e.key === ' ' || e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (statusRef.current !== 'over' || e.key === ' ') togglePause();
      return true;
    }
    if (e.key === 'Enter' && statusRef.current !== 'playing') {
      play();
      return true;
    }
  });

  const onPointerDown = (e: React.PointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = swipe.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_DISTANCE) return;
    steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
    // Keep tracking from here so one long drag can make several turns.
    swipe.current = { x: e.clientX, y: e.clientY, moved: true };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const tapped = swipe.current && !swipe.current.moved;
    swipe.current = null;
    if (!tapped || (e.target as HTMLElement).closest('button')) return;
    if (statusRef.current === 'ready' || statusRef.current === 'paused') play();
  };

  const hint =
    status === 'ready'
      ? 'Arrow keys, WASD or swipe to move. Space pauses.'
      : status === 'playing'
        ? 'Eat quickly to build a combo. Grab the golden stars before they vanish!'
        : status === 'paused'
          ? 'Paused.'
          : 'Ouch! Press Enter or tap Play again.';

  return (
    <div className="snake">
      <div className="game-toolbar">
        <div className="game-stats">
          <span>
            Score <strong>{score}</strong>
          </span>
          <span>
            Best <strong>{best}</strong>
          </span>
          <span>
            Length <strong>{length}</strong>
          </span>
        </div>
        <div className="game-controls">
          <div className="segmented" role="group" aria-label="Mode">
            {(['walls', 'wrap'] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => changeMode(m)}>
                {m === 'walls' ? 'Walls' : 'Wrap'}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--ghost" onClick={() => setMutedState((m) => !m)} aria-pressed={!muted}>
            {muted ? 'Sound off' : 'Sound on'}
          </button>
          {(status === 'playing' || status === 'paused') && (
            <button type="button" className="btn" onClick={togglePause}>
              {status === 'playing' ? 'Pause' : 'Resume'}
            </button>
          )}
        </div>
      </div>
      <p className="game-status" aria-live="polite">
        {hint}
      </p>

      <div
        className="snake-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
      >
        <canvas ref={canvasRef} className="game-canvas" aria-label="Snake board" />

        {status === 'ready' && (
          <div className="snake-overlay">
            <p className="snake-overlay__title">Snake</p>
            <p>
              Eat the berries, grow long, and don&apos;t bite your own tail. {mode === 'wrap' ? 'Wrap mode: go off one edge and come back on the other.' : 'Walls mode: the edges bite!'}
            </p>
            <button type="button" className="btn btn--big" onClick={play}>
              Start
            </button>
          </div>
        )}
        {status === 'paused' && (
          <div className="snake-overlay">
            <p className="snake-overlay__title">Paused</p>
            <p>Press Space or tap to carry on.</p>
            <button type="button" className="btn btn--big" onClick={play}>
              Resume
            </button>
          </div>
        )}
        {status === 'over' && (
          <div className="snake-overlay snake-overlay--over">
            <p className={`snake-overlay__title${newBest ? ' snake-overlay__title--best' : ''}`}>
              {newBest ? 'New best!' : 'Game over!'}
            </p>
            <p>
              Score <strong>{score}</strong> · Length <strong>{length}</strong>
            </p>
            <button type="button" className="btn btn--big" onClick={play}>
              Play again
            </button>
          </div>
        )}
      </div>

      <div className="dpad" aria-label="Direction buttons">
        {(
          [
            ['up', '▲'],
            ['left', '◀'],
            ['right', '▶'],
            ['down', '▼'],
          ] as const
        ).map(([dir, label]) => (
          <button
            key={dir}
            type="button"
            className={`dpad__${dir}`}
            aria-label={dir}
            onPointerDown={(e) => {
              e.preventDefault();
              steer(dir);
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
