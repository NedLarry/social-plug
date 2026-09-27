import { describe, expect, it } from 'vitest';
import type { WhotCard, WhotShape } from '../deck';
import { canPlay, classicReducer, handScore, newGame, type ClassicState } from './logic';

const c = (shape: WhotShape, number: number, id = `${shape}-${number}`): WhotCard => ({ id, shape, number });

function table(hands: WhotCard[][], topCard: WhotCard, market: WhotCard[] = []): ClassicState {
  return {
    players: hands.map((hand, i) => ({ name: i === 0 ? 'You' : `CPU ${i}`, isHuman: i === 0, hand })),
    market,
    pile: [topCard],
    current: 0,
    requestedShape: null,
    pending: null,
    winner: null,
    log: [],
  };
}

const play = (s: ClassicState, cardId: string, shape?: WhotShape) =>
  classicReducer(s, { type: 'PLAY', cardId, shape });

describe('classic whot', () => {
  it('deals hands and starts on a plain card', () => {
    const s = newGame(3, 5);
    expect(s.players.map((p) => p.hand.length)).toEqual([5, 5, 5]);
    expect([1, 2, 5, 8, 14, 20]).not.toContain(s.pile[0].number);
    expect(s.market.length + s.pile.length + 15).toBe(54);
  });

  it('allows matching shape, number, or Whot only', () => {
    const s = table([[]], c('circle', 7));
    expect(canPlay(s, c('circle', 3))).toBe(true);
    expect(canPlay(s, c('star', 7))).toBe(true);
    expect(canPlay(s, c('whot', 20))).toBe(true);
    expect(canPlay(s, c('star', 3))).toBe(false);
  });

  it('rejects an illegal card', () => {
    const s = table([[c('star', 3), c('cross', 1)], [c('circle', 4)]], c('circle', 7));
    expect(play(s, 'star-3')).toBe(s);
  });

  it('pick two stacks and must be defended with another 2', () => {
    let s = table(
      [[c('circle', 2), c('star', 4)], [c('star', 2), c('cross', 10)], [c('square', 3), c('square', 5)]],
      c('circle', 7),
      [c('triangle', 1, 'm1'), c('triangle', 3, 'm2'), c('triangle', 4, 'm3'), c('triangle', 5, 'm4')],
    );
    s = play(s, 'circle-2');
    expect(s.pending).toEqual({ number: 2, count: 2 });
    s = classicReducer(s, { type: 'CPU_TURN' }); // CPU 1 defends with star 2
    expect(s.pending).toEqual({ number: 2, count: 4 });
    expect(s.current).toBe(2);
    s = classicReducer(s, { type: 'CPU_TURN' }); // CPU 2 can't defend, picks 4
    expect(s.players[2].hand).toHaveLength(6);
    expect(s.pending).toBeNull();
    expect(s.current).toBe(0);
  });

  it('hold on keeps the turn, suspension skips the next player', () => {
    let s = table([[c('circle', 1), c('circle', 8), c('star', 4)], [c('star', 5)], [c('star', 7)]], c('circle', 7));
    s = play(s, 'circle-1');
    expect(s.current).toBe(0);
    s = play(s, 'circle-8');
    expect(s.current).toBe(2);
  });

  it('general market gives everyone else a card', () => {
    let s = table([[c('circle', 14), c('star', 4)], [c('star', 5)], [c('star', 7)]], c('circle', 7), [
      c('cross', 3, 'm1'),
      c('cross', 5, 'm2'),
    ]);
    s = play(s, 'circle-14');
    expect(s.players.map((p) => p.hand.length)).toEqual([1, 2, 2]);
    expect(s.current).toBe(1);
  });

  it('Whot needs a shape and the next card must follow it', () => {
    let s = table([[c('whot', 20), c('star', 4)], [c('circle', 7), c('cross', 7)]], c('circle', 3));
    expect(play(s, 'whot-20')).toBe(s);
    s = play(s, 'whot-20', 'cross');
    expect(s.requestedShape).toBe('cross');
    expect(canPlay(s, c('circle', 7))).toBe(false);
    expect(canPlay(s, c('cross', 7))).toBe(true);
  });

  it('playing your last card wins', () => {
    const s = play(table([[c('circle', 4)], [c('star', 5)]], c('circle', 7)), 'circle-4');
    expect(s.winner).toBe(0);
  });

  it('counts hands when nothing is left to draw', () => {
    const s = classicReducer(table([[c('star', 4)], [c('circle', 5)]], c('circle', 7)), { type: 'GO_MARKET' });
    expect(handScore(s.players[0].hand)).toBe(8);
    expect(s.winner).toBe(1);
  });

  it('CPU-only games always finish without losing cards', () => {
    for (let game = 0; game < 200; game++) {
      let s = newGame(2 + (game % 3), 5);
      s = { ...s, players: s.players.map((p) => ({ ...p, isHuman: false })) };
      let steps = 0;
      while (s.winner === null && steps++ < 5000) s = classicReducer(s, { type: 'CPU_TURN' });
      expect(s.winner).not.toBeNull();
      const total = s.market.length + s.pile.length + s.players.reduce((n, p) => n + p.hand.length, 0);
      expect(total).toBe(54);
    }
  });
});
