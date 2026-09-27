export type WhotShape = 'circle' | 'triangle' | 'cross' | 'square' | 'star' | 'whot';

export interface WhotCard {
  id: string;
  shape: WhotShape;
  number: number;
}

// Nigerian names for the shapes, and a symbol used on placeholder cards.
export const SHAPES: Record<WhotShape, { name: string; symbol: string }> = {
  circle: { name: 'Ball', symbol: '●' },
  triangle: { name: 'Angle', symbol: '▲' },
  cross: { name: 'Cross', symbol: '✚' },
  square: { name: 'Carpet', symbol: '■' },
  star: { name: 'Star', symbol: '★' },
  whot: { name: 'Whot', symbol: 'W' },
};

// Standard 54-card Nigerian Whot deck (five Whot 20s).
const DECK_SPEC: Record<WhotShape, number[]> = {
  circle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  triangle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  cross: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  square: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  star: [1, 2, 3, 4, 5, 7, 8],
  whot: [20, 20, 20, 20, 20],
};

export function createDeck(): WhotCard[] {
  return (Object.keys(DECK_SPEC) as WhotShape[]).flatMap((shape) =>
    DECK_SPEC[shape].map((number, i) => ({ id: `${shape}-${number}-${i}`, shape, number })),
  );
}

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
