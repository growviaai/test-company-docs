import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { cors, securityHeaders } from "./middleware/security.js";
import { sessionMiddleware } from "./middleware/session.js";
import { csrfMiddleware } from "./middleware/csrf.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRoutes } from "./routes/auth.js";
import { meRoutes } from "./routes/me.js";
import { adminRoutes } from "./routes/admin.js";
import { spaceRoutes } from "./routes/spaces.js";
import { pageRoutes } from "./routes/pages.js";
import { searchRoutes } from "./routes/search.js";
import { inviteRoutes } from "./routes/invites.js";

export function buildApp() {
  const app = new Hono();

  app.onError(errorHandler);
  app.use("*", requestId());
  app.use("*", securityHeaders);
  app.use("*", cors);
  app.use("*", sessionMiddleware);
  app.use("*", csrfMiddleware);

  app.get("/health", (c) => c.json({ data: { ok: true } }));

  app.route("/auth", authRoutes);
  app.route("/me", meRoutes);
  app.route("/admin", adminRoutes);
  app.route("/spaces", spaceRoutes);
  app.route("/pages", pageRoutes);
  app.route("/search", searchRoutes);
  app.route("/invites", inviteRoutes);

  return app;
}
