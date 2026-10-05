/** Loose Supabase Database type: the schema is enforced by migrations and
 * zod validation at the route layer, not by generated types in this build,
 * so table access is typed permissively here rather than left as `never`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
