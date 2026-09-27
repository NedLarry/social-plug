import { Link, Route, Routes } from 'react-router-dom';
import { GamesPage } from './pages/GamesPage';
import { VariationsPage } from './pages/VariationsPage';
import { PlayPage } from './pages/PlayPage';
import { NotFound } from './pages/NotFound';

export function App() {
  return (
    <>
      <header className="site-header">
        <Link to="/" className="brand">
          Social Games
        </Link>
      </header>
      <main className="page">
        <Routes>
          <Route path="/" element={<GamesPage />} />
          <Route path="/games/:gameId" element={<VariationsPage />} />
          <Route path="/games/:gameId/:variationId" element={<PlayPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}
