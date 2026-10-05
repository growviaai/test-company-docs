import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../../lib/api";

interface InviteRow {
  id: string;
  email: string;
  role: "admin" | "member";
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

type StatusFilter = "pending" | "accepted" | "closed";

function inviteStatus(i: InviteRow): string {
  if (i.accepted_at) return "Accepted";
  if (i.revoked_at) return "Revoked";
  if (new Date(i.expires_at).getTime() < Date.now()) return "Expired";
  return "Pending";
}

export function AdminInvitesPage() {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [expiresIn, setExpiresIn] = useState<"24h" | "72h" | "7d">("72h");
  const [error, setError] = useState<string | null>(null);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    api.get<InviteRow[]>(`/admin/invites?status=${filter}`).then(setInvites);
  }
  useEffect(load, [filter]);

  async function createInvite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const created = await api.post<{ acceptUrl: string }>("/admin/invites", { email, role, expiresIn });
      setLastLink(created.acceptUrl);
      setEmail("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create invite");
    } finally {
      setBusy(false);
    }
  }

  async function resend(id: string) {
    const updated = await api.post<{ acceptUrl: string }>(`/admin/invites/${id}/resend`);
    setLastLink(updated.acceptUrl);
    load();
  }

  async function revoke(id: string) {
    await api.delete(`/admin/invites/${id}`);
    load();
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Invites</h1>

      {/* ASSUMPTION: real SMTP delivery isn't implemented yet (see
          apps/api/src/services/email.ts) — invites are queued in
          email_outbox but not actually sent, so the accept link is shown
          here for the admin to copy and send manually. */}
      <form onSubmit={createInvite} className="mb-4 flex flex-wrap items-end gap-2 rounded-md border border-border bg-surface p-4">
        <div>
          <label className="mb-1 block text-xs text-muted">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "member")}
            className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Expires in</label>
          <select
            value={expiresIn}
            onChange={(e) => setExpiresIn(e.target.value as "24h" | "72h" | "7d")}
            className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent"
          >
            <option value="24h">24 hours</option>
            <option value="72h">72 hours</option>
            <option value="7d">7 days</option>
          </select>
        </div>
        <button type="submit" disabled={busy} className="rounded-md bg-accent px-3 py-1.5 text-sm text-white disabled:opacity-60">
          {busy ? "Sending…" : "Send invite"}
        </button>
      </form>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {lastLink && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm">
          <span className="text-muted">Accept link (email isn&apos;t wired up to real SMTP yet — share this manually):</span>
          <code className="truncate">{lastLink}</code>
          <button
            onClick={() => navigator.clipboard?.writeText(lastLink)}
            className="shrink-0 rounded-md border border-border px-2 py-1 text-xs hover:bg-border/40"
          >
            Copy
          </button>
        </div>
      )}

      <div className="mb-3 flex gap-2 text-sm">
        {(["pending", "accepted", "closed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-2 py-1 ${filter === f ? "bg-accent/10 text-accent" : "text-muted hover:bg-border/40"}`}
          >
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th className="py-2">Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Expires</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {invites.map((i) => (
            <tr key={i.id} className="border-b border-border/60">
              <td className="py-2">{i.email}</td>
              <td>{i.role}</td>
              <td>{inviteStatus(i)}</td>
              <td>{new Date(i.expires_at).toLocaleString()}</td>
              <td className="flex gap-2 py-2">
                {!i.accepted_at && !i.revoked_at && (
                  <>
                    <button onClick={() => resend(i.id)} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-border/40">
                      Resend
                    </button>
                    <button onClick={() => revoke(i.id)} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-border/40">
                      Revoke
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {invites.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-muted">
                No invites
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
