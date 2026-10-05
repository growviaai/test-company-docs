import { Hono } from "hono";
import { getDb } from "../db/supabase.js";
import { requireAuth } from "../middleware/session.js";
import { accessibleSpaceIds } from "../services/permissions.js";

export const searchRoutes = new Hono();

searchRoutes.get("/", async (c) => {
  const user = requireAuth(c);
  const q = c.req.query("q");
  if (!q || q.trim().length === 0) return c.json({ data: [] });
  const ids = await accessibleSpaceIds(user);
  if (ids.length === 0) return c.json({ data: [] });
  const db = getDb();
  const { data, error } = await db.rpc("search_pages", { q, accessible_space_ids: ids, lim: 20 });
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return c.json({ data });
});
