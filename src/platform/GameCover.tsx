import type { RegisteredGame } from '../games/registry';

/** The game's own cover art, or its initial if it doesn't have any yet. */
export function GameCover({ game }: { game: RegisteredGame }) {
  const Cover = game.cover;
  return (
    <div className="cover-frame">
      {Cover ? (
        <Cover />
      ) : (
        <span className="default-cover" aria-hidden="true">
          {game.name.charAt(0)}
        </span>
      )}
    </div>
  );
}
