import { Hono } from "hono";
import { requireAuth } from "../middleware/session.js";
import { getDb, getAuthCheckClient } from "../db/supabase.js";
import { revokeSession } from "../services/sessions.js";
import { writeAudit } from "../services/audit.js";
import { changePasswordSchema, validatePassword } from "../shared.js";

export const meRoutes = new Hono();

meRoutes.get("/", (c) => {
  const user = requireAuth(c);
  return c.json({ data: { id: user.id, email: user.email, role: user.role }, csrfToken: c.get("csrfToken") });
});

// Per 04-auth-and-sessions.md §7: verify the current password, apply the
// same password rules as everywhere else, then keep only this session.
meRoutes.post("/password", async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "validation_error", message: "Invalid request" } }, 400);
  }

  const authClient = getAuthCheckClient();
  const { error: signInError } = await authClient.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (signInError) {
    return c.json({ error: { code: "unauthenticated", message: "Current password is incorrect" } }, 401);
  }

  const passwordCheck = validatePassword(parsed.data.newPassword, user.email);
  if (!passwordCheck.ok) {
    return c.json({ error: { code: "validation_error", message: passwordCheck.error } }, 400);
  }

  const updateClient = getAuthCheckClient();
  const { error: updateError } = await updateClient.auth.admin.updateUserById(user.id, {
    password: parsed.data.newPassword,
  });
  if (updateError) {
    throw Object.assign(new Error(updateError.message), { status: 500 });
  }

  const db = getDb();
  const currentSessionId = c.get("sessionId");
  const { data: others } = await db
    .from("sessions")
    .select("id")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .neq("id", currentSessionId ?? "");
  for (const row of others ?? []) {
    await revokeSession((row as { id: string }).id, "password_changed");
  }

  await writeAudit({ actorId: user.id, actorEmail: user.email, action: "auth.password_changed" });
  return c.json({ data: { ok: true } });
});

// Per 04-auth-and-sessions.md §8: "Users can also end their own other
// sessions from /settings/security."
meRoutes.get("/sessions", async (c) => {
  const user = requireAuth(c);
  const db = getDb();
  const { data, error } = await db
    .from("sessions")
    .select("id, ip, user_agent, created_at, last_active_at, expires_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("last_active_at", { ascending: false });
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  const currentSessionId = c.get("sessionId");
  return c.json({ data: (data ?? []).map((s) => ({ ...s, isCurrent: s.id === currentSessionId })) });
});

meRoutes.delete("/sessions/:id", async (c) => {
  const user = requireAuth(c);
  const id = c.req.param("id");
  const db = getDb();
  const { data: session } = await db.from("sessions").select("id, user_id").eq("id", id).maybeSingle();
  if (!session || session.user_id !== user.id) {
    return c.json({ error: { code: "not_found", message: "Session not found" } }, 404);
  }
  await revokeSession(id, "self");
  await writeAudit({ actorId: user.id, actorEmail: user.email, action: "session.terminated", targetType: "session", targetId: id });
  return c.json({ data: { ok: true } });
});
