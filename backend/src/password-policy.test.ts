import { describe, expect, it } from "vitest";
import { validatePassword, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "./password-policy.js";

describe("validatePassword", () => {
  it("rejects a password shorter than the minimum", () => {
    const result = validatePassword("a".repeat(MIN_PASSWORD_LENGTH - 1), "person@example.com");
    expect(result.ok).toBe(false);
  });

  it("rejects a password longer than the maximum", () => {
    const result = validatePassword("a".repeat(MAX_PASSWORD_LENGTH + 1), "person@example.com");
    expect(result.ok).toBe(false);
  });

  it("rejects a common password even at 12+ characters", () => {
    const result = validatePassword("qwertyuiop123", "person@example.com");
    expect(result.ok).toBe(false);
  });

  it("rejects a password equal to the email", () => {
    const result = validatePassword("Person@Example.com", "person@example.com");
    expect(result.ok).toBe(false);
  });

  it("rejects a password equal to the email's local part (case-insensitive), independent of the length check", () => {
    // "longlocalpart" is 13 chars — long enough to pass the length check on
    // its own, so a rejection here is specifically the local-part rule.
    const result = validatePassword("LongLocalPart", "longlocalpart@example.com");
    expect(result.ok).toBe(false);
  });

  it("accepts a reasonable, long, non-common, non-email password", () => {
    const result = validatePassword("Correct-Horse-Battery-Staple-42", "person@example.com");
    expect(result.ok).toBe(true);
  });
});
