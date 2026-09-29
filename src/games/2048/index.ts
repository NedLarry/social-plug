import { defineGame } from '../define';
import { Cover2048 } from './Cover2048';

export default defineGame({
  id: '2048',
  name: '2048',
  description: 'Slide the tiles, merge the matches, and chase the 2048 tile.',
  tags: ['Puzzle'],
  order: 5,
  cover: Cover2048,
  variations: [
    {
      id: 'play',
      name: '2048',
      description: 'Classic 4×4 2048: swipe or use the arrow keys.',
      load: () => import('./Game2048'),
    },
  ],
});
