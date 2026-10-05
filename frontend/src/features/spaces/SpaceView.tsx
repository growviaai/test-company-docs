import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../lib/api";
import { ListSkeleton } from "../../components/ui/Skeleton";

interface PageRow {
  id: string;
  title: string;
  kind: "page" | "group";
  parent_id: string | null;
}

export function SpaceView() {
  const { spaceId } = useParams();
  const [pages, setPages] = useState<PageRow[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    if (!spaceId) return;
    api.get<PageRow[]>(`/pages/tree?space_id=${spaceId}`).then((data) => {
      setPages(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load() closes over spaceId, re-run only when it changes
  }, [spaceId]);

  async function createPage(e: React.FormEvent) {
    e.preventDefault();
    if (!spaceId) return;
    await api.post("/pages", { space_id: spaceId, title: title || "Untitled" });
    setTitle("");
    load();
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Pages</h1>
      <form onSubmit={createPage} className="mb-6 flex gap-2">
        <input placeholder="Page title" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm" />
        <button className="rounded-md bg-accent px-3 py-1.5 text-sm text-white">New page</button>
      </form>
      {loading ? (
        <ListSkeleton rows={4} />
      ) : (
      <ul className="flex flex-col gap-1">
        {pages.map((p) => (
          <li key={p.id}>
            <Link to={`/pages/${p.id}`} className="block rounded-md px-3 py-2 hover:bg-border/40">
              {p.kind === "group" ? "📁" : "📄"} {p.title}
            </Link>
          </li>
        ))}
        {pages.length === 0 && <p className="text-muted">No pages yet.</p>}
      </ul>
      )}
    </div>
  );
}
