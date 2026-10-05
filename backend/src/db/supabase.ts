import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "../config/env.js";
import type { Database } from "./types.js";

let client: SupabaseClient<Database> | undefined;

/** Server-only Supabase client using the service role key.
 * Never import this module from frontend code.
 *
 * IMPORTANT: never call `.auth.signInWithPassword` (or any other
 * session-establishing auth method) on the client returned by this
 * function. supabase-js wires a client's internal auth state into the
 * Authorization header its PostgREST (`.from(...)`) calls use: the moment
 * `signInWithPassword` succeeds on a client, every later `.from(...)` call
 * on that SAME client instance is sent as the signed-in user ("authenticated"
 * role) instead of the service role, even though it was constructed with the
 * service role key. Because this client is cached (singleton, for warm
 * Lambda reuse), that downgrade would silently persist across unrelated
 * requests on the same warm instance. The same risk applies to any other
 * `.auth.*` call that touches session state, including the Admin API
 * (`auth.admin.createUser`, `updateUserById`, …) used by the invite-accept
 * and password-reset flows — use `getAuthCheckClient()` below for every
 * one-off `.auth.*` call instead: a fresh, never-cached, never-reused
 * client whose auth-state mutation cannot leak anywhere else. */
export function getDb(): SupabaseClient<Database> {
  if (client) return client;
  const env = getEnv();
  client = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** A throwaway Supabase client for any one-off call under `.auth.*` —
 * `signInWithPassword` for sign-in, or an Admin API call
 * (`auth.admin.createUser`/`updateUserById`/`deleteUser`) for invite
 * acceptance and password reset — deliberately NOT the cached `getDb()`
 * client (see the warning on `getDb` above). A fresh instance is created
 * on every call and discarded immediately after use, so its auth-state
 * mutation can never bleed into `getDb()`'s PostgREST calls or into any
 * other request. */
export function getAuthCheckClient(): SupabaseClient<Database> {
  const env = getEnv();
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
