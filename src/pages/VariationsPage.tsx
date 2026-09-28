import { Link } from 'react-router-dom';
import { playPath, type RegisteredGame } from '../games/registry';

export function VariationsPage({ game }: { game: RegisteredGame }) {
  return (
    <>
      <Link to="/" className="back-link">
        ← All games
      </Link>
      <h1>{game.name}</h1>
      <p className="lead">Choose how you want to play.</p>
      <div className="tile-grid">
        {game.variations.map((v) => (
          <Link key={v.id} to={playPath(game, v)} className="tile">
            <span className="tile__title">{v.name}</span>
            <span className="tile__desc">{v.description}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
