import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";

// Per 04-auth-and-sessions.md §6: the API always returns 204, whatever the
// email, so the UI always shows the same message too — never reveal
// whether an address has an account.
export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email });
    } finally {
      setBusy(false);
      setSent(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg text-text">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold">Reset your password</h1>
        {sent ? (
          <p className="text-sm text-muted">
            If that email has an account, we&apos;ve sent a link to reset the password. The link expires in 1 hour.
          </p>
        ) : (
          <form onSubmit={onSubmit}>
            <p className="mb-4 text-sm text-muted">Enter your email and we&apos;ll send a link to reset your password.</p>
            <label className="mb-1 block text-sm text-muted">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-6 w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-accent px-3 py-2 font-medium text-white disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
        <Link to="/sign-in" className="mt-4 block text-center text-sm text-accent">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
