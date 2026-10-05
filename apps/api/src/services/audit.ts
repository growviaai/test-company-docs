import { getDb } from "../db/supabase.js";

export async function writeAudit(opts: {
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const db = getDb();
  await db.from("audit_logs").insert({
    actor_id: opts.actorId,
    actor_email: opts.actorEmail,
    action: opts.action,
    target_type: opts.targetType ?? null,
    target_id: opts.targetId ?? null,
    metadata: opts.metadata ?? {},
    ip: opts.ip ?? null,
    user_agent: opts.userAgent ?? null,
  });
}
