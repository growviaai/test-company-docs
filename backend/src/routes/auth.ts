import { Hono } from "hono";
import { getDb, getAuthCheckClient } from "../db/supabase.js";
import { createSession, revokeSession, revokeAllSessionsForUser } from "../services/sessions.js";
import { sessionCookieAttrs, clearedSessionCookieAttrs } from "../middleware/cookies.js";
import { tooManyFailedAttempts, recordLoginAttempt, tooManyForgotPasswordAttempts } from "../middleware/rateLimit.js";
import { writeAudit } from "../services/audit.js";
import { signInSchema, forgotPasswordSchema, resetPasswordSchema, validatePassword } from "../shared.js";
import { getEnv } from "../config/env.js";
import { randomToken, sha256 } from "../services/crypto.js";
import { queueEmail, resetPasswordEmail } from "../services/email.js";

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

  // Verify the password against Supabase Auth. Deliberately uses a
  // dedicated, never-cached client (see the warning on db/supabase.ts's
  // getDb()) rather than the shared `db` instance above: calling
  // signInWithPassword on a client silently swaps its Authorization header
  // from the service role to the signed-in user for every later request on
  // that same instance, which would have downgraded the shared singleton
  // for the rest of this warm Lambda.
  const authClient = getAuthCheckClient();
  const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
    email,
    password,
  });
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

// Per 04-auth-and-sessions.md §6 [ASSUMPTION]: always 204, whatever the
// email, so a caller can never tell whether an address has an account
// (RULES.md §2.11: no account enumeration).
authRoutes.post("/forgot-password", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  if (!parsed.success) return c.body(null, 204);
  if (await tooManyForgotPasswordAttempts(ip)) return c.body(null, 204);

  const email = parsed.data.email.trim().toLowerCase();
  const db = getDb();
  const { data: profile } = await db
    .from("profiles")
    .select("id, email, status")
    .eq("email", email)
    .maybeSingle();

  // Audited (and so rate-limited) even for an unknown email, with no actor —
  // otherwise an attacker could tell known emails apart by the absence of
  // this row, defeating the point of always returning 204.
  await writeAudit({ actorId: null, actorEmail: email, action: "auth.password_reset_requested", ip });

  if (profile && profile.status === "active") {
    const rawToken = randomToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await db.from("password_resets").insert({ user_id: profile.id, token_hash: sha256(rawToken), expires_at: expiresAt });

    const env = getEnv();
    const resetUrl = `${env.FRONTEND_URL}/reset-password/${rawToken}`;
    const { subject, html, text } = resetPasswordEmail(resetUrl);
    await queueEmail({ to: profile.email as string, subject, html, text, kind: "password_reset" });
  }

  return c.body(null, 204);
});

authRoutes.post("/reset-password", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "validation_error", message: "Invalid request" } }, 400);
  }

  const db = getDb();
  const { data: reset } = await db
    .from("password_resets")
    .select("id, user_id, expires_at, used_at")
    .eq("token_hash", sha256(parsed.data.token))
    .maybeSingle();

  const invalid = !reset || reset.used_at || new Date(reset.expires_at as string).getTime() < Date.now();
  if (invalid) {
    return c.json({ error: { code: "not_found", message: "This reset link is invalid or has expired." } }, 404);
  }

  const { data: profile } = await db.from("profiles").select("id, email").eq("id", reset.user_id).maybeSingle();
  if (!profile) {
    return c.json({ error: { code: "not_found", message: "This reset link is invalid or has expired." } }, 404);
  }

  const passwordCheck = validatePassword(parsed.data.password, profile.email as string);
  if (!passwordCheck.ok) {
    return c.json({ error: { code: "validation_error", message: passwordCheck.error } }, 400);
  }

  const authClient = getAuthCheckClient();
  const { error: updateError } = await authClient.auth.admin.updateUserById(profile.id as string, {
    password: parsed.data.password,
  });
  if (updateError) {
    throw Object.assign(new Error(updateError.message), { status: 500 });
  }

  await db.from("password_resets").update({ used_at: new Date().toISOString() }).eq("id", reset.id);
  await revokeAllSessionsForUser(profile.id as string, "password_reset");
  await writeAudit({ actorId: profile.id as string, actorEmail: profile.email as string, action: "auth.password_reset" });

  return c.body(null, 204);
});

authRoutes.post("/sign-out", async (c) => {
  const sessionId = c.get("sessionId");
  const env = getEnv();
  if (sessionId) await revokeSession(sessionId, "logout");
  c.header("Set-Cookie", `${env.SESSION_COOKIE_NAME}=; ${clearedSessionCookieAttrs()}`);
  return c.json({ data: { ok: true } });
});
