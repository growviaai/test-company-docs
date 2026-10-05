import { z } from "zod";

export * from "./content-schema.js";
export * from "./password-policy.js";

export type UserRole = "admin" | "member";
export type UserStatus = "active" | "deactivated";
export type SpaceVisibility = "all" | "restricted";
export type PageKind = "page" | "group";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  email_notifications: boolean;
  created_at: string;
}

export interface Space {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  emoji: string | null;
  visibility: SpaceVisibility;
  position: number;
  archived_at: string | null;
}

export interface Page {
  id: string;
  space_id: string;
  parent_id: string | null;
  kind: PageKind;
  title: string;
  slug: string;
  description: string | null;
  emoji: string | null;
  position: number;
  content: unknown;
  revision: number;
  created_at: string;
  updated_at: string;
}

/** Can this user read/write this space, per 05-roles-permissions.md:
 *  admins always have access; members need an 'all' visibility space or membership. */
export function canAccessSpace(
  user: { role: UserRole },
  space: { visibility: SpaceVisibility },
  isMember: boolean
): boolean {
  if (user.role === "admin") return true;
  if (space.visibility === "all") return true;
  return isMember;
}

export function isAdmin(user: { role: UserRole }): boolean {
  return user.role === "admin";
}

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createSpaceSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .min(1)
    .max(80),
  description: z.string().max(300).optional().nullable(),
  emoji: z.string().max(8).optional().nullable(),
  visibility: z.enum(["all", "restricted"]).default("all"),
});

export const createPageSchema = z.object({
  space_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),
  kind: z.enum(["page", "group"]).default("page"),
  title: z.string().min(1).max(200).default("Untitled"),
});

export const updatePageContentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(300).nullable().optional(),
  content: z.unknown(),
  revision: z.number().int().positive(),
});

// Per 04-auth-and-sessions.md §5-7.
export const INVITE_EXPIRY_OPTIONS = ["24h", "72h", "7d"] as const;
export type InviteExpiryOption = (typeof INVITE_EXPIRY_OPTIONS)[number];

export const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
  expiresIn: z.enum(INVITE_EXPIRY_OPTIONS).default("72h"),
  spaceIds: z.array(z.string().uuid()).max(100).optional(),
});

export const acceptInviteSchema = z.object({
  fullName: z.string().min(1).max(120),
  password: z.string().min(1).max(200),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(1).max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1).max(200),
});

export const ERROR_CODES = {
  UNAUTHENTICATED: "unauthenticated",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not_found",
  VALIDATION: "validation_error",
  CONFLICT: "revision_conflict",
  RATE_LIMITED: "rate_limited",
  LOCKED: "account_locked",
  SERVER: "server_error",
} as const;
