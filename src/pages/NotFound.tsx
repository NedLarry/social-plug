import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <>
      <h1>Not found</h1>
      <p>
        <Link to="/">Back to games</Link>
      </p>
    </>
  );
}
