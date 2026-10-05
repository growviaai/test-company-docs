import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface AuditRow {
  id: string;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  created_at: string;
}

// 06-admin-panel.md §7 / 09-search-versions-audit.md §3: append-only log,
// visible to admins only. Filters kept client-side for v1 (the API already
// returns the most recent 200 rows, which is plenty for a single-company
// install) rather than adding server-side query params not in 10-api-spec.md.
export function AdminAuditLogPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [actionFilter, setActionFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");

  useEffect(() => {
    api.get<AuditRow[]>("/admin/audit-logs").then(setRows);
  }, []);

  const actions = Array.from(new Set(rows.map((r) => r.action))).sort();

  const visible = rows.filter((r) => {
    if (actionFilter && r.action !== actionFilter) return false;
    if (actorFilter && !r.actor_email?.toLowerCase().includes(actorFilter.toLowerCase())) return false;
    return true;
  });

  function exportCsv() {
    const header = "Time,Actor,Action,Target type,Target id\n";
    const body = visible
      .map((r) => [r.created_at, r.actor_email ?? "", r.action, r.target_type ?? "", r.target_id ?? ""].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Audit log</h1>
        <button onClick={exportCsv} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-border/40">
          Export CSV
        </button>
      </div>

      <div className="mb-3 flex gap-2">
        <input
          placeholder="Filter by actor email…"
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          className="rounded-md border border-border bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent"
        />
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-md border border-border bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent"
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th className="py-2">Time</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Target</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => (
            <tr key={r.id} className="border-b border-border/60">
              <td className="py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
              <td>{r.actor_email ?? "—"}</td>
              <td>
                <code className="rounded bg-border/40 px-1.5 py-0.5 text-xs">{r.action}</code>
              </td>
              <td className="text-muted">
                {r.target_type ? `${r.target_type}${r.target_id ? ` · ${r.target_id.slice(0, 8)}…` : ""}` : "—"}
              </td>
            </tr>
          ))}
          {visible.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-muted">
                No matching entries
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
