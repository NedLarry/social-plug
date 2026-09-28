// Creates a new game folder that the platform picks up automatically.
//
//   npm run new-game -- snake --name "Snake" --template canvas --tags Arcade
//
// Templates: canvas (default) for games drawn on a <canvas>, react for games
// built from regular page elements (cards, boards, buttons).
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    name: { type: 'string' },
    template: { type: 'string', default: 'canvas' },
    tags: { type: 'string' },
  },
});

const id = positionals[0];
if (!id || !/^[a-z][a-z0-9-]*$/.test(id)) {
  console.error('Usage: npm run new-game -- <id> [--name "Display Name"] [--template canvas|react] [--tags Arcade,Puzzle]');
  console.error('  <id> is lowercase letters, numbers and dashes, e.g. snake or tic-tac-toe');
  process.exit(1);
}
if (!['canvas', 'react'].includes(values.template)) {
  console.error(`Unknown template "${values.template}". Use canvas or react.`);
  process.exit(1);
}

const name = values.name ?? id.replace(/(^|-)([a-z])/g, (_, dash, c) => (dash ? ' ' : '') + c.toUpperCase());
const component = name.replace(/[^A-Za-z0-9]/g, '') || 'Game';
const tags = (values.tags ?? (values.template === 'canvas' ? 'Arcade' : 'Casual')).split(',').map((t) => t.trim()).filter(Boolean);
const dir = path.join('src/games', id);

if (existsSync(dir)) {
  console.error(`${dir} already exists.`);
  process.exit(1);
}

const indexTs = `import { defineGame } from '../define';

export default defineGame({
  id: '${id}',
  name: '${name}',
  description: 'TODO: one line about ${name} for the home page.',
  tags: ${JSON.stringify(tags)},
  // cover: MyCover, // optional artwork component for the home page tile
  variations: [
    {
      id: 'play',
      name: '${name}',
      description: 'TODO: how this version plays.',
      load: () => import('./${component}'),
    },
  ],
});
`;

const canvasTsx = `import { useEffect, useRef, useState } from 'react';
import { pointerPosition, setupCanvas, useGameLoop, useHighScore, useKeyDown } from '../../shared';

// Starter game: move the square to collect dots. Replace with your own game.
const WIDTH = 480;
const HEIGHT = 360;
const SIZE = 20;
const SPEED = 220; // units per second

const randomDot = () => ({ x: 20 + Math.random() * (WIDTH - 40), y: 20 + Math.random() * (HEIGHT - 40) });

export default function ${component}() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const player = useRef({ x: WIDTH / 2, y: HEIGHT / 2 });
  const dot = useRef(randomDot());
  const held = useRef(new Set<string>());
  const target = useRef<{ x: number; y: number } | null>(null);
  const scoreRef = useRef(0);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(true);
  const [best, submitBest] = useHighScore('${id}.best');

  useEffect(() => {
    ctxRef.current = setupCanvas(canvasRef.current!, WIDTH, HEIGHT);
  }, []);

  useEffect(() => {
    const up = (e: KeyboardEvent) => held.current.delete(e.key);
    window.addEventListener('keyup', up);
    return () => window.removeEventListener('keyup', up);
  }, []);

  useKeyDown((e) => {
    if (e.key === ' ') {
      setRunning((r) => !r);
      return true;
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
      held.current.add(e.key);
      target.current = null;
      return true;
    }
  });

  useGameLoop((dt) => {
    const p = player.current;
    const keys = held.current;
    // Keys give a direction; a tap gives a point to walk to (and stop at).
    let dx = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0);
    let dy = (keys.has('ArrowDown') || keys.has('s') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('w') ? 1 : 0);
    let maxStep = Infinity;
    if (target.current) {
      dx = target.current.x - p.x;
      dy = target.current.y - p.y;
      maxStep = Math.hypot(dx, dy);
    }
    const len = Math.hypot(dx, dy);
    if (len > 0.5) {
      const step = Math.min(SPEED * dt, maxStep);
      p.x = Math.max(0, Math.min(WIDTH, p.x + (dx / len) * step));
      p.y = Math.max(0, Math.min(HEIGHT, p.y + (dy / len) * step));
    }
    if (Math.hypot(dot.current.x - p.x, dot.current.y - p.y) < SIZE) {
      dot.current = randomDot();
      scoreRef.current += 1;
      setScore(scoreRef.current);
      submitBest(scoreRef.current);
    }

    const ctx = ctxRef.current!;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#e0566a';
    ctx.beginPath();
    ctx.arc(dot.current.x, dot.current.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(p.x - SIZE / 2, p.y - SIZE / 2, SIZE, SIZE);
  }, running);

  const restart = () => {
    player.current = { x: WIDTH / 2, y: HEIGHT / 2 };
    dot.current = randomDot();
    scoreRef.current = 0;
    setScore(0);
    setRunning(true);
  };

  return (
    <div>
      <div className="game-toolbar">
        <div className="game-stats">
          <span>
            Score <strong>{score}</strong>
          </span>
          <span>
            Best <strong>{best}</strong>
          </span>
        </div>
        <div className="game-controls">
          <button type="button" className="btn btn--ghost" onClick={() => setRunning((r) => !r)}>
            {running ? 'Pause' : 'Resume'}
          </button>
          <button type="button" className="btn" onClick={restart}>
            Restart
          </button>
        </div>
      </div>
      <p className="game-status">Arrow keys / WASD, or tap where to go. Space pauses.</p>
      <canvas
        ref={canvasRef}
        className="game-canvas"
        onPointerDown={(e) => (target.current = pointerPosition(e.currentTarget, e, WIDTH, HEIGHT))}
        onPointerMove={(e) => {
          if (e.buttons) target.current = pointerPosition(e.currentTarget, e, WIDTH, HEIGHT);
        }}
      />
    </div>
  );
}
`;

const reactTsx = `import { useState } from 'react';
import { useHighScore } from '../../shared';

// Starter game built from regular page elements. Replace with your own game.
export default function ${component}() {
  const [score, setScore] = useState(0);
  const [best, submitBest] = useHighScore('${id}.best');

  const tap = () => {
    setScore(score + 1);
    submitBest(score + 1);
  };

  return (
    <div>
      <div className="game-toolbar">
        <div className="game-stats">
          <span>
            Score <strong>{score}</strong>
          </span>
          <span>
            Best <strong>{best}</strong>
          </span>
        </div>
        <div className="game-controls">
          <button type="button" className="btn btn--ghost" onClick={() => setScore(0)}>
            Restart
          </button>
        </div>
      </div>
      <p className="game-status">Tap the button!</p>
      <button type="button" className="btn btn--big" onClick={tap}>
        Tap
      </button>
    </div>
  );
}
`;

await mkdir(dir, { recursive: true });
await writeFile(path.join(dir, 'index.ts'), indexTs);
await writeFile(path.join(dir, `${component}.tsx`), values.template === 'canvas' ? canvasTsx : reactTsx);

console.log(`Created ${dir}/
  index.ts          name, description, tags and variations (shows up on the home page automatically)
  ${component}.tsx  the game itself (${values.template} starter)

Run \`npm run dev\` and open /games/${id}`);
