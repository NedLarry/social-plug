import type { Leaderboard as LeaderboardData } from './leaderboard';
import { usePlayer } from './player';

interface Props {
  board: LeaderboardData;
  title?: string;
  /** Label after each score: 'pts', or [singular, plural] like ['win', 'wins']. */
  unit?: string | [string, string];
}

/** This week's top scores for a board from `useLeaderboard`, with the player's row highlighted. */
export function Leaderboard({ board, title = "This week's top scores", unit = '' }: Props) {
  const { name } = usePlayer();
  const label = (score: number) => {
    const u = Array.isArray(unit) ? unit[score === 1 ? 0 : 1] : unit;
    return `${score.toLocaleString()}${u ? ` ${u}` : ''}`;
  };
  const { data, status, you } = board;
  const isYou = (n: string) => !!name && n.toLowerCase() === name.toLowerCase();
  const showYouBelow = you && !data?.entries.some((e) => isYou(e.name));

  return (
    <section className="leaderboard" aria-label={title}>
      <h2 className="leaderboard__title">{title}</h2>
      {status === 'offline' ? (
        <p className="leaderboard__note">Scores are offline right now. Your games still work.</p>
      ) : !data ? (
        <p className="leaderboard__note">Loading scores…</p>
      ) : data.entries.length === 0 ? (
        <p className="leaderboard__note">No scores yet this week. Be the first!</p>
      ) : (
        <ol className="leaderboard__list">
          {data.entries.map((e, i) => (
            <li key={e.name} className={isYou(e.name) ? 'is-you' : undefined}>
              <span className="leaderboard__rank">{i + 1}</span>
              <span className="leaderboard__name">
                {e.name}
                {isYou(e.name) && <span className="leaderboard__you"> (you)</span>}
              </span>
              <span className="leaderboard__score">{label(e.score)}</span>
            </li>
          ))}
          {showYouBelow && (
            <li className="is-you leaderboard__below">
              <span className="leaderboard__rank">{you.rank}</span>
              <span className="leaderboard__name">
                {you.name}
                <span className="leaderboard__you"> (you)</span>
              </span>
              <span className="leaderboard__score">{label(you.score)}</span>
            </li>
          )}
        </ol>
      )}
    </section>
  );
}
