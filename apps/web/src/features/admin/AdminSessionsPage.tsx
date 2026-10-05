import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface SessionRow {
  id: string;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  last_active_at: string;
  expires_at: string;
  user: { id: string; email: string; full_name: string } | null;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

// 06-admin-panel.md §4: table of active sessions across all users,
// auto-refreshing every 30 seconds, with per-row Terminate.
export function AdminSessionsPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [filterUser, setFilterUser] = useState<string | null>(null);

  function load() {
    api.get<SessionRow[]>("/admin/sessions").then(setSessions);
  }
  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  async function terminate(id: string) {
    await api.delete(`/admin/sessions/${id}`);
    load();
  }

  async function terminateAllForUser(userId: string) {
    await api.delete(`/admin/users/${userId}/sessions`);
    load();
  }

  const visible = filterUser ? sessions.filter((s) => s.user?.id === filterUser) : sessions;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sessions</h1>
        {filterUser && (
          <button onClick={() => setFilterUser(null)} className="text-sm text-accent hover:underline">
            Clear filter
          </button>
        )}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th className="py-2">User</th>
            <th>Device</th>
            <th>IP</th>
            <th>Signed in</th>
            <th>Last active</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {visible.map((s) => (
            <tr key={s.id} className="border-b border-border/60">
              <td className="py-2">
                {s.user ? (
                  <button onClick={() => setFilterUser(s.user!.id)} className="text-left hover:underline">
                    {s.user.full_name || s.user.email}
                  </button>
                ) : (
                  "Unknown user"
                )}
              </td>
              <td className="max-w-xs truncate">{s.user_agent ?? "Unknown"}</td>
              <td>{s.ip ?? "—"}</td>
              <td>{new Date(s.created_at).toLocaleString()}</td>
              <td>{relativeTime(s.last_active_at)}</td>
              <td className="flex gap-2 py-2">
                <button onClick={() => terminate(s.id)} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-border/40">
                  Terminate
                </button>
                {s.user && (
                  <button
                    onClick={() => terminateAllForUser(s.user!.id)}
                    className="rounded-md border border-border px-2 py-1 text-xs hover:bg-border/40"
                  >
                    Terminate all for user
                  </button>
                )}
              </td>
            </tr>
          ))}
          {visible.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-muted">
                No active sessions
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
