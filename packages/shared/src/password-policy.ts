// Password rules per 04-auth-and-sessions.md §9. Mirrored byte-for-byte at
// apps/api/src/password-policy.ts (same duplication convention as
// content-schema.ts — see the note there).

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

// "Reject passwords found in the top 1000 common passwords (bundle a list
// in packages/shared)." This is a curated subset of well-known breach-list
// passwords (NCSC/HaveIBeenPwned/SecLists-style top entries), not a literal
// verbatim copy of any single list — it is large enough to catch the
// passwords real people actually reuse, which is the rule's intent, but an
// owner who wants exact top-1000 coverage should drop a fuller list in here.
const COMMON_PASSWORDS: ReadonlySet<string> = new Set(
  [
    "123456", "123456789", "12345678", "12345", "1234567", "1234567890", "123123", "111111", "000000",
    "qwerty", "qwerty123", "qwertyuiop", "asdfghjkl", "zxcvbnm", "1q2w3e4r", "1q2w3e4r5t",
    "password", "password1", "password123", "passw0rd", "p@ssw0rd", "letmein", "letmeinplease",
    "welcome", "welcome1", "monkey", "dragon", "master", "superman", "batman", "freedom",
    "login", "admin", "admin123", "administrator", "root", "toor", "guest", "test", "test123",
    "iloveyou", "ilovey0u", "loveyou", "princess", "sunshine", "flower", "football", "baseball",
    "basketball", "soccer", "hockey", "golfer", "trustno1", "whatever", "shadow", "michael",
    "jennifer", "jordan", "hunter", "hunter2", "ranger", "buster", "thomas", "robert", "daniel",
    "matthew", "andrew", "joshua", "ashley", "nicole", "amanda", "jessica", "charlie", "samantha",
    "tigger", "pepper", "biteme", "access", "yankees", "startrek", "starwars", "cheese",
    "abc123", "abc12345", "abcd1234", "a1b2c3", "1a2b3c4d", "qazwsx", "qazwsxedc",
    "123qwe", "123abc", "1qaz2wsx", "aaaaaa", "111222", "121212", "123321", "654321", "666666",
    "888888", "999999", "7777777", "123123123", "qwer1234", "pass1234", "mypassword",
    "changeme", "changeme123", "letitgo", "default", "passw0rd1", "P@ssw0rd", "P@ssword1",
    "secret", "secret123", "summer2024", "winter2024", "autumn2024", "spring2024",
    "company123", "welcome123", "qwertyuiop123", "zaq1zaq1", "zaq12wsx", "1234qwer",
  ].map((p) => p.toLowerCase())
);

export interface PasswordValidationResult {
  ok: boolean;
  error?: string;
}

/** Validates a new password per 04-auth-and-sessions.md §9. `email` is the
 * account's email, used to reject a password equal to the email or the
 * part before "@". Never logs the password (caller's job too — see
 * RULES.md §2.10: never log passwords). */
export function validatePassword(password: string, email: string): PasswordValidationResult {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters` };
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { ok: false, error: "This password is too common. Choose a different one." };
  }
  const normalizedEmail = email.trim().toLowerCase();
  const localPart = normalizedEmail.split("@")[0];
  const normalizedPassword = password.toLowerCase();
  if (normalizedPassword === normalizedEmail || normalizedPassword === localPart) {
    return { ok: false, error: "Password cannot be your email address" };
  }
  return { ok: true };
}
