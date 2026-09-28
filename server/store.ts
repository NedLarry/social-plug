import { createClient } from 'redis';
import { WEEK_SECONDS, type BoardRule } from './boards.ts';

export interface Entry {
  name: string;
  score: number;
}

/** Who a name belongs to: `ok` if it's (now) yours, with the name as first registered. */
export interface ClaimResult {
  ok: boolean;
  name: string;
}

export interface ScoreStore {
  /**
   * Reserves `name` (case-insensitively) for `owner`, or renews it if `owner` already
   * has it, for `ttlSeconds` from now. Fails if someone else holds it.
   */
  claim(name: string, owner: string, ttlSeconds: number): Promise<ClaimResult>;
  /** Highest scores first. */
  top(board: string, limit: number): Promise<Entry[]>;
  /** A player's score and 1-based rank, or null. */
  find(board: string, name: string): Promise<(Entry & { rank: number }) | null>;
  /** Records a score (keeping the best, or adding up for 'total' boards). Starts the board's week if new. */
  submit(board: string, rule: BoardRule, entry: Entry): Promise<void>;
  /** Adds `entry` only if the board doesn't exist yet (new or just reset). */
  seedIfEmpty(board: string, entry: Entry): Promise<boolean>;
  /** When the board resets (epoch ms), or null if it has no scores. */
  resetsAt(board: string): Promise<number | null>;
}

const key = (board: string) => `games:board:${board}`;
const nameKey = (name: string) => `games:name:${name.toLowerCase()}`;

// Atomic claim-or-renew: returns {1, name} if the caller owns it, {0, name} if taken.
const CLAIM_SCRIPT = `
local owner = redis.call('HGET', KEYS[1], 'owner')
if owner and owner ~= ARGV[1] then
  return {0, redis.call('HGET', KEYS[1], 'name')}
end
if not owner then
  redis.call('HSET', KEYS[1], 'owner', ARGV[1], 'name', ARGV[2])
end
redis.call('EXPIRE', KEYS[1], ARGV[3])
return {1, redis.call('HGET', KEYS[1], 'name')}`;

// Seeding must be atomic so two visitors can't both seed a fresh board.
const SEED_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 0 then
  redis.call('ZADD', KEYS[1], ARGV[1], ARGV[2])
  redis.call('EXPIRE', KEYS[1], ARGV[3])
  return 1
end
return 0`;

function redisClient(url: string, isConnected: () => boolean) {
  return createClient({
    url,
    socket: {
      connectTimeout: 2000,
      // Retry forever once we've been connected; give up quickly on first connect.
      reconnectStrategy: (retries: number) => (isConnected() || retries < 2 ? Math.min(retries * 200, 3000) : new Error('Redis unreachable')),
    },
  });
}

type Redis = ReturnType<typeof redisClient>;

export class RedisStore implements ScoreStore {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async claim(name: string, owner: string, ttlSeconds: number) {
    const [ok, registered] = (await this.redis.eval(CLAIM_SCRIPT, {
      keys: [nameKey(name)],
      arguments: [owner, name, String(ttlSeconds)],
    })) as [number, string];
    return { ok: ok === 1, name: registered };
  }

  async top(board: string, limit: number) {
    const rows = await this.redis.zRangeWithScores(key(board), 0, limit - 1, { REV: true });
    return rows.map((r) => ({ name: r.value, score: r.score }));
  }

  async find(board: string, name: string) {
    const [score, rank] = await Promise.all([this.redis.zScore(key(board), name), this.redis.zRevRank(key(board), name)]);
    return score === null || rank === null ? null : { name, score, rank: rank + 1 };
  }

  async submit(board: string, rule: BoardRule, entry: Entry) {
    const k = key(board);
    const tx = this.redis.multi();
    if (rule.kind === 'total') tx.zIncrBy(k, entry.score, entry.name);
    else tx.zAdd(k, { score: entry.score, value: entry.name }, { GT: true });
    // The week starts with the first score; later scores don't extend it.
    tx.expire(k, WEEK_SECONDS, 'NX');
    await tx.exec();
  }

  async seedIfEmpty(board: string, entry: Entry) {
    const added = await this.redis.eval(SEED_SCRIPT, {
      keys: [key(board)],
      arguments: [String(entry.score), entry.name, String(WEEK_SECONDS)],
    });
    return added === 1;
  }

  async resetsAt(board: string) {
    const ms = await this.redis.pTTL(key(board));
    return ms > 0 ? Date.now() + ms : null;
  }
}

/** Same rules as Redis, kept in memory. Used when Redis is unavailable, and in tests. */
export class MemoryStore implements ScoreStore {
  private boards = new Map<string, { expiresAt: number; scores: Map<string, number> }>();
  private names = new Map<string, { owner: string; name: string; expiresAt: number }>();
  private now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  async claim(name: string, owner: string, ttlSeconds: number) {
    const k = name.toLowerCase();
    let held = this.names.get(k);
    if (held && held.expiresAt <= this.now()) held = undefined;
    if (held && held.owner !== owner) return { ok: false, name: held.name };
    const entry = { owner, name: held?.name ?? name, expiresAt: this.now() + ttlSeconds * 1000 };
    this.names.set(k, entry);
    return { ok: true, name: entry.name };
  }

  private live(board: string) {
    const b = this.boards.get(board);
    if (b && b.expiresAt <= this.now()) {
      this.boards.delete(board);
      return undefined;
    }
    return b;
  }

  private create(board: string) {
    const b = { expiresAt: this.now() + WEEK_SECONDS * 1000, scores: new Map<string, number>() };
    this.boards.set(board, b);
    return b;
  }

  private sorted(board: string) {
    return [...(this.live(board)?.scores ?? [])].map(([name, score]) => ({ name, score })).sort((a, b) => b.score - a.score);
  }

  async top(board: string, limit: number) {
    return this.sorted(board).slice(0, limit);
  }

  async find(board: string, name: string) {
    const all = this.sorted(board);
    const i = all.findIndex((e) => e.name === name);
    return i < 0 ? null : { ...all[i], rank: i + 1 };
  }

  async submit(board: string, rule: BoardRule, entry: Entry) {
    const b = this.live(board) ?? this.create(board);
    const prev = b.scores.get(entry.name);
    const next = rule.kind === 'total' ? (prev ?? 0) + entry.score : Math.max(prev ?? -Infinity, entry.score);
    b.scores.set(entry.name, next);
  }

  async seedIfEmpty(board: string, entry: Entry) {
    if (this.live(board)) return false;
    this.create(board).scores.set(entry.name, entry.score);
    return true;
  }

  async resetsAt(board: string) {
    return this.live(board)?.expiresAt ?? null;
  }
}

/**
 * Connects to Redis at REDIS_URL (default redis://localhost:6379). If it can't be
 * reached at startup, falls back to the in-memory store so the games keep working.
 */
export async function connectStore(url = process.env.REDIS_URL ?? 'redis://localhost:6379'): Promise<ScoreStore> {
  let connected = false;
  const redis = redisClient(url, () => connected);
  redis.on('error', (err: Error) => {
    if (connected) console.error('[scores] Redis error:', err.message);
  });
  try {
    await redis.connect();
    connected = true;
    console.log(`[scores] Using Redis at ${url.replace(/\/\/[^@]*@/, '//***@')}`);
    return new RedisStore(redis);
  } catch (err) {
    console.warn(`[scores] Redis not reachable (${(err as Error).message}); keeping scores in memory instead.`);
    return new MemoryStore();
  }
}
