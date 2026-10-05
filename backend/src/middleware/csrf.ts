import type { MiddlewareHandler } from "hono";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Double-submit CSRF check: the session's csrf_token (set server-side,
 * readable by the session middleware only) must match the X-CSRF-Token
 * header on every state-changing request, per 04-auth-and-sessions.md. */
export const csrfMiddleware: MiddlewareHandler = async (c, next) => {
  if (SAFE_METHODS.has(c.req.method)) return next();

  const user = c.get("user");
  if (!user) return next(); // let auth checks report 401 first

  const expected = c.get("csrfToken");
  const provided = c.req.header("x-csrf-token");
  if (!expected || !provided || provided !== expected) {
    return c.json({ error: { code: "forbidden", message: "Invalid CSRF token" } }, 403);
  }
  await next();
};
