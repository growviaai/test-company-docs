import { Hono } from "hono";
import { getDb, getAuthCheckClient } from "../db/supabase.js";
import { requireAuth } from "../middleware/session.js";
import { requireAdmin } from "../services/permissions.js";
import { writeAudit } from "../services/audit.js";
import { revokeAllSessionsForUser, revokeSession } from "../services/sessions.js";
import { randomToken, sha256 } from "../services/crypto.js";
import { inviteExpiryDate } from "../services/invites.js";
import { queueEmail, inviteEmail, resetPasswordEmail } from "../services/email.js";
import { createInviteSchema } from "../shared.js";
import { getEnv } from "../config/env.js";
import { z } from "zod";

export const adminRoutes = new Hono();

function assertAdmin(c: Parameters<typeof requireAuth>[0]) {
  const user = requireAuth(c);
  if (!requireAdmin(user)) {
    throw Object.assign(new Error("Admin only"), { status: 403, code: "forbidden" });
  }
  return user;
}

adminRoutes.get("/users", async (c) => {
  assertAdmin(c);
  const db = getDb();
  const { data, error } = await db
    .from("profiles")
    .select("id, email, full_name, role, status, last_login_at, created_at")
    .order("created_at", { ascending: true });
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return c.json({ data });
});

const roleSchema = z.object({ role: z.enum(["admin", "member"]) });

adminRoutes.patch("/users/:id/role", async (c) => {
  const actor = assertAdmin(c);
  const targetId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: { code: "validation_error", message: "Invalid role" } }, 400);

  const db = getDb();
  if (parsed.data.role === "member") {
    const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
    const { data: target } = await db.from("profiles").select("role").eq("id", targetId).maybeSingle();
    if (target?.role === "admin" && (count ?? 0) <= 1) {
      return c.json({ error: { code: "forbidden", message: "Cannot demote the last admin" } }, 400);
    }
  }

  const { data, error } = await db
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", targetId)
    .select("id, email, role")
    .single();
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  await writeAudit({ actorId: actor.id, actorEmail: actor.email, action: "user.role_change", targetType: "profile", targetId, metadata: { role: parsed.data.role } });
  return c.json({ data });
});

adminRoutes.post("/users/:id/deactivate", async (c) => {
  const actor = assertAdmin(c);
  const targetId = c.req.param("id");
  const db = getDb();
  const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin").eq("status", "active");
  const { data: target } = await db.from("profiles").select("role").eq("id", targetId).maybeSingle();
  if (target?.role === "admin" && (count ?? 0) <= 1) {
    return c.json({ error: { code: "forbidden", message: "Cannot deactivate the last admin" } }, 400);
  }
  await db.from("profiles").update({ status: "deactivated", deactivated_at: new Date().toISOString() }).eq("id", targetId);
  await revokeAllSessionsForUser(targetId, "deactivated", actor.id);
  await writeAudit({ actorId: actor.id, actorEmail: actor.email, action: "user.deactivate", targetType: "profile", targetId });
  return c.json({ data: { ok: true } });
});

adminRoutes.post("/users/:id/reactivate", async (c) => {
  const actor = assertAdmin(c);
  const targetId = c.req.param("id");
  const db = getDb();
  const { data: target } = await db.from("profiles").select("id, status").eq("id", targetId).maybeSingle();
  if (!target) return c.json({ error: { code: "not_found", message: "User not found" } }, 404);
  if (target.status !== "deactivated") {
    return c.json({ error: { code: "conflict", message: "User is not deactivated" } }, 409);
  }
  await db.from("profiles").update({ status: "active", deactivated_at: null }).eq("id", targetId);
  await writeAudit({ actorId: actor.id, actorEmail: actor.email, action: "user.reactivate", targetType: "profile", targetId });
  return c.json({ data: { ok: true } });
});

adminRoutes.delete("/users/:id", async (c) => {
  const actor = assertAdmin(c);
  const targetId = c.req.param("id");
  if (targetId === actor.id) {
    return c.json({ error: { code: "forbidden", message: "Cannot delete your own account" } }, 400);
  }
  const db = getDb();
  const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
  const { data: target } = await db.from("profiles").select("id, role, email").eq("id", targetId).maybeSingle();
  if (!target) return c.json({ error: { code: "not_found", message: "User not found" } }, 404);
  if (target.role === "admin" && (count ?? 0) <= 1) {
    return c.json({ error: { code: "forbidden", message: "Cannot delete the last admin" } }, 400);
  }

  // Deleting the auth.users row cascades to `profiles` (and from there to
  // sessions, invites sent by them, etc. — see 03-database-schema.md's `on
  // delete cascade` columns). Tables that record the user as a content
  // owner without cascade (pages.author_id, spaces.created_by, …) are
  // intentionally `on delete restrict`-by-default, so Postgres will reject
  // the delete with a foreign_key_violation if this user has created
  // content — surface that as a clear, actionable 409 rather than a 500.
  const authClient = getAuthCheckClient();
  const { error: deleteError } = await authClient.auth.admin.deleteUser(targetId);
  if (deleteError) {
    const isFkViolation = /foreign key|violates/i.test(deleteError.message);
    if (isFkViolation) {
      return c.json(
        {
          error: {
            code: "conflict",
            message: "This user has created spaces, pages, or other content and cannot be deleted. Deactivate them instead, or reassign their content first.",
          },
        },
        409,
      );
    }
    throw Object.assign(new Error(deleteError.message), { status: 500 });
  }

  await writeAudit({ actorId: actor.id, actorEmail: actor.email, action: "user.delete", targetType: "profile", targetId, metadata: { email: target.email } });
  return c.json({ data: { ok: true } });
});

adminRoutes.post("/users/:id/send-reset", async (c) => {
  const actor = assertAdmin(c);
  const targetId = c.req.param("id");
  const db = getDb();
  const { data: target } = await db.from("profiles").select("id, email, status").eq("id", targetId).maybeSingle();
  if (!target) return c.json({ error: { code: "not_found", message: "User not found" } }, 404);

  if (target.status === "active") {
    const rawToken = randomToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await db.from("password_resets").insert({ user_id: target.id, token_hash: sha256(rawToken), expires_at: expiresAt });
    const env = getEnv();
    const resetUrl = `${env.FRONTEND_URL}/reset-password/${rawToken}`;
    const { subject, html, text } = resetPasswordEmail(resetUrl);
    await queueEmail({ to: target.email as string, subject, html, text, kind: "password_reset" });
  }
  await writeAudit({ actorId: actor.id, actorEmail: actor.email, action: "auth.password_reset_requested", targetType: "profile", targetId });
  return c.json({ data: { ok: true } });
});

// --- Invites (04-auth-and-sessions.md §5, 10-api-spec.md §4) ---

adminRoutes.get("/invites", async (c) => {
  assertAdmin(c);
  const status = c.req.query("status"); // "pending" | "accepted" | "closed"
  const db = getDb();
  let query = db
    .from("invites")
    .select("id, email, role, space_ids, invited_by, expires_at, accepted_at, revoked_at, created_at")
    .order("created_at", { ascending: false });
  if (status === "pending") query = query.is("accepted_at", null).is("revoked_at", null);
  else if (status === "accepted") query = query.not("accepted_at", "is", null);
  else if (status === "closed") query = query.not("revoked_at", "is", null);
  const { data, error } = await query;
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return c.json({ data });
});

adminRoutes.post("/invites", async (c) => {
  const actor = assertAdmin(c);
  const body = await c.req.json().catch(() => null);
  const parsed = createInviteSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: { code: "validation_error", message: "Invalid invite" } }, 400);

  const email = parsed.data.email.trim().toLowerCase();
  const db = getDb();

  const { data: existingProfile } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existingProfile) {
    return c.json({ error: { code: "conflict", message: "A user with this email already exists" } }, 409);
  }
  const { data: existingInvite } = await db
    .from("invites")
    .select("id")
    .eq("email", email)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .maybeSingle();
  if (existingInvite) {
    return c.json({ error: { code: "conflict", message: "An open invite for this email already exists. Resend it instead." } }, 409);
  }

  const rawToken = randomToken(32);
  const expiresAt = inviteExpiryDate(parsed.data.expiresIn).toISOString();
  const { data: invite, error } = await db
    .from("invites")
    .insert({
      email,
      role: parsed.data.role,
      token_hash: sha256(rawToken),
      space_ids: parsed.data.spaceIds ?? [],
      invited_by: actor.id,
      expires_at: expiresAt,
    })
    .select("id, email, role, expires_at")
    .single();
  if (error) throw Object.assign(new Error(error.message), { status: 500 });

  const env = getEnv();
  const acceptUrl = `${env.FRONTEND_URL}/invite/${rawToken}`;
  const { subject, html, text } = inviteEmail(acceptUrl, parsed.data.role);
  await queueEmail({ to: email, subject, html, text, kind: "invite" });
  await writeAudit({ actorId: actor.id, actorEmail: actor.email, action: "invite.created", targetType: "invite", targetId: invite.id as string, metadata: { email } });

  // ASSUMPTION / flagged deviation: 04-auth-and-sessions.md says the raw
  // token is shown "only in the email, never returned by the API". Real
  // SMTP delivery is not implemented yet (see services/email.ts) — the
  // email is only queued in `email_outbox`, not actually sent — so
  // returning the accept link here to the *admin who just created this
  // invite* is the only way it can reach the invitee at all right now.
  // The admin already has full user-management power in this system; this
  // does not expose the token to anyone else. Remove this field once real
  // email delivery exists.
  return c.json({ data: { ...invite, acceptUrl } }, 201);
});

adminRoutes.post("/invites/:id/resend", async (c) => {
  const actor = assertAdmin(c);
  const id = c.req.param("id");
  const db = getDb();
  const { data: invite } = await db.from("invites").select("id, email, role, accepted_at, revoked_at").eq("id", id).maybeSingle();
  if (!invite || invite.accepted_at || invite.revoked_at) {
    return c.json({ error: { code: "not_found", message: "Invite not found" } }, 404);
  }

  const rawToken = randomToken(32);
  const expiresAt = inviteExpiryDate("72h").toISOString();
  const { data: updated, error } = await db
    .from("invites")
    .update({ token_hash: sha256(rawToken), expires_at: expiresAt })
    .eq("id", id)
    .select("id, email, role, expires_at")
    .single();
  if (error) throw Object.assign(new Error(error.message), { status: 500 });

  const env = getEnv();
  const acceptUrl = `${env.FRONTEND_URL}/invite/${rawToken}`;
  const { subject, html, text } = inviteEmail(acceptUrl, invite.role as string);
  await queueEmail({ to: invite.email as string, subject, html, text, kind: "invite" });
  await writeAudit({ actorId: actor.id, actorEmail: actor.email, action: "invite.resent", targetType: "invite", targetId: id });

  return c.json({ data: { ...updated, acceptUrl } });
});

adminRoutes.delete("/invites/:id", async (c) => {
  const actor = assertAdmin(c);
  const id = c.req.param("id");
  const db = getDb();
  const { data: invite } = await db.from("invites").select("id, accepted_at, revoked_at").eq("id", id).maybeSingle();
  if (!invite || invite.accepted_at || invite.revoked_at) {
    return c.json({ error: { code: "not_found", message: "Invite not found" } }, 404);
  }
  await db.from("invites").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  await writeAudit({ actorId: actor.id, actorEmail: actor.email, action: "invite.revoked", targetType: "invite", targetId: id });
  return c.json({ data: { ok: true } });
});

// --- Admin sessions (06-admin-panel.md §4, 04-auth-and-sessions.md §8) ---

adminRoutes.get("/sessions", async (c) => {
  assertAdmin(c);
  const db = getDb();
  const { data, error } = await db
    .from("sessions")
    // sessions has two FKs to profiles (user_id, revoked_by) — PostgREST
    // can't auto-pick one for an implicit embed ("more than one
    // relationship was found"), so disambiguate by column name.
    .select("id, ip, user_agent, created_at, last_active_at, expires_at, user:profiles!sessions_user_id_fkey(id, email, full_name)")
    .is("revoked_at", null)
    .order("last_active_at", { ascending: false });
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return c.json({ data });
});

adminRoutes.delete("/sessions/:id", async (c) => {
  const actor = assertAdmin(c);
  const id = c.req.param("id");
  await revokeSession(id, "admin", actor.id);
  await writeAudit({ actorId: actor.id, actorEmail: actor.email, action: "session.terminated", targetType: "session", targetId: id });
  return c.json({ data: { ok: true } });
});

adminRoutes.delete("/users/:id/sessions", async (c) => {
  const actor = assertAdmin(c);
  const targetId = c.req.param("id");
  await revokeAllSessionsForUser(targetId, "admin", actor.id);
  await writeAudit({ actorId: actor.id, actorEmail: actor.email, action: "session.terminated_all", targetType: "profile", targetId });
  return c.json({ data: { ok: true } });
});

adminRoutes.get("/audit-logs", async (c) => {
  assertAdmin(c);
  const db = getDb();
  const { data, error } = await db
    .from("audit_logs")
    .select("id, actor_email, action, target_type, target_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return c.json({ data });
});
