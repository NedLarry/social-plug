import type { WhotCard } from './deck';

// Web copies made from the photos in src/assets/cards by scripts/prepare-cards.mjs
// (see the README there). Cards without an image render as numbered placeholders.
const files = import.meta.glob<string>('../../assets/cards/web/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

const byName: Record<string, string> = {};
for (const [path, url] of Object.entries(files)) {
  const name = path.split('/').pop()!.replace(/\.[^.]+$/, '').toLowerCase();
  byName[name] = url;
}

export function getCardFaceImage(card: Pick<WhotCard, 'shape' | 'number'>): string | undefined {
  return byName[`${card.shape}-${card.number}`];
}

export function getCardBackImage(): string | undefined {
  return byName.back;
}
