import { Hono } from "hono";
import { getDb } from "../db/supabase.js";
import { requireAuth } from "../middleware/session.js";
import { requireAdmin } from "../services/permissions.js";
import { writeAudit } from "../services/audit.js";
import { revokeAllSessionsForUser } from "../services/sessions.js";
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
