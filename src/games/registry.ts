import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { GameDefinition, GameVariation } from './types';

export interface RegisteredVariation extends GameVariation {
  Component: LazyExoticComponent<ComponentType>;
}

export interface RegisteredGame extends Omit<GameDefinition, 'variations'> {
  variations: RegisteredVariation[];
}

// Every src/games/<id>/index.ts is a game: no list to keep up to date.
// (Keep only games in src/games; shared code lives in src/shared.)
const modules = import.meta.glob<GameDefinition>('./*/index.ts', { eager: true, import: 'default' });

function register(path: string, game: GameDefinition | undefined): RegisteredGame {
  const folder = path.split('/')[1];
  if (!game) throw new Error(`${path} must \`export default defineGame({...})\``);
  if (game.id !== folder) throw new Error(`Game id "${game.id}" must match its folder name "${folder}"`);
  if (game.variations.length === 0) throw new Error(`Game "${game.id}" needs at least one variation`);
  const ids = game.variations.map((v) => v.id);
  if (new Set(ids).size !== ids.length) throw new Error(`Game "${game.id}" has duplicate variation ids`);
  return { ...game, variations: game.variations.map((v) => ({ ...v, Component: lazy(v.load) })) };
}

export const games: RegisteredGame[] = Object.entries(modules)
  .map(([path, game]) => register(path, game))
  .sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.name.localeCompare(b.name));

export const featuredGame = games.find((g) => g.featured) ?? games[0];

export function findGame(gameId: string | undefined) {
  return games.find((g) => g.id === gameId);
}

export function findVariation(game: RegisteredGame | undefined, variationId: string | undefined) {
  return game?.variations.find((v) => v.id === variationId);
}

/** Single-variation games live at /games/<id>; the rest at /games/<id>/<variation>. */
export function playPath(game: RegisteredGame, variation: GameVariation = game.variations[0]) {
  return game.variations.length === 1 ? `/games/${game.id}` : `/games/${game.id}/${variation.id}`;
}

/** Where a game's tile links to: straight into play, or to its variations. */
export function gamePath(game: RegisteredGame) {
  return `/games/${game.id}`;
}
