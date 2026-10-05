import { Hono } from "hono";
import { getDb } from "../db/supabase.js";
import { requireAuth } from "../middleware/session.js";
import { accessibleSpaceIds, requireAdmin } from "../services/permissions.js";
import { createSpaceSchema } from "../shared.js";
import { writeAudit } from "../services/audit.js";

export const spaceRoutes = new Hono();

spaceRoutes.get("/", async (c) => {
  const user = requireAuth(c);
  const ids = await accessibleSpaceIds(user);
  if (ids.length === 0) return c.json({ data: [] });
  const db = getDb();
  const { data, error } = await db
    .from("spaces")
    .select("id, slug, name, description, emoji, visibility, position, archived_at")
    .in("id", ids)
    .is("archived_at", null)
    .order("position", { ascending: true });
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return c.json({ data });
});

spaceRoutes.post("/", async (c) => {
  const user = requireAuth(c);
  if (!requireAdmin(user)) {
    return c.json({ error: { code: "forbidden", message: "Admin only" } }, 403);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = createSpaceSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "validation_error", message: "Invalid space" } }, 400);
  }
  const db = getDb();
  const { data, error } = await db
    .from("spaces")
    .insert({ ...parsed.data, created_by: user.id })
    .select("id, slug, name, description, emoji, visibility, position")
    .single();
  if (error) {
    const dup = error.code === "23505";
    return c.json(
      { error: { code: dup ? "validation_error" : "server_error", message: dup ? "Slug already in use" : "Could not create space" } },
      dup ? 400 : 500
    );
  }
  await writeAudit({ actorId: user.id, actorEmail: user.email, action: "space.create", targetType: "space", targetId: data.id as string });
  return c.json({ data }, 201);
});
