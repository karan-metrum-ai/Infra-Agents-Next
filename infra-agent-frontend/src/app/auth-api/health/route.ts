import { NextResponse } from "next/server";
import { config, getCookieDomain } from "@/server/auth/config";
import { getSessionStore } from "@/server/auth/sessionStore";

export async function GET() {
  const store = await getSessionStore();

  let redisStatus: string;
  if (!config.redisUrl) {
    redisStatus = "not_configured";
  } else {
    try {
      redisStatus = (await store.ping()) ? "healthy" : "unhealthy";
    } catch (error) {
      redisStatus = `error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  return NextResponse.json({
    status: "healthy",
    service: "auth-api",
    timestamp: new Date().toISOString(),
    version: "2.1.0",
    stores: {
      session: store.name,
      pkce: store.name === "RedisSessionStore" ? "RedisPkceStore" : "InMemoryPkceStore",
    },
    redis_status: redisStatus,
    config: {
      cookie_name: config.sessionCookieName,
      cookie_domain: getCookieDomain() ?? "(host-only)",
      bff_base_url: config.bffBaseUrl,
    },
  });
}
