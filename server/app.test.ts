import { createClient } from 'redis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WEEK_SECONDS, cleanName } from './boards.ts';
import { createApp } from './app.ts';
import { randomPlayerName } from './names.ts';
import { MemoryStore, RedisStore, type ScoreStore } from './store.ts';

function setup() {
  let now = Date.UTC(2026, 8, 28);
  const store = new MemoryStore(() => now);
  const app = createApp(async () => store);
  const get = async (board: string, name?: string) =>
    (await app.request(`/api/boards/${board}${name ? `?name=${encodeURIComponent(name)}` : ''}`)).json();
  // Each player's secret key, by player name in the test (Ada's browser, Tunde's browser…).
  const keyFor = (who: string) => `test-player-key-${who.toLowerCase().replace(/\W/g, '')}`;
  const send = (path: string, body: unknown, key: string | null) =>
    app.request(path, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json', ...(key ? { 'x-player-token': key } : {}) },
    });
  const post = async (board: string, body: { name: string; score: number }, key = keyFor(body.name)) =>
    await send(`/api/boards/${board}/scores`, body, key);
  const claim = async (name: string, key: string | null = keyFor(name)) => await send('/api/players/claim', { name }, key);
  return { get, post, claim, keyFor, store, advance: (ms: number) => (now += ms), now: () => now };
}

describe('scores API', () => {
  it('keeps each player’s best score, highest first', async () => {
    const { get, post } = setup();
    await post('whot-higher-lower', { name: 'Ada', score: 5 });
    await post('whot-higher-lower', { name: 'Tunde', score: 9 });
    await post('whot-higher-lower', { name: 'Ada', score: 3 });
    const res = await get('whot-higher-lower', 'Ada');
    expect(res.entries).toEqual([
      { name: 'Tunde', score: 9 },
      { name: 'Ada', score: 5 },
    ]);
    expect(res.you).toEqual({ name: 'Ada', score: 5, rank: 2 });
  });

  it('reports whether a score improved and who was top before', async () => {
    const { post } = setup();
    await post('whot-match-12', { name: 'Ada', score: 4 });
    const worse = await (await post('whot-match-12', { name: 'Ada', score: 2 })).json();
    expect(worse.result).toMatchObject({ improved: false, topBefore: { name: 'Ada', score: 4 } });
    const better = await (await post('whot-match-12', { name: 'Ada', score: 6 })).json();
    expect(better.result.improved).toBe(true);
    expect(better.you).toMatchObject({ score: 6, rank: 1 });
  });

  it('adds up wins on total boards, one at a time', async () => {
    const { get, post } = setup();
    await post('whot-classic-wins', { name: 'Ada', score: 1 });
    await post('whot-classic-wins', { name: 'Ada', score: 1 });
    expect((await get('whot-classic-wins')).entries).toEqual([{ name: 'Ada', score: 2 }]);
    expect((await post('whot-classic-wins', { name: 'Ada', score: 5 })).status).toBe(400);
  });

  it('resets a week after the first score', async () => {
    const { get, post, advance, now } = setup();
    await post('whot-higher-lower', { name: 'Ada', score: 5 });
    const first = await get('whot-higher-lower');
    expect(first.resetsAt).toBe(now() + WEEK_SECONDS * 1000);
    advance(3 * 24 * 3600 * 1000);
    await post('whot-higher-lower', { name: 'Tunde', score: 7 });
    expect((await get('whot-higher-lower')).resetsAt).toBe(first.resetsAt); // later scores don't extend the week
    advance(4 * 24 * 3600 * 1000);
    const after = await get('whot-higher-lower');
    expect(after.entries).toEqual([]);
    expect(after.resetsAt).toBeNull();
  });

  it('Snake boards always have a seeded score to beat, re-seeded after each reset', async () => {
    const { get, advance } = setup();
    for (const board of ['snake-walls', 'snake-wrap']) {
      const res = await get(board);
      expect(res.entries).toHaveLength(1);
      expect(res.entries[0].score).toBeGreaterThanOrEqual(380);
      expect(res.entries[0].score % 10).toBe(0);
      expect(res.resetsAt).not.toBeNull();
    }
    const before = (await get('snake-walls')).entries[0];
    expect((await get('snake-walls')).entries).toEqual([before]); // not re-seeded on every visit
    advance(WEEK_SECONDS * 1000 + 1);
    const after = await get('snake-walls');
    expect(after.entries).toHaveLength(1);
    expect(after.resetsAt).toBeGreaterThan(Date.UTC(2026, 8, 28) + WEEK_SECONDS * 1000);
  });

  it('names belong to whoever uses them first (case-insensitive)', async () => {
    const { claim, post, get } = setup();
    expect((await claim('Ada', 'ada-browser-key-1234')).status).toBe(200);
    // Same browser again (any casing) keeps it, under the name as first registered.
    const again = await claim('ADA', 'ada-browser-key-1234');
    expect(await again.json()).toEqual({ name: 'Ada' });
    // Another browser can't have it.
    const other = await claim('ada', 'someone-else-key-5678');
    expect(other.status).toBe(409);
    expect((await other.json()).code).toBe('name-taken');
    expect((await post('whot-higher-lower', { name: 'Ada', score: 99 }, 'someone-else-key-5678')).status).toBe(409);
    // Owner's scores save under one entry whatever the casing.
    await post('whot-higher-lower', { name: 'ada', score: 4 }, 'ada-browser-key-1234');
    await post('whot-higher-lower', { name: 'ADA', score: 6 }, 'ada-browser-key-1234');
    expect((await get('whot-higher-lower')).entries).toEqual([{ name: 'Ada', score: 6 }]);
  });

  it('a name frees up after 30 days unused, but using it keeps it', async () => {
    const { claim, advance } = setup();
    await claim('Ada', 'ada-browser-key-1234');
    advance(29 * 24 * 3600 * 1000);
    await claim('Ada', 'ada-browser-key-1234'); // played again: renewed
    advance(29 * 24 * 3600 * 1000);
    expect((await claim('Ada', 'someone-else-key-5678')).status).toBe(409);
    advance(2 * 24 * 3600 * 1000);
    expect((await claim('Ada', 'someone-else-key-5678')).status).toBe(200);
  });

  it('seeded Snake names are reserved, so players cannot merge with them', async () => {
    const { get, claim } = setup();
    const seed = (await get('snake-walls')).entries[0].name;
    expect((await claim(seed, 'player-browser-key-1234')).status).toBe(409);
  });

  it('refuses offensive names, for claims and scores', async () => {
    const { claim, post, get } = setup();
    const res = await claim('n1gg@');
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('name-not-allowed');
    expect((await post('whot-higher-lower', { name: 'Big Nigga', score: 5 })).status).toBe(400);
    expect((await get('whot-higher-lower')).entries).toEqual([]);
    expect((await claim('Nigerian Queen')).status).toBe(200);
  });

  it('needs a player key to save or claim', async () => {
    const { post, claim } = setup();
    expect((await post('whot-higher-lower', { name: 'Ada', score: 1 }, '')).status).toBe(400);
    expect((await claim('Ada', null)).status).toBe(400);
    expect((await claim('Ada', 'short')).status).toBe(400);
  });

  it('rejects bad input', async () => {
    const { post } = setup();
    expect((await post('snake-walls', { name: '   ', score: 10 })).status).toBe(400);
    expect((await post('snake-walls', { name: 'Ada', score: -1 })).status).toBe(400);
    expect((await post('snake-walls', { name: 'Ada', score: 1.5 })).status).toBe(400);
    expect((await post('Not_A_Board', { name: 'Ada', score: 1 })).status).toBe(404);
  });

  it('tidies names', () => {
    expect(cleanName('  Chinedu   O.  ')).toBe('Chinedu O.');
    expect(cleanName('<b>Ada</b>')).toBe('bAdab');
    expect(cleanName('x'.repeat(40))).toHaveLength(20);
    expect(cleanName('🙂')).toBeNull();
  });

  it('makes human-looking seed names', () => {
    const names = new Set(Array.from({ length: 50 }, () => randomPlayerName()));
    expect(names.size).toBeGreaterThan(10);
    for (const n of names) expect(cleanName(n)).toBe(n);
  });
});

// Runs against a real Redis when one is reachable (REDIS_URL or localhost).
const redis = createClient({ url: process.env.REDIS_URL ?? 'redis://localhost:6379', socket: { connectTimeout: 1000, reconnectStrategy: false } });
const redisUp = await redis.connect().then(
  () => true,
  () => false,
);
const prefix = `test-${Date.now().toString(36)}`;

describe.skipIf(!redisUp)('RedisStore (real Redis)', () => {
  let store: ScoreStore;
  beforeAll(() => {
    store = new RedisStore(redis as never);
  });
  afterAll(async () => {
    const keys = [...(await redis.keys(`games:board:${prefix}*`)), ...(await redis.keys(`games:name:${prefix}*`))];
    if (keys.length) await redis.del(keys);
    await redis.quit();
  });

  it('keeps the best score, ranks, and expires a week after the first score', async () => {
    const board = `${prefix}-best`;
    await store.submit(board, { kind: 'best' }, { name: 'Ada', score: 5 });
    await store.submit(board, { kind: 'best' }, { name: 'Ada', score: 3 });
    await store.submit(board, { kind: 'best' }, { name: 'Tunde', score: 8 });
    expect(await store.top(board, 10)).toEqual([
      { name: 'Tunde', score: 8 },
      { name: 'Ada', score: 5 },
    ]);
    expect(await store.find(board, 'Ada')).toEqual({ name: 'Ada', score: 5, rank: 2 });
    const ttl = await redis.ttl(`games:board:${board}`);
    expect(ttl).toBeGreaterThan(WEEK_SECONDS - 5);
    expect(ttl).toBeLessThanOrEqual(WEEK_SECONDS);
  });

  it('adds up totals', async () => {
    const board = `${prefix}-total`;
    await store.submit(board, { kind: 'total' }, { name: 'Ada', score: 1 });
    await store.submit(board, { kind: 'total' }, { name: 'Ada', score: 1 });
    expect(await store.top(board, 10)).toEqual([{ name: 'Ada', score: 2 }]);
  });

  it('claims names case-insensitively, renewing for the owner', async () => {
    const name = `${prefix}-Ada`;
    expect(await store.claim(name, 'owner-a', 60)).toEqual({ ok: true, name });
    expect(await store.claim(name.toUpperCase(), 'owner-a', 120)).toEqual({ ok: true, name });
    expect(await store.claim(name.toLowerCase(), 'owner-b', 60)).toEqual({ ok: false, name });
    expect(await redis.ttl(`games:name:${name.toLowerCase()}`)).toBeGreaterThan(100);
  });

  it('seeds only an empty board', async () => {
    const board = `${prefix}-seed`;
    expect(await store.seedIfEmpty(board, { name: 'Seed', score: 500 })).toBe(true);
    expect(await store.seedIfEmpty(board, { name: 'Other', score: 900 })).toBe(false);
    expect(await store.top(board, 10)).toEqual([{ name: 'Seed', score: 500 }]);
    expect(await store.resetsAt(board)).toBeGreaterThan(Date.now() + (WEEK_SECONDS - 5) * 1000);
  });
});
