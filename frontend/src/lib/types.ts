// Shared-shape types used by more than one feature. Most pages define their
// own local row interfaces (see AdminUsersPage, AdminSessionsPage, etc.) —
// this file exists only for the few types reused across features, to avoid
// a repo-wide packages/shared workspace package for a handful of fields.
export interface Space {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  emoji: string | null;
  visibility: "all" | "restricted";
  position: number;
  archived_at: string | null;
}
