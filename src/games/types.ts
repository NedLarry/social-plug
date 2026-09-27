import type { ComponentType } from 'react';

export interface GameVariation {
  id: string;
  name: string;
  description: string;
  component: ComponentType;
}

export interface GameDefinition {
  id: string;
  name: string;
  description: string;
  variations: GameVariation[];
}
