import type { MiddlewareHandler } from "hono";
import { getEnv } from "../config/env.js";
import { parseCookie, clearedSessionCookieAttrs } from "./cookies.js";
import { loadSessionByRawToken, touchSession, isSessionExpired, revokeSession } from "../services/sessions.js";
import { getDb } from "../db/supabase.js";
import type { AuthedUser } from "../services/permissions.js";

declare module "hono" {
  interface ContextVariableMap {
    user: AuthedUser | null;
    sessionId: string | null;
    csrfToken: string | null;
  }
}

/** Loads the session (if any), enforces idle/absolute expiry and the
 * user's active status, and attaches `user`/`sessionId` to context.
 * Does NOT itself reject unauthenticated requests — routes decide that,
 * so public endpoints (sign-in) can share the pipeline. */
export const sessionMiddleware: MiddlewareHandler = async (c, next) => {
  const env = getEnv();
  const cookieHeader = c.req.header("cookie");
  const raw = parseCookie(cookieHeader, env.SESSION_COOKIE_NAME);

  c.set("user", null);
  c.set("sessionId", null);
  c.set("csrfToken", null);

  if (raw) {
    const session = await loadSessionByRawToken(raw);
    if (session && !isSessionExpired(session, env.SESSION_IDLE_MINUTES)) {
      const db = getDb();
      const { data: profile } = await db
        .from("profiles")
        .select("id, email, role, status")
        .eq("id", session.user_id)
        .maybeSingle();

      if (profile && profile.status === "active") {
        c.set("user", profile as AuthedUser);
        c.set("sessionId", session.id);
        c.set("csrfToken", session.csrf_token);
        await touchSession(session.id);
      } else if (profile && profile.status !== "active") {
        await revokeSession(session.id, "deactivated");
      }
    } else if (session && session.revoked_at === null) {
      // Expired by idle/absolute timeout — revoke it for bookkeeping.
      await revokeSession(session.id, "idle");
    }

    if (!c.get("user")) {
      c.header("Set-Cookie", `${env.SESSION_COOKIE_NAME}=; ${clearedSessionCookieAttrs()}`);
    }
  }

  await next();
};

export function requireAuth(c: { get: (k: "user") => AuthedUser | null }): AuthedUser {
  const user = c.get("user");
  if (!user) {
    throw Object.assign(new Error("unauthenticated"), { status: 401, code: "unauthenticated" });
  }
  return user;
}
