import { useEffect, useRef, useState } from 'react';
import { Leaderboard, useKeyDown, useLeaderboard } from '../../shared';
import {
  HINT_PENALTY,
  MISTAKE_PENALTY,
  PEERS,
  boxOf,
  colOf,
  completedUnits,
  finalScore,
  isSolved,
  makePuzzle,
  rowOf,
  type Difficulty,
  type Grid,
} from './logic';
import './sudoku.css';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

interface Game {
  difficulty: Difficulty;
  puzzle: Grid;
  solution: Grid;
  values: Grid;
  /** Pencil marks per cell, as a bitmask (bit d = digit d). */
  notes: number[];
  mistakes: number;
  hints: number;
}

function newGame(difficulty: Difficulty): Game {
  const { puzzle, solution } = makePuzzle(difficulty);
  return { difficulty, puzzle, solution, values: [...puzzle], notes: Array(81).fill(0), mistakes: 0, hints: 0 };
}

function loadDifficulty(): Difficulty {
  try {
    const d = localStorage.getItem('sudoku.difficulty');
    return d === 'medium' || d === 'hard' ? d : 'easy';
  } catch {
    return 'easy';
  }
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function Sudoku() {
  const [game, setGame] = useState<Game>(() => newGame(loadDifficulty()));
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [flash, setFlash] = useState<{ cells: Set<number>; id: number } | null>(null);
  // 'top' = beat this week's high score, 'personal' = beat your own best this week.
  const [record, setRecord] = useState<'top' | 'personal' | null>(null);
  const [finalPoints, setFinalPoints] = useState(0);
  const flashId = useRef(0);

  const board = useLeaderboard(`sudoku-${game.difficulty}`);
  const solved = isSolved(game.values, game.solution);
  const running = !solved && !paused;

  // Clock.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  // Pause when switching tabs or apps (the grid is hidden while paused).
  useEffect(() => {
    const onHide = () => document.hidden && setPaused(true);
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  // Save the score once, when the puzzle is solved.
  const submitted = useRef(false);
  useEffect(() => {
    if (!solved) {
      submitted.current = false;
      return;
    }
    if (submitted.current) return;
    submitted.current = true;
    const points = finalScore(game.difficulty, seconds, game.mistakes, game.hints);
    setFinalPoints(points);
    const beatTop = points > (board.top?.score ?? 0);
    setRecord(beatTop ? 'top' : null);
    void board.submit(points).then((res) => {
      if (res?.improved && !beatTop) setRecord('personal');
    });
  }, [solved, game, seconds, board]);

  // Lets browser tests read the board (development builds only).
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __sudoku?: { solution: Grid; puzzle: Grid } };
    w.__sudoku = { solution: game.solution, puzzle: game.puzzle };
    return () => {
      delete w.__sudoku;
    };
  }, [game.solution, game.puzzle]);

  function start(difficulty = game.difficulty) {
    try {
      localStorage.setItem('sudoku.difficulty', difficulty);
    } catch {
      // Just won't be remembered.
    }
    setGame(newGame(difficulty));
    setSelected(null);
    setSeconds(0);
    setPaused(false);
    setRecord(null);
    setFlash(null);
  }

  function celebrate(cells: number[]) {
    if (!cells.length) return;
    flashId.current += 1;
    setFlash({ cells: new Set(cells), id: flashId.current });
  }

  function place(digit: number) {
    if (selected === null || solved || paused) return;
    const i = selected;
    if (game.puzzle[i] || game.values[i] === game.solution[i]) return; // givens and correct answers are locked

    if (notesMode) {
      const notes = [...game.notes];
      notes[i] ^= 1 << digit;
      setGame({ ...game, notes });
      return;
    }

    const values = [...game.values];
    values[i] = digit;
    const correct = digit === game.solution[i];
    const notes = [...game.notes];
    notes[i] = 0;
    // A correct number clears that digit from the notes around it.
    if (correct) for (const j of PEERS[i]) notes[j] &= ~(1 << digit);
    setGame({ ...game, values, notes, mistakes: game.mistakes + (correct ? 0 : 1) });
    if (correct) celebrate(completedUnits(values, game.solution, i));
  }

  function erase() {
    if (selected === null || solved || paused) return;
    const i = selected;
    if (game.puzzle[i] || game.values[i] === game.solution[i]) return;
    const values = [...game.values];
    const notes = [...game.notes];
    values[i] = 0;
    notes[i] = 0;
    setGame({ ...game, values, notes });
  }

  function hint() {
    if (solved || paused) return;
    // The selected cell if it needs it, otherwise the first empty or wrong one.
    const needs = (i: number) => game.values[i] !== game.solution[i];
    const i = selected !== null && needs(selected) ? selected : game.values.findIndex((_, j) => needs(j));
    if (i < 0) return;
    const values = [...game.values];
    values[i] = game.solution[i];
    const notes = [...game.notes];
    notes[i] = 0;
    for (const j of PEERS[i]) notes[j] &= ~(1 << game.solution[i]);
    setGame({ ...game, values, notes, hints: game.hints + 1 });
    setSelected(i);
    celebrate(completedUnits(values, game.solution, i));
  }

  useKeyDown((e) => {
    if (paused && e.key !== 'p' && e.key !== 'P') return;
    if (/^[1-9]$/.test(e.key)) {
      place(Number(e.key));
      return true;
    }
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      erase();
      return true;
    }
    const moves: Record<string, number> = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
    if (e.key in moves) {
      const from = selected ?? 40;
      const to = from + moves[e.key];
      const sameRow = e.key === 'ArrowLeft' || e.key === 'ArrowRight' ? rowOf(to) === rowOf(from) : true;
      if (to >= 0 && to < 81 && sameRow) setSelected(to);
      else if (selected === null) setSelected(from);
      return true;
    }
    if (e.key === 'n' || e.key === 'N') {
      setNotesMode((m) => !m);
      return true;
    }
    if (e.key === 'h' || e.key === 'H') {
      hint();
      return true;
    }
    if ((e.key === 'p' || e.key === 'P') && !solved) {
      setPaused((p) => !p);
      return true;
    }
  });

  // Correctly placed count per digit, for the number pad.
  const placed = DIGITS.map((d) => game.values.filter((v, i) => v === d && game.solution[i] === d).length);
  const selValue = selected !== null ? game.values[selected] : 0;
  const top = board.top;

  return (
    <div className="sudoku">
      <div className="game-toolbar">
        <div className="game-stats">
          <span>
            Time <strong>{clock(seconds)}</strong>
          </span>
          <span>
            Mistakes <strong>{game.mistakes}</strong>
          </span>
          <span>
            Top <strong title={top ? `by ${top.name}` : undefined}>{top?.score ?? '–'}</strong>
          </span>
        </div>
        <div className="game-controls">
          <div className="segmented" role="group" aria-label="Difficulty">
            {DIFFICULTIES.map((d) => (
              <button key={d} type="button" aria-pressed={game.difficulty === d} onClick={() => start(d)}>
                {LABEL[d]}
              </button>
            ))}
          </div>
          {!solved && (
            <button type="button" className="btn btn--ghost" onClick={() => setPaused((p) => !p)}>
              {paused ? 'Resume' : 'Pause'}
            </button>
          )}
        </div>
      </div>
      <p className="game-status">
        Fill every row, column and 3×3 box with 1–9. Mistakes cost {MISTAKE_PENALTY} points, hints {HINT_PENALTY}.
      </p>

      <div className="sudoku-stage">
        <div className={`sudoku-grid${solved ? ' is-solved' : ''}${paused ? ' is-paused' : ''}`} role="grid" aria-label="Sudoku grid">
          {game.values.map((v, i) => {
            const given = game.puzzle[i] !== 0;
            const wrong = v !== 0 && v !== game.solution[i];
            const related =
              selected !== null && i !== selected && (rowOf(i) === rowOf(selected) || colOf(i) === colOf(selected) || boxOf(i) === boxOf(selected));
            const classes = [
              'sudoku-cell',
              given ? 'is-given' : v ? (wrong ? 'is-wrong' : 'is-entered') : '',
              i === selected ? 'is-selected' : related ? 'is-related' : '',
              selValue && v === selValue && i !== selected ? 'is-same' : '',
              flash?.cells.has(i) ? 'is-flash' : '',
              colOf(i) % 3 === 2 && colOf(i) !== 8 ? 'edge-right' : '',
              rowOf(i) % 3 === 2 && rowOf(i) !== 8 ? 'edge-bottom' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={flash?.cells.has(i) ? `${i}-${flash.id}` : i}
                type="button"
                role="gridcell"
                className={classes}
                style={solved ? { animationDelay: `${(rowOf(i) + colOf(i)) * 45}ms` } : undefined}
                aria-label={`Row ${rowOf(i) + 1}, column ${colOf(i) + 1}${v ? `: ${v}` : ', empty'}`}
                onClick={() => setSelected(i)}
              >
                {v ? (
                  v
                ) : game.notes[i] ? (
                  <span className="sudoku-notes">
                    {DIGITS.map((d) => (
                      <span key={d}>{game.notes[i] & (1 << d) ? d : ''}</span>
                    ))}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {paused && !solved && (
          <div className="sudoku-overlay">
            <p className="sudoku-overlay__title">Paused</p>
            <button type="button" className="btn btn--big" onClick={() => setPaused(false)}>
              Resume
            </button>
          </div>
        )}
        {solved && (
          <div className="sudoku-overlay sudoku-overlay--won">
            <p className={`sudoku-overlay__title${record ? ' is-record' : ''}`}>
              {record === 'top' ? 'New high score!' : record === 'personal' ? 'Personal best!' : 'Solved!'}
            </p>
            <p>
              <strong>{finalPoints}</strong> points · {clock(seconds)} · {game.mistakes} mistake{game.mistakes === 1 ? '' : 's'}
              {game.hints ? ` · ${game.hints} hint${game.hints === 1 ? '' : 's'}` : ''}
            </p>
            <button type="button" className="btn btn--big" onClick={() => start()}>
              New puzzle
            </button>
          </div>
        )}
      </div>

      <div className="sudoku-pad">
        {DIGITS.map((d, k) => (
          <button key={d} type="button" className="sudoku-pad__digit" disabled={placed[k] >= 9 || solved} onClick={() => place(d)} aria-label={`Enter ${d}`}>
            {d}
            <small>{9 - placed[k]}</small>
          </button>
        ))}
      </div>
      <div className="sudoku-tools">
        <button type="button" className={`btn btn--ghost${notesMode ? ' is-on' : ''}`} aria-pressed={notesMode} onClick={() => setNotesMode((m) => !m)}>
          ✎ Notes {notesMode ? 'on' : 'off'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={erase}>
          ⌫ Erase
        </button>
        <button type="button" className="btn btn--ghost" onClick={hint} disabled={solved}>
          💡 Hint
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => start()}>
          New puzzle
        </button>
      </div>

      <Leaderboard board={board} title={`This week's top scores · ${LABEL[game.difficulty]}`} unit="pts" />
    </div>
  );
}
