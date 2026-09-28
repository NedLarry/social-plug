import { Link } from 'react-router-dom';
import { featuredGame, gamePath, games, playPath } from '../games/registry';
import { GameCover } from '../platform/GameCover';
import { Tags } from '../platform/Tags';

export function GamesPage() {
  return (
    <>
      <section className="hero">
        <div className="hero__text">
          <p className="hero__eyebrow">Browser games</p>
          <h1 className="hero__title">
            Pick a game.
            <br />
            <span className="hero__accent">Play in seconds.</span>
          </h1>
          <p className="hero__lead">Quick games you can play right in your browser. No downloads, no sign-up.</p>
          <div className="hero__actions">
            <Link to={gamePath(featuredGame)} className="btn btn--big">
              Play {featuredGame.name}
            </Link>
            <a href="#games" className="btn btn--big btn--ghost">
              Browse games
            </a>
          </div>
        </div>

        <Link to={gamePath(featuredGame)} className="feature">
          <div className="feature__cover">
            <GameCover game={featuredGame} />
          </div>
          <div className="feature__meta">
            <span className="feature__label">Featured</span>
            <span className="feature__name">{featuredGame.name}</span>
            <Tags tags={featuredGame.tags} />
          </div>
        </Link>
      </section>

      <section id="games" className="games">
        <h2 className="section-title">All games</h2>
        <div className="game-grid">
          {games.map((game) => (
            <article key={game.id} className="game-card">
              <Link to={gamePath(game)} className="game-card__cover" aria-label={`Open ${game.name}`}>
                <GameCover game={game} />
                <Tags tags={game.tags} className="game-card__tags" />
              </Link>
              <div className="game-card__body">
                <h3 className="game-card__title">
                  <Link to={gamePath(game)}>{game.name}</Link>
                </h3>
                <p className="game-card__desc">{game.description}</p>
                <ul className="chips" aria-label={`${game.name} variations`}>
                  {game.variations.length === 1 ? (
                    <li>
                      <Link to={playPath(game)} className="chip">
                        Play now →
                      </Link>
                    </li>
                  ) : (
                    game.variations.map((v) => (
                      <li key={v.id}>
                        <Link to={playPath(game, v)} className="chip">
                          {v.name}
                        </Link>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </article>
          ))}
          <div className="game-card game-card--soon">
            <span className="game-card__soon-mark">?</span>
            <p className="game-card__title">More games on the way</p>
            <p className="game-card__desc">New games are being added. Check back soon.</p>
          </div>
        </div>
      </section>
    </>
  );
}
