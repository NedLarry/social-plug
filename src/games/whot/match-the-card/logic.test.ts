import { describe, expect, it } from 'vitest';
import type { WhotCard } from '../deck';
import { createDeck } from '../deck';
import { initState, isGameOver, matchReducer } from './logic';

const cards: WhotCard[] = [
  { id: 'a', shape: 'circle', number: 1 },
  { id: 'b', shape: 'star', number: 1 },
  { id: 'c', shape: 'square', number: 5 },
  { id: 'd', shape: 'circle', number: 7 },
];

const flip = (s: ReturnType<typeof initState>, id: string) => matchReducer(s, { type: 'FLIP', id });

describe('match the card', () => {
  it('builds the standard 54-card deck', () => {
    expect(createDeck()).toHaveLength(54);
  });

  it('scores when the second card shares a number', () => {
    const s = flip(flip(initState(cards), 'a'), 'b');
    expect(s.score).toBe(1);
    expect(s.targetId).toBeNull();
    expect(s.cards.filter((c) => c.status === 'matched').map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('scores when the second card shares a shape', () => {
    const s = flip(flip(initState(cards), 'a'), 'd');
    expect(s.score).toBe(1);
  });

  it('treats Whot 20 as wild', () => {
    const s = initState([...cards, { id: 'w', shape: 'whot', number: 20 }]);
    expect(flip(flip(s, 'c'), 'w').score).toBe(1);
  });

  it('keeps the target up on a miss and flips the miss back', () => {
    let s = flip(flip(initState(cards), 'a'), 'c');
    expect(s.score).toBe(0);
    expect(s.missId).toBe('c');
    expect(flip(s, 'b')).toBe(s); // clicks ignored while the miss is showing
    s = matchReducer(s, { type: 'HIDE_MISS' });
    expect(s.cards.find((c) => c.id === 'c')!.status).toBe('down');
    expect(s.targetId).toBe('a');
    s = flip(s, 'b');
    expect(s.score).toBe(1);
    expect(s.moves).toBe(2);
  });

  it('lets the target be turned back down', () => {
    const s = flip(flip(initState(cards), 'c'), 'c');
    expect(s.targetId).toBeNull();
    expect(s.cards.every((c) => c.status === 'down')).toBe(true);
  });

  it('ends when no remaining cards can match', () => {
    const s = flip(flip(initState(cards), 'a'), 'b');
    expect(isGameOver(s)).toBe(true); // square-5 and circle-7 left
    expect(isGameOver(initState(cards))).toBe(false);
  });
});
