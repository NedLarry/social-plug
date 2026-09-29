import { describe, expect, it } from 'vitest';
import {
  GIVENS,
  PEERS,
  UNITS,
  completedUnits,
  countSolutions,
  finalScore,
  generateSolved,
  isSolved,
  makePuzzle,
  type Difficulty,
  type Grid,
} from './logic';

function isValidSolution(g: Grid) {
  return g.every((v) => v >= 1 && v <= 9) && UNITS.every((units) => units.every((u) => new Set(u.map((i) => g[i])).size === 9));
}

describe('sudoku', () => {
  it('each cell has 20 peers and 3 units of 9', () => {
    expect(PEERS.every((p) => p.length === 20)).toBe(true);
    expect(UNITS.every((u) => u.length === 3 && u.every((cells) => cells.length === 9))).toBe(true);
  });

  it('generates a valid, full solution', () => {
    for (let n = 0; n < 5; n++) expect(isValidSolution(generateSolved())).toBe(true);
  });

  it.each(['easy', 'medium', 'hard'] as Difficulty[])('%s puzzles have one solution and the right number of givens', (difficulty) => {
    const { puzzle, solution } = makePuzzle(difficulty);
    expect(isValidSolution(solution)).toBe(true);
    expect(countSolutions(puzzle, 2)).toBe(1);
    const givens = puzzle.filter(Boolean).length;
    // Hard puzzles can stop a few short of the target if no more numbers can go.
    expect(givens).toBeGreaterThanOrEqual(GIVENS[difficulty]);
    expect(givens).toBeLessThanOrEqual(GIVENS[difficulty] + 6);
    puzzle.forEach((v, i) => v && expect(v).toBe(solution[i]));
  });

  it('easier puzzles give more numbers', () => {
    const count = (d: Difficulty) => makePuzzle(d).puzzle.filter(Boolean).length;
    expect(count('easy')).toBeGreaterThan(count('hard'));
  });

  it('spots completed rows, columns and boxes', () => {
    const solution = generateSolved();
    const values = [...solution];
    values[80] = 0; // bottom-right cell empty
    // Row, column and box through cell 0: 27 cells, minus overlaps (row∩box 3, col∩box 3, row∩col 1, +1 counted thrice).
    expect(completedUnits(values, solution, 0)).toHaveLength(21);
    expect(completedUnits(values, solution, 80)).toEqual([]);
    values[80] = solution[80];
    expect(completedUnits(values, solution, 80).length).toBeGreaterThan(0);
    expect(isSolved(values, solution)).toBe(true);
  });

  it('scores by difficulty, time, mistakes and hints, never below 10%', () => {
    expect(finalScore('easy', 0, 0, 0)).toBe(1000);
    expect(finalScore('medium', 300, 2, 1)).toBe(2000 - 300 - 100 - 100);
    expect(finalScore('hard', 99999, 0, 0)).toBe(300);
    expect(finalScore('hard', 60, 0, 0)).toBeGreaterThan(finalScore('easy', 60, 0, 0));
  });
});
