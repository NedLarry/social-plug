import { Component, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface State {
  error: Error | null;
}

/** Keeps one broken game from taking the whole site down. */
export class GameErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Game crashed:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="game-crash" role="alert">
        <p>
          <strong>Something went wrong with this game.</strong>
        </p>
        <p className="game-status">{this.state.error.message}</p>
        <div className="game-controls">
          <button type="button" className="btn" onClick={() => location.reload()}>
            Reload
          </button>
          <Link to="/" className="btn btn--ghost">
            Back to games
          </Link>
        </div>
      </div>
    );
  }
}
