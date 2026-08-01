/**
 * Session storage — ported from `infra_agents/auth/client/session.py`'s
 * `SessionStore` protocol. Redis-backed when `REDIS_URL` is set and
 * reachable (via `ioredis`, async — the Python service used a *synchronous*
 * redis-py client called un-awaited from async handlers, blocking its event
 * loop; that's a bug there, not a behavior to replicate), else an
 * in-memory `Map` fallback with no TTL enforcement (matches Python's
 * `InMemorySessionStore`: entries live until `delete()` or process restart).
 */
import { randomUUID } from "node:crypto";
import { config } from "@/server/auth/config";

export interface SessionData {
  sessionId: string;
  userId: string;
  email: string;
  name: string;
  picture: string;
  role: string;
  tenantId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  createdAt: number;
}

export function isAccessTokenExpired(session: SessionData): boolean {
  return Date.now() / 1000 >= session.accessTokenExpiresAt;
}

interface SessionStoreBackend {
  readonly name: "RedisSessionStore" | "InMemorySessionStore";
  create(data: SessionData): Promise<void>;
  get(sessionId: string): Promise<SessionData | null>;
  update(data: SessionData): Promise<void>;
  delete(sessionId: string): Promise<void>;
  exists(sessionId: string): Promise<boolean>;
  ping(): Promise<boolean>;
}

class InMemorySessionStore implements SessionStoreBackend {
  readonly name = "InMemorySessionStore" as const;
  private readonly sessions = new Map<string, SessionData>();

  async create(data: SessionData): Promise<void> {
    this.sessions.set(data.sessionId, data);
  }
  async get(sessionId: string): Promise<SessionData | null> {
    return this.sessions.get(sessionId) ?? null;
  }
  async update(data: SessionData): Promise<void> {
    this.sessions.set(data.sessionId, data);
  }
  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }
  async exists(sessionId: string): Promise<boolean> {
    return this.sessions.has(sessionId);
  }
  async ping(): Promise<boolean> {
    return true;
  }
}

class RedisSessionStore implements SessionStoreBackend {
  readonly name = "RedisSessionStore" as const;
  private readonly client: import("ioredis").Redis;

  constructor(client: import("ioredis").Redis) {
    this.client = client;
  }

  private key(sessionId: string): string {
    return `${config.redisKeyPrefix}${sessionId}`;
  }

  async create(data: SessionData): Promise<void> {
    await this.client.setex(this.key(data.sessionId), config.sessionMaxAge, JSON.stringify(data));
  }
  async get(sessionId: string): Promise<SessionData | null> {
    const raw = await this.client.get(this.key(sessionId));
    return raw ? (JSON.parse(raw) as SessionData) : null;
  }
  async update(data: SessionData): Promise<void> {
    await this.client.setex(this.key(data.sessionId), config.sessionMaxAge, JSON.stringify(data));
  }
  async delete(sessionId: string): Promise<void> {
    await this.client.del(this.key(sessionId));
  }
  async exists(sessionId: string): Promise<boolean> {
    return (await this.client.exists(this.key(sessionId))) === 1;
  }
  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()) === "PONG";
    } catch {
      return false;
    }
  }

  getClient(): import("ioredis").Redis {
    return this.client;
  }
}

let storePromise: Promise<SessionStoreBackend> | null = null;

async function createStore(): Promise<SessionStoreBackend> {
  if (!config.redisUrl) return new InMemorySessionStore();

  try {
    const { Redis } = await import("ioredis");
    const client = new Redis(config.redisUrl, {
      connectTimeout: 5000,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    await client.connect();
    const store = new RedisSessionStore(client);
    if (await store.ping()) return store;
    client.disconnect();
  } catch (error) {
    console.warn("Redis session store unavailable, falling back to in-memory:", error);
  }
  return new InMemorySessionStore();
}

/** Module-level singleton, decided once (mirrors the Python service's startup-time decision). */
export function getSessionStore(): Promise<SessionStoreBackend> {
  storePromise ??= createStore();
  return storePromise;
}

export async function getRedisClientIfAvailable(): Promise<import("ioredis").Redis | null> {
  const store = await getSessionStore();
  return store instanceof RedisSessionStore ? store.getClient() : null;
}

export function newSessionId(): string {
  return randomUUID();
}
