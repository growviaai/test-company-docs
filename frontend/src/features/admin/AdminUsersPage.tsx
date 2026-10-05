import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { TableSkeleton } from "../../components/ui/Skeleton";

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "member";
  status: "active" | "deactivated";
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    api.get<UserRow[]>("/admin/users").then((data) => {
      setUsers(data);
      setLoading(false);
    });
  }
  useEffect(load, []);

  async function setRole(id: string, role: "admin" | "member") {
    await api.patch(`/admin/users/${id}/role`, { role });
    load();
  }

  async function deactivate(id: string) {
    await api.post(`/admin/users/${id}/deactivate`);
    load();
  }

  async function reactivate(id: string) {
    await api.post(`/admin/users/${id}/reactivate`);
    load();
  }

  async function remove(user: UserRow) {
    const typed = window.prompt(`Type ${user.email} to permanently delete this user. This cannot be undone.`);
    if (typed !== user.email) return;
    try {
      await api.delete(`/admin/users/${user.id}`);
      load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not delete this user.");
    }
  }

  async function sendReset(id: string) {
    await api.post(`/admin/users/${id}/send-reset`);
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Users</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th className="py-2">Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : (
        <tbody>
          {users.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-muted">
                No users yet
              </td>
            </tr>
          )}
          {users.map((u) => (
            <tr key={u.id} className="border-b border-border/60">
              <td className="py-2">{u.full_name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.status}</td>
              <td className="flex gap-2 py-2">
                <button
                  onClick={() => setRole(u.id, u.role === "admin" ? "member" : "admin")}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-border/40"
                >
                  {u.role === "admin" ? "Make member" : "Make admin"}
                </button>
                {u.status === "active" ? (
                  <>
                    <button onClick={() => sendReset(u.id)} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-border/40">
                      Send reset link
                    </button>
                    <button onClick={() => deactivate(u.id)} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-border/40">
                      Deactivate
                    </button>
                  </>
                ) : (
                  <button onClick={() => reactivate(u.id)} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-border/40">
                    Reactivate
                  </button>
                )}
                <button onClick={() => remove(u)} className="rounded-md border border-red-500/40 px-2 py-1 text-xs text-red-500 hover:bg-red-500/10">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        )}
      </table>
    </div>
  );
}
