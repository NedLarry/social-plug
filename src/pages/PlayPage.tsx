import { Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { findGame, findVariation, type RegisteredGame, type RegisteredVariation } from '../games/registry';
import { GameErrorBoundary } from '../platform/GameErrorBoundary';
import { NotFound } from './NotFound';

export function PlayRoute() {
  const { gameId, variationId } = useParams();
  const game = findGame(gameId);
  const variation = findVariation(game, variationId);
  if (!game || !variation) return <NotFound />;
  return <PlayPage game={game} variation={variation} />;
}

export function PlayPage({ game, variation }: { game: RegisteredGame; variation: RegisteredVariation }) {
  const single = game.variations.length === 1;
  const Game = variation.Component;

  return (
    <>
      <Link to={single ? '/' : `/games/${game.id}`} className="back-link">
        ← {single ? 'All games' : `${game.name} variations`}
      </Link>
      <h1>{single ? game.name : `${game.name}: ${variation.name}`}</h1>
      <GameErrorBoundary key={`${game.id}/${variation.id}`}>
        <Suspense fallback={<p className="game-status">Loading {game.name}…</p>}>
          <Game />
        </Suspense>
      </GameErrorBoundary>
    </>
  );
}
