import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "../../lib/api";

interface PageDoc {
  id: string;
  title: string;
  description: string | null;
  content: { type: "doc"; content: Array<{ type: string; content?: Array<{ type: string; text?: string }> }> };
  revision: number;
}

function docToText(doc: PageDoc["content"]): string {
  return (doc.content ?? [])
    .map((node) => (node.content ?? []).map((n) => n.text ?? "").join(""))
    .join("\n");
}

function textToDoc(text: string): PageDoc["content"] {
  return {
    type: "doc",
    content: text.split("\n").map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    })),
  };
}

export function PageView() {
  const { pageId } = useParams();
  const [page, setPage] = useState<PageDoc | null>(null);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "conflict" | "error">("idle");

  useEffect(() => {
    if (!pageId) return;
    api.get<PageDoc>(`/pages/${pageId}`).then((p) => {
      setPage(p);
      setTitle(p.title);
      setText(docToText(p.content));
    });
  }, [pageId]);

  async function save() {
    if (!page || !pageId) return;
    setStatus("saving");
    try {
      const updated = await api.patch<PageDoc>(`/pages/${pageId}`, {
        title,
        content: textToDoc(text),
        revision: page.revision,
      });
      setPage(updated);
      setStatus("saved");
    } catch (e) {
      if (e instanceof ApiError && e.code === "revision_conflict") {
        setStatus("conflict");
      } else {
        setStatus("error");
      }
    }
  }

  if (!page) return <p className="text-muted">Loading…</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mb-4 w-full border-none bg-transparent text-2xl font-semibold outline-none"
      />
      {status === "conflict" && (
        <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This page changed elsewhere. Reload before saving again.
        </p>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={20}
        className="w-full rounded-md border border-border bg-surface p-4 font-mono text-sm leading-6 outline-none focus:border-accent"
      />
      <div className="mt-3 flex items-center gap-3">
        <button onClick={save} className="rounded-md bg-accent px-4 py-1.5 text-sm text-white">
          Save
        </button>
        <span className="text-xs text-muted">
          {status === "saving" && "Saving…"}
          {status === "saved" && "Saved"}
          {status === "error" && "Could not save"}
        </span>
      </div>
      <p className="mt-6 text-xs text-muted">
        Note: this build uses a plain-text block editor (paragraphs only), stored as TipTap-shaped JSON. The full
        TipTap rich block editor (headings, lists, code, tables, images) from 07-docs-editor.md is not implemented.
      </p>
    </div>
  );
}
