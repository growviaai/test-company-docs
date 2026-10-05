import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";

interface InviteInfo {
  email: string;
  role: "admin" | "member";
  expiresAt: string;
}

export function AcceptInvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .get<InviteInfo>(`/invites/${token}`)
      .then(setInvite)
      .catch(() => setNotFound(true));
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/invites/${token}/accept`, { fullName, password });
      await refreshUser();
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not accept this invite.");
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-text">
        <p className="text-sm text-muted">This invite link is invalid or has expired. Ask an admin to resend it.</p>
      </div>
    );
  }

  if (!invite) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg text-text">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Join Company Docs</h1>
        <p className="mb-6 text-sm text-muted">
          Creating an account for <strong>{invite.email}</strong> as {invite.role}.
        </p>
        {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <label className="mb-1 block text-sm text-muted">Full name</label>
        <input
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mb-4 w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
        />
        <label className="mb-1 block text-sm text-muted">Password</label>
        <input
          type="password"
          required
          minLength={12}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
        />
        <label className="mb-1 block text-sm text-muted">Confirm password</label>
        <input
          type="password"
          required
          minLength={12}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mb-6 w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-accent px-3 py-2 font-medium text-white disabled:opacity-60"
        >
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
