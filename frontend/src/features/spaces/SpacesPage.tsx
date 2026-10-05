import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Space } from "../../lib/types";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { ListSkeleton } from "../../components/ui/Skeleton";

export function SpacesPage() {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  function load() {
    api
      .get<Space[]>("/spaces")
      .then(setSpaces)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function createSpace(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/spaces", { name, slug, visibility: "all" });
    setName("");
    setSlug("");
    load();
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Spaces</h1>
      {user?.role === "admin" && (
        <form onSubmit={createSpace} className="mb-6 flex gap-2">
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm" />
          <input placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value)} className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm" />
          <button className="rounded-md bg-accent px-3 py-1.5 text-sm text-white">Create space</button>
        </form>
      )}
      {loading ? (
        <ListSkeleton rows={3} />
      ) : (
      <ul className="flex flex-col gap-2">
        {spaces.map((s) => (
          <li key={s.id}>
            <Link to={`/spaces/${s.id}`} className="block rounded-md border border-border bg-surface px-4 py-3 hover:border-accent">
              <span className="mr-2">{s.emoji ?? "📄"}</span>
              <span className="font-medium">{s.name}</span>
              {s.visibility === "restricted" && <span className="ml-2 rounded bg-border/40 px-1.5 py-0.5 text-xs text-muted">restricted</span>}
            </Link>
          </li>
        ))}
        {spaces.length === 0 && <p className="text-muted">No spaces yet.</p>}
      </ul>
      )}
    </div>
  );
}
