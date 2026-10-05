import { Hono } from "hono";
import { getDb } from "../db/supabase.js";
import { createSession, revokeSession } from "../services/sessions.js";
import { sessionCookieAttrs, clearedSessionCookieAttrs } from "../middleware/cookies.js";
import { tooManyFailedAttempts, recordLoginAttempt } from "../middleware/rateLimit.js";
import { writeAudit } from "../services/audit.js";
import { signInSchema } from "../shared.js";
import { getEnv } from "../config/env.js";

export const authRoutes = new Hono();

authRoutes.post("/sign-in", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = signInSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "validation_error", message: "Invalid email or password" } }, 400);
  }
  const { email, password } = parsed.data;
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  if (await tooManyFailedAttempts(email, ip)) {
    return c.json({ error: { code: "rate_limited", message: "Too many attempts. Try again later." } }, 429);
  }

  const db = getDb();
  const { data: profile } = await db
    .from("profiles")
    .select("id, email, role, status, locked_until, failed_login_count")
    .eq("email", email)
    .maybeSingle();

  if (profile?.locked_until && new Date(profile.locked_until as string).getTime() > Date.now()) {
    return c.json({ error: { code: "account_locked", message: "Account temporarily locked." } }, 423);
  }

  // Verify the password against Supabase Auth using the service role key
  // (per 02-architecture.md: "Supabase Auth for password checks" from the API only).
  const { data: signInData, error: signInError } = await db.auth.signInWithPassword({ email, password });
  const ok = !signInError && !!signInData?.user;

  await recordLoginAttempt(email, ip, ok);

  if (!ok || !profile) {
    if (profile) {
      const nextCount = (profile.failed_login_count ?? 0) + 1;
      const lockedUntil = nextCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
      await db
        .from("profiles")
        .update({ failed_login_count: nextCount, locked_until: lockedUntil })
        .eq("id", profile.id);
    }
    await writeAudit({ actorId: null, actorEmail: email, action: "auth.sign_in_failed", ip });
    return c.json({ error: { code: "unauthenticated", message: "Invalid email or password" } }, 401);
  }

  if (profile.status !== "active") {
    return c.json({ error: { code: "forbidden", message: "Account is deactivated" } }, 403);
  }

  await db
    .from("profiles")
    .update({ failed_login_count: 0, locked_until: null, last_login_at: new Date().toISOString() })
    .eq("id", profile.id);

  const userAgent = c.req.header("user-agent") ?? null;
  const { rawToken } = await createSession({ userId: profile.id, ip, userAgent });
  const env = getEnv();

  c.header(
    "Set-Cookie",
    `${env.SESSION_COOKIE_NAME}=${rawToken}; ${sessionCookieAttrs(env.SESSION_ABSOLUTE_HOURS * 3600)}`
  );
  await writeAudit({ actorId: profile.id, actorEmail: profile.email as string, action: "auth.sign_in", ip });

  return c.json({ data: { id: profile.id, email: profile.email, role: profile.role } });
});

authRoutes.post("/sign-out", async (c) => {
  const sessionId = c.get("sessionId");
  const env = getEnv();
  if (sessionId) await revokeSession(sessionId, "logout");
  c.header("Set-Cookie", `${env.SESSION_COOKIE_NAME}=; ${clearedSessionCookieAttrs()}`);
  return c.json({ data: { ok: true } });
});
