/**
 * PKCE state store — ported from `session.py`'s `PkceStateStore`. One-time
 * use: `retrieve()` atomically gets-and-deletes. 5-minute TTL, same as the
 * Python service. Shares the Redis connection with the session store when
 * available; falls back to an in-memory `Map` otherwise.
 */
import { config } from "@/server/auth/config";
import { getRedisClientIfAvailable } from "@/server/auth/sessionStore";

export interface PkceState {
  codeVerifier: string;
  redirectUri: string;
}

const PKCE_STATE_TTL_SECONDS = 300;

const memoryStore = new Map<string, { state: PkceState; expiresAt: number }>();

function pkceKeyPrefix(): string {
  return config.redisKeyPrefix.replace("session:", "pkce:");
}

export async function storePkceState(stateToken: string, state: PkceState): Promise<void> {
  const redis = await getRedisClientIfAvailable();
  if (redis) {
    await redis.setex(
      `${pkceKeyPrefix()}${stateToken}`,
      PKCE_STATE_TTL_SECONDS,
      JSON.stringify(state),
    );
    return;
  }
  memoryStore.set(stateToken, { state, expiresAt: Date.now() + PKCE_STATE_TTL_SECONDS * 1000 });
}

export async function retrievePkceState(stateToken: string): Promise<PkceState | null> {
  const redis = await getRedisClientIfAvailable();
  if (redis) {
    const key = `${pkceKeyPrefix()}${stateToken}`;
    const raw = await redis.get(key);
    if (!raw) return null;
    await redis.del(key);
    return JSON.parse(raw) as PkceState;
  }

  const entry = memoryStore.get(stateToken);
  memoryStore.delete(stateToken);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.state;
}
