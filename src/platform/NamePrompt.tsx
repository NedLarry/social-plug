import { useState, type FormEvent } from 'react';
import { claimName, tidyName } from '../shared/player';

interface Props {
  gameName: string;
  initial: string | null;
  onSubmit: (name: string) => void;
  onCancel?: () => void;
  /** Show as a dialog over the page (for changing name mid-game). */
  modal?: boolean;
}

/** Asks who's playing, so scores can be saved under their name. */
export function NamePrompt({ gameName, initial, onSubmit, onCancel, modal }: Props) {
  const [value, setValue] = useState(initial ?? '');
  const [checking, setChecking] = useState(false);
  // The last name the server refused, and why.
  const [refused, setRefused] = useState<{ name: string; reason: 'taken' | 'not-allowed' } | null>(null);
  const name = tidyName(value);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || checking) return;
    setChecking(true);
    const outcome = await claimName(name);
    setChecking(false);
    if (outcome.status === 'taken' || outcome.status === 'not-allowed') setRefused({ name, reason: outcome.status });
    // Offline: play anyway; scores can't be saved until the server is back.
    else onSubmit(outcome.status === 'ok' ? outcome.name : name);
  };

  const form = (
    <form className="name-prompt" onSubmit={submit} aria-label="Enter your name">
      <p className="name-prompt__title">Who&apos;s playing?</p>
      <p className="name-prompt__lead">
        Your scores in {gameName} are saved under this name on this week&apos;s leaderboard. Names are unique: once
        it&apos;s yours, nobody else can use it.
      </p>
      <input
        className="name-prompt__input"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setRefused(null);
        }}
        maxLength={24}
        placeholder="Your name"
        aria-label="Your name"
        autoComplete="nickname"
        aria-invalid={!!refused}
        aria-describedby={refused ? 'name-error' : undefined}
        autoFocus
      />
      {refused && (
        <p id="name-error" className="name-prompt__error" role="alert">
          {refused.reason === 'taken' ? (
            <>&ldquo;{refused.name}&rdquo; is already taken by another player. Try a different name.</>
          ) : (
            <>That name isn&apos;t allowed. Please choose a different one.</>
          )}
        </p>
      )}
      <div className="game-controls">
        <button type="submit" className="btn btn--big" disabled={!name || checking || name === refused?.name}>
          {checking ? 'Checking…' : modal ? 'Save name' : "Let's play"}
        </button>
        {onCancel && (
          <button type="button" className="btn btn--big btn--ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );

  if (!modal) return form;
  return (
    <div className="name-prompt__backdrop" role="dialog" aria-modal="true" onKeyDown={(e) => e.key === 'Escape' && onCancel?.()}>
      {form}
    </div>
  );
}
