import { getDb } from "../db/supabase.js";
import type { UserRole } from "../shared.js";

export interface AuthedUser {
  id: string;
  email: string;
  role: UserRole;
  status: "active" | "deactivated";
}

/** Returns the list of space ids this user may read, per 05-roles-permissions.md:
 * admins see every non-archived space; members see 'all'-visibility spaces
 * plus any 'restricted' space they are a member of. */
export async function accessibleSpaceIds(user: AuthedUser): Promise<string[]> {
  const db = getDb();
  if (user.role === "admin") {
    const { data } = await db.from("spaces").select("id").is("archived_at", null);
    return (data ?? []).map((r: { id: string }) => r.id);
  }

  const { data: openSpaces } = await db
    .from("spaces")
    .select("id")
    .eq("visibility", "all")
    .is("archived_at", null);

  const { data: memberRows } = await db
    .from("space_members")
    .select("space_id")
    .eq("user_id", user.id);

  const memberIds = (memberRows ?? []).map((r: { space_id: string }) => r.space_id);
  const openIds = (openSpaces ?? []).map((r: { id: string }) => r.id);
  return Array.from(new Set([...openIds, ...memberIds]));
}

export async function canAccessSpace(user: AuthedUser, spaceId: string): Promise<boolean> {
  const ids = await accessibleSpaceIds(user);
  return ids.includes(spaceId);
}

export function requireAdmin(user: AuthedUser): boolean {
  return user.role === "admin";
}
