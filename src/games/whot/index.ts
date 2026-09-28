import { defineGame } from '../define';
import { WhotCover } from './WhotFan';

export default defineGame({
  id: 'whot',
  name: 'Whot',
  description: 'The classic Naija card game of shapes and numbers.',
  tags: ['Cards'],
  order: 1,
  featured: true,
  cover: WhotCover,
  variations: [
    {
      id: 'classic',
      name: 'Classic Whot',
      description:
        'Naija rules against the computer: Hold on, Pick two, Pick three, Suspension, General market and Whot.',
      load: () => import('./classic/ClassicWhot'),
    },
    {
      id: 'match-the-card',
      name: 'Match the Card',
      description: 'Flip cards face up and find ones that share a shape or number.',
      load: () => import('./match-the-card/MatchTheCard'),
    },
    {
      id: 'higher-lower',
      name: 'Higher or Lower',
      description: 'Guess if the next card is higher or lower. How long can your streak go?',
      load: () => import('./higher-lower/HigherLower'),
    },
  ],
});
