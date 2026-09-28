import type { ComponentType } from 'react';

export interface GameVariation {
  /** URL segment, e.g. 'classic' → /games/whot/classic */
  id: string;
  name: string;
  description: string;
  /**
   * Loads the game screen (a default-exported component) only when it's opened,
   * e.g. `() => import('./Snake')`. Keeps the home page fast as games are added.
   */
  load: () => Promise<{ default: ComponentType }>;
}

export interface GameDefinition {
  /** Must match the game's folder name; used in URLs: /games/<id> */
  id: string;
  name: string;
  /** One line shown on the home page. */
  description: string;
  /** Short labels shown on the game's tile, e.g. ['Cards'] or ['Arcade']. */
  tags?: string[];
  /** Position on the home page; lower comes first (default 100, then by name). */
  order?: number;
  /** Show this game in the home page hero. The first featured game wins. */
  featured?: boolean;
  /** Artwork for the game's tile. It fills a frame, so size it with % or cqw/cqh. Defaults to the game's initial. */
  cover?: ComponentType;
  /**
   * Ways to play. With one, the game opens straight into it; with several,
   * players pick one first.
   */
  variations: GameVariation[];
}
