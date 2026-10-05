import type { InviteExpiryOption } from "../shared.js";

const EXPIRY_MS: Record<InviteExpiryOption, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "72h": 72 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

/** Per 04-auth-and-sessions.md §5: "Invite expiry options: 24 hours, 72
 * hours (default), 7 days." */
export function inviteExpiryDate(option: InviteExpiryOption): Date {
  return new Date(Date.now() + EXPIRY_MS[option]);
}
