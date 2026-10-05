import { getDb } from "../db/supabase.js";
import { getEnv } from "../config/env.js";
import { randomToken, sha256 } from "./crypto.js";

export interface SessionRecord {
  id: string;
  user_id: string;
  csrf_token: string;
  expires_at: string;
  last_active_at: string;
  revoked_at: string | null;
}

/** Creates a new DB-backed session row and returns the raw cookie token
 * (never stored — only its SHA-256 hash is persisted). */
export async function createSession(opts: {
  userId: string;
  ip: string | null;
  userAgent: string | null;
}) {
  const env = getEnv();
  const db = getDb();
  const rawToken = randomToken(32);
  const csrfToken = randomToken(16);
  const expiresAt = new Date(
    Date.now() + env.SESSION_ABSOLUTE_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await db
    .from("sessions")
    .insert({
      user_id: opts.userId,
      token_hash: sha256(rawToken),
      csrf_token: csrfToken,
      ip: opts.ip,
      user_agent: opts.userAgent,
      expires_at: expiresAt,
    })
    .select("id, csrf_token")
    .single();

  if (error || !data) throw new Error("Failed to create session");
  return { rawToken, csrfToken: data.csrf_token as string, sessionId: data.id as string };
}

export async function loadSessionByRawToken(rawToken: string): Promise<SessionRecord | null> {
  const db = getDb();
  const { data, error } = await db
    .from("sessions")
    .select("id, user_id, csrf_token, expires_at, last_active_at, revoked_at")
    .eq("token_hash", sha256(rawToken))
    .maybeSingle();
  if (error || !data) return null;
  return data as SessionRecord;
}

export async function touchSession(sessionId: string) {
  const db = getDb();
  // At most once per minute to limit write volume (per 02-architecture.md).
  await db
    .from("sessions")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", sessionId);
}

export async function revokeSession(sessionId: string, reason: string, revokedBy?: string) {
  const db = getDb();
  await db
    .from("sessions")
    .update({ revoked_at: new Date().toISOString(), revoked_reason: reason, revoked_by: revokedBy ?? null })
    .eq("id", sessionId);
}

export async function revokeAllSessionsForUser(userId: string, reason: string, revokedBy?: string) {
  const db = getDb();
  await db
    .from("sessions")
    .update({ revoked_at: new Date().toISOString(), revoked_reason: reason, revoked_by: revokedBy ?? null })
    .eq("user_id", userId)
    .is("revoked_at", null);
}

export function isSessionExpired(session: SessionRecord, idleMinutes: number): boolean {
  if (session.revoked_at) return true;
  if (new Date(session.expires_at).getTime() < Date.now()) return true;
  const idleLimitMs = idleMinutes * 60 * 1000;
  if (Date.now() - new Date(session.last_active_at).getTime() > idleLimitMs) return true;
  return false;
}
