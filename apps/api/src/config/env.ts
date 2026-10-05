import { z } from "zod";

const schema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SESSION_COOKIE_NAME: z.string().default("tcd_session"),
  SESSION_IDLE_MINUTES: z.coerce.number().default(30),
  SESSION_ABSOLUTE_HOURS: z.coerce.number().default(12),
  CORS_ORIGIN: z.string().default("*"),
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
