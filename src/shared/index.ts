// Helpers any game can use: import { useGameLoop, ... } from "../../shared". See README.md → "Adding a game".
export { pointerPosition, setupCanvas } from './canvas';
export { Leaderboard } from './Leaderboard';
export { useLeaderboard, type LeaderboardEntry, type SubmitResult } from './leaderboard';
export { usePlayer } from './player';
export { useGameLoop } from './useGameLoop';
export { useHighScore } from './useHighScore';
export { useKeyDown } from './useKeyDown';
