import { describe, it, expect } from "vitest";
import { isSessionExpired } from "./sessions.js";

describe("isSessionExpired", () => {
  const base = {
    id: "s1",
    user_id: "u1",
    csrf_token: "t",
    revoked_at: null as string | null,
  };

  it("is expired when revoked", () => {
    expect(
      isSessionExpired(
        { ...base, revoked_at: new Date().toISOString(), expires_at: new Date(Date.now() + 10000).toISOString(), last_active_at: new Date().toISOString() },
        30
      )
    ).toBe(true);
  });

  it("is expired past absolute limit", () => {
    expect(
      isSessionExpired(
        { ...base, expires_at: new Date(Date.now() - 1000).toISOString(), last_active_at: new Date().toISOString() },
        30
      )
    ).toBe(true);
  });

  it("is expired past idle limit", () => {
    expect(
      isSessionExpired(
        {
          ...base,
          expires_at: new Date(Date.now() + 3600_000).toISOString(),
          last_active_at: new Date(Date.now() - 31 * 60_000).toISOString(),
        },
        30
      )
    ).toBe(true);
  });

  it("is valid within limits", () => {
    expect(
      isSessionExpired(
        {
          ...base,
          expires_at: new Date(Date.now() + 3600_000).toISOString(),
          last_active_at: new Date().toISOString(),
        },
        30
      )
    ).toBe(false);
  });
});
