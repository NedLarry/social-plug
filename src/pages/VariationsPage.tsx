import { Link, useParams } from 'react-router-dom';
import { findGame } from '../games/registry';
import { NotFound } from './NotFound';

export function VariationsPage() {
  const { gameId } = useParams();
  const game = findGame(gameId);
  if (!game) return <NotFound />;

  return (
    <>
      <Link to="/" className="back-link">
        ← All games
      </Link>
      <h1>{game.name}</h1>
      <p className="lead">Choose how you want to play.</p>
      <div className="tile-grid">
        {game.variations.map((v) => (
          <Link key={v.id} to={`/games/${game.id}/${v.id}`} className="tile">
            <span className="tile__title">{v.name}</span>
            <span className="tile__desc">{v.description}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
