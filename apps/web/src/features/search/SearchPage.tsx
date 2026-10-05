import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";

interface SearchHit {
  page_id: string;
  title: string;
  snippet: string;
}

export function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return setResults([]);
    const data = await api.get<SearchHit[]>(`/search?q=${encodeURIComponent(q)}`);
    setResults(data);
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Search</h1>
      <form onSubmit={onSearch} className="mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search pages…"
          className="w-full max-w-md rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </form>
      <ul className="flex flex-col gap-3">
        {results.map((r) => (
          <li key={r.page_id}>
            <Link to={`/pages/${r.page_id}`} className="block rounded-md border border-border bg-surface p-3 hover:border-accent">
              <div className="font-medium">{r.title}</div>
              <div className="text-sm text-muted" dangerouslySetInnerHTML={{ __html: r.snippet }} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
