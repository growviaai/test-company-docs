import { getDb } from "../db/supabase.js";

/** Postgres-backed rate limit for login attempts, per 02-architecture.md
 * ("Rate limiting backed by Postgres") and 04-auth-and-sessions.md lockout rules. */
export async function tooManyFailedAttempts(email: string, ip: string | null): Promise<boolean> {
  const db = getDb();
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { count: byEmail } = await db
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .eq("success", false)
    .gte("created_at", since);

  if ((byEmail ?? 0) >= 10) return true;

  if (ip) {
    const { count: byIp } = await db
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .eq("success", false)
      .gte("created_at", since);
    if ((byIp ?? 0) >= 30) return true;
  }
  return false;
}

export async function recordLoginAttempt(email: string, ip: string | null, success: boolean) {
  const db = getDb();
  await db.from("login_attempts").insert({ email, ip, success });
}

/** Per 10-api-spec.md: "forgot-password 5 / hour" (per IP). Backed by
 * audit_logs (append-only, already written on every forgot-password call)
 * rather than a new table, per 02-architecture.md's "rate limiting backed
 * by Postgres" — no separate counter to keep in sync. */
export async function tooManyForgotPasswordAttempts(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  const db = getDb();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("action", "auth.password_reset_requested")
    .eq("ip", ip)
    .gte("created_at", since);
  return (count ?? 0) >= 5;
}
