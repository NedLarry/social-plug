import { Suspense, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { findGame, findVariation, type RegisteredGame, type RegisteredVariation } from '../games/registry';
import { GameErrorBoundary } from '../platform/GameErrorBoundary';
import { NamePrompt } from '../platform/NamePrompt';
import { usePlayer } from '../shared/player';
import { NotFound } from './NotFound';

export function PlayRoute() {
  const { gameId, variationId } = useParams();
  const game = findGame(gameId);
  const variation = findVariation(game, variationId);
  if (!game || !variation) return <NotFound />;
  return <PlayPage key={`${game.id}/${variation.id}`} game={game} variation={variation} />;
}

export function PlayPage({ game, variation }: { game: RegisteredGame; variation: RegisteredVariation }) {
  const single = game.variations.length === 1;
  const Game = variation.Component;
  const { name, setName } = usePlayer();
  // Asked every time a game is opened; pre-filled with the last name used.
  const [named, setNamed] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const title = single ? game.name : `${game.name}: ${variation.name}`;

  return (
    <>
      <Link to={single ? '/' : `/games/${game.id}`} className="back-link">
        ← {single ? 'All games' : `${game.name} variations`}
      </Link>
      <h1>{title}</h1>
      {!named ? (
        <NamePrompt
          gameName={title}
          initial={name}
          onSubmit={(n) => {
            setName(n);
            setNamed(true);
          }}
        />
      ) : (
        <>
          <p className="playing-as">
            Playing as <strong>{name}</strong> ·{' '}
            <button type="button" className="link-button" onClick={() => setRenaming(true)}>
              Change name
            </button>
          </p>
          <GameErrorBoundary key={`${game.id}/${variation.id}`}>
            <Suspense fallback={<p className="game-status">Loading {game.name}…</p>}>
              <Game />
            </Suspense>
          </GameErrorBoundary>
          {renaming && (
            <NamePrompt
              modal
              gameName={title}
              initial={name}
              onSubmit={(n) => {
                setName(n);
                setRenaming(false);
              }}
              onCancel={() => setRenaming(false)}
            />
          )}
        </>
      )}
    </>
  );
}
