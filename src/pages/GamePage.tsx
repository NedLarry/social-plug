import { useParams } from 'react-router-dom';
import { findGame } from '../games/registry';
import { NotFound } from './NotFound';
import { PlayPage } from './PlayPage';
import { VariationsPage } from './VariationsPage';

/** /games/<id>: straight into play for single-variation games, otherwise pick a variation. */
export function GamePage() {
  const { gameId } = useParams();
  const game = findGame(gameId);
  if (!game) return <NotFound />;
  if (game.variations.length === 1) return <PlayPage game={game} variation={game.variations[0]} />;
  return <VariationsPage game={game} />;
}
