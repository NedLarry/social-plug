import { defineGame } from '../define';
import { SudokuCover } from './SudokuCover';

export default defineGame({
  id: 'sudoku',
  name: 'Sudoku',
  description: 'Fill the grid with 1–9, no repeats. Fresh puzzle every time, easy to hard.',
  tags: ['Puzzle'],
  order: 4,
  cover: SudokuCover,
  variations: [
    {
      id: 'play',
      name: 'Sudoku',
      description: 'Classic 9×9 Sudoku with notes, hints and three difficulties.',
      load: () => import('./Sudoku'),
    },
  ],
});
