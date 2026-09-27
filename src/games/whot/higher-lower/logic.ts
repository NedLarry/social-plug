import { createDeck, shuffle, type WhotCard } from '../deck';

export type Guess = 'higher' | 'lower';

export interface HigherLowerState {
  /** Cards still to come; the current card is not in here. */
  deck: WhotCard[];
  current: WhotCard;
  previous: WhotCard | null;
  lastResult: 'right' | 'wrong' | 'tie' | null;
  streak: number;
  over: boolean;
}

export type HigherLowerAction = { type: 'GUESS'; guess: Guess } | { type: 'NEW_GAME' };

export function newGame(random = Math.random): HigherLowerState {
  // Whot 20s would always be the highest card, so they sit this one out.
  const [current, ...deck] = shuffle(
    createDeck().filter((c) => c.shape !== 'whot'),
    random,
  );
  return { deck, current, previous: null, lastResult: null, streak: 0, over: false };
}

export function higherLowerReducer(state: HigherLowerState, action: HigherLowerAction): HigherLowerState {
  if (action.type === 'NEW_GAME') return newGame();
  if (state.over) return state;

  const [next, ...deck] = state.deck;
  const diff = next.number - state.current.number;
  // Same number is a free pass: the streak holds and you guess again.
  const lastResult = diff === 0 ? 'tie' : (diff > 0) === (action.guess === 'higher') ? 'right' : 'wrong';
  const streak = lastResult === 'right' ? state.streak + 1 : state.streak;
  return {
    deck,
    current: next,
    previous: state.current,
    lastResult,
    streak,
    over: lastResult === 'wrong' || deck.length === 0,
  };
}
