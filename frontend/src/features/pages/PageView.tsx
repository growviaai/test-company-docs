import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { Editor, type EditorHandle } from "../editor/Editor";
import { isEmptyDoc } from "./docUtils";
import { Skeleton } from "../../components/ui/Skeleton";

interface PageDoc {
  id: string;
  space_id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  content: Record<string, unknown>;
  revision: number;
}

const AUTOSAVE_DEBOUNCE_MS = 2000;
const EMPTY_DOC = { type: "doc", content: [] };

export function PageView() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef<EditorHandle>(null);

  const [page, setPage] = useState<PageDoc | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState<Record<string, unknown>>(EMPTY_DOC);
  const [editable, setEditable] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [conflict, setConflict] = useState<{ theirRevision: number } | null>(null);

  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef({ title: "", description: "", content: EMPTY_DOC as Record<string, unknown> });

  useEffect(() => {
    if (!pageId) return;
    setConflict(null);
    api.get<PageDoc>(`/pages/${pageId}`).then((p) => {
      setPage(p);
      setTitle(p.title);
      setDescription(p.description ?? "");
      setContent(p.content);
      latestRef.current = { title: p.title, description: p.description ?? "", content: p.content };
      dirtyRef.current = false;
    });
  }, [pageId]);

  const save = useCallback(async () => {
    if (!page || !pageId || savingRef.current || !dirtyRef.current) return;
    savingRef.current = true;
    setStatus("saving");
    const { title: t, description: d, content: c } = latestRef.current;
    try {
      const updated = await api.patch<PageDoc>(`/pages/${pageId}`, {
        title: t,
        description: d || null,
        content: c,
        revision: page.revision,
      });
      setPage(updated);
      dirtyRef.current = false;
      setStatus("saved");
    } catch (e) {
      if (e instanceof ApiError && e.code === "revision_conflict") {
        setConflict({ theirRevision: page.revision + 1 });
        setStatus("error");
      } else {
        setStatus("error");
      }
    } finally {
      savingRef.current = false;
    }
  }, [page, pageId]);

  function scheduleAutosave() {
    dirtyRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void save(), AUTOSAVE_DEBOUNCE_MS);
  }

  // Save before leaving the page/tab, and warn if a save could not land in time.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current) {
        void save();
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      void save();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-bound only when `save` identity changes
  }, [save]);

  async function keepAsCopy() {
    if (!page) return;
    const { title: t, content: c } = latestRef.current;
    const created = await api.post<{ id: string }>("/pages", {
      space_id: page.space_id,
      parent_id: page.parent_id,
      title: `${t} (copy)`,
    });
    await api.patch(`/pages/${created.id}`, { title: `${t} (copy)`, content: c, revision: 1 });
    setConflict(null);
    navigate(`/pages/${created.id}`);
  }

  async function reloadTheirs() {
    if (!pageId) return;
    const latest = await api.get<PageDoc>(`/pages/${pageId}`);
    setPage(latest);
    setTitle(latest.title);
    setDescription(latest.description ?? "");
    setContent(latest.content);
    latestRef.current = { title: latest.title, description: latest.description ?? "", content: latest.content };
    dirtyRef.current = false;
    setConflict(null);
    setStatus("idle");
  }

  if (!page) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 pb-24">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-5 w-1/3" />
        <div className="space-y-2 pt-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-24">
      {conflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-lg">
            <h2 className="mb-2 text-lg font-semibold">This page changed elsewhere</h2>
            <p className="mb-4 text-sm text-muted">
              Someone else saved a newer version while you were editing. Reload their version, or keep your changes as
              a new copy — nothing is overwritten silently.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={reloadTheirs} className="rounded-md border border-border px-3 py-1.5 text-sm">
                Reload their version
              </button>
              <button onClick={keepAsCopy} className="rounded-md bg-accent px-3 py-1.5 text-sm text-white">
                Keep mine as a copy
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-1 flex items-center justify-between">
        <input
          value={title}
          disabled={!editable}
          onChange={(e) => {
            setTitle(e.target.value);
            latestRef.current = { ...latestRef.current, title: e.target.value };
            scheduleAutosave();
          }}
          placeholder="Untitled page"
          className="w-full border-none bg-transparent text-2xl font-semibold text-text outline-none disabled:opacity-100"
        />
        <button
          onClick={() => {
            if (editable) void save();
            setEditable((v) => !v);
          }}
          className="ml-4 shrink-0 rounded-md border border-border px-3 py-1.5 text-sm"
        >
          {editable ? "Done" : "Edit"}
        </button>
      </div>

      <input
        value={description}
        disabled={!editable}
        onChange={(e) => {
          setDescription(e.target.value);
          latestRef.current = { ...latestRef.current, description: e.target.value };
          scheduleAutosave();
        }}
        placeholder="Page description (optional)"
        className="mb-6 w-full border-none bg-transparent text-sm text-muted outline-none disabled:opacity-100"
      />

      <Editor
        ref={editorRef}
        content={content}
        editable={editable}
        spaceId={page.space_id}
        pageId={page.id}
        onUpdate={(json) => {
          setContent(json);
          latestRef.current = { ...latestRef.current, content: json };
          scheduleAutosave();
        }}
        onBlur={() => void save()}
      />

      {editable && isEmptyDoc(content) && (
        <div className="mt-3 flex flex-wrap gap-2">
          <QuickstartChip label="Heading 1" onClick={() => editorRef.current?.insertHeading()} />
          <QuickstartChip label="Hint" onClick={() => editorRef.current?.insertHint()} />
          <QuickstartChip label="Code" onClick={() => editorRef.current?.insertCodeBlock()} />
          <QuickstartChip label="Table" onClick={() => editorRef.current?.insertTable()} />
        </div>
      )}

      <div className="mt-6 flex items-center gap-3 text-xs text-muted">
        {status === "saving" && <span>Saving…</span>}
        {status === "saved" && <span>Saved</span>}
        {status === "error" && !conflict && <span className="text-red-600">Could not save. Retrying…</span>}
      </div>
    </div>
  );
}

function QuickstartChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-border px-3 py-1 text-sm text-text hover:bg-surface"
    >
      + {label}
    </button>
  );
}
