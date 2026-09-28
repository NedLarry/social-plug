import { defineGame } from '../define';
import { SnakeCover } from './SnakeCover';

export default defineGame({
  id: 'snake',
  name: 'Snake',
  description: 'Eat, grow, and don’t bite your own tail. It gets faster as you go!',
  tags: ['Arcade'],
  order: 2,
  cover: SnakeCover,
  variations: [
    {
      id: 'play',
      name: 'Snake',
      description: 'Classic Snake with combos and golden bonus stars. Play with walls or wrap-around edges.',
      load: () => import('./Snake'),
    },
  ],
});
