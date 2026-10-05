import { getDb } from "../db/supabase.js";

/**
 * ASSUMPTION / known gap: real SMTP delivery (00-README-for-AI.md: "the
 * company's own SMTP", 14-build-plan.md Phase 2: "Email service
 * (nodemailer, outbox, templates)") is not implemented. There is no SMTP
 * credential available to this build, and the owner's mandate for this
 * pass explicitly allows invites/reset to ship "with email stubbed".
 *
 * What IS real: every email this app would send is written to the
 * `email_outbox` table (status='queued') exactly as the outbox pattern in
 * 02-architecture.md describes, so nothing is silently dropped and a real
 * SMTP sender can be plugged in later by adding one worker that polls this
 * table — no call site needs to change. Never logs the body (it contains
 * invite/reset links — RULES.md §2.10).
 */
export async function queueEmail(opts: { to: string; subject: string; html: string; text: string; kind: string }) {
  const db = getDb();
  const { error } = await db.from("email_outbox").insert({
    to_email: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    kind: opts.kind,
    status: "queued",
  });
  if (error) {
    // eslint-disable-next-line no-console -- never logs the email body/link, only that queuing failed.
    console.error("[email] failed to queue", { kind: opts.kind, code: error.code });
  }
}

export function inviteEmail(acceptUrl: string, role: string) {
  const text = `You've been invited to join the company docs site as a ${role}.\n\nAccept your invite: ${acceptUrl}\n\nThis link expires — if it has, ask an admin to resend it.`;
  const html = `<p>You've been invited to join the company docs site as a <strong>${role}</strong>.</p><p><a href="${acceptUrl}">Accept your invite</a></p><p>This link expires — if it has, ask an admin to resend it.</p>`;
  return { subject: "You're invited to Company Docs", html, text };
}

export function resetPasswordEmail(resetUrl: string) {
  const text = `Reset your Company Docs password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`;
  const html = `<p><a href="${resetUrl}">Reset your Company Docs password</a></p><p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`;
  return { subject: "Reset your Company Docs password", html, text };
}
