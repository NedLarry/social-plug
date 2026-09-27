import type { GameDefinition } from '../types';
import { ClassicWhot } from './classic/ClassicWhot';
import { HigherLower } from './higher-lower/HigherLower';
import { MatchTheCard } from './match-the-card/MatchTheCard';

export const whot: GameDefinition = {
  id: 'whot',
  name: 'Whot',
  description: 'The classic Naija card game of shapes and numbers.',
  variations: [
    {
      id: 'classic',
      name: 'Classic Whot',
      description:
        'Naija rules against the computer: Hold on, Pick two, Pick three, Suspension, General market and Whot.',
      component: ClassicWhot,
    },
    {
      id: 'match-the-card',
      name: 'Match the Card',
      description: 'Flip cards face up and find ones that share a shape or number.',
      component: MatchTheCard,
    },
    {
      id: 'higher-lower',
      name: 'Higher or Lower',
      description: 'Guess if the next card is higher or lower. How long can your streak go?',
      component: HigherLower,
    },
  ],
};
