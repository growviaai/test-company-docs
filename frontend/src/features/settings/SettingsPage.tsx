import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";

interface SessionRow {
  id: string;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  last_active_at: string;
  isCurrent: boolean;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString();
}

// Per 04-auth-and-sessions.md §7-8: a user can change their own password
// (re-verifying the current one) and see/end their own other sessions.
export function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const [sessions, setSessions] = useState<SessionRow[]>([]);

  function loadSessions() {
    api.get<SessionRow[]>("/me/sessions").then(setSessions);
  }
  useEffect(loadSessions, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    setSaving(true);
    try {
      await api.post("/me/password", { currentPassword, newPassword });
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      loadSessions(); // changing password ends every other session
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : "Could not change password.");
    } finally {
      setSaving(false);
    }
  }

  async function endSession(id: string) {
    await api.delete(`/me/sessions/${id}`);
    loadSessions();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <h1 className="mb-1 text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted">Manage your password and active sessions.</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Change password</h2>
        <form onSubmit={changePassword} className="space-y-3">
          <div>
            <label htmlFor="currentPassword" className="mb-1 block text-sm">
              Current password
            </label>
            <input
              id="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="mb-1 block text-sm">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted">At least 12 characters.</p>
          </div>
          {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
          {passwordSuccess && <p className="text-sm text-green-600">Password changed. Your other sessions were ended.</p>}
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-fg px-4 py-2 text-sm font-medium text-bg disabled:opacity-50"
          >
            {saving ? "Saving…" : "Change password"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Your sessions</h2>
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <div>
                <div>
                  {s.ip ?? "Unknown IP"} {s.isCurrent && <span className="ml-1 text-xs text-muted">(this device)</span>}
                </div>
                <div className="text-xs text-muted">
                  {s.user_agent ?? "Unknown device"} · last active {formatWhen(s.last_active_at)}
                </div>
              </div>
              {!s.isCurrent && (
                <button onClick={() => endSession(s.id)} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-border/40">
                  End session
                </button>
              )}
            </li>
          ))}
          {sessions.length === 0 && <li className="text-sm text-muted">No active sessions.</li>}
        </ul>
      </section>
    </div>
  );
}
