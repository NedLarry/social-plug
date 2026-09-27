import { Link } from 'react-router-dom';
import { games } from '../games/registry';

export function GamesPage() {
  return (
    <>
      <h1>Pick a game</h1>
      <div className="tile-grid">
        {games.map((game) => (
          <Link key={game.id} to={`/games/${game.id}`} className="tile">
            <span className="tile__title">{game.name}</span>
            <span className="tile__desc">{game.description}</span>
            <span className="tile__meta">
              {game.variations.length} variation{game.variations.length === 1 ? '' : 's'}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
