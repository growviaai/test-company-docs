import { Hono } from "hono";
import { getDb, getAuthCheckClient } from "../db/supabase.js";
import { sha256 } from "../services/crypto.js";
import { createSession } from "../services/sessions.js";
import { sessionCookieAttrs } from "../middleware/cookies.js";
import { writeAudit } from "../services/audit.js";
import { getEnv } from "../config/env.js";
import { acceptInviteSchema, validatePassword } from "../shared.js";

export const inviteRoutes = new Hono();

const GENERIC_NOT_FOUND = { error: { code: "not_found", message: "This invite link is invalid or has expired." } } as const;

interface OpenInvite {
  id: string;
  email: string;
  role: "admin" | "member";
  space_ids: string[];
  expires_at: string;
}

/** Looks up a still-open (not accepted/revoked/expired) invite by its raw
 * token. Per 04-auth-and-sessions.md §5: invalid, accepted, revoked, and
 * expired all return the same generic 404 — never reveal which. */
async function loadOpenInvite(rawToken: string): Promise<OpenInvite | null> {
  const db = getDb();
  const { data } = await db
    .from("invites")
    .select("id, email, role, space_ids, expires_at, accepted_at, revoked_at")
    .eq("token_hash", sha256(rawToken))
    .maybeSingle();
  if (!data) return null;
  if (data.accepted_at || data.revoked_at) return null;
  if (new Date(data.expires_at as string).getTime() < Date.now()) return null;
  return data as unknown as OpenInvite;
}

inviteRoutes.get("/:token", async (c) => {
  const invite = await loadOpenInvite(c.req.param("token"));
  if (!invite) return c.json(GENERIC_NOT_FOUND, 404);
  return c.json({ data: { email: invite.email, role: invite.role, expiresAt: invite.expires_at } });
});

inviteRoutes.post("/:token/accept", async (c) => {
  const rawToken = c.req.param("token");
  const invite = await loadOpenInvite(rawToken);
  if (!invite) return c.json(GENERIC_NOT_FOUND, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = acceptInviteSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "validation_error", message: "Invalid name or password" } }, 400);
  }

  const passwordCheck = validatePassword(parsed.data.password, invite.email);
  if (!passwordCheck.ok) {
    return c.json({ error: { code: "validation_error", message: passwordCheck.error } }, 400);
  }

  const db = getDb();
  const authClient = getAuthCheckClient();
  const { data: created, error: createError } = await authClient.auth.admin.createUser({
    email: invite.email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (createError || !created?.user) {
    return c.json({ error: { code: "validation_error", message: "Could not create your account" } }, 400);
  }

  const { error: profileError } = await db.from("profiles").insert({
    id: created.user.id,
    email: invite.email,
    full_name: parsed.data.fullName,
    role: invite.role,
    status: "active",
  });
  if (profileError) {
    throw Object.assign(new Error(profileError.message), { status: 500 });
  }

  if (invite.space_ids && invite.space_ids.length > 0) {
    const { data: stillRestricted } = await db
      .from("spaces")
      .select("id")
      .in("id", invite.space_ids)
      .eq("visibility", "restricted")
      .is("archived_at", null);
    const rows = (stillRestricted ?? []).map((s: { id: string }) => ({
      space_id: s.id,
      user_id: created.user.id,
      added_by: created.user.id,
    }));
    if (rows.length > 0) await db.from("space_members").insert(rows);
  }

  await db.from("invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);

  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = c.req.header("user-agent") ?? null;
  const { rawToken: sessionToken } = await createSession({ userId: created.user.id, ip, userAgent });
  const env = getEnv();
  c.header("Set-Cookie", `${env.SESSION_COOKIE_NAME}=${sessionToken}; ${sessionCookieAttrs(env.SESSION_ABSOLUTE_HOURS * 3600)}`);

  await writeAudit({ actorId: created.user.id, actorEmail: invite.email, action: "invite.accepted", targetType: "invite", targetId: invite.id, ip });

  return c.json({ data: { id: created.user.id, email: invite.email, role: invite.role } }, 201);
});
