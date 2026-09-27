import type { GameDefinition } from './types';
import { whot } from './whot';

// Add new games here; the home page grid and routes are generated from this list.
export const games: GameDefinition[] = [whot];

export function findGame(gameId: string | undefined) {
  return games.find((g) => g.id === gameId);
}

export function findVariation(gameId: string | undefined, variationId: string | undefined) {
  return findGame(gameId)?.variations.find((v) => v.id === variationId);
}
