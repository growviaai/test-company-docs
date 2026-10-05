import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function onSignOut() {
    await signOut();
    navigate("/sign-in");
  }

  return (
    <div className="flex min-h-screen bg-bg text-text">
      <aside className="w-60 shrink-0 border-r border-border bg-surface p-4">
        <div className="mb-6 text-lg font-semibold">Company Docs</div>
        <nav className="flex flex-col gap-1 text-sm">
          <NavLink to="/" className={({ isActive }) => `rounded-md px-2 py-1.5 ${isActive ? "bg-accent/10 text-accent" : "hover:bg-border/40"}`}>
            Spaces
          </NavLink>
          <NavLink to="/search" className={({ isActive }) => `rounded-md px-2 py-1.5 ${isActive ? "bg-accent/10 text-accent" : "hover:bg-border/40"}`}>
            Search
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `rounded-md px-2 py-1.5 ${isActive ? "bg-accent/10 text-accent" : "hover:bg-border/40"}`}>
            Settings
          </NavLink>
          {user?.role === "admin" && (
            <>
              <NavLink to="/admin" end className={({ isActive }) => `rounded-md px-2 py-1.5 ${isActive ? "bg-accent/10 text-accent" : "hover:bg-border/40"}`}>
                Users
              </NavLink>
              <NavLink to="/admin/invites" className={({ isActive }) => `rounded-md px-2 py-1.5 ${isActive ? "bg-accent/10 text-accent" : "hover:bg-border/40"}`}>
                Invites
              </NavLink>
              <NavLink to="/admin/sessions" className={({ isActive }) => `rounded-md px-2 py-1.5 ${isActive ? "bg-accent/10 text-accent" : "hover:bg-border/40"}`}>
                Sessions
              </NavLink>
            </>
          )}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-6 py-3">
          <div className="text-sm text-muted">{user?.email}</div>
          <button onClick={onSignOut} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-border/40">
            Sign out
          </button>
        </header>
        <main className="min-w-0 flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
