import { Hono } from "hono";
import { requireAuth } from "../middleware/session.js";

export const meRoutes = new Hono();

meRoutes.get("/", (c) => {
  const user = requireAuth(c);
  return c.json({ data: { id: user.id, email: user.email, role: user.role }, csrfToken: c.get("csrfToken") });
});
