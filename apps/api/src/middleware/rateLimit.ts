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
