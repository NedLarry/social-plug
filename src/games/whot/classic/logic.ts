import { createDeck, shuffle, SHAPES, type WhotCard, type WhotShape } from '../deck';

export interface Player {
  name: string;
  isHuman: boolean;
  hand: WhotCard[];
}

export interface ClassicState {
  players: Player[];
  market: WhotCard[];
  /** Played cards; the last one is on top. */
  pile: WhotCard[];
  current: number;
  /** Shape asked for by the last Whot 20. */
  requestedShape: WhotShape | null;
  /** Cards the current player must pick unless they defend with the same number. */
  pending: { number: 2 | 5; count: number } | null;
  winner: number | null;
  log: string[];
}

export type ClassicAction =
  | { type: 'PLAY'; cardId: string; shape?: WhotShape }
  | { type: 'GO_MARKET' }
  | { type: 'CPU_TURN' }
  | { type: 'NEW_GAME'; players: number; handSize: number };

// Nigerian rules: 1 hold on, 2 pick two, 5 pick three, 8 suspension, 14 general market, 20 whot.
const SPECIAL_NUMBERS = [1, 2, 5, 8, 14, 20];
const LOG_LIMIT = 6;

export function cardLabel(card: WhotCard) {
  return `${SHAPES[card.shape].name} ${card.number}`;
}

export function top(state: ClassicState) {
  return state.pile[state.pile.length - 1];
}

export function nextIndex(state: ClassicState, steps = 1) {
  return (state.current + steps) % state.players.length;
}

export function newGame(playerCount: number, handSize: number, random = Math.random): ClassicState {
  const deck = shuffle(createDeck(), random);
  const players: Player[] = Array.from({ length: playerCount }, (_, i) => ({
    name: i === 0 ? 'You' : `CPU ${i}`,
    isHuman: i === 0,
    hand: deck.splice(0, handSize),
  }));
  // Start on a plain card so no special effect hits the first player.
  const startIdx = deck.findIndex((c) => !SPECIAL_NUMBERS.includes(c.number));
  const [start] = deck.splice(startIdx, 1);
  return {
    players,
    market: deck,
    pile: [start],
    current: 0,
    requestedShape: null,
    pending: null,
    winner: null,
    log: [`Game on. Call card: ${cardLabel(start)}.`],
  };
}

export function canPlay(state: ClassicState, card: WhotCard) {
  if (state.pending) return card.number === state.pending.number;
  if (card.shape === 'whot') return true;
  if (state.requestedShape) return card.shape === state.requestedShape;
  const t = top(state);
  return card.shape === t.shape || card.number === t.number;
}

/** Hand value when the market runs out: face value, stars double, Whot 20. */
export function handScore(hand: WhotCard[]) {
  return hand.reduce((sum, c) => sum + (c.shape === 'star' ? c.number * 2 : c.number), 0);
}

function withLog(state: ClassicState, ...lines: string[]): ClassicState {
  return { ...state, log: [...state.log, ...lines].slice(-LOG_LIMIT) };
}

function setHand(players: Player[], index: number, hand: WhotCard[]) {
  return players.map((p, i) => (i === index ? { ...p, hand } : p));
}

/** Draws up to n cards, reshuffling the pile under the top card when the market is empty. */
function draw(state: ClassicState, playerIndex: number, n: number): ClassicState {
  let { market, pile } = state;
  const drawn: WhotCard[] = [];
  for (let i = 0; i < n; i++) {
    if (market.length === 0) {
      if (pile.length <= 1) break;
      market = shuffle(pile.slice(0, -1));
      pile = pile.slice(-1);
    }
    drawn.push(market[0]);
    market = market.slice(1);
  }
  const hand = [...state.players[playerIndex].hand, ...drawn];
  return { ...state, market, pile, players: setHand(state.players, playerIndex, hand) };
}

/** No cards left anywhere to draw: lowest hand value wins. */
function endByCount(state: ClassicState): ClassicState {
  const scores = state.players.map((p) => handScore(p.hand));
  const winner = scores.indexOf(Math.min(...scores));
  return withLog(
    { ...state, winner },
    `Market is finished. Counting cards: ${state.players.map((p, i) => `${p.name} ${scores[i]}`).join(', ')}.`,
  );
}

function play(state: ClassicState, cardId: string, shape?: WhotShape): ClassicState {
  const player = state.players[state.current];
  const card = player.hand.find((c) => c.id === cardId);
  if (!card || !canPlay(state, card)) return state;
  if (card.shape === 'whot' && !shape) return state;

  const hand = player.hand.filter((c) => c.id !== cardId);
  let s: ClassicState = {
    ...state,
    players: setHand(state.players, state.current, hand),
    pile: [...state.pile, card],
    requestedShape: null,
  };
  const who = player.name;

  if (hand.length === 0) {
    return withLog({ ...s, winner: state.current }, `${who} played ${cardLabel(card)} and won! Check up!`);
  }

  switch (card.number) {
    case 20:
      return withLog(
        { ...s, requestedShape: shape!, current: nextIndex(s) },
        `${who} played Whot and asked for ${SHAPES[shape!].name}.`,
      );
    case 1:
      return withLog(s, `${who} played ${cardLabel(card)}: Hold on, ${who} goes again.`);
    case 2:
    case 5: {
      const count = (state.pending?.count ?? 0) + (card.number === 2 ? 2 : 3);
      const next = nextIndex(s);
      return withLog(
        { ...s, pending: { number: card.number, count }, current: next },
        `${who} played ${cardLabel(card)}: ${s.players[next].name} must pick ${count}.`,
      );
    }
    case 8: {
      const skipped = s.players[nextIndex(s)].name;
      return withLog({ ...s, current: nextIndex(s, 2) }, `${who} played ${cardLabel(card)}: ${skipped} is suspended.`);
    }
    case 14: {
      for (let i = 0; i < s.players.length; i++) {
        if (i !== state.current) s = draw(s, i, 1);
      }
      return withLog({ ...s, current: nextIndex(s) }, `${who} played ${cardLabel(card)}: General market! Everyone picks one.`);
    }
    default:
      return withLog({ ...s, current: nextIndex(s) }, `${who} played ${cardLabel(card)}.`);
  }
}

function goMarket(state: ClassicState): ClassicState {
  const who = state.players[state.current].name;
  const count = state.pending?.count ?? 1;
  const before = state.players[state.current].hand.length;
  const s = draw(state, state.current, count);
  const got = s.players[state.current].hand.length - before;
  if (got === 0) return endByCount(s);
  return withLog(
    { ...s, pending: null, current: nextIndex(s) },
    `${who} went to market (${got} card${got === 1 ? '' : 's'}).`,
  );
}

/** Simple CPU: defend or play specials first, keep Whot for last, else go to market. */
export function chooseCpuMove(state: ClassicState): ClassicAction {
  const hand = state.players[state.current].hand;
  const playable = hand.filter((c) => canPlay(state, c));
  if (playable.length === 0) return { type: 'GO_MARKET' };

  const rank = (c: WhotCard) => (c.shape === 'whot' ? 3 : SPECIAL_NUMBERS.includes(c.number) ? 0 : 1);
  const card = [...playable].sort((a, b) => rank(a) - rank(b))[0];
  if (card.shape !== 'whot') return { type: 'PLAY', cardId: card.id };

  // Ask for the shape the CPU holds most of.
  const counts = new Map<WhotShape, number>();
  for (const c of hand) if (c.shape !== 'whot') counts.set(c.shape, (counts.get(c.shape) ?? 0) + 1);
  const shape = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'circle';
  return { type: 'PLAY', cardId: card.id, shape };
}

export function classicReducer(state: ClassicState, action: ClassicAction): ClassicState {
  if (action.type === 'NEW_GAME') return newGame(action.players, action.handSize);
  if (state.winner !== null) return state;

  const isHumanTurn = state.players[state.current].isHuman;
  switch (action.type) {
    case 'PLAY':
      return isHumanTurn ? play(state, action.cardId, action.shape) : state;
    case 'GO_MARKET':
      return isHumanTurn ? goMarket(state) : state;
    case 'CPU_TURN': {
      if (isHumanTurn) return state;
      const move = chooseCpuMove(state);
      return move.type === 'PLAY' ? play(state, move.cardId, move.shape) : goMarket(state);
    }
  }
}
