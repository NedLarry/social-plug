import { defineGame } from '../define';
import { WhackCover } from './WhackCover';

export default defineGame({
  id: 'whack-a-mole',
  name: 'Whack-a-Mole',
  description: 'Bonk the moles, grab the golden ones, dodge the bombs. 30 seconds, go!',
  tags: ['Arcade'],
  order: 6,
  cover: WhackCover,
  variations: [
    {
      id: 'play',
      name: 'Whack-a-Mole',
      description: '30-second rounds that speed up as you go, with combos and golden moles.',
      load: () => import('./WhackAMole'),
    },
  ],
});
