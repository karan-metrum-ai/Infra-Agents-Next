/**
 * Hash-chained audit log — ported from `infra_agents/compliance`'s
 * `audit_logger.py`, writing into the same pre-existing `audit_log` Postgres
 * table (schema: `init-compliance.sql`) the Python service used. Best-effort
 * and fire-and-forget, matching the Python service exactly: if
 * `COMPLIANCE_DB_URL`/`DB_URL` isn't configured, every call below is a
 * silent no-op — no error surfaces to the caller either way.
 */
import { createHash, randomUUID } from "node:crypto";
import { config } from "@/server/auth/config";

const DNS_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuidv5(name: string, namespace: string): string {
  const nsBytes = Buffer.from(namespace.replace(/-/g, ""), "hex");
  const hash = createHash("sha1")
    .update(Buffer.concat([nsBytes, Buffer.from(name, "utf8")]))
    .digest();
  const bytes = hash.subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function asUuid(value: string | null | undefined): string | null {
  if (!value) return null;
  if (UUID_RE.test(value)) return value.toLowerCase();
  return uuidv5(value, DNS_NAMESPACE);
}

/** Matches Python's `json.dumps(payload, sort_keys=True, separators=(",",":"), default=str)`. */
function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).toSorted();
    return `{${keys
      .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export interface AuditRecordInput {
  eventType: string;
  eventCategory: string;
  outcome: "success" | "failure" | "denied";
  organizationId?: string | null;
  userId?: string | null;
  actorRole?: string | null;
  target?: string | null;
  targetType?: string | null;
  sourceIp?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
  details?: Record<string, unknown>;
}

let poolPromise: Promise<import("pg").Pool | null> | null = null;

async function getPool(): Promise<import("pg").Pool | null> {
  if (!config.complianceDbUrl) return null;
  poolPromise ??= (async () => {
    try {
      const { Pool } = await import("pg");
      return new Pool({ connectionString: config.complianceDbUrl });
    } catch (error) {
      console.error("Compliance DB unavailable, audit events will be dropped:", error);
      return null;
    }
  })();
  return poolPromise;
}

/** Best-effort — never throws. Call sites use `void auditRecord(...)` for fire-and-forget parity. */
export async function auditRecord(input: AuditRecordInput): Promise<void> {
  try {
    const pool = await getPool();
    if (!pool) return;

    const orgUuid = asUuid(input.organizationId);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1)::bigint)", [
        `org:${orgUuid ?? "null"}`,
      ]);
      const prevResult = await client.query<{ row_hash: string }>(
        `SELECT row_hash FROM audit_log WHERE organization_id IS NOT DISTINCT FROM $1
         ORDER BY id DESC LIMIT 1 FOR UPDATE`,
        [orgUuid],
      );
      const prevHash = prevResult.rows[0]?.row_hash ?? "";

      const eventId = randomUUID();
      const createdAt = new Date().toISOString();
      const payload = {
        event_id: eventId,
        organization_id: orgUuid,
        user_id: input.userId ?? null,
        actor_role: input.actorRole ?? null,
        event_type: input.eventType,
        event_category: input.eventCategory,
        outcome: input.outcome,
        target: input.target ?? null,
        target_type: input.targetType ?? null,
        source_ip: input.sourceIp ?? null,
        user_agent: input.userAgent ?? null,
        correlation_id: input.correlationId ?? null,
        details: input.details ?? {},
        created_at: createdAt,
      };
      const rowHash = createHash("sha256")
        .update(prevHash + canonicalJson(payload))
        .digest("hex");

      await client.query(
        `INSERT INTO audit_log
           (event_id, organization_id, user_id, actor_role, event_type, event_category,
            outcome, target, target_type, source_ip, user_agent, correlation_id, details,
            prev_hash, row_hash, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          eventId,
          orgUuid,
          payload.user_id,
          payload.actor_role,
          payload.event_type,
          payload.event_category,
          payload.outcome,
          payload.target,
          payload.target_type,
          payload.source_ip,
          payload.user_agent,
          payload.correlation_id,
          JSON.stringify(payload.details),
          prevHash || null,
          rowHash,
          createdAt,
        ],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Audit log write failed (dropped):", error);
  }
}
