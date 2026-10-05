import type { MiddlewareHandler } from "hono";
import { getEnv } from "../config/env.js";

/** Security headers per 12-security.md. */
export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  c.header(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'"
  );
  c.header("Cross-Origin-Resource-Policy", "same-origin");
};

/**
 * CORS: frontend (GitHub Pages) and backend (Vercel) are on different
 * registrable domains. The spec's default is a same-domain `SameSite=Lax`
 * cookie; since that is not possible here, we explicitly echo the exact
 * configured frontend origin with credentials allowed, which is required
 * for a `SameSite=None; Secure` cross-site cookie to be sent/received at all.
 * This is a deliberate, documented deviation from 02-architecture.md section 5.
 */
export const cors: MiddlewareHandler = async (c, next) => {
  const env = getEnv();
  const origin = c.req.header("origin");
  if (origin && env.CORS_ORIGIN !== "*" && origin === env.CORS_ORIGIN) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Vary", "Origin");
  }
  c.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type,X-CSRF-Token");
  if (c.req.method === "OPTIONS") {
    return c.body(null, 204);
  }
  await next();
};
