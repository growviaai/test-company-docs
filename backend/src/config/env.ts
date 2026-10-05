import { z } from "zod";

const schema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SESSION_COOKIE_NAME: z.string().default("tcd_session"),
  SESSION_IDLE_MINUTES: z.coerce.number().default(30),
  SESSION_ABSOLUTE_HOURS: z.coerce.number().default(12),
  CORS_ORIGIN: z.string().default("*"),
  // Base URL the frontend is actually served from — used only to build
  // invite/reset links in emails. Distinct from CORS_ORIGIN, which must
  // stay an exact origin for the CORS check in middleware/security.ts.
  FRONTEND_URL: z.string().url().default("https://test-company-docs.twobot2026.workers.dev"),
  NODE_ENV: z.string().default("production"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Fail loudly but never leak secret values.
    throw new Error(
      "Invalid environment configuration: " +
        parsed.error.issues.map((i) => i.path.join(".")).join(", ")
    );
  }
  cached = parsed.data;
  return cached;
}
