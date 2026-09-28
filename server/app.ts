import { createHash } from 'node:crypto';
import { Hono, type Context } from 'hono';
import { NAME_CLAIM_SECONDS, WEEK_SECONDS, boardRule, cleanName, seedScore } from './boards.ts';
import { isOffensive } from './nameFilter.ts';
import { randomPlayerName } from './names.ts';
import { connectStore, type ScoreStore } from './store.ts';

const TOP = 10;
const MAX_SCORE = 10_000_000;
/** Owner of the made-up Snake names (real owners are 64-char hashes, so no clash). */
const HOUSE = 'house';
const TOKEN = /^[A-Za-z0-9-]{16,100}$/;

/**
 * Each browser sends a random secret player key (x-player-token); names belong to the
 * key that used them first. Only a hash of the key is stored.
 */
function playerOwner(c: Context) {
  const token = c.req.header('x-player-token');
  return token && TOKEN.test(token) ? createHash('sha256').update(token).digest('hex') : null;
}

const taken = (name: string) => ({ error: `"${name}" is already taken. Try another name.`, code: 'name-taken' });
const notAllowed = { error: 'Please choose a different name.', code: 'name-not-allowed' };

/** The scores API, mounted at /api. `getStore` is called lazily on the first request. */
export function createApp(getStore: () => Promise<ScoreStore>) {
  const app = new Hono().basePath('/api');

  async function ensureSeed(store: ScoreStore, board: string) {
    const rule = boardRule(board);
    if (!rule?.seed || (await store.resetsAt(board)) !== null) return;
    // Reserve the made-up name while the board lasts, so no real player's score merges with it.
    for (let tries = 0; tries < 5; tries++) {
      const name = randomPlayerName();
      if ((await store.claim(name, HOUSE, WEEK_SECONDS)).ok) {
        await store.seedIfEmpty(board, { name, score: seedScore(rule.seed) });
        return;
      }
    }
  }

  async function snapshot(store: ScoreStore, board: string, name: string | null) {
    const [entries, you, resetsAt] = await Promise.all([
      store.top(board, TOP),
      name ? store.find(board, name) : null,
      store.resetsAt(board),
    ]);
    return { board, entries, you, resetsAt };
  }

  app.onError((err, c) => {
    console.error('[scores]', err);
    return c.json({ error: 'Scores are unavailable right now.' }, 503);
  });

  app.get('/health', (c) => c.json({ ok: true }));

  // Reserve a name for this player (or renew it). 409 if someone else has it.
  app.post('/players/claim', async (c) => {
    const owner = playerOwner(c);
    if (!owner) return c.json({ error: 'Missing player key.' }, 400);
    const body = await c.req.json().catch(() => null);
    const name = cleanName(body?.name);
    if (!name) return c.json({ error: 'A name is required.' }, 400);
    if (isOffensive(name)) return c.json(notAllowed, 400);
    const store = await getStore();
    const claim = await store.claim(name, owner, NAME_CLAIM_SECONDS);
    return claim.ok ? c.json({ name: claim.name }) : c.json(taken(name), 409);
  });

  app.get('/boards/:board', async (c) => {
    const board = c.req.param('board');
    if (!boardRule(board)) return c.json({ error: 'Unknown board.' }, 404);
    const store = await getStore();
    await ensureSeed(store, board);
    return c.json(await snapshot(store, board, cleanName(c.req.query('name'))));
  });

  app.post('/boards/:board/scores', async (c) => {
    const board = c.req.param('board');
    const rule = boardRule(board);
    if (!rule) return c.json({ error: 'Unknown board.' }, 404);
    const owner = playerOwner(c);
    if (!owner) return c.json({ error: 'Missing player key.' }, 400);
    const body = await c.req.json().catch(() => null);
    const typed = cleanName(body?.name);
    const score = body?.score;
    if (!typed) return c.json({ error: 'A name is required.' }, 400);
    if (isOffensive(typed)) return c.json(notAllowed, 400);
    if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) return c.json({ error: 'Invalid score.' }, 400);
    if (rule.kind === 'total' && score > (rule.maxPerSubmit ?? MAX_SCORE)) return c.json({ error: 'Invalid score.' }, 400);

    const store = await getStore();
    const claim = await store.claim(typed, owner, NAME_CLAIM_SECONDS);
    if (!claim.ok) return c.json(taken(typed), 409);
    const name = claim.name; // as first registered, so "ada" and "Ada" are one entry
    await ensureSeed(store, board);
    const [before, topBefore] = await Promise.all([store.find(board, name), store.top(board, 1)]);
    await store.submit(board, rule, { name, score });
    const snap = await snapshot(store, board, name);
    return c.json({
      ...snap,
      result: {
        score,
        improved: !before || snap.you!.score > before.score,
        topBefore: topBefore[0] ?? null,
      },
    });
  });

  return app;
}

let store: Promise<ScoreStore> | null = null;

/** The API backed by Redis (or memory, if Redis is down). Connects on first use. */
export const app = createApp(() => (store ??= connectStore()));
