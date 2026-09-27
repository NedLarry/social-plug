import { createDeck, shuffle, type WhotCard } from '../deck';

export type CardStatus = 'down' | 'up' | 'matched';

export interface BoardCard extends WhotCard {
  status: CardStatus;
}

export interface MatchState {
  cards: BoardCard[];
  /** First card turned over; stays face up until a match is found. */
  targetId: string | null;
  /** A non-matching card currently shown; flipped back down by HIDE_MISS. */
  missId: string | null;
  score: number;
  moves: number;
}

export type MatchAction =
  | { type: 'FLIP'; id: string }
  | { type: 'HIDE_MISS' }
  | { type: 'NEW_GAME'; cards: WhotCard[] };

// Same shape or same number; Whot 20 is wild, as in the real game.
export function cardsMatch(a: WhotCard, b: WhotCard) {
  return a.shape === 'whot' || b.shape === 'whot' || a.shape === b.shape || a.number === b.number;
}

export function dealBoard(size: number, random: () => number = Math.random): WhotCard[] {
  return shuffle(createDeck(), random).slice(0, size);
}

export function initState(cards: WhotCard[]): MatchState {
  return {
    cards: cards.map((c) => ({ ...c, status: 'down' })),
    targetId: null,
    missId: null,
    score: 0,
    moves: 0,
  };
}

function setStatus(cards: BoardCard[], ids: string[], status: CardStatus) {
  return cards.map((c) => (ids.includes(c.id) ? { ...c, status } : c));
}

export function matchReducer(state: MatchState, action: MatchAction): MatchState {
  switch (action.type) {
    case 'NEW_GAME':
      return initState(action.cards);

    case 'HIDE_MISS':
      if (!state.missId) return state;
      return { ...state, cards: setStatus(state.cards, [state.missId], 'down'), missId: null };

    case 'FLIP': {
      // Wait for the previous miss to flip back before accepting another click.
      if (state.missId) return state;
      const card = state.cards.find((c) => c.id === action.id);
      if (!card || card.status === 'matched') return state;

      if (!state.targetId) {
        return { ...state, cards: setStatus(state.cards, [card.id], 'up'), targetId: card.id };
      }

      // Clicking the target again puts it back, in case it has no match left.
      if (card.id === state.targetId) {
        return { ...state, cards: setStatus(state.cards, [card.id], 'down'), targetId: null };
      }

      const target = state.cards.find((c) => c.id === state.targetId)!;
      const moves = state.moves + 1;
      if (cardsMatch(target, card)) {
        return {
          ...state,
          cards: setStatus(state.cards, [target.id, card.id], 'matched'),
          targetId: null,
          score: state.score + 1,
          moves,
        };
      }
      return { ...state, cards: setStatus(state.cards, [card.id], 'up'), missId: card.id, moves };
    }
  }
}

/** True when no two remaining cards can be matched. */
export function isGameOver(state: MatchState) {
  const left = state.cards.filter((c) => c.status !== 'matched');
  for (let i = 0; i < left.length; i++) {
    for (let j = i + 1; j < left.length; j++) {
      if (cardsMatch(left[i], left[j])) return false;
    }
  }
  return true;
}
