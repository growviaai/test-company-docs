import { z } from "zod";

export * from "./content-schema.js";
export * from "./password-policy.js";

// Mirrors packages/shared/src/index.ts. Duplicated (rather than imported as a
// pnpm workspace dependency) so apps/api can be deployed to Vercel as a
// standalone package with no monorepo workspace resolution required.

export type UserRole = "admin" | "member";

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
