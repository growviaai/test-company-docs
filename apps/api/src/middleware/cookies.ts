import { getEnv } from "../config/env.js";

/**
 * Session cookie attributes.
 *
 * Deviation from 04-auth-and-sessions.md: the spec's default is
 * `SameSite=Lax` because frontend and API share one registrable domain.
 * Here the frontend is on GitHub Pages (*.github.io) and the API is on
 * Vercel (*.vercel.app) — different base domains — so a Lax or Strict
 * cookie would never be sent on cross-origin fetches. We use
 * `SameSite=None; Secure` instead, which requires HTTPS (satisfied by
 * both GitHub Pages and Vercel) and explicit CORS allow-listing of the
 * exact frontend origin (see middleware/security.ts).
 */
export function sessionCookieAttrs(maxAgeSeconds: number): string {
  const env = getEnv();
  const secure = env.NODE_ENV === "production" ? "Secure; " : "";
  return `Path=/; HttpOnly; ${secure}SameSite=None; Max-Age=${maxAgeSeconds}`;
}

export function clearedSessionCookieAttrs(): string {
  const env = getEnv();
  const secure = env.NODE_ENV === "production" ? "Secure; " : "";
  return `Path=/; HttpOnly; ${secure}SameSite=None; Max-Age=0`;
}

export function parseCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}
