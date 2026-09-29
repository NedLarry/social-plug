import { describe, expect, it } from 'vitest';
import { ROUND_MS, multiplier, newRound, pickKind, spawnGap, tick, upTime, whack, type Kind, type WhackState } from './logic';

/** A round with one mole already up in `hole`. */
function withMole(kind: Kind, hole = 4, overrides: Partial<WhackState> = {}): WhackState {
  const s = { ...newRound(), elapsed: 1000, nextSpawnAt: 99_999, ...overrides };
  s.holes = [...s.holes];
  s.holes[hole] = { kind, upAt: 1000, downAt: 2000, hit: false };
  return s;
}

describe('whack-a-mole', () => {
  it('pops moles up over time, in empty holes', () => {
    let s = newRound();
    for (let t = 0; t < 3000; t += 50) s = tick(s, 50, () => 0.5).state;
    expect(s.holes.filter(Boolean).length).toBeGreaterThan(0);
  });

  it('gets faster as the round goes on', () => {
    expect(spawnGap(ROUND_MS)).toBeLessThan(spawnGap(0));
    expect(upTime('mole', ROUND_MS)).toBeLessThan(upTime('mole', 0));
  });

  it('no bombs in the first seconds; some gold', () => {
    expect(pickKind(() => 0.1, 1000)).toBe('mole');
    expect(pickKind(() => 0.1, 10_000)).toBe('bomb');
    expect(pickKind(() => 0.01, 0)).toBe('gold');
  });

  it('whacking a mole scores and builds a combo', () => {
    const { state, event } = whack(withMole('mole'), 4);
    expect(event).toMatchObject({ type: 'hit', points: 10, multiplier: 1 });
    expect(state).toMatchObject({ score: 10, combo: 1, hits: 1 });
    // Can't hit the same mole twice.
    expect(whack(state, 4).event.type).toBe('miss');
  });

  it('combos multiply points', () => {
    expect(multiplier(0)).toBe(1);
    expect(multiplier(5)).toBe(2);
    expect(multiplier(100)).toBe(4);
    const { event } = whack(withMole('gold', 4, { combo: 10 }), 4);
    expect(event).toMatchObject({ type: 'hit', kind: 'gold', points: 150, multiplier: 3 });
  });

  it('bombs cost points (not below zero) and break the combo', () => {
    const { state, event } = whack(withMole('bomb', 2, { score: 100, combo: 7 }), 2);
    expect(event).toMatchObject({ type: 'bomb', points: -30 });
    expect(state).toMatchObject({ score: 70, combo: 0 });
    expect(whack(withMole('bomb', 2, { score: 10 }), 2).state.score).toBe(0);
  });

  it('missing, or letting a mole escape, breaks the combo', () => {
    expect(whack(withMole('mole', 4, { combo: 3 }), 0)).toMatchObject({ state: { combo: 0 }, event: { type: 'miss' } });
    const escaped = tick(withMole('mole', 4, { combo: 3 }), 1500);
    expect(escaped.events).toContainEqual({ type: 'escaped', hole: 4 });
    expect(escaped.state.combo).toBe(0);
    expect(escaped.state.holes[4]).toBeNull();
    // A bomb going down on its own is fine.
    expect(tick(withMole('bomb', 4, { combo: 3 }), 1500).state.combo).toBe(3);
  });

  it('ends after 30 seconds', () => {
    let s = newRound();
    while (!s.over) s = tick(s, 100).state;
    expect(s.elapsed).toBe(ROUND_MS);
    expect(tick(s, 100).state).toBe(s);
  });
});
