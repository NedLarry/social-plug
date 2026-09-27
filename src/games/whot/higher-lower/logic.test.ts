import { describe, expect, it } from 'vitest';
import type { WhotCard } from '../deck';
import { higherLowerReducer, newGame, type HigherLowerState } from './logic';

const c = (number: number): WhotCard => ({ id: `circle-${number}`, shape: 'circle', number });
const state = (current: number, ...deck: number[]): HigherLowerState => ({
  deck: deck.map(c),
  current: c(current),
  previous: null,
  lastResult: null,
  streak: 0,
  over: false,
});

describe('higher or lower', () => {
  it('leaves Whot cards out', () => {
    const s = newGame();
    expect([s.current, ...s.deck].some((x) => x.shape === 'whot')).toBe(false);
    expect(s.deck).toHaveLength(48);
  });

  it('counts right guesses and ends on a wrong one', () => {
    let s = higherLowerReducer(state(5, 10, 3, 7), { type: 'GUESS', guess: 'higher' });
    expect(s).toMatchObject({ streak: 1, lastResult: 'right', over: false });
    s = higherLowerReducer(s, { type: 'GUESS', guess: 'higher' });
    expect(s).toMatchObject({ streak: 1, lastResult: 'wrong', over: true });
  });

  it('treats the same number as a free pass', () => {
    const s = higherLowerReducer(state(5, 5, 1), { type: 'GUESS', guess: 'lower' });
    expect(s).toMatchObject({ streak: 0, lastResult: 'tie', over: false });
  });

  it('ends when the deck runs out', () => {
    const s = higherLowerReducer(state(5, 10), { type: 'GUESS', guess: 'higher' });
    expect(s).toMatchObject({ streak: 1, over: true });
  });
});
