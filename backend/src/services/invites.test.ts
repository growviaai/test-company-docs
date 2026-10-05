import { describe, expect, it } from "vitest";
import { inviteExpiryDate } from "./invites.js";

describe("inviteExpiryDate", () => {
  it("24h is about 24 hours from now", () => {
    const ms = inviteExpiryDate("24h").getTime() - Date.now();
    expect(ms).toBeGreaterThan(23.9 * 60 * 60 * 1000);
    expect(ms).toBeLessThan(24.1 * 60 * 60 * 1000);
  });

  it("72h is the default-sized window and is longer than 24h", () => {
    expect(inviteExpiryDate("72h").getTime()).toBeGreaterThan(inviteExpiryDate("24h").getTime());
  });

  it("7d is longer than 72h", () => {
    expect(inviteExpiryDate("7d").getTime()).toBeGreaterThan(inviteExpiryDate("72h").getTime());
  });
});
