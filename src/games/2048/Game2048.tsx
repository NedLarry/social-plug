import { useEffect, useRef, useState } from 'react';
import { Leaderboard, useKeyDown, useLeaderboard } from '../../shared';
import { SIZE, WIN_VALUE, newGame, slide, type Dir, type Game2048 as Game, type Tile } from './logic';
import './2048.css';

const SLIDE_MS = 110;
const SWIPE_DISTANCE = 28;

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

export default function Game2048() {
  const [game, setGame] = useState<Game>(() => newGame());
  const [ghosts, setGhosts] = useState<Tile[]>([]);
  const [popup, setPopup] = useState<{ points: number; id: number } | null>(null);
  // Show "You made 2048!" once per game; afterwards keep playing for a bigger score.
  const [winSeen, setWinSeen] = useState(false);
  const [record, setRecord] = useState<'top' | 'personal' | null>(null);
  const board = useLeaderboard('2048');
  const submittedScore = useRef(0);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const gameRef = useRef(game);
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  /** Saves the score (best-per-player, so saving a lower one is harmless). */
  function save(score: number) {
    if (score <= submittedScore.current) return;
    submittedScore.current = score;
    const beatTop = score > (board.top?.score ?? 0);
    void board.submit(score).then((res) => {
      if (!gameRef.current.over) return;
      setRecord(beatTop ? 'top' : res?.improved ? 'personal' : null);
    });
  }

  // Game over saves the score (so does starting over mid-game; see restart).
  useEffect(() => {
    if (game.over) save(game.score);
  }, [game.over]);

  // Swallowed tiles only live for the slide animation.
  useEffect(() => {
    if (!ghosts.length) return;
    const t = setTimeout(() => setGhosts([]), SLIDE_MS + 20);
    return () => clearTimeout(t);
  }, [ghosts]);

  // Lets browser tests read the board (development builds only).
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __game2048?: () => Game };
    w.__game2048 = () => gameRef.current;
    return () => {
      delete w.__game2048;
    };
  }, []);

  function move(dir: Dir) {
    const showingWin = game.won && !winSeen;
    if (game.over || showingWin) return;
    const r = slide(game, dir);
    if (!r.moved) return;
    setGame(r.game);
    setGhosts(r.ghosts);
    if (r.gained) setPopup({ points: r.gained, id: r.game.nextId });
  }

  function restart() {
    save(game.score);
    submittedScore.current = 0;
    setGame(newGame());
    setGhosts([]);
    setPopup(null);
    setWinSeen(false);
    setRecord(null);
  }

  useKeyDown((e) => {
    const dir = KEY_DIRS[e.key] ?? KEY_DIRS[e.key.toLowerCase()];
    if (dir) {
      move(dir);
      return true;
    }
    if (e.key === 'Enter' && game.over) {
      restart();
      return true;
    }
  });

  const onPointerDown = (e: React.PointerEvent) => (swipe.current = { x: e.clientX, y: e.clientY });
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_DISTANCE) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  };

  const best = Math.max(board.you?.score ?? 0, game.over ? game.score : 0);
  const top = board.top;
  const tileStyle = (t: Tile) => ({ '--r': t.row, '--c': t.col }) as React.CSSProperties;
  const showWin = game.won && !winSeen && !game.over;

  return (
    <div className="t2048">
      <div className="game-toolbar">
        <div className="game-stats">
          <span className="t2048-score">
            Score <strong>{game.score}</strong>
            {popup && (
              <span key={popup.id} className="t2048-score__pop">
                +{popup.points}
              </span>
            )}
          </span>
          <span>
            Your best <strong>{board.data ? best : '–'}</strong>
          </span>
          <span>
            Top <strong title={top ? `by ${top.name}` : undefined}>{top?.score ?? '–'}</strong>
          </span>
        </div>
        <div className="game-controls">
          <button type="button" className="btn" onClick={restart}>
            New game
          </button>
        </div>
      </div>
      <p className="game-status">Arrow keys, WASD or swipe. Tiles with the same number merge. Make {WIN_VALUE}!</p>

      <div className="t2048-stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (swipe.current = null)}>
        <div className="t2048-board" style={{ '--size': SIZE } as React.CSSProperties}>
          {Array.from({ length: SIZE * SIZE }, (_, i) => (
            <div key={`cell${i}`} className="t2048-cell" style={{ '--r': Math.floor(i / SIZE), '--c': i % SIZE } as React.CSSProperties} />
          ))}
          {ghosts.map((t) => (
            <div key={t.id} className={`t2048-tile v${Math.min(t.value, 4096)}`} style={tileStyle(t)}>
              {t.value}
            </div>
          ))}
          {game.tiles.map((t) => (
            <div
              key={t.id}
              className={`t2048-tile v${Math.min(t.value, 4096)}${t.isNew ? ' is-new' : ''}${t.merged ? ' is-merged' : ''}${t.value >= 1024 ? ' is-big' : ''}`}
              style={tileStyle(t)}
              aria-label={String(t.value)}
            >
              {t.value}
            </div>
          ))}
        </div>

        {showWin && (
          <div className="t2048-overlay">
            <p className="t2048-overlay__title">You made {WIN_VALUE}! 🎉</p>
            <p>Keep going for a bigger score?</p>
            <div className="game-controls">
              <button type="button" className="btn btn--big" onClick={() => setWinSeen(true)}>
                Keep going
              </button>
              <button type="button" className="btn btn--big btn--ghost" onClick={restart}>
                New game
              </button>
            </div>
          </div>
        )}
        {game.over && (
          <div className="t2048-overlay t2048-overlay--over">
            <p className={`t2048-overlay__title${record ? ' is-record' : ''}`}>
              {record === 'top' ? 'New high score!' : record === 'personal' ? 'Personal best!' : 'No more moves!'}
            </p>
            <p>
              Score <strong>{game.score}</strong> · Biggest tile <strong>{Math.max(...game.tiles.map((t) => t.value))}</strong>
            </p>
            {record !== 'top' && top && (
              <p className="t2048-overlay__target">
                Score to beat: <strong>{top.score}</strong> by {top.name}
              </p>
            )}
            <button type="button" className="btn btn--big" onClick={restart}>
              Play again
            </button>
          </div>
        )}
      </div>

      <Leaderboard board={board} unit="pts" />
    </div>
  );
}
