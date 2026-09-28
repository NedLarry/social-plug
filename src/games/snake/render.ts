import { BONUS_STEPS, type Dir, type Point, type SnakeState } from './logic';

export const CELL = 24;
export const FONT = "'Comic Sans MS', 'Comic Sans', 'Comic Neue', cursive";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
}

export interface Popup {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
  size: number;
}

export interface Scene {
  state: SnakeState;
  /** Snake positions before the current step, for smooth movement between cells. */
  prev: Point[];
  /** 0 → at prev, 1 → at current positions. */
  t: number;
  time: number;
  particles: Particle[];
  popups: Popup[];
  shake: number;
}

const DIRS: Record<Dir, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const center = (p: Point) => ({ x: (p.x + 0.5) * CELL, y: (p.y + 0.5) * CELL });

export const FOOD_COLOR = '#ff5a6e';
export const BONUS_COLOR = '#ffd23f';

/** Head is bright lime, fading to teal along the body. */
function bodyColor(i: number, n: number, dead: boolean) {
  const k = n > 1 ? i / (n - 1) : 0;
  if (dead) return `hsl(0 ${40 - k * 20}% ${55 - k * 15}%)`;
  return `hsl(${110 + k * 60} 80% ${60 - k * 18}%)`;
}

export function spawnBurst(particles: Particle[], at: Point, color: string, count: number, speed = 140) {
  const c = center(at);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    const max = 0.4 + Math.random() * 0.4;
    particles.push({ x: c.x, y: c.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: max, max, size: 2 + Math.random() * 3, color });
  }
}

export function spawnPopup(popups: Popup[], at: Point, text: string, color: string, size = 16) {
  const c = center(at);
  popups.push({ x: c.x, y: c.y - 6, text, life: 0.9, color, size });
}

export function updateEffects(scene: Scene, dt: number) {
  for (const p of scene.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 3 * dt;
    p.vy *= 1 - 3 * dt;
    p.life -= dt;
  }
  scene.particles = scene.particles.filter((p) => p.life > 0);
  for (const p of scene.popups) {
    p.y -= 34 * dt;
    p.life -= dt;
  }
  scene.popups = scene.popups.filter((p) => p.life > 0);
  scene.shake = Math.max(0, scene.shake - dt * 2.5);
}

function drawBoard(ctx: CanvasRenderingContext2D, s: SnakeState) {
  ctx.fillStyle = '#0c0c0c';
  ctx.fillRect(0, 0, s.cols * CELL, s.rows * CELL);
  ctx.fillStyle = '#131313';
  for (let y = 0; y < s.rows; y++) {
    for (let x = (y % 2); x < s.cols; x += 2) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
  }
  if (s.mode === 'wrap') {
    // Dashed edge hints that you can pass through.
    ctx.strokeStyle = 'rgb(95 191 133 / 0.35)';
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, s.cols * CELL - 2, s.rows * CELL - 2);
    ctx.setLineDash([]);
  }
}

function drawFood(ctx: CanvasRenderingContext2D, at: Point, time: number) {
  const c = center(at);
  const r = CELL * 0.3 * (1 + Math.sin(time * 6) * 0.1);
  ctx.save();
  ctx.shadowColor = FOOD_COLOR;
  ctx.shadowBlur = 14;
  ctx.fillStyle = FOOD_COLOR;
  ctx.beginPath();
  ctx.arc(c.x, c.y + 1, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Shine and leaf.
  ctx.fillStyle = 'rgb(255 255 255 / 0.7)';
  ctx.beginPath();
  ctx.arc(c.x - r * 0.35, c.y - r * 0.25, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5fbf85';
  ctx.beginPath();
  ctx.ellipse(c.x + 3, c.y - r - 1, 4, 2, -0.6, 0, Math.PI * 2);
  ctx.fill();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rotation: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rotation + (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function drawBonus(ctx: CanvasRenderingContext2D, bonus: NonNullable<SnakeState['bonus']>, time: number) {
  const c = center(bonus.pos);
  const left = bonus.stepsLeft / BONUS_STEPS;
  // Blink when about to disappear.
  if (bonus.stepsLeft < 10 && Math.floor(time * 8) % 2 === 0) return;
  ctx.save();
  ctx.shadowColor = BONUS_COLOR;
  ctx.shadowBlur = 18;
  ctx.fillStyle = BONUS_COLOR;
  star(ctx, c.x, c.y, CELL * 0.42 * (1 + Math.sin(time * 8) * 0.08), time * 1.5);
  ctx.fill();
  ctx.restore();
  // Countdown ring.
  ctx.strokeStyle = 'rgb(255 210 63 / 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c.x, c.y, CELL * 0.62, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2);
  ctx.stroke();
}

function interpolated(scene: Scene): Point[] {
  const { state, prev, t } = scene;
  return state.snake.map((cur, i) => {
    const from = prev[i] ?? prev[prev.length - 1] ?? cur;
    const a = center(from);
    const b = center(cur);
    // Wrapping across the board: jump instead of sliding across it.
    if (Math.abs(from.x - cur.x) > 1 || Math.abs(from.y - cur.y) > 1) return b;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  });
}

function drawSnake(ctx: CanvasRenderingContext2D, scene: Scene) {
  const { state, time } = scene;
  const pts = interpolated(scene);
  const n = pts.length;
  const dead = !state.alive;
  const width = (i: number) => CELL * (0.82 - (0.3 * i) / Math.max(n - 1, 1));

  ctx.lineCap = 'round';
  for (let i = n - 1; i >= 1; i--) {
    const a = pts[i];
    const b = pts[i - 1];
    const color = bodyColor(i, n, dead);
    if (Math.hypot(a.x - b.x, a.y - b.y) < CELL * 1.5) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width(i);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(a.x, a.y, width(i) / 2, 0, Math.PI * 2);
    ctx.fill();
    // Spots along the back.
    if (i % 3 === 0) {
      ctx.fillStyle = 'rgb(255 255 255 / 0.18)';
      ctx.beginPath();
      ctx.arc(a.x, a.y, width(i) * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const head = pts[0];
  const d = DIRS[state.dir];
  const perp = { x: -d.y, y: d.x };

  // Tongue flicks every couple of seconds.
  if (!dead && time % 2.2 < 0.22) {
    const base = { x: head.x + d.x * CELL * 0.42, y: head.y + d.y * CELL * 0.42 };
    const tip = { x: base.x + d.x * CELL * 0.35, y: base.y + d.y * CELL * 0.35 };
    ctx.strokeStyle = FOOD_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(tip.x + (d.x + perp.x) * 4, tip.y + (d.y + perp.y) * 4);
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x + (d.x - perp.x) * 4, tip.y + (d.y - perp.y) * 4);
    ctx.stroke();
  }

  ctx.fillStyle = bodyColor(0, n, dead);
  ctx.beginPath();
  ctx.arc(head.x, head.y, CELL * 0.48, 0, Math.PI * 2);
  ctx.fill();

  const blink = !dead && time % 3.3 < 0.12;
  for (const side of [1, -1]) {
    const e = { x: head.x + d.x * CELL * 0.1 + perp.x * side * CELL * 0.2, y: head.y + d.y * CELL * 0.1 + perp.y * side * CELL * 0.2 };
    if (dead) {
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      const r = CELL * 0.1;
      ctx.beginPath();
      ctx.moveTo(e.x - r, e.y - r);
      ctx.lineTo(e.x + r, e.y + r);
      ctx.moveTo(e.x + r, e.y - r);
      ctx.lineTo(e.x - r, e.y + r);
      ctx.stroke();
    } else if (blink) {
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(e.x - perp.x * 3 - d.x, e.y - perp.y * 3 - d.y);
      ctx.lineTo(e.x + perp.x * 3 - d.x, e.y + perp.y * 3 - d.y);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(e.x, e.y, CELL * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(e.x + d.x * 1.5, e.y + d.y * 1.5, CELL * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawEffects(ctx: CanvasRenderingContext2D, scene: Scene) {
  for (const p of scene.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const p of scene.popups) {
    ctx.globalAlpha = Math.min(1, p.life * 2);
    ctx.font = `bold ${p.size}px ${FONT}`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgb(0 0 0 / 0.7)';
    ctx.strokeText(p.text, p.x, p.y);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
}

export function drawScene(ctx: CanvasRenderingContext2D, scene: Scene) {
  const { state } = scene;
  const w = state.cols * CELL;
  const h = state.rows * CELL;
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  if (scene.shake > 0) {
    const m = scene.shake * 9;
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
  }
  drawBoard(ctx, state);
  drawFood(ctx, state.food, scene.time);
  if (state.bonus) drawBonus(ctx, state.bonus, scene.time);
  drawSnake(ctx, scene);
  drawEffects(ctx, scene);
  // Red flash on crash.
  if (!state.alive && scene.shake > 0) {
    ctx.fillStyle = `rgb(255 60 80 / ${scene.shake * 0.25})`;
    ctx.fillRect(-20, -20, w + 40, h + 40);
  }
  ctx.restore();
}
