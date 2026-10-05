import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { EditorContent, ReactRenderer, useEditor } from "@tiptap/react";
import type { Editor as TiptapEditor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import type { SuggestionOptions } from "@tiptap/suggestion";
import { Hint } from "./extensions/hint";
import { ImageNode, FileNode } from "./extensions/attachments";
import { createSlashCommandExtension, buildAttachmentSlashItems, type SlashCommandItem } from "./extensions/slashCommand";
import { SlashMenuList, type SlashMenuListHandle } from "./SlashMenuList";
import { FloatingToolbar } from "./FloatingToolbar";
import { uploadFile, validateFileBeforeUpload } from "../../lib/uploads";
import "./editor.css";

const lowlight = createLowlight(common);

export interface EditorHandle {
  getJSON: () => Record<string, unknown>;
  focus: () => void;
  insertHeading: () => void;
  insertHint: () => void;
  insertCodeBlock: () => void;
  insertTable: () => void;
}

interface Props {
  content: Record<string, unknown>;
  editable: boolean;
  spaceId: string;
  pageId: string;
  onUpdate: (json: Record<string, unknown>) => void;
  onBlur?: () => void;
}

interface UploadStatus {
  fileName: string;
  progress: number;
  error: string | null;
}

function buildSlashSuggestionRender(): Pick<SuggestionOptions<SlashCommandItem>, "render"> {
  return {
    render: () => {
      let component: ReactRenderer<SlashMenuListHandle> | null = null;
      let popup: TippyInstance[] = [];
      return {
        onStart: (props) => {
          component = new ReactRenderer(SlashMenuList, { props, editor: props.editor });
          popup = tippy("body", {
            getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect(),
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
          });
        },
        onUpdate(props) {
          component?.updateProps(props);
          popup[0]?.setProps({ getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect() });
        },
        onKeyDown(props) {
          if (props.event.key === "Escape") {
            popup[0]?.hide();
            return true;
          }
          return component?.ref?.onKeyDown(props) ?? false;
        },
        onExit() {
          popup[0]?.destroy();
          component?.destroy();
        },
      };
    },
  };
}

/** The TipTap editor for a page, per 07-docs-editor.md §4. Content and
 * editability are controlled by the parent (PageView), which owns
 * load/save/autosave; this component only ever reports JSON changes up via
 * onUpdate and never fetches anything itself. */
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"];

export const Editor = forwardRef<EditorHandle, Props>(({ content, editable, spaceId, pageId, onUpdate, onBlur }, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickKindRef = useRef<"image" | "file">("file");
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const editorRefForUpload = useRef<TiptapEditor | null>(null);

  async function handleFile(file: File, kindHint?: "image" | "file") {
    const validationError = validateFileBeforeUpload(file);
    if (validationError) {
      setUploadStatus({ fileName: file.name, progress: 0, error: validationError });
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const isImage = kindHint === "image" || (kindHint === undefined && IMAGE_EXTENSIONS.includes(ext));

    setUploadStatus({ fileName: file.name, progress: 0, error: null });
    try {
      const result = await uploadFile(file, { spaceId, pageId }, (pct) => setUploadStatus({ fileName: file.name, progress: pct, error: null }));
      const ed = editorRefForUpload.current;
      if (ed) {
        if (isImage) {
          ed.chain().focus().insertContent({ type: "image", attrs: { attachmentId: result.attachmentId, alt: result.fileName, caption: null } }).run();
        } else {
          ed.chain().focus().insertContent({ type: "file", attrs: { attachmentId: result.attachmentId, fileName: result.fileName } }).run();
        }
      }
      setUploadStatus(null);
    } catch (err) {
      setUploadStatus({ fileName: file.name, progress: 0, error: err instanceof Error ? err.message : "Upload failed" });
    }
  }

  function openFilePicker(kind: "image" | "file") {
    pickKindRef.current = kind;
    if (fileInputRef.current) {
      fileInputRef.current.accept = kind === "image" ? "image/png,image/jpeg,image/gif,image/webp" : "";
      fileInputRef.current.click();
    }
  }

  const slashCommand = useMemo(
    () => createSlashCommandExtension(buildSlashSuggestionRender(), buildAttachmentSlashItems(openFilePicker)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openFilePicker only reads refs, stable across renders
    [],
  );

  const editor = useEditor({
    editable,
    content,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        validate: (href) => /^(https?:\/\/|mailto:)\S+$/i.test(href),
      }),
      Placeholder.configure({ placeholder: "Enter your content here…" }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Hint,
      ImageNode,
      FileNode,
      slashCommand,
    ],
    onUpdate: ({ editor: e }) => onUpdate(e.getJSON()),
    onBlur: () => onBlur?.(),
    editorProps: {
      // 07-docs-editor.md §5: "drag-and-drop and paste" alongside the
      // slash-menu picker. Both funnel through the same handleFile() path
      // as the file input, so validation/progress/insertion stays in one
      // place. Returning true tells ProseMirror we've handled the event
      // ourselves (no default browser paste/drop behavior).
      handleDrop: (_view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        event.preventDefault();
        Array.from(files).forEach((f) => void handleFile(f));
        return true;
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (files.length === 0) return false;
        event.preventDefault();
        files.forEach((f) => void handleFile(f));
        return true;
      },
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- content is only the initial doc; later prop changes are applied via setContent in PageView, not here, to avoid fighting the user's cursor.
  }, []);

  editorRefForUpload.current = editor;

  useImperativeHandle(ref, () => ({
    getJSON: () => editor?.getJSON() ?? { type: "doc", content: [] },
    focus: () => editor?.commands.focus(),
    insertHeading: () => editor?.chain().focus().setNode("heading", { level: 1 }).run(),
    insertHint: () => editor?.chain().focus().setHint("info").run(),
    insertCodeBlock: () => editor?.chain().focus().toggleCodeBlock().run(),
    insertTable: () => editor?.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run(),
  }));

  if (!editor) return null;

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file, pickKindRef.current);
        }}
      />
      {uploadStatus && (
        <div
          className={`mb-2 flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
            uploadStatus.error ? "border-red-500/40 bg-red-500/5 text-red-500" : "border-border bg-surface text-muted"
          }`}
        >
          <span>
            {uploadStatus.error
              ? `${uploadStatus.fileName}: ${uploadStatus.error}`
              : `Uploading ${uploadStatus.fileName}… ${uploadStatus.progress}%`}
          </span>
          <button onClick={() => setUploadStatus(null)} className="ml-2 text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}
      <FloatingToolbar editor={editor} />
      <EditorContent editor={editor} className="tiptap" />
    </div>
  );
});
Editor.displayName = "Editor";
