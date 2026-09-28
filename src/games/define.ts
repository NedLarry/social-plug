import type { GameDefinition } from './types';

/** Declares a game. Export the result as the default export of src/games/<id>/index.ts. */
export function defineGame(game: GameDefinition): GameDefinition {
  return game;
}
