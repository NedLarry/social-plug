import { describe, expect, it } from 'vitest';
import { BONUS_POINTS, FOOD_POINTS, newGame, step, stepInterval, turn, type SnakeState } from './logic';

const fixed = () => 0; // always picks the first free cell / always spawns a bonus

function at(state: SnakeState, overrides: Partial<SnakeState>): SnakeState {
  return { ...state, ...overrides };
}

describe('snake', () => {
  it('starts with a 3-long snake heading right, food off the snake', () => {
    const s = newGame('walls');
    expect(s.snake).toHaveLength(3);
    expect(s.dir).toBe('right');
    expect(s.snake.some((p) => p.x === s.food.x && p.y === s.food.y)).toBe(false);
  });

  it('moves one cell per step and keeps its length', () => {
    const s = at(newGame('walls', 10, 10), { food: { x: 0, y: 0 } });
    const { state } = step(s);
    expect(state.snake[0]).toEqual({ x: s.snake[0].x + 1, y: s.snake[0].y });
    expect(state.snake).toHaveLength(3);
  });

  it('ignores reversing straight back, and queues quick turns', () => {
    let s = newGame('walls', 10, 10);
    expect(turn(s, 'left')).toBe(s);
    s = turn(turn(s, 'up'), 'left');
    expect(s.queue).toEqual(['up', 'left']);
    s = step(s).state;
    expect(s.dir).toBe('up');
    s = step(s).state;
    expect(s.dir).toBe('left');
  });

  it('eats, scores, grows and moves the food', () => {
    const s = newGame('walls', 10, 10);
    const head = s.snake[0];
    const ate = step(at(s, { food: { x: head.x + 1, y: head.y } }), fixed);
    expect(ate.events[0]).toMatchObject({ type: 'eat', points: FOOD_POINTS, combo: 1 });
    expect(ate.state.score).toBe(FOOD_POINTS);
    const grown = step(ate.state, fixed).state;
    expect(grown.snake).toHaveLength(4);
    expect(grown.snake.some((p) => p.x === ate.state.food.x && p.y === ate.state.food.y)).toBe(false);
  });

  it('builds a combo for quick eats', () => {
    const s = newGame('walls', 10, 10);
    const head = s.snake[0];
    const first = step(at(s, { food: { x: head.x + 1, y: head.y }, bonus: { pos: { x: 9, y: 9 }, stepsLeft: 99 } })).state;
    const second = step(at(first, { food: { x: head.x + 2, y: head.y } }));
    expect(second.events[0]).toMatchObject({ type: 'eat', combo: 2, points: FOOD_POINTS * 2 });
  });

  it('spawns a bonus that is worth more and runs out', () => {
    const s = newGame('walls', 10, 10);
    const head = s.snake[0];
    const ate = step(at(s, { food: { x: head.x + 1, y: head.y } }), fixed);
    expect(ate.events.map((e) => e.type)).toContain('bonus-spawn');
    const withBonus = at(ate.state, { bonus: { pos: { x: head.x + 2, y: head.y }, stepsLeft: 5 }, food: { x: 0, y: 0 } });
    const got = step(withBonus);
    expect(got.events[0]).toMatchObject({ type: 'bonus', points: BONUS_POINTS });
    const expiring = step(at(ate.state, { bonus: { pos: { x: 0, y: 9 }, stepsLeft: 1 }, food: { x: 0, y: 0 } }));
    expect(expiring.events.map((e) => e.type)).toContain('bonus-gone');
    expect(expiring.state.bonus).toBeNull();
  });

  it('dies on walls in walls mode, wraps in wrap mode', () => {
    const edge = { snake: [{ x: 9, y: 5 }, { x: 8, y: 5 }, { x: 7, y: 5 }], food: { x: 0, y: 0 } };
    const walls = step(at(newGame('walls', 10, 10), edge));
    expect(walls.state.alive).toBe(false);
    expect(walls.events[0].type).toBe('die');
    const wrap = step(at(newGame('wrap', 10, 10), { ...edge, food: { x: 3, y: 3 } }));
    expect(wrap.state.alive).toBe(true);
    expect(wrap.state.snake[0]).toEqual({ x: 0, y: 5 });
  });

  it('dies biting itself, but may follow its own tail', () => {
    // A 4-long snake in a tight loop: moving into where the tail is leaving is fine.
    const loop = { snake: [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 4, y: 6 }, { x: 4, y: 5 }], dir: 'up' as const, food: { x: 0, y: 0 } };
    const follow = step(turn(at(newGame('walls', 10, 10), loop), 'left'));
    expect(follow.state.alive).toBe(true);
    const bite = step(turn(at(newGame('walls', 10, 10), { ...loop, grow: 1 }), 'left'));
    expect(bite.state.alive).toBe(false);
  });

  it('speeds up as it eats, with a floor', () => {
    expect(stepInterval(0)).toBeGreaterThan(stepInterval(10));
    expect(stepInterval(1000)).toBe(60);
  });
});
