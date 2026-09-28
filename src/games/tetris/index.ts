import { defineGame } from '../define';
import { TetrisCover } from './TetrisCover';

export default defineGame({
  id: 'tetris',
  name: 'Tetris',
  description: 'Stack the falling blocks and clear lines. How long can you last?',
  tags: ['Arcade', 'Puzzle'],
  order: 3,
  cover: TetrisCover,
  variations: [
    {
      id: 'play',
      name: 'Tetris',
      description: 'Classic falling blocks with a ghost piece and next-piece preview.',
      load: () => import('./Tetris'),
    },
  ],
});
