import { Link, Route, Routes } from 'react-router-dom';
import { GamePage } from './pages/GamePage';
import { GamesPage } from './pages/GamesPage';
import { NotFound } from './pages/NotFound';
import { PlayRoute } from './pages/PlayPage';

export function App() {
  return (
    <>
      <header className="site-header">
        <Link to="/" className="brand" aria-label="Games - Social, home">
          Games - Social
        </Link>
      </header>
      <main className="page">
        <Routes>
          <Route path="/" element={<GamesPage />} />
          <Route path="/games/:gameId" element={<GamePage />} />
          <Route path="/games/:gameId/:variationId" element={<PlayRoute />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}
