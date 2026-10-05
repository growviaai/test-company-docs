import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "../config/env.js";
import type { Database } from "./types.js";

let client: SupabaseClient<Database> | undefined;

/** Server-only Supabase client using the service role key.
 * Never import this module from frontend code. */
export function getDb(): SupabaseClient<Database> {
  if (client) return client;
  const env = getEnv();
  client = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
