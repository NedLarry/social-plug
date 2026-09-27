import { Link, useParams } from 'react-router-dom';
import { findGame, findVariation } from '../games/registry';
import { NotFound } from './NotFound';

export function PlayPage() {
  const { gameId, variationId } = useParams();
  const game = findGame(gameId);
  const variation = findVariation(gameId, variationId);
  if (!game || !variation) return <NotFound />;

  const Game = variation.component;
  return (
    <>
      <Link to={`/games/${game.id}`} className="back-link">
        ← {game.name} variations
      </Link>
      <h1>
        {game.name}: {variation.name}
      </h1>
      <Game />
    </>
  );
}
