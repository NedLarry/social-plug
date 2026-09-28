export type Dir = 'up' | 'down' | 'left' | 'right';
export type Mode = 'walls' | 'wrap';

export interface Point {
  x: number;
  y: number;
}

export interface SnakeState {
  cols: number;
  rows: number;
  mode: Mode;
  /** Head first. */
  snake: Point[];
  dir: Dir;
  /** Turns pressed but not yet taken, so quick double-taps aren't lost. */
  queue: Dir[];
  food: Point;
  bonus: { pos: Point; stepsLeft: number } | null;
  /** Segments still to grow. */
  grow: number;
  score: number;
  eaten: number;
  combo: number;
  stepsSinceEat: number;
  alive: boolean;
}

export type SnakeEvent =
  | { type: 'eat'; at: Point; points: number; combo: number }
  | { type: 'bonus'; at: Point; points: number }
  | { type: 'bonus-spawn'; at: Point }
  | { type: 'bonus-gone'; at: Point }
  | { type: 'die'; at: Point };

export const FOOD_POINTS = 10;
export const BONUS_POINTS = 50;
export const BONUS_STEPS = 45;
export const BONUS_CHANCE = 0.25;
export const COMBO_WINDOW = 30; // steps between eats to keep the combo going
export const MAX_COMBO = 5;
const MAX_QUEUE = 3;

const VECTORS: Record<Dir, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

/** Milliseconds per step: starts relaxed and speeds up as the snake eats. */
export function stepInterval(eaten: number) {
  return Math.max(60, 140 - eaten * 3);
}

export function randomFreeCell(state: Pick<SnakeState, 'cols' | 'rows' | 'snake'>, taken: Point[] = [], random = Math.random) {
  const blocked = new Set([...state.snake, ...taken].map((p) => `${p.x},${p.y}`));
  const free: Point[] = [];
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.cols; x++) if (!blocked.has(`${x},${y}`)) free.push({ x, y });
  }
  return free.length ? free[Math.floor(random() * free.length)] : null;
}

export function newGame(mode: Mode, cols = 24, rows = 18, random = Math.random): SnakeState {
  const y = Math.floor(rows / 2);
  const x = Math.floor(cols / 3);
  const snake = [
    { x, y },
    { x: x - 1, y },
    { x: x - 2, y },
  ];
  const base = { cols, rows, snake };
  return {
    ...base,
    mode,
    dir: 'right',
    queue: [],
    food: randomFreeCell(base, [], random)!,
    bonus: null,
    grow: 0,
    score: 0,
    eaten: 0,
    combo: 0,
    stepsSinceEat: 0,
    alive: true,
  };
}

/** Queues a turn. Ignores reversing into yourself and repeats of the last queued direction. */
export function turn(state: SnakeState, dir: Dir): SnakeState {
  const last = state.queue[state.queue.length - 1] ?? state.dir;
  if (dir === last || dir === OPPOSITE[last] || state.queue.length >= MAX_QUEUE) return state;
  return { ...state, queue: [...state.queue, dir] };
}

/** Moves the snake one cell and reports what happened, for sounds and effects. */
export function step(state: SnakeState, random = Math.random): { state: SnakeState; events: SnakeEvent[] } {
  if (!state.alive) return { state, events: [] };
  const events: SnakeEvent[] = [];
  const [dir = state.dir, ...queue] = state.queue;
  const v = VECTORS[dir];
  let head = { x: state.snake[0].x + v.x, y: state.snake[0].y + v.y };

  if (state.mode === 'wrap') {
    head = { x: (head.x + state.cols) % state.cols, y: (head.y + state.rows) % state.rows };
  }

  // The tail moves out of the way this step unless the snake is growing.
  const body = state.grow > 0 ? state.snake : state.snake.slice(0, -1);
  const hitWall = head.x < 0 || head.y < 0 || head.x >= state.cols || head.y >= state.rows;
  if (hitWall || body.some((p) => same(p, head))) {
    events.push({ type: 'die', at: state.snake[0] });
    return { state: { ...state, dir, queue, alive: false }, events };
  }

  let s: SnakeState = {
    ...state,
    dir,
    queue,
    snake: [head, ...body],
    grow: Math.max(0, state.grow - 1),
    stepsSinceEat: state.stepsSinceEat + 1,
  };

  if (same(head, s.food)) {
    const combo = s.eaten > 0 && s.stepsSinceEat <= COMBO_WINDOW ? Math.min(s.combo + 1, MAX_COMBO) : 1;
    const points = FOOD_POINTS * combo;
    events.push({ type: 'eat', at: head, points, combo });
    s = { ...s, score: s.score + points, eaten: s.eaten + 1, combo, grow: s.grow + 1, stepsSinceEat: 0 };
    const taken = s.bonus ? [s.bonus.pos] : [];
    s.food = randomFreeCell(s, taken, random) ?? s.food;
    if (!s.bonus && random() < BONUS_CHANCE) {
      const pos = randomFreeCell(s, [s.food], random);
      if (pos) {
        s.bonus = { pos, stepsLeft: BONUS_STEPS };
        events.push({ type: 'bonus-spawn', at: pos });
      }
    }
  } else if (s.bonus && same(head, s.bonus.pos)) {
    events.push({ type: 'bonus', at: head, points: BONUS_POINTS });
    s = { ...s, score: s.score + BONUS_POINTS, grow: s.grow + 2, bonus: null };
  } else if (s.bonus) {
    const stepsLeft = s.bonus.stepsLeft - 1;
    if (stepsLeft <= 0) {
      events.push({ type: 'bonus-gone', at: s.bonus.pos });
      s = { ...s, bonus: null };
    } else {
      s = { ...s, bonus: { ...s.bonus, stepsLeft } };
    }
  }

  return { state: s, events };
}
