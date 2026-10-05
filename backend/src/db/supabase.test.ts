import { describe, expect, it } from "vitest";
import { getDb, getAuthCheckClient } from "./supabase.js";

// Regression test for a production incident: auth.ts used to call
// `db.auth.signInWithPassword` on the shared, cached `getDb()` client.
// supabase-js rewrites a client's PostgREST Authorization header to the
// signed-in user's token the moment sign-in succeeds on that client, so
// every later `.from(...)` call on the SAME instance (including on later,
// unrelated requests, since this client is a warm-Lambda singleton) was
// silently downgraded from the service role to the "authenticated" role,
// which has no table grants — causing "permission denied for table
// sessions" on session creation right after a successful password check.
//
// The fix is structural: password verification must run on a client that
// is never reused for anything else. These tests pin that structure down.
describe("Supabase client wiring", () => {
  process.env.SUPABASE_URL ??= "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= "x".repeat(40);

  it("getDb() returns the same cached singleton on every call", () => {
    expect(getDb()).toBe(getDb());
  });

  it("getAuthCheckClient() never returns the getDb() singleton", () => {
    expect(getAuthCheckClient()).not.toBe(getDb());
  });

  it("getAuthCheckClient() returns a fresh instance on every call, so a signInWithPassword mutation on one call can never leak into another", () => {
    expect(getAuthCheckClient()).not.toBe(getAuthCheckClient());
  });
});
